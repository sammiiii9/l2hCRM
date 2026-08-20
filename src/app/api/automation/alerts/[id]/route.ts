import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { resolveAdminAlert, dismissAdminAlert } from "@/lib/automation/admin-alerts";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return errorResponse("Unauthorized", 401);

    const alertId = params.id;
    const body = await req.json();
    const { action, note } = body; // action: 'RESOLVE' | 'DISMISS'

    if (action === "DISMISS") {
      const alert = await dismissAdminAlert(alertId, session.id);
      return successResponse({ alert, message: "Alert dismissed" });
    }

    const alert = await resolveAdminAlert(alertId, session.id, note);
    return successResponse({ alert, message: "Alert resolved" });
  } catch (error: any) {
    console.error("POST /api/automation/alerts/[id] error:", error);
    return errorResponse(error.message, 500);
  }
}
