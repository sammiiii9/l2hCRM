export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getUserTodayDar, getTodayISTDateString, formatDarDisplayDate } from "@/lib/dar";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const todayDateString = getTodayISTDateString();
    const formattedDate = formatDarDisplayDate(todayDateString);
    const existingDar = await getUserTodayDar(session.id);

    return successResponse({
      todayDateString,
      formattedDate,
      isSubmitted: !!existingDar,
      dar: existingDar,
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        phone: session.phone,
        staffCode: session.staffCode,
        teamName: session.teamName,
        designation: session.designation,
        roleName: session.roleName,
      },
    });
  } catch (error: any) {
    console.error("GET /api/dar/today error:", error);
    return errorResponse(error.message || "Failed to fetch today's DAR", 500);
  }
}
