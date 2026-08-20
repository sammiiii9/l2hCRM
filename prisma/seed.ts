import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding with Automation Engine rules & data...");

  // 1. Clear existing records safely in order
  await prisma.escalationLog.deleteMany();
  await prisma.adminAlert.deleteMany();
  await prisma.automationExecution.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.leadScoreHistory.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.siteVisit.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.callLog.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.inventoryUnit.deleteMany();
  await prisma.project.deleteMany();
  await prisma.developer.deleteMany();
  await prisma.customerRequirement.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.systemSetting.deleteMany();

  // 2. Seed Permissions
  const permissionsData = [
    // Leads
    { slug: "leads.view", name: "View Leads", module: "LEADS", description: "View assigned or all leads" },
    { slug: "leads.create", name: "Create Leads", module: "LEADS", description: "Create new leads in CRM" },
    { slug: "leads.update", name: "Update Leads", module: "LEADS", description: "Edit lead details, stage & status" },
    { slug: "leads.delete", name: "Delete Leads", module: "LEADS", description: "Soft-delete leads to trash" },
    { slug: "leads.assign", name: "Assign / Reassign Leads", module: "LEADS", description: "Reassign leads across team members" },
    { slug: "leads.merge", name: "Merge Duplicate Leads", module: "LEADS", description: "Merge duplicate leads safely" },
    
    // Projects & Inventory
    { slug: "projects.view", name: "View Projects", module: "PROJECTS", description: "Browse master project catalog" },
    { slug: "projects.manage", name: "Manage Projects", module: "PROJECTS", description: "Create, edit, or delete projects" },
    { slug: "inventory.view", name: "View Inventory", module: "INVENTORY", description: "View unit availability and pricing" },
    { slug: "inventory.manage", name: "Manage Inventory", module: "INVENTORY", description: "Add units, adjust pricing, hold/block units" },

    // Bookings & Deals
    { slug: "bookings.view", name: "View Bookings", module: "BOOKINGS", description: "View deal and booking records" },
    { slug: "bookings.create", name: "Create Bookings", module: "BOOKINGS", description: "Reserve inventory and book deals" },
    { slug: "bookings.manage", name: "Manage Bookings", module: "BOOKINGS", description: "Approve, cancel, or modify bookings" },

    // Customers
    { slug: "customers.view", name: "View Customers", module: "CUSTOMERS", description: "View customer 360 profiles" },
    { slug: "customers.manage", name: "Manage Customers", module: "CUSTOMERS", description: "Create and update customer records" },

    // Calling & Followups
    { slug: "calls.create", name: "Log Calls", module: "CALLS", description: "Log calling data, outcomes, and remarks" },
    { slug: "calls.view", name: "View Call Logs", module: "CALLS", description: "View call histories and reports" },
    { slug: "followups.manage", name: "Manage Follow-ups", module: "FOLLOWUPS", description: "Schedule and complete follow-ups" },

    // Users & RBAC
    { slug: "users.view", name: "View Users", module: "USERS", description: "View staff list and profiles" },
    { slug: "users.manage", name: "Manage Users & RBAC", module: "USERS", description: "Create users, assign roles & permissions" },

    // Reports & Automation
    { slug: "reports.view", name: "View Analytics", module: "REPORTS", description: "View business metrics & funnel reports" },
    { slug: "audit.view", name: "View Audit Logs", module: "SETTINGS", description: "Inspect immutable audit trails" },
    { slug: "settings.manage", name: "Manage System Settings", module: "SETTINGS", description: "Configure CRM global settings" },
    { slug: "automation.manage", name: "Manage Automation Rules", module: "AUTOMATION", description: "Configure automation workflows, thresholds, and alerts" },
  ];

  const permissions: Record<string, any> = {};
  for (const perm of permissionsData) {
    const created = await prisma.permission.create({ data: perm });
    permissions[perm.slug] = created;
  }

  // 3. Seed Roles
  const adminRole = await prisma.role.create({
    data: {
      name: "Administrator",
      slug: "ADMIN",
      description: "Full unrestricted access to all CRM systems, users, reports, automation, and settings",
      isSystem: true,
    },
  });

  const teamLeadRole = await prisma.role.create({
    data: {
      name: "Team Leader",
      slug: "TEAM_LEAD",
      description: "Manages team leads, reviews member calls, distributes prospects, and views team alerts",
      isSystem: true,
    },
  });

  const memberRole = await prisma.role.create({
    data: {
      name: "Sales Associate",
      slug: "MEMBER",
      description: "Operational user managing assigned leads, daily briefing, calling, follow-ups, and bookings",
      isSystem: true,
    },
  });

  // Assign Permissions to Admin
  for (const perm of Object.values(permissions)) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Team Lead Permissions
  const teamLeadPermSlugs = [
    "leads.view", "leads.create", "leads.update", "leads.assign", "leads.merge",
    "projects.view", "inventory.view", "bookings.view", "bookings.create", "bookings.manage",
    "customers.view", "customers.manage", "calls.create", "calls.view", "followups.manage",
    "users.view", "reports.view", "audit.view", "automation.manage"
  ];
  for (const slug of teamLeadPermSlugs) {
    if (permissions[slug]) {
      await prisma.rolePermission.create({
        data: { roleId: teamLeadRole.id, permissionId: permissions[slug].id },
      });
    }
  }

  // Sales Associate Permissions
  const memberPermSlugs = [
    "leads.view", "leads.create", "leads.update",
    "projects.view", "inventory.view", "bookings.view", "bookings.create",
    "customers.view", "customers.manage", "calls.create", "calls.view", "followups.manage",
  ];
  for (const slug of memberPermSlugs) {
    if (permissions[slug]) {
      await prisma.rolePermission.create({
        data: { roleId: memberRole.id, permissionId: permissions[slug].id },
      });
    }
  }

  // 4. Seed Users
  const passwordHash = await bcrypt.hash("admin123", 10);
  const agentPasswordHash = await bcrypt.hash("agent123", 10);

  const adminUser = await prisma.user.create({
    data: {
      name: "Managing Director",
      email: "admin@l2hcrm.com",
      phone: "9999900000",
      staffCode: "ADMIN01",
      passwordHash: passwordHash,
      roleId: adminRole.id,
      designation: "Principal Partner",
      teamName: "Executive Leadership",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    },
  });

  const shahrukhUser = await prisma.user.create({
    data: {
      name: "Shahrukh Ali",
      email: "shahrukh@l2hcrm.com",
      phone: "8439654385",
      staffCode: "8439654385",
      passwordHash: agentPasswordHash,
      roleId: adminRole.id,
      designation: "Team Lead & System Admin",
      teamName: "Team Adrash",
      specializationLocation: "Noida",
      specializationProperty: "RESIDENTIAL_APARTMENT",
      maxActiveLeadLoad: 50,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    },
  });

  const shahnawazUser = await prisma.user.create({
    data: {
      name: "Shahnawaz Khan",
      email: "shahnawaz@l2hcrm.com",
      phone: "9876543210",
      staffCode: "SHAHNAWAZ",
      passwordHash: passwordHash,
      roleId: adminRole.id,
      designation: "Team Lead & System Admin",
      teamName: "Team Shahnawaz",
      specializationLocation: "Greater Noida",
      specializationProperty: "COMMERCIAL",
      maxActiveLeadLoad: 50,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    },
  });

  const anamikaUser = await prisma.user.create({
    data: {
      name: "Anamika Gupta",
      email: "anamika@l2hcrm.com",
      phone: "9871122334",
      staffCode: "AG04",
      passwordHash: agentPasswordHash,
      roleId: memberRole.id,
      designation: "Senior Sales Associate",
      teamName: "Team Adrash",
      specializationLocation: "Noida",
      specializationProperty: "RESIDENTIAL_APARTMENT",
      maxActiveLeadLoad: 40,
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
    },
  });

  const sumitUser = await prisma.user.create({
    data: {
      name: "Sumit Sharma",
      email: "sumit@l2hcrm.com",
      phone: "9818833445",
      staffCode: "SS05",
      passwordHash: agentPasswordHash,
      roleId: memberRole.id,
      designation: "Closing Specialist",
      teamName: "Team Shahnawaz",
      specializationLocation: "Gurugram",
      specializationProperty: "VILLA",
      maxActiveLeadLoad: 40,
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80",
    },
  });

  // 5. Seed Developers & Projects
  const willowDev = await prisma.developer.create({
    data: {
      name: "Willow Luxury Infra",
      contactPerson: "Rajeev Singhal",
      contactPhone: "+91 120 4567890",
      email: "connect@willowinfra.com",
      website: "https://willowinfra.com",
      description: "Premier real estate developer specializing in luxury golf-side condominiums and commercial townships.",
    },
  });

  const godrejDev = await prisma.developer.create({
    data: {
      name: "Godrej Properties",
      contactPerson: "Meenakshi Sundaram",
      contactPhone: "+91 120 9876543",
      email: "sales@godrejproperties.com",
      website: "https://godrejproperties.com",
      description: "Leading national developer known for sustainable luxury residential projects.",
    },
  });

  const projectWillow = await prisma.project.create({
    data: {
      projectCode: "PRJ-101",
      name: "Willow Estate",
      developerId: willowDev.id,
      location: "Sector 150, Noida-Greater Noida Expressway",
      address: "Plot GH-01, Sector 150, Noida",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201310",
      propertyType: "RESIDENTIAL",
      projectType: "UNDER_CONSTRUCTION",
      status: "ACTIVE",
      launchDate: new Date("2024-01-15"),
      possessionDate: new Date("2027-12-31"),
      priceRangeMin: 8500000,
      priceRangeMax: 27500000,
      reraNumber: "UPRERAPRJ15092",
      totalUnits: 360,
      availableUnits: 142,
      amenities: "Olympic Swimming Pool, 9-Hole Golf Greens, 50,000 sq ft Clubhouse, Tennis Court, 24/7 Multi-tier Security, Electric Vehicle Charging",
      connectivity: "2 mins from Noida Expressway, 15 mins to upcoming Noida International Airport Jewar, Sector 148 Metro 5 mins",
      description: "Willow Estate is an ultra-modern 25-acre luxury township featuring 80% green open spaces and panoramic golf views.",
      coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80",
    },
  });

  const projectMultiplex = await prisma.project.create({
    data: {
      projectCode: "PRJ-103",
      name: "Multiplex Grand Square",
      developerId: willowDev.id,
      location: "Sector 62, Electronic City, Noida",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201309",
      propertyType: "COMMERCIAL",
      projectType: "READY_TO_MOVE",
      status: "ACTIVE",
      priceRangeMin: 3500000,
      priceRangeMax: 15000000,
      reraNumber: "UPRERAPRJ99210",
      totalUnits: 200,
      availableUnits: 54,
      amenities: "Food Court, High-Street Retail, Multiplex, Grade A Office Spaces, Basement Parking",
      connectivity: "Walking distance to Noida Electronic City Metro Station",
      description: "High footfall commercial destination offering retail shops and high-yield studio offices.",
      coverImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80",
    },
  });

  // 6. Seed Inventory Units
  const unitsData = [
    {
      projectId: projectWillow.id,
      unitNumber: "T1-0402",
      tower: "Tower 1",
      floor: 4,
      configuration: "3BHK",
      carpetArea: 1450,
      superArea: 1850,
      facing: "Golf Course Facing",
      view: "Green Park View",
      basePrice: 12500000,
      plcCharges: 250000,
      parkingCharges: 300000,
      floorRiseCharges: 100000,
      totalCalculatedPrice: 13150000,
      status: "AVAILABLE",
    },
    {
      projectId: projectWillow.id,
      unitNumber: "T2-1801",
      tower: "Tower 2",
      floor: 18,
      configuration: "4BHK",
      carpetArea: 2200,
      superArea: 2850,
      facing: "Club Facing Corner",
      view: "Panoramic Expressway View",
      basePrice: 19500000,
      plcCharges: 500000,
      parkingCharges: 600000,
      floorRiseCharges: 450000,
      totalCalculatedPrice: 21050000,
      status: "BOOKED",
    },
    {
      projectId: projectMultiplex.id,
      unitNumber: "G-14",
      tower: "Retail Arcade Ground",
      floor: 0,
      configuration: "STUDIO",
      carpetArea: 420,
      superArea: 550,
      facing: "Main Atrium Facing",
      view: "High Street Frontage",
      basePrice: 4800000,
      plcCharges: 200000,
      parkingCharges: 200000,
      floorRiseCharges: 0,
      totalCalculatedPrice: 5200000,
      status: "AVAILABLE",
    },
  ];

  const inventoryUnits: any[] = [];
  for (const u of unitsData) {
    const unit = await prisma.inventoryUnit.create({ data: u });
    inventoryUnits.push(unit);
  }

  // 7. Seed Leads with Explainable Scoring & Daily Priority
  const leadsData = [
    {
      leadCode: "LD-1001",
      name: "Momin Salman",
      phone: "917505610239",
      whatsapp: "917505610239",
      email: "momin.salman@gmail.com",
      source: "CALL_FLOOR",
      campaign: "Noida Commercial Drive",
      assignedToId: shahrukhUser.id,
      createdById: shahrukhUser.id,
      status: "QUALIFIED",
      stage: "PROSPECT",
      priority: "WARM",
      budget: "₹15 Lakhs - ₹25 Lakhs",
      budgetMin: 1500000,
      budgetMax: 2500000,
      preferredLocation: "Multiplex • Noida Sector 62",
      propertyType: "COMMERCIAL",
      purpose: "INVESTMENT",
      configuration: "STUDIO",
      buyingTimeline: "IMMEDIATE",
      requirementNotes: "Enquiring about commercial investment in Noida Sector 62. Looking for assured rental returns.",
      projectInterestId: projectMultiplex.id,
      leadScore: 75,
      scoreBreakdown: JSON.stringify({
        budgetFit: 15,
        timeline: 20,
        engagement: 15,
        completeness: 15,
        siteVisit: 0,
        projectInterest: 10,
        total: 75,
        reasons: ["+20 Immediate buying timeline", "+15 Commercial budget fit", "+15 Connected on call", "+15 Complete requirements", "+10 Project selected"]
      }),
      priorityRankScore: 82.5,
      lastContactedAt: new Date(Date.now() - 1 * 86400000),
      lastActivityAt: new Date(Date.now() - 1 * 86400000),
      nextFollowUpDate: new Date(Date.now() + 1 * 86400000),
      latestRemarks: "Investor looking for commercial rental return. Follow up with ROI sheet.",
      tags: "Investor,Commercial,Noida",
    },
    {
      leadCode: "LD-1006",
      name: "Dr. Aniruddh Sengupta",
      phone: "9818822334",
      whatsapp: "9818822334",
      email: "aniruddh.dr@maxhealthcare.com",
      source: "REFERRAL",
      campaign: "VIP Referral",
      assignedToId: shahrukhUser.id,
      createdById: shahrukhUser.id,
      status: "SITE_VISIT_SCHEDULED",
      stage: "PROSPECT",
      priority: "HOT",
      budget: "₹2.0 Cr - ₹2.5 Cr",
      budgetMin: 20000000,
      budgetMax: 25000000,
      preferredLocation: "Sector 150, Noida",
      propertyType: "RESIDENTIAL_APARTMENT",
      purpose: "SELF_USE",
      configuration: "4BHK",
      buyingTimeline: "0_3_MONTHS",
      requirementNotes: "Senior doctor at Max Hospital looking for premium high-floor corner unit.",
      projectInterestId: projectWillow.id,
      leadScore: 92,
      scoreBreakdown: JSON.stringify({
        budgetFit: 20,
        timeline: 15,
        engagement: 20,
        completeness: 15,
        siteVisit: 10,
        projectInterest: 12,
        total: 92,
        reasons: ["+20 ₹2 Cr+ Budget fit", "+20 High call & WhatsApp engagement", "+15 Buying within 3 months", "+15 Complete 4BHK requirements", "+12 Willow Estate project interest", "+10 Site visit scheduled"]
      }),
      priorityRankScore: 94.0,
      lastContactedAt: new Date(Date.now() - 12 * 3600000),
      lastActivityAt: new Date(Date.now() - 12 * 3600000),
      nextFollowUpDate: new Date(Date.now() + 1 * 86400000),
      latestRemarks: "Site visit confirmed for Saturday 11:30 AM with family. Send driver for pickup.",
      tags: "VIP,Doctor,4BHK,Site Visit Confirmed",
    },
    {
      leadCode: "LD-1008",
      name: "Raj Sharma",
      phone: "9876501234",
      whatsapp: "9876501234",
      email: "raj.sharma@noida.in",
      source: "DIGITAL_AD",
      campaign: "High Intent Google Search",
      assignedToId: shahrukhUser.id,
      createdById: shahrukhUser.id,
      status: "QUALIFIED",
      stage: "PROSPECT",
      priority: "HOT",
      budget: "₹2.0 Cr",
      budgetMin: 18000000,
      budgetMax: 22000000,
      preferredLocation: "Sector 150, Noida",
      propertyType: "RESIDENTIAL_APARTMENT",
      purpose: "SELF_USE",
      configuration: "3BHK",
      buyingTimeline: "IMMEDIATE",
      requirementNotes: "Ready to book 3BHK in Sector 150. Follow-up is overdue by 1 day.",
      projectInterestId: projectWillow.id,
      leadScore: 91,
      scoreBreakdown: JSON.stringify({
        budgetFit: 20,
        timeline: 20,
        engagement: 18,
        completeness: 15,
        siteVisit: 5,
        projectInterest: 13,
        total: 91,
        reasons: ["+20 ₹2 Cr budget fit", "+20 Immediate buying timeline", "+18 Highly responsive", "+15 Complete specifications", "+13 Willow interest", "+5 Site visit enquiry"]
      }),
      priorityRankScore: 96.5,
      lastContactedAt: new Date(Date.now() - 52 * 3600000), // 52 hours ago
      lastActivityAt: new Date(Date.now() - 52 * 3600000),
      nextFollowUpDate: new Date(Date.now() - 24 * 3600000), // Overdue by 1 day!
      latestRemarks: "Customer requested cost sheet 2 days ago. No follow-up logged since.",
      tags: "HOT,Overdue,Immediate Buyer",
    },
    {
      leadCode: "LD-1009",
      name: "Amit Kumar",
      phone: "9811223344",
      whatsapp: "9811223344",
      email: "amit.k@gmail.com",
      source: "REFERRAL",
      campaign: "Word of Mouth",
      assignedToId: shahrukhUser.id,
      createdById: shahrukhUser.id,
      status: "SITE_VISIT_DONE",
      stage: "PROSPECT",
      priority: "HOT",
      budget: "₹1.8 Cr",
      budgetMin: 16000000,
      budgetMax: 20000000,
      preferredLocation: "Sector 150, Noida",
      propertyType: "RESIDENTIAL_APARTMENT",
      purpose: "SELF_USE",
      configuration: "3BHK",
      buyingTimeline: "0_3_MONTHS",
      requirementNotes: "Completed site visit yesterday with spouse. Loved Unit T1-0402.",
      projectInterestId: projectWillow.id,
      leadScore: 87,
      scoreBreakdown: JSON.stringify({
        budgetFit: 18,
        timeline: 15,
        engagement: 19,
        completeness: 15,
        siteVisit: 20,
        projectInterest: 0,
        total: 87,
        reasons: ["+20 Site visit completed", "+19 High engagement", "+18 Budget aligned", "+15 0-3 months timeline", "+15 Complete requirements"]
      }),
      priorityRankScore: 89.0,
      lastContactedAt: new Date(Date.now() - 24 * 3600000),
      lastActivityAt: new Date(Date.now() - 24 * 3600000),
      nextFollowUpDate: new Date(Date.now() + 6 * 3600000), // Today
      latestRemarks: "Site visit was successful. Need to discuss final payment terms today.",
      tags: "Site Visit Done,High Intent",
    },
  ];

  const leads: any[] = [];
  for (const l of leadsData) {
    const lead = await prisma.lead.create({ data: l });
    leads.push(lead);

    // Seed initial score history
    await prisma.leadScoreHistory.create({
      data: {
        leadId: lead.id,
        oldScore: 50,
        newScore: lead.leadScore,
        category: lead.leadScore >= 70 ? "HOT" : lead.leadScore >= 40 ? "WARM" : "COLD",
        reason: "Initial explainable score calculation on lead intake",
        breakdown: lead.scoreBreakdown,
      },
    });

    // Create activity record
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: lead.assignedToId,
        type: "STAGE_CHANGED",
        title: `Lead initialized at stage: ${lead.stage}`,
        description: lead.latestRemarks || "Lead record created in CRM system",
        isAutomated: false,
      },
    });
  }

  // 8. Seed Follow-ups (including 1 overdue follow-up to test overdue escalation)
  const rajLead = leads.find((l) => l.leadCode === "LD-1008");
  if (rajLead) {
    await prisma.followUp.create({
      data: {
        leadId: rajLead.id,
        assignedToId: shahrukhUser.id,
        scheduledAt: new Date(Date.now() - 24 * 3600000), // 1 day overdue
        priority: "HIGH",
        status: "PENDING",
        isAutomated: true,
        escalationLevel: 2, // Escalated to Manager
        lastEscalatedAt: new Date(Date.now() - 4 * 3600000),
      },
    });
  }

  const doctorLead = leads.find((l) => l.leadCode === "LD-1006");
  if (doctorLead) {
    await prisma.siteVisit.create({
      data: {
        leadId: doctorLead.id,
        projectId: projectWillow.id,
        assignedToId: shahrukhUser.id,
        scheduledDate: new Date(Date.now() + 86400000 * 2),
        status: "SCHEDULED",
        feedback: "Customer requested site golf cart tour and sample flat viewing of 4BHK Tower 2.",
      },
    });

    await prisma.followUp.create({
      data: {
        leadId: doctorLead.id,
        assignedToId: shahrukhUser.id,
        scheduledAt: new Date(Date.now() + 86400000),
        priority: "HIGH",
        status: "PENDING",
        isAutomated: true,
      },
    });
  }

  // 9. Seed Automation Rules
  const automationRules = [
    {
      eventType: "site_visit.completed",
      name: "Auto Follow-Up after Site Visit",
      description: "Automatically schedules a high-priority follow-up next day at 11:00 AM upon site visit completion",
      isEnabled: true,
      triggerConditions: JSON.stringify({ event: "site_visit.completed" }),
      actionPayload: JSON.stringify({
        action: "CREATE_FOLLOWUP",
        delayDays: 1,
        time: "11:00",
        priority: "HIGH",
        preventDuplicates: true,
      }),
    },
    {
      eventType: "lead.qualified",
      name: "Auto Follow-Up on Lead Qualification",
      description: "Creates next-step follow-up within 24 hours when lead reaches QUALIFIED stage",
      isEnabled: true,
      triggerConditions: JSON.stringify({ stage: "QUALIFIED" }),
      actionPayload: JSON.stringify({
        action: "CREATE_FOLLOWUP",
        delayHours: 24,
        priority: "HIGH",
        preventDuplicates: true,
      }),
    },
    {
      eventType: "lead.negotiation",
      name: "Urgent Follow-Up in Negotiation Stage",
      description: "Creates same-day/next-day high priority follow-up for leads in active negotiation",
      isEnabled: true,
      triggerConditions: JSON.stringify({ status: "NEGOTIATION" }),
      actionPayload: JSON.stringify({
        action: "CREATE_FOLLOWUP",
        delayHours: 12,
        priority: "HIGH",
        preventDuplicates: true,
      }),
    },
    {
      eventType: "followup.overdue",
      name: "Multi-Level Overdue Follow-Up Escalation",
      description: "Level 1: Notify Agent. Level 2 (>24h): Escalate to Team Lead. Level 3 (Hot Lead + >48h inactivity): Critical Admin Alert.",
      isEnabled: true,
      triggerConditions: JSON.stringify({ overdueHours: 24 }),
      actionPayload: JSON.stringify({
        action: "ESCALATE_AND_ALERT",
        level1Hours: 0,
        level2Hours: 24,
        level3HotLeadInactivityHours: 48,
      }),
    },
    {
      eventType: "lead.high_value",
      name: "High-Value Lead Management Alert",
      description: "Generates management alert whenever a lead with budget >= ₹1.5 Cr is created or updated",
      isEnabled: true,
      triggerConditions: JSON.stringify({ minBudgetAmount: 15000000 }),
      actionPayload: JSON.stringify({
        action: "CREATE_ADMIN_ALERT",
        severity: "WARNING",
        category: "HIGH_VALUE_LEAD",
      }),
    },
    {
      eventType: "lead.scoring_weights",
      name: "Lead Scoring Weightage Configuration",
      description: "Defines transparent point weights and category thresholds for explainable lead scoring",
      isEnabled: true,
      triggerConditions: JSON.stringify({}),
      actionPayload: JSON.stringify({
        budgetMaxPoints: 20,
        timelineMaxPoints: 20,
        engagementMaxPoints: 20,
        completenessMaxPoints: 15,
        siteVisitMaxPoints: 20,
        projectInterestMaxPoints: 15,
        thresholdHot: 70,
        thresholdWarm: 40,
      }),
    },
  ];

  for (const rule of automationRules) {
    await prisma.automationRule.create({ data: rule });
  }

  // 10. Seed Admin Alerts
  const initialAlerts = [
    {
      severity: "CRITICAL",
      category: "HOT_INACTIVE",
      title: "🔴 Lead Leakage Risk: Raj Sharma (₹2.0 Cr)",
      description: "Hot Lead (Score 91) has had no activity for 52 hours and follow-up is 1 day overdue. Assigned to Shahrukh Ali.",
      entity: "LEAD",
      entityId: rajLead?.id,
      entityCode: rajLead?.leadCode,
      recommendedAction: "Call lead immediately or reassign to available associate",
      linkUrl: `/leads/${rajLead?.id}`,
      status: "OPEN",
      assignedToId: adminUser.id,
    },
    {
      severity: "WARNING",
      category: "UNASSIGNED_LEAD",
      title: "🟠 High-Value Referral Lead Unassigned",
      description: "New referral inquiry for Godrej Palm Retreat (₹1.8 Cr) has been in queue for 45 minutes without assignment.",
      entity: "LEAD",
      recommendedAction: "Use Round-Robin or assign directly to Team Lead",
      linkUrl: "/leads",
      status: "OPEN",
      assignedToId: adminUser.id,
    },
    {
      severity: "INFO",
      category: "INVENTORY_CHANGE",
      title: "🔵 Premium Golf Facing Unit Released",
      description: "Unit T1-0402 (3BHK, Willow Estate) was released back to AVAILABLE status.",
      entity: "INVENTORY",
      recommendedAction: "Pitch to interested 3BHK prospective buyers",
      linkUrl: "/projects",
      status: "OPEN",
      assignedToId: adminUser.id,
    },
  ];

  for (const alert of initialAlerts) {
    await prisma.adminAlert.create({ data: alert });
  }

  // 11. Seed System Settings
  const settings = [
    { key: "company_name", value: "L2H Real Estate Ventures", category: "GENERAL", description: "Organization Name" },
    { key: "default_commission_rate", value: "2.5", category: "GENERAL", description: "Default Agent Commission Percentage" },
    { key: "auto_assign_leads", value: "true", category: "CALL_FLOOR", description: "Round-robin automatic lead assignment" },
    { key: "whatsapp_template_intro", value: "Hello {name}, thanks for your interest in {project}. Here is the complete brochure & cost sheet.", category: "INTEGRATIONS", description: "Default WhatsApp greeting message" },
    { key: "automation_enabled", value: "true", category: "AUTOMATION", description: "Master switch for CRM event automation engine" },
    { key: "hot_lead_inactivity_hours", value: "48", category: "AUTOMATION", description: "Hours of inactivity before HOT lead triggers critical alert" },
    { key: "high_value_lead_threshold", value: "15000000", category: "AUTOMATION", description: "Budget threshold (INR) for high-value management alerts" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.create({ data: s });
  }

  console.log("✅ Seeding with Automation Engine completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
