import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { detectDuplicateLeads } from "@/lib/automation/duplicate-detector";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const { phone, whatsapp, email, name, preferredLocation, excludeLeadId } = body;

    const duplicates = await detectDuplicateLeads({
      phone,
      whatsapp,
      email,
      name,
      preferredLocation,
      excludeLeadId,
    });

    return successResponse({
      hasDuplicates: duplicates.length > 0,
      count: duplicates.length,
      duplicates,
    });
  } catch (error: any) {
    console.error("POST /api/leads/check-duplicate error:", error);
    return errorResponse(error.message, 500);
  }
}
