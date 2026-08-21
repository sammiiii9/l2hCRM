export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { hasPermission } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const severity = searchParams.get("severity");
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "OPEN";

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (severity && severity !== "ALL") where.severity = severity;
    if (category && category !== "ALL") where.category = category;

    const alerts = await prisma.adminAlert.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        { severity: "asc" }, // CRITICAL first
        { createdAt: "desc" },
      ],
    });

    const counts = {
      critical: await prisma.adminAlert.count({ where: { status: "OPEN", severity: "CRITICAL" } }),
      warning: await prisma.adminAlert.count({ where: { status: "OPEN", severity: "WARNING" } }),
      info: await prisma.adminAlert.count({ where: { status: "OPEN", severity: "INFO" } }),
      totalOpen: await prisma.adminAlert.count({ where: { status: "OPEN" } }),
    };

    return successResponse({ alerts, counts });
  } catch (error: any) {
    console.error("GET /api/automation/alerts error:", error);
    return errorResponse(error.message, 500);
  }
}
