export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { executeSafeLeadReassignment } from "@/lib/automation/reassignment-engine";
import { hasPermission } from "@/lib/rbac";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return errorResponse("Unauthorized", 401);

    if (!hasPermission(session, "leads.assign")) {
      return errorResponse("Forbidden: Reassignment requires team lead or admin permission", 403);
    }

    const leadId = params.id;
    const body = await req.json().catch(() => ({}));
    const { reason = "Manual reassignment via Lead 360" } = body;

    const result = await executeSafeLeadReassignment({
      leadId,
      reason,
      actor: {
        id: session.id,
        name: session.name,
        roleSlug: session.roleSlug,
      },
    });

    if (!result.success) {
      return errorResponse(result.reason || "Failed to reassign lead", 400);
    }

    return successResponse(result, `Lead reassigned from ${result.previousAgentName} to ${result.newAgentName}`);
  } catch (error: any) {
    console.error("POST /api/leads/[id]/reassign error:", error);
    return errorResponse(error.message, 500);
  }
}
