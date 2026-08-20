import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { isAdmin } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const dar = await prisma.dailyActivityReport.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            staffCode: true,
            teamName: true,
            designation: true,
            avatar: true,
          },
        },
      },
    });

    if (!dar) {
      return errorResponse("DAR record not found", 404);
    }

    // Permission check: only admin, team lead or owner can view
    if (!isAdmin(session) && session.roleSlug !== "TEAM_LEAD" && dar.userId !== session.id) {
      return errorResponse("Forbidden: You cannot view other members' DAR", 403);
    }

    return successResponse({ dar });
  } catch (error: any) {
    console.error("GET /api/dar/[id] error:", error);
    return errorResponse(error.message || "Failed to fetch DAR detail", 500);
  }
}
