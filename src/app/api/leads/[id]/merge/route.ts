export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { mergeLeads } from "@/lib/automation/duplicate-detector";
import { hasPermission } from "@/lib/rbac";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return errorResponse("Unauthorized", 401);

    // Check merge permission
    if (!hasPermission(session, "leads.merge") && !hasPermission(session, "leads.assign")) {
      return errorResponse("Forbidden: Lead merge requires admin or team lead authority", 403);
    }

    const primaryLeadId = params.id;
    const body = await req.json();
    const { duplicateLeadId } = body;

    if (!duplicateLeadId) {
      return errorResponse("duplicateLeadId is required", 400);
    }

    const result = await mergeLeads(primaryLeadId, duplicateLeadId, {
      id: session.id,
      name: session.name,
      roleSlug: session.roleSlug,
    });

    return successResponse(result);
  } catch (error: any) {
    console.error("POST /api/leads/[id]/merge error:", error);
    return errorResponse(error.message, 500);
  }
}
