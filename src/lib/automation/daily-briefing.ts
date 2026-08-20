import { prisma } from "../prisma";

export interface PrioritizedLeadAction {
  leadId: string;
  leadCode: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  budget: string | null;
  preferredLocation: string | null;
  configuration: string | null;
  stage: string;
  status: string;
  leadScore: number;
  scoreCategory: "HOT" | "WARM" | "COLD";
  priorityRankScore: number;
  rankReason: string;
  recommendedAction: string;
  recommendedActionType: "CALL" | "WHATSAPP" | "FOLLOWUP" | "SITE_VISIT" | "NOTE";
  followUpStatus: "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "NONE";
  followUpDate: Date | null;
  followUpId: string | null;
  lastContactedAt: Date | null;
  latestRemarks: string | null;
}

export interface DailyBriefingSummary {
  hotLeadsCount: number;
  callsTargetCount: number;
  callsLoggedToday: number;
  followUpsDueToday: number;
  overdueFollowUpsCount: number;
  upcomingSiteVisitsCount: number;
  activeOpportunitiesCount: number;
  topPriorities: PrioritizedLeadAction[];
}

/**
 * Computes the Daily Agent Briefing and prioritized "What Should I Do Next?" action queue.
 */
export async function getDailyAgentBriefing(userId: string, isAllLeads: boolean = false): Promise<DailyBriefingSummary> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Fetch leads assigned to user (or all if admin viewing team briefing)
  const whereClause: any = { isDeleted: false };
  if (!isAllLeads) {
    whereClause.assignedToId = userId;
  }

  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: {
      followUps: {
        where: { status: "PENDING" },
        orderBy: { scheduledAt: "asc" },
      },
      callLogs: {
        orderBy: { callDate: "desc" },
        take: 3,
      },
      siteVisits: {
        orderBy: { scheduledDate: "desc" },
      },
    },
  });

  // Today's calls logged by this user
  const callsToday = await prisma.callLog.count({
    where: {
      userId,
      callDate: { gte: startOfDay, lte: endOfDay },
    },
  });

  // Calculate Priority Actions for each lead
  const prioritizedList: PrioritizedLeadAction[] = [];
  let hotLeadsCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let siteVisitsCount = 0;
  let activeOpportunities = 0;

  for (const lead of leads) {
    if (lead.leadScore >= 70 || lead.priority === "HOT") hotLeadsCount++;
    if (["QUALIFIED", "SITE_VISIT_SCHEDULED", "SITE_VISIT_DONE", "NEGOTIATION"].includes(lead.status)) {
      activeOpportunities++;
    }

    const pendingFollowUp = lead.followUps[0];
    let urgencyScore = 0;
    let followUpStatus: "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "NONE" = "NONE";
    let rankReason = "";
    let recommendedAction = "Review Lead Profile";
    let recommendedActionType: "CALL" | "WHATSAPP" | "FOLLOWUP" | "SITE_VISIT" | "NOTE" = "CALL";

    if (pendingFollowUp) {
      if (pendingFollowUp.scheduledAt < now) {
        // OVERDUE
        overdueCount++;
        followUpStatus = "OVERDUE";
        const overdueHours = (now.getTime() - pendingFollowUp.scheduledAt.getTime()) / 3600000;
        urgencyScore = Math.min(100, 70 + overdueHours * 2);
        rankReason = `⚠️ Follow-up overdue by ${Math.round(overdueHours / 24) || 1} day(s)`;
        recommendedAction = "Call now to resolve overdue follow-up";
        recommendedActionType = "CALL";
      } else if (pendingFollowUp.scheduledAt <= endOfDay) {
        // DUE TODAY
        dueTodayCount++;
        followUpStatus = "DUE_TODAY";
        urgencyScore = 80;
        rankReason = `⏰ Due today at ${pendingFollowUp.scheduledAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
        recommendedAction = "Follow up with client as scheduled";
        recommendedActionType = "CALL";
      } else {
        followUpStatus = "UPCOMING";
        urgencyScore = 40;
        rankReason = `📅 Scheduled for ${pendingFollowUp.scheduledAt.toLocaleDateString("en-IN")}`;
        recommendedAction = "Review requirement & prepare proposal";
        recommendedActionType = "NOTE";
      }
    } else {
      // No active follow-up
      const hasCompletedVisit = lead.siteVisits.some((v) => v.status === "COMPLETED");
      if (hasCompletedVisit) {
        urgencyScore = 85;
        rankReason = "📍 Site visit completed with no follow-up scheduled";
        recommendedAction = "Follow up today to discuss site visit feedback";
        recommendedActionType = "CALL";
      } else if (lead.status === "NEW") {
        urgencyScore = 75;
        rankReason = "🚀 Fresh lead awaiting first contact";
        recommendedAction = "Make first discovery call";
        recommendedActionType = "CALL";
      } else {
        urgencyScore = 30;
        rankReason = "Nurture lead";
        recommendedAction = "Share new inventory options on WhatsApp";
        recommendedActionType = "WHATSAPP";
      }
    }

    const scheduledVisit = lead.siteVisits.find((v) => v.status === "SCHEDULED" && v.scheduledDate >= startOfDay);
    if (scheduledVisit) {
      siteVisitsCount++;
      if (scheduledVisit.scheduledDate <= endOfDay) {
        urgencyScore = 95;
        rankReason = `🏠 Site visit scheduled for TODAY at ${scheduledVisit.scheduledDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
        recommendedAction = "Coordinate site arrival & golf cart tour";
        recommendedActionType = "SITE_VISIT";
      }
    }

    // Engagement Recency (0 - 100)
    let recencyScore = 50;
    if (lead.lastContactedAt) {
      const hoursSince = (now.getTime() - lead.lastContactedAt.getTime()) / 3600000;
      if (hoursSince < 24) recencyScore = 90;
      else if (hoursSince < 72) recencyScore = 70;
      else if (hoursSince < 168) recencyScore = 50;
      else recencyScore = 30;
    }

    // Budget Score (0 - 100)
    let budgetScore = 50;
    if (lead.budgetMax && lead.budgetMax >= 20000000) budgetScore = 100;
    else if (lead.budgetMax && lead.budgetMax >= 10000000) budgetScore = 80;
    else if (lead.budgetMax && lead.budgetMax >= 5000000) budgetScore = 60;

    // Final Weighted Priority Formula
    const priorityRankScore = Math.round(
      lead.leadScore * 0.35 +
      urgencyScore * 0.30 +
      recencyScore * 0.20 +
      budgetScore * 0.15
    );

    const scoreCategory: "HOT" | "WARM" | "COLD" =
      lead.leadScore >= 70 ? "HOT" : lead.leadScore >= 40 ? "WARM" : "COLD";

    prioritizedList.push({
      leadId: lead.id,
      leadCode: lead.leadCode,
      name: lead.name,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      email: lead.email,
      budget: lead.budget,
      preferredLocation: lead.preferredLocation,
      configuration: lead.configuration,
      stage: lead.stage,
      status: lead.status,
      leadScore: lead.leadScore,
      scoreCategory,
      priorityRankScore,
      rankReason,
      recommendedAction,
      recommendedActionType,
      followUpStatus,
      followUpDate: pendingFollowUp?.scheduledAt || null,
      followUpId: pendingFollowUp?.id || null,
      lastContactedAt: lead.lastContactedAt,
      latestRemarks: lead.latestRemarks,
    });
  }

  // Sort by Priority Rank Score descending
  prioritizedList.sort((a, b) => b.priorityRankScore - a.priorityRankScore);

  return {
    hotLeadsCount,
    callsTargetCount: 50,
    callsLoggedToday: callsToday,
    followUpsDueToday: dueTodayCount,
    overdueFollowUpsCount: overdueCount,
    upcomingSiteVisitsCount: siteVisitsCount,
    activeOpportunitiesCount: activeOpportunities,
    topPriorities: prioritizedList.slice(0, 15), // Top 15 prioritized actions
  };
}

export const generateDailyBriefing = getDailyAgentBriefing;
