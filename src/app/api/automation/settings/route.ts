export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { isAdmin } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return errorResponse("Unauthorized", 401);

    const rules = await prisma.automationRule.findMany({
      orderBy: { createdAt: "asc" },
    });

    const settings = await prisma.systemSetting.findMany({
      where: { category: "AUTOMATION" },
    });

    return successResponse({ rules, settings });
  } catch (error: any) {
    console.error("GET /api/automation/settings error:", error);
    return errorResponse(error.message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return errorResponse("Unauthorized", 401);
    if (!isAdmin(session)) return errorResponse("Forbidden: Admin access required", 403);

    const body = await req.json();
    const { ruleId, isEnabled, actionPayload, settingKey, settingValue } = body;

    if (ruleId) {
      const updatedRule = await prisma.automationRule.update({
        where: { id: ruleId },
        data: {
          isEnabled: isEnabled !== undefined ? isEnabled : undefined,
          actionPayload: actionPayload ? JSON.stringify(actionPayload) : undefined,
        },
      });

      await createAuditLog({
        user: session,
        action: "UPDATE",
        entity: "SETTING",
        entityId: ruleId,
        fieldChanged: "RULE_CONFIG",
        newValue: JSON.stringify({ isEnabled, actionPayload }),
      });

      return successResponse({ rule: updatedRule, message: "Rule updated successfully" });
    }

    if (settingKey && settingValue !== undefined) {
      const updatedSetting = await prisma.systemSetting.upsert({
        where: { key: settingKey },
        create: {
          key: settingKey,
          value: String(settingValue),
          category: "AUTOMATION",
        },
        update: {
          value: String(settingValue),
        },
      });

      return successResponse({ setting: updatedSetting, message: "Setting updated" });
    }

    return errorResponse("Invalid payload", 400);
  } catch (error: any) {
    console.error("PATCH /api/automation/settings error:", error);
    return errorResponse(error.message, 500);
  }
}
