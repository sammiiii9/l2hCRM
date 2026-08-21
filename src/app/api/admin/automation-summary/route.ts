export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { isAdmin } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return errorResponse("Unauthorized", 401);
    if (!isAdmin(session)) return errorResponse("Forbidden: Admin access required", 403);

    const [
      totalRules,
      activeRules,
      automatedFollowUps,
      totalExecutions,
      hotLeadsCount,
      warmLeadsCount,
      coldLeadsCount,
      openAlertsCritical,
      openAlertsWarning,
      openAlertsInfo,
      totalEscalations,
    ] = await Promise.all([
      prisma.automationRule.count(),
      prisma.automationRule.count({ where: { isEnabled: true } }),
      prisma.followUp.count({ where: { isAutomated: true } }),
      prisma.automationExecution.count({ where: { status: "SUCCESS" } }),
      prisma.lead.count({ where: { isDeleted: false, leadScore: { gte: 70 } } }),
      prisma.lead.count({ where: { isDeleted: false, leadScore: { gte: 40, lt: 70 } } }),
      prisma.lead.count({ where: { isDeleted: false, leadScore: { lt: 40 } } }),
      prisma.adminAlert.count({ where: { status: "OPEN", severity: "CRITICAL" } }),
      prisma.adminAlert.count({ where: { status: "OPEN", severity: "WARNING" } }),
      prisma.adminAlert.count({ where: { status: "OPEN", severity: "INFO" } }),
      prisma.escalationLog.count(),
    ]);

    return successResponse({
      rules: { total: totalRules, active: activeRules },
      executions: { total: totalExecutions, automatedFollowUps },
      leadScoring: { hot: hotLeadsCount, warm: warmLeadsCount, cold: coldLeadsCount },
      alerts: {
        critical: openAlertsCritical,
        warning: openAlertsWarning,
        info: openAlertsInfo,
        totalOpen: openAlertsCritical + openAlertsWarning + openAlertsInfo,
      },
      escalations: { total: totalEscalations },
    });
  } catch (error: any) {
    console.error("GET /api/admin/automation-summary error:", error);
    return errorResponse(error.message, 500);
  }
}
