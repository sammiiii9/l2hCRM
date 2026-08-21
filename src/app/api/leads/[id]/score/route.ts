export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { calculateLeadScore, updateLeadScoreAndHistory } from "@/lib/automation/scoring-engine";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return errorResponse("Unauthorized", 401);

    const leadId = params.id;
    const { searchParams } = new URL(req.url);
    const recalculate = searchParams.get("recalculate") === "true";

    let breakdown;
    if (recalculate) {
      breakdown = await updateLeadScoreAndHistory(leadId, "Manual recalculation via Lead 360");
    } else {
      breakdown = await calculateLeadScore(leadId);
    }

    const history = await prisma.leadScoreHistory.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return successResponse({ breakdown, history });
  } catch (error: any) {
    console.error("GET /api/leads/[id]/score error:", error);
    return errorResponse(error.message, 500);
  }
}
