import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "audit.view")) {
      return forbiddenResponse("Only administrators can view system audit logs.");
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");

    const where: any = {};
    if (action && action !== "ALL") where.action = action;
    if (entity && entity !== "ALL") where.entity = entity;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return successResponse(logs, "Audit logs retrieved.");
  } catch (error) {
    console.error("GET /api/audit-logs error:", error);
    return errorResponse("Failed to fetch audit logs.", 500);
  }
}
