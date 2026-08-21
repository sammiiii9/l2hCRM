export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getDailyAgentBriefing } from "@/lib/automation/daily-briefing";
import { isAdmin } from "@/lib/rbac";
import { getOrSetCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const viewAll = searchParams.get("viewAll") === "true" && isAdmin(session);

    const briefing = await getOrSetCache(`briefing:${session.id}:${viewAll}`, 30000, async () => {
      return getDailyAgentBriefing(session.id, viewAll);
    });

    return successResponse(briefing);
  } catch (error: any) {
    console.error("GET /api/automation/briefing error:", error);
    return errorResponse(error.message, 500);
  }
}
