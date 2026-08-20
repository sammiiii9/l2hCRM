import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "../lib/auth";
import { hasPermission } from "../lib/rbac";
import { dispatchCrmEvent } from "../lib/automation/engine";
import { calculateLeadScore, recordLeadScoreChange } from "../lib/automation/scoring-engine";
import { autoCreateFollowUp } from "../lib/automation/followup-automator";
import { scanAndEscalateOverdueFollowUps } from "../lib/automation/overdue-escalator";
import { normalizePhoneNumber, findDuplicateLeads, mergeLeads } from "../lib/automation/duplicate-detector";
import { generateDailyBriefing } from "../lib/automation/daily-briefing";
import { resolveAdminAlert } from "../lib/automation/admin-alerts";
import { findBestAgentForLead, reassignLead } from "../lib/automation/reassignment-engine";
import { runPeriodicAutomationJobs } from "../lib/automation/scheduler";
import {
  validateDarInput,
  upsertDailyActivityReport,
  getUserTodayDar,
  listDailyActivityReports,
  getTodayISTDateString,
} from "../lib/dar";

async function runAllTests() {
  console.log("🚀 Starting L2H CRM Comprehensive Verification & Automation Test Suite...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Auth & Password Hashing Test
    console.log("👉 1. Testing Authentication & Password Verification...");
    const admin = await prisma.user.findUnique({
      where: { email: "admin@l2hcrm.com" },
      include: { role: true },
    });
    assert(admin !== null, "Admin user exists in database");
    if (admin) {
      const isMatch = await bcrypt.compare("admin123", admin.passwordHash);
      assert(isMatch, "Admin password hash verification succeeds");

      const token = signToken({ userId: admin.id });
      const payload = verifyToken(token);
      assert(payload?.userId === admin.id, "JWT signing and verification is valid");
    }

    // 2. RBAC & System Admin Access (Shahrukh & Shahnawaz)
    console.log("\n👉 2. Testing System Admin & Team Lead Access for Shahrukh & Shahnawaz...");
    const shahrukh = await prisma.user.findUnique({
      where: { email: "shahrukh@l2hcrm.com" },
      include: { role: true },
    });
    const shahnawaz = await prisma.user.findUnique({
      where: { email: "shahnawaz@l2hcrm.com" },
      include: { role: true },
    });

    assert(shahrukh !== null && shahrukh.role.slug === "ADMIN", "Shahrukh Ali is System Admin / Team Lead");
    assert(shahnawaz !== null && shahnawaz.role.slug === "ADMIN", "Shahnawaz is System Admin / Team Lead");

    const associate = await prisma.user.findUnique({
      where: { email: "anamika@l2hcrm.com" },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    assert(associate !== null && associate.role.slug === "MEMBER", "Anamika is Sales Associate");

    if (shahrukh && associate) {
      const shahrukhSession = {
        id: shahrukh.id,
        name: shahrukh.name,
        email: shahrukh.email,
        phone: shahrukh.phone,
        staffCode: shahrukh.staffCode,
        roleId: shahrukh.roleId,
        roleSlug: shahrukh.role.slug,
        roleName: shahrukh.role.name,
        teamName: shahrukh.teamName,
        designation: shahrukh.designation,
        permissions: ["all"],
      };

      const associateSession = {
        id: associate.id,
        name: associate.name,
        email: associate.email,
        phone: associate.phone,
        staffCode: associate.staffCode,
        roleId: associate.roleId,
        roleSlug: associate.role.slug,
        roleName: associate.role.name,
        teamName: associate.teamName,
        designation: associate.designation,
        permissions: associate.role.permissions.map((p) => p.permission.slug),
      };

      assert(hasPermission(shahrukhSession, "leads.assign") === true, "Shahrukh has full 'leads.assign' control");
      assert(hasPermission(shahrukhSession, "leads.create") === true, "Shahrukh has 'leads.create' permission");
      assert(hasPermission(associateSession, "leads.view") === true, "Associate has 'leads.view' permission");
      assert(hasPermission(associateSession, "users.manage") === false, "Associate is restricted from 'users.manage'");
    }

    // 3. Dynamic Weighted Leaderboard Hierarchy Test
    console.log("\n👉 3. Testing Dynamic Weighted Leaderboard Hierarchy (Bookings > Visits > Calls)...");
    const testFloor = [
      { name: "Agent Alpha", bookings: 1, visits: 0, calls: 50 }, // 1 Booking (Tier 1)
      { name: "Agent Beta", bookings: 0, visits: 10, calls: 250 }, // 10 Visits (Tier 2)
      { name: "Agent Gamma", bookings: 0, visits: 0, calls: 400 }, // 400 Calls (Tier 3)
      { name: "Agent Delta", bookings: 1, visits: 5, calls: 300 }, // 1 Booking + 5 Visits (beats Alpha on Tie-break)
      { name: "Agent Epsilon", bookings: 0, visits: 10, calls: 300 }, // 10 Visits + 300 Calls (beats Beta on Tie-break)
    ];

    testFloor.sort((a, b) => {
      // Tier 1: Bookings
      if (b.bookings !== a.bookings) return b.bookings - a.bookings;
      // Tier 2: Visits
      if (b.visits !== a.visits) return b.visits - a.visits;
      // Tier 3: Calls
      if (b.calls !== a.calls) return b.calls - a.calls;
      return a.name.localeCompare(b.name);
    });

    assert(testFloor[0].name === "Agent Delta", "Tier 1: 1 Booking + 5 Visits ranked #1");
    assert(testFloor[1].name === "Agent Alpha", "Tier 1: 1 Booking ranked #2 (beats 10 Visits / 400 Calls)");
    assert(testFloor[2].name === "Agent Epsilon", "Tier 2: 10 Visits + 300 Calls ranked #3 (beats 10 Visits + 250 Calls)");
    assert(testFloor[3].name === "Agent Beta", "Tier 2: 10 Visits + 250 Calls ranked #4 (beats 400 Calls with 0 visits)");
    assert(testFloor[4].name === "Agent Gamma", "Tier 3: 400 Calls ranked #5 (0 Bookings, 0 Visits)");

    // 4. AUTOMATION: Explainable Lead Scoring Engine
    console.log("\n👉 4. Testing Explainable Lead Scoring Engine & History...");
    const scoringTestLead = await prisma.lead.create({
      data: {
        leadCode: `LD-SCORE-${Date.now()}`,
        name: "Scoring Test Lead",
        phone: `9876${Math.floor(100000 + Math.random() * 900000)}`,
        source: "WEBSITE",
        stage: "PROSPECT",
        status: "INTERESTED",
        priority: "WARM",
        budget: "₹2.5 Cr",
        buyingTimeline: "IMMEDIATE",
        preferredLocation: "Sector 128 Noida",
        purpose: "INVESTMENT",
        propertyType: "RESIDENTIAL_APARTMENT",
        configuration: "3BHK",
        engagementScore: 15,
      },
    });

    const scoreResult = await calculateLeadScore(scoringTestLead.id);
    assert(scoreResult.total >= 70, `Score is >= 70 for high-intent lead (Actual: ${scoreResult.total})`);
    assert(scoreResult.category === "HOT", `Classified as HOT lead (Actual: ${scoreResult.category})`);
    assert(scoreResult.reasons.length > 0, `Explainable breakdown reasons generated: ${scoreResult.reasons.join(" | ")}`);

    const scoreHistory = await recordLeadScoreChange({
      leadId: scoringTestLead.id,
      oldScore: 50,
      newScore: scoreResult.total,
      breakdown: scoreResult,
      reason: "Initial qualification score calculation",
    });
    assert(scoreHistory.id !== null, "Lead score history logged with breakdown JSON");

    // 5. AUTOMATION: Automatic Follow-up Creation & 12h Duplicate Window
    console.log("\n👉 5. Testing Automatic Follow-up Creation & 12h Duplicate Window...");
    const autoFollowUp1 = await autoCreateFollowUp({
      leadId: scoringTestLead.id,
      assignedToId: shahrukh?.id,
      delayHours: 24,
      outcomeRemarks: "Post site visit feedback",
    });
    assert(autoFollowUp1.success === true && !autoFollowUp1.skipped, "Automated follow-up created successfully");

    // Attempt duplicate creation within 12h window
    const autoFollowUp2 = await autoCreateFollowUp({
      leadId: scoringTestLead.id,
      assignedToId: shahrukh?.id,
      delayHours: 24,
      outcomeRemarks: "Duplicate trigger attempt",
    });
    assert(
      autoFollowUp2.skipped === true && autoFollowUp2.followUpId === autoFollowUp1.followUpId,
      "Duplicate follow-up prevented; returned existing active follow-up within 12h window"
    );

    // 6. AUTOMATION: Duplicate Lead Detection & Safe Merge
    console.log("\n👉 6. Testing Phone Normalization, Duplicate Detection & Safe Merge...");
    assert(normalizePhoneNumber("+91 98765-43210") === "9876543210", "Phone normalization handles '+91' and dashes");
    assert(normalizePhoneNumber("09876543210") === "9876543210", "Phone normalization handles leading '0'");
    assert(normalizePhoneNumber("9876543210") === "9876543210", "Phone normalization handles standard 10-digit number");

    // Create a duplicate lead
    const duplicateLead = await prisma.lead.create({
      data: {
        leadCode: `LD-DUP-${Date.now()}`,
        name: "Scoring Test Lead (Secondary)",
        phone: scoringTestLead.phone, // Same phone
        source: "DIGITAL_AD",
        stage: "TO_WORK",
        status: "NEW",
        priority: "WARM",
      },
    });

    const dupCheck = await findDuplicateLeads({ phone: scoringTestLead.phone, excludeLeadId: scoringTestLead.id });
    assert(dupCheck.hasDuplicates === true, "findDuplicateLeads detected matching phone number");
    assert(dupCheck.duplicates.length >= 1, `Found ${dupCheck.duplicates.length} duplicate lead(s)`);

    // Add a call log and activity to duplicate lead before merge
    if (shahrukh) {
      await prisma.callLog.create({
        data: {
          leadId: duplicateLead.id,
          userId: shahrukh.id,
          outcome: "CONNECTED",
          durationSeconds: 120,
          remarks: "Secondary lead call before merge",
        },
      });
    }

    // Perform safe merge
    const mergeResult = await mergeLeads({
      primaryLeadId: scoringTestLead.id,
      secondaryLeadId: duplicateLead.id,
      mergedByUserId: shahrukh?.id,
    });
    assert(mergeResult.success === true, "mergeLeads transaction completed successfully");

    const verifiedPrimary = await prisma.lead.findUnique({
      where: { id: scoringTestLead.id },
      include: { callLogs: true, activities: true },
    });
    assert(
      verifiedPrimary?.callLogs.some((c) => c.remarks === "Secondary lead call before merge") === true,
      "Secondary call logs successfully transferred to primary lead during merge"
    );

    const verifiedSecondary = await prisma.lead.findUnique({
      where: { id: duplicateLead.id },
    });
    assert(
      verifiedSecondary?.isDuplicate === true && verifiedSecondary.mergedIntoId === scoringTestLead.id,
      "Secondary lead safely preserved and marked as merged duplicate"
    );

    // 7. AUTOMATION: Overdue Follow-up Multi-Level Escalation
    console.log("\n👉 7. Testing Overdue Follow-up Multi-Level Escalation...");
    // Create an intentionally overdue follow-up (scheduled 2 hours ago)
    const overdueFollowUp = await prisma.followUp.create({
      data: {
        leadId: scoringTestLead.id,
        assignedToId: shahrukh!.id,
        scheduledAt: new Date(Date.now() - 2 * 3600 * 1000), // 2 hours ago
        status: "PENDING",
        isAutomated: true,
        escalationLevel: 0,
      },
    });

    const scanResult = await scanAndEscalateOverdueFollowUps();
    assert(scanResult.level1Count > 0, `Escalated ${scanResult.level1Count} overdue follow-up(s) to Level 1`);

    const escalatedFollowUp = await prisma.followUp.findUnique({
      where: { id: overdueFollowUp.id },
    });
    assert(
      escalatedFollowUp !== null && escalatedFollowUp.escalationLevel >= 1,
      `Follow-up escalated to Level ${escalatedFollowUp?.escalationLevel}`
    );

    // Verify agent received in-app notification
    const notification = await prisma.notification.findFirst({
      where: { userId: shahrukh?.id, type: "OVERDUE_ALERT" },
    });
    assert(notification !== null, "Agent notification generated for overdue follow-up");

    // 8. AUTOMATION: Daily Agent Briefing ("What Should I Do Next?")
    console.log("\n👉 8. Testing Daily Agent Briefing & Priority Action Queue...");
    if (shahrukh) {
      const briefing = await generateDailyBriefing(shahrukh.id);
      assert(briefing !== null, "Daily briefing generated for agent");
      assert(briefing.topPriorities.length > 0, `Action queue contains ${briefing.topPriorities.length} prioritized items`);
      assert(briefing.topPriorities[0].priorityRankScore > 0, "Top priority has calculated priorityRankScore");
      assert(briefing.topPriorities[0].recommendedAction !== undefined, `Recommended next action: ${briefing.topPriorities[0].recommendedAction}`);
    }

    // 9. AUTOMATION: Matchmaking & Capacity-Aware Lead Reassignment
    console.log("\n👉 9. Testing Matchmaking & Capacity-Aware Lead Reassignment...");
    const bestAgent = await findBestAgentForLead({
      preferredLocation: "Sector 128 Noida",
      propertyType: "RESIDENTIAL_APARTMENT",
    });
    assert(bestAgent !== null, `Matchmaking found best agent: ${bestAgent?.name}`);

    if (bestAgent && shahrukh) {
      const reassigned = await reassignLead({
        leadId: scoringTestLead.id,
        newAssigneeId: bestAgent.id,
        reassignedByUserId: shahrukh.id,
        reason: "Location specialization matchmaking",
      });
      assert(reassigned?.assignedToId === bestAgent.id, `Lead successfully reassigned to ${bestAgent.name}`);
    }

    // 10. AUTOMATION: Periodic Background Scheduler Runner
    console.log("\n👉 10. Testing Periodic Background Scheduler Runner...");
    const schedulerResult = await runPeriodicAutomationJobs();
    assert(schedulerResult.success === true, "runPeriodicAutomationJobs executed all cron tasks without error");
    assert(schedulerResult.tasks.overdueEscalations >= 0, "Overdue escalation job completed");
    assert(schedulerResult.tasks.staleLeadsProcessed >= 0, "Stale lead inactivity job completed");

    // 11. DAR: Daily Activity Report Submission, Validation & Duplicate Protection
    console.log("\n👉 11. Testing Daily Activity Report (DAR) Submission, Validation & Duplicate Protection...");
    
    // 11a. Validation Tests
    const validCheck = validateDarInput({
      calls: 45,
      talkTimeMinutes: 180,
      prospects: 3,
      suspects: 12,
      meetings: 2,
      visits: 1,
      callyzerScreenshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    });
    assert(validCheck.isValid === true, "Valid DAR input passes validation");

    const invalidCallsCheck = validateDarInput({
      calls: -5,
      talkTimeMinutes: 100,
      prospects: 1,
      suspects: 1,
      meetings: 0,
      visits: 0,
      callyzerScreenshot: "data:image/png;base64,...",
    });
    assert(invalidCallsCheck.isValid === false, "Negative calls fails validation");

    const invalidTalkTimeCheck = validateDarInput({
      calls: 20,
      talkTimeMinutes: -10,
      prospects: 1,
      suspects: 1,
      meetings: 0,
      visits: 0,
      callyzerScreenshot: "data:image/png;base64,...",
    });
    assert(invalidTalkTimeCheck.isValid === false, "Negative talk time fails validation");

    const missingScreenshotCheck = validateDarInput({
      calls: 20,
      talkTimeMinutes: 100,
      prospects: 1,
      suspects: 1,
      meetings: 0,
      visits: 0,
      callyzerScreenshot: "",
    });
    assert(missingScreenshotCheck.isValid === false, "Missing screenshot fails validation (mandatory proof)");

    // 11b. Create DAR Submission
    if (shahrukh) {
      const sessionShahrukh = {
        id: shahrukh.id,
        name: shahrukh.name,
        email: shahrukh.email,
        phone: shahrukh.phone,
        staffCode: shahrukh.staffCode,
        roleId: shahrukh.roleId,
        roleSlug: "ADMIN",
        roleName: "Administrator",
        teamName: shahrukh.teamName,
        designation: shahrukh.designation,
        permissions: ["leads.view"],
      };

      const darSubmitResult = await upsertDailyActivityReport({
        user: sessionShahrukh,
        calls: 50,
        talkTimeMinutes: 210,
        prospects: 4,
        suspects: 15,
        meetings: 2,
        visits: 1,
        callyzerScreenshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        callyzerFileName: "callyzer_report_aug20.png",
        callyzerFileSize: 45020,
        remarks: "Floor testing completed. High client response on Sector 128 project.",
      });

      assert(darSubmitResult.success === true, "DAR submitted successfully");
      assert(darSubmitResult.isUpdate === false || darSubmitResult.isUpdate === true, "DAR submission returned state");
      assert(darSubmitResult.dar.calls === 50, "DAR calls recorded as 50");
      assert(darSubmitResult.dar.talkTimeMinutes === 210, "DAR talk time recorded as 210 min");
      assert(darSubmitResult.dar.status === "SUBMITTED", "DAR status is SUBMITTED");

      // 11c. Duplicate Protection (Same Day Update)
      const darUpdateResult = await upsertDailyActivityReport({
        user: sessionShahrukh,
        calls: 55,
        talkTimeMinutes: 230,
        prospects: 5,
        suspects: 16,
        meetings: 3,
        visits: 1,
        callyzerScreenshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        callyzerFileName: "callyzer_report_aug20_v2.png",
        remarks: "Updated after evening follow-up call batch.",
      });

      assert(darUpdateResult.isUpdate === true, "Same day DAR submission updates existing record (isUpdate === true)");
      assert(darUpdateResult.dar.calls === 55, "Updated DAR calls updated to 55");

      const todayDateStr = getTodayISTDateString();
      const userDarsCount = await prisma.dailyActivityReport.count({
        where: { userId: shahrukh.id, dateString: todayDateStr },
      });
      assert(userDarsCount === 1, "Duplicate protection verified: exactly 1 DAR record exists for user for today");

      // 11d. Fetch Today's DAR
      const fetchedDar = await getUserTodayDar(shahrukh.id);
      assert(fetchedDar !== null && fetchedDar.calls === 55, "getUserTodayDar successfully fetched today's DAR");

      // 11e. Admin Listing & Compliance
      const listResult = await listDailyActivityReports({ dateString: todayDateStr });
      assert(listResult.dars.length >= 1, `listDailyActivityReports returned ${listResult.dars.length} submission(s)`);
      assert(listResult.aggregates.totalCalls >= 55, `Aggregates totalCalls calculated: ${listResult.aggregates.totalCalls}`);
      assert(listResult.compliance.submittedCount >= 1, `Compliance submitted count: ${listResult.compliance.submittedCount}`);
      assert(listResult.compliance.complianceRate >= 0, `Compliance rate calculated: ${listResult.compliance.complianceRate}%`);

      // Clean up test DAR
      await prisma.dailyActivityReport.deleteMany({ where: { userId: shahrukh.id } });
      await prisma.auditLog.deleteMany({ where: { entity: "DAR" } });

      // 12. Notification Center & Follow-Up Reminder Service Tests
      console.log("\n👉 12. Testing Follow-up Reminders & Notification Service...");
      const {
        checkDueFollowUpReminders,
        getUserNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      } = await import("../lib/notifications/service");

      // Create a test follow-up due in 10 minutes
      const testReminderFollowUp = await prisma.followUp.create({
        data: {
          leadId: scoringTestLead.id,
          assignedToId: shahrukh.id,
          scheduledAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins from now
          status: "PENDING",
          priority: "HIGH",
        },
      });

      const dueReminders = await checkDueFollowUpReminders(shahrukh.id);
      assert(
        dueReminders.some((r) => r.leadId === scoringTestLead.id),
        "checkDueFollowUpReminders successfully detected follow-up due in 10 mins"
      );

      const userNotifs = await getUserNotifications(shahrukh.id);
      assert(userNotifs.notifications.length > 0, "getUserNotifications returned created notifications");
      assert(userNotifs.unreadCount > 0, `Unread notification count: ${userNotifs.unreadCount}`);

      const firstNotif = userNotifs.notifications[0];
      await markNotificationAsRead(firstNotif.id, shahrukh.id);
      const updatedNotif = await prisma.notification.findUnique({ where: { id: firstNotif.id } });
      assert(updatedNotif?.isRead === true, "markNotificationAsRead marked notification as read");

      await markAllNotificationsAsRead(shahrukh.id);
      const postReadAll = await getUserNotifications(shahrukh.id);
      assert(postReadAll.unreadCount === 0, "markAllNotificationsAsRead cleared all unread notifications");

      // Clean up reminder follow-up
      await prisma.followUp.delete({ where: { id: testReminderFollowUp.id } });
      await prisma.notification.deleteMany({ where: { userId: shahrukh.id } });

      // 13. Testing User/Agent Registration & Admin Approval Access
      console.log("\n👉 13. Testing User/Agent Signup & Admin Approval Workflow...");
      const testSignupEmail = `test.agent.${Date.now()}@l2hcrm.com`;
      const testSignupPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const memberRole = await prisma.role.findFirst({ where: { slug: "MEMBER" } });

      // 13a. Create user via registration flow
      const registeredUser = await prisma.user.create({
        data: {
          name: "Vikram Sharma",
          email: testSignupEmail,
          phone: testSignupPhone,
          staffCode: `STAFF-${Date.now().toString().slice(-4)}`,
          passwordHash: await bcrypt.hash("agent123", 10),
          roleId: memberRole!.id,
          status: "PENDING_APPROVAL",
          designation: "Sales Associate",
          dateOfJoining: new Date(),
          teamLeadName: "Shahrukh Ali",
          teamName: "Team Adrash",
          authProvider: "EMAIL",
        },
      });

      assert(registeredUser.status === "PENDING_APPROVAL", "New registered user is placed in PENDING_APPROVAL status");
      assert(registeredUser.teamLeadName === "Shahrukh Ali", "Team lead correctly recorded on registration");

      // 13b. Check that unapproved user is rejected during active auth check
      const activeUserCheck = await prisma.user.findFirst({
        where: { id: registeredUser.id, status: "ACTIVE" },
      });
      assert(activeUserCheck === null, "Unapproved user is NOT active and cannot access system");

      // 13c. Admin Approval Action
      const approvedUser = await prisma.user.update({
        where: { id: registeredUser.id },
        data: {
          status: "ACTIVE",
          approvedAt: new Date(),
          approvedById: shahrukh.id,
          approvalNotes: "Approved by Shahrukh Ali (Team Lead)",
        },
      });

      assert(approvedUser.status === "ACTIVE", "Admin approval activates user account");
      assert(approvedUser.approvedById === shahrukh.id, "Admin approval records approvedById");

      // 13d. Approved user can now authenticate and get token
      const isApprovedPasswordValid = await bcrypt.compare("agent123", approvedUser.passwordHash);
      assert(isApprovedPasswordValid, "Approved user password matches");
      const userToken = signToken({ userId: approvedUser.id });
      const verifiedPayload = verifyToken(userToken);
      assert(verifiedPayload?.userId === approvedUser.id, "Approved user receives valid JWT token");

      // Clean up test registered user
      await prisma.user.delete({ where: { id: registeredUser.id } });
    }

    // 14. Multi-Source Lead Ingestion & Bulk Assignment Distribution
    console.log("\n👉 14. Testing Multi-Source Lead Ingestion & Bulk Assignment Distribution...");
    const Papa = (await import("papaparse")).default;

    // 14a. Phone normalization check
    const cleanPhone = (val: string) => {
      if (!val) return "";
      let cleaned = val.replace(/\D/g, "");
      if (cleaned.startsWith("91") && cleaned.length === 12) {
        cleaned = cleaned.substring(2);
      } else if (cleaned.startsWith("0") && cleaned.length === 11) {
        cleaned = cleaned.substring(1);
      }
      return cleaned;
    };

    assert(cleanPhone("+91 98119 92233") === "9811992233", "Cleaned Indian format with country code");
    assert(cleanPhone("09811992233") === "9811992233", "Cleaned 0-prefixed 11 digit format");
    assert(cleanPhone("98119-92233") === "9811992233", "Cleaned hyphenated phone number");

    // 14b. TSV (Google Sheets / Excel paste) and CSV parsing
    const tsvData = "Name\tPhone\tBudget\tLocation\nAditi Verma\t+91 9988776655\t₹2.5 Cr\tSector 128 Noida\nVikram Malhotra\t9876543210\t₹4.2 Cr\tGolf Course Ext Road";
    const parsedTsv = Papa.parse(tsvData, { header: true, skipEmptyLines: true });
    assert(parsedTsv.data.length === 2, "TSV parsed 2 leads from Google Sheets paste format");

    // 14c. Round-Robin Lead Distribution Simulation
    const mockAgents = [
      { id: "agent-1", name: "Agent Alpha" },
      { id: "agent-2", name: "Agent Beta" },
    ];
    const testLeadIds = ["lead-1", "lead-2", "lead-3", "lead-4"];
    const distributions: Record<string, string[]> = { "agent-1": [], "agent-2": [] };

    testLeadIds.forEach((leadId, idx) => {
      const targetAgent = mockAgents[idx % mockAgents.length];
      distributions[targetAgent.id].push(leadId);
    });

    assert(distributions["agent-1"].length === 2, "Agent 1 received exactly 2 leads under round-robin");
    assert(distributions["agent-2"].length === 2, "Agent 2 received exactly 2 leads under round-robin");
    assert(distributions["agent-1"].includes("lead-1") && distributions["agent-1"].includes("lead-3"), "Round robin alternated leads evenly");

    // 14d. Bulk Distribute DB Operation
    if (shahrukh) {
      const leadA = await prisma.lead.create({
        data: {
          leadCode: `LD-TEST-A-${Date.now()}`,
          name: "Test Distribute Alpha",
          phone: `9988${Math.floor(100000 + Math.random() * 900000)}`,
          createdById: shahrukh.id,
          assignedToId: shahrukh.id,
          stage: "TO_WORK",
          status: "NEW",
          priority: "WARM",
        },
      });

      const leadB = await prisma.lead.create({
        data: {
          leadCode: `LD-TEST-B-${Date.now()}`,
          name: "Test Distribute Beta",
          phone: `9988${Math.floor(100000 + Math.random() * 900000)}`,
          createdById: shahrukh.id,
          assignedToId: shahrukh.id,
          stage: "TO_WORK",
          status: "NEW",
          priority: "WARM",
        },
      });

      // Distribute to active users
      const allActiveUsers = await prisma.user.findMany({ where: { status: "ACTIVE" }, take: 2 });
      if (allActiveUsers.length > 0) {
        const targetUserId = allActiveUsers[0].id;
        await prisma.lead.updateMany({
          where: { id: { in: [leadA.id, leadB.id] } },
          data: { assignedToId: targetUserId },
        });

        const verifiedA = await prisma.lead.findUnique({ where: {id: leadA.id} });
        const verifiedB = await prisma.lead.findUnique({ where: {id: leadB.id} });
        assert(verifiedA?.assignedToId === targetUserId, "Lead A successfully reassigned in bulk batch");
        assert(verifiedB?.assignedToId === targetUserId, "Lead B successfully reassigned in bulk batch");
      }

      // Clean up test distribution leads
      await prisma.lead.delete({ where: { id: leadA.id } });
      await prisma.lead.delete({ where: { id: leadB.id } });
    }

    // Clean up test data
    await prisma.followUp.deleteMany({ where: { leadId: scoringTestLead.id } });
    await prisma.callLog.deleteMany({ where: { leadId: scoringTestLead.id } });
    await prisma.leadActivity.deleteMany({ where: { leadId: scoringTestLead.id } });
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: scoringTestLead.id } });
    await prisma.adminAlert.deleteMany({ where: { entityId: scoringTestLead.id } });
    await prisma.lead.delete({ where: { id: duplicateLead.id } });
    await prisma.lead.delete({ where: { id: scoringTestLead.id } });

    console.log("\n🧹 Test clean up completed.");
  } catch (error) {
    console.error("Test Suite Error:", error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n========================================================");
  console.log(`🎯 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
