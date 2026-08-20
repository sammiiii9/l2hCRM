import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { isAdmin } from "@/lib/rbac";
import {
  upsertDailyActivityReport,
  listDailyActivityReports,
  getTodayISTDateString,
  validateDarInput,
} from "@/lib/dar";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return errorResponse("Unauthorized: Please sign in to submit DAR", 401);
    }

    const body = await req.json();

    const validation = validateDarInput(body);
    if (!validation.isValid) {
      return errorResponse(validation.errors.join("; "), 400);
    }

    const result = await upsertDailyActivityReport({
      user: session,
      calls: body.calls,
      talkTimeMinutes: body.talkTimeMinutes,
      prospects: body.prospects,
      suspects: body.suspects,
      meetings: body.meetings,
      visits: body.visits,
      callyzerScreenshot: body.callyzerScreenshot,
      callyzerFileName: body.callyzerFileName,
      callyzerFileSize: body.callyzerFileSize,
      remarks: body.remarks,
    });

    return successResponse(result, "DAR submitted successfully", undefined, 201);
  } catch (error: any) {
    console.error("POST /api/dar error:", error);
    return errorResponse(error.message || "Failed to submit DAR", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const dateString = searchParams.get("date") || getTodayISTDateString();
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const teamName = searchParams.get("team") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let requestedUserId = searchParams.get("userId") || undefined;

    // Normal associates can only view their own DARs
    if (!isAdmin(session) && session.roleSlug !== "TEAM_LEAD") {
      requestedUserId = session.id;
    }

    const result = await listDailyActivityReports({
      dateString: startDate || endDate ? undefined : dateString,
      startDate,
      endDate,
      userId: requestedUserId,
      teamName,
      status,
      page,
      limit,
    });

    return successResponse(result);
  } catch (error: any) {
    console.error("GET /api/dar error:", error);
    return errorResponse(error.message || "Failed to list DAR reports", 500);
  }
}
