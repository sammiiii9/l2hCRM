import { prisma } from "../prisma";

export interface ScoreBreakdown {
  budgetFit: number;
  timeline: number;
  engagement: number;
  completeness: number;
  siteVisit: number;
  projectInterest: number;
  total: number;
  category: "HOT" | "WARM" | "COLD";
  reasons: string[];
}

/**
 * Calculates a transparent, explainable lead score for any lead record.
 */
export async function calculateLeadScore(leadId: string): Promise<ScoreBreakdown> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      callLogs: true,
      siteVisits: true,
      projectInterest: true,
      followUps: true,
    },
  });

  if (!lead) {
    throw new Error(`Lead not found with id: ${leadId}`);
  }

  let budgetFit = 0;
  let timeline = 0;
  let engagement = 0;
  let completeness = 0;
  let siteVisit = 0;
  let projectInterest = 0;
  const reasons: string[] = [];

  // 1. Budget Fit (Max 20 pts)
  const maxBudget = lead.budgetMax || (lead.budget ? extractBudgetNumber(lead.budget) : 0);
  if (maxBudget >= 20000000) {
    budgetFit = 20;
    reasons.push("+20 High-ticket budget fit (₹2.0 Cr+)");
  } else if (maxBudget >= 10000000) {
    budgetFit = 18;
    reasons.push("+18 Premium budget fit (₹1.0 Cr - ₹2.0 Cr)");
  } else if (maxBudget >= 5000000) {
    budgetFit = 15;
    reasons.push("+15 Mid-segment budget fit (₹50 L - ₹1.0 Cr)");
  } else if (maxBudget > 0) {
    budgetFit = 10;
    reasons.push("+10 Budget recorded (< ₹50 L)");
  } else {
    budgetFit = 5;
    reasons.push("+5 Basic requirement noted");
  }

  // 2. Timeline (Max 20 pts)
  const tl = lead.buyingTimeline || "0_3_MONTHS";
  if (tl === "IMMEDIATE") {
    timeline = 20;
    reasons.push("+20 Immediate buying timeline (< 30 days)");
  } else if (tl === "0_3_MONTHS") {
    timeline = 15;
    reasons.push("+15 Buying within 3 months");
  } else if (tl === "3_6_MONTHS") {
    timeline = 10;
    reasons.push("+10 Buying within 3–6 months");
  } else if (tl === "6_12_MONTHS") {
    timeline = 5;
    reasons.push("+5 Long term buyer (6–12 months)");
  } else {
    timeline = 0;
  }

  // 3. Engagement (Max 20 pts)
  const connectedCalls = lead.callLogs.filter((c) =>
    ["CONNECTED", "INTERESTED", "QUALIFIED", "SITE_VISIT_AGREED", "CONNECTED_INTERESTED"].includes(c.outcome)
  );
  if (connectedCalls.length > 0) {
    const callPoints = Math.min(connectedCalls.length * 5, 12);
    engagement += callPoints;
    reasons.push(`+${callPoints} Connected on ${connectedCalls.length} call(s)`);
  }

  const highIntentCalls = lead.callLogs.filter((c) =>
    ["INTERESTED", "QUALIFIED", "SITE_VISIT_AGREED", "CONNECTED_INTERESTED"].includes(c.outcome)
  );
  if (highIntentCalls.length > 0) {
    engagement += 5;
    reasons.push("+5 High interest indicated on calling floor");
  }

  if (lead.whatsapp) {
    engagement += 3;
    reasons.push("+3 WhatsApp communication active");
  }

  if (lead.engagementScore && lead.engagementScore > 0) {
    engagement = Math.max(engagement, Math.min(lead.engagementScore, 20));
  }
  engagement = Math.min(engagement, 20);

  // 4. Requirement Completeness (Max 15 pts)
  let compPoints = 0;
  if (lead.budget || lead.budgetMax) compPoints += 3;
  if (lead.preferredLocation) compPoints += 3;
  if (lead.configuration) compPoints += 3;
  if (lead.propertyType) compPoints += 3;
  if (lead.purpose) compPoints += 3;
  completeness = Math.min(compPoints, 15);
  if (completeness >= 12) {
    reasons.push(`+${completeness} Comprehensive buyer profile (Location, BHK, Budget, Purpose)`);
  } else if (completeness > 0) {
    reasons.push(`+${completeness} Partial buyer profile details recorded`);
  }

  // 5. Site Visit (Max 20 pts)
  const completedVisits = lead.siteVisits.filter((v) => v.status === "COMPLETED");
  const scheduledVisits = lead.siteVisits.filter((v) => v.status === "SCHEDULED");

  if (completedVisits.length > 0) {
    siteVisit = 20;
    reasons.push("+20 Site visit completed");
  } else if (scheduledVisits.length > 0) {
    siteVisit = 10;
    reasons.push("+10 Site visit scheduled");
  }

  // 6. Project Interest (Max 15 pts)
  if (lead.projectInterestId && lead.projectInterest) {
    projectInterest = 15;
    reasons.push(`+15 Explicit interest in ${lead.projectInterest.name}`);
  }

  const total = Math.min(
    100,
    budgetFit + timeline + engagement + completeness + siteVisit + projectInterest
  );

  const category: "HOT" | "WARM" | "COLD" =
    total >= 70 ? "HOT" : total >= 40 ? "WARM" : "COLD";

  return {
    budgetFit,
    timeline,
    engagement,
    completeness,
    siteVisit,
    projectInterest,
    total,
    category,
    reasons,
  };
}

/**
 * Manually logs a score change to the history table.
 */
export async function recordLeadScoreChange(params: {
  leadId: string;
  oldScore: number;
  newScore: number;
  breakdown: ScoreBreakdown;
  reason: string;
}) {
  const { leadId, oldScore, newScore, breakdown, reason } = params;

  return await prisma.leadScoreHistory.create({
    data: {
      leadId,
      oldScore,
      newScore,
      category: breakdown.category,
      reason,
      breakdown: JSON.stringify(breakdown),
    },
  });
}

/**
 * Recalculates lead score, updates Lead record, and saves history if changed.
 */
export async function updateLeadScoreAndHistory(
  leadId: string,
  reason: string = "Automated score recalculation"
): Promise<ScoreBreakdown> {
  const currentLead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, leadScore: true, priority: true },
  });

  if (!currentLead) {
    throw new Error(`Lead not found with id: ${leadId}`);
  }

  const breakdown = await calculateLeadScore(leadId);
  const oldScore = currentLead.leadScore;
  const newScore = breakdown.total;

  // Update lead with new score, breakdown JSON, and priority tag
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: newScore,
      priority: breakdown.category,
      scoreBreakdown: JSON.stringify(breakdown),
    },
  });

  // Record history if score changed or if no history exists yet
  if (oldScore !== newScore) {
    await recordLeadScoreChange({
      leadId,
      oldScore,
      newScore,
      breakdown,
      reason: `${reason} (${oldScore} → ${newScore})`,
    });

    // Also log automated lead activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: "SCORE_UPDATED",
        title: `🤖 Lead Score updated: ${oldScore} → ${newScore} (${breakdown.category})`,
        description: breakdown.reasons.join(", "),
        isAutomated: true,
      },
    });
  }

  return breakdown;
}

function extractBudgetNumber(budgetStr: string): number {
  const clean = budgetStr.toLowerCase().replace(/,/g, "");
  const crMatch = clean.match(/([\d.]+)\s*(cr|crore)/);
  if (crMatch) {
    return parseFloat(crMatch[1]) * 10000000;
  }
  const lakhMatch = clean.match(/([\d.]+)\s*(l|lakh|lac)/);
  if (lakhMatch) {
    return parseFloat(lakhMatch[1]) * 100000;
  }
  const numMatch = clean.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  return 0;
}
