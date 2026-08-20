import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    return successResponse(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return errorResponse("Failed to fetch settings.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "settings.manage")) {
      return forbiddenResponse("Only administrators can update system settings.");
    }

    const body = await req.json();
    const { key, value, category, description } = body;

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value, category, description },
      create: { key, value, category, description },
    });

    await createAuditLog({
      user,
      action: "UPDATE",
      entity: "SETTING",
      fieldChanged: key,
      newValue: value,
    });

    return successResponse(setting, "Setting updated successfully.");
  } catch (error) {
    console.error("POST /api/settings error:", error);
    return errorResponse("Failed to update settings.", 500);
  }
}
