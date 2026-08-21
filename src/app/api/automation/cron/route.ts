export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { runPeriodicAutomations } from "@/lib/automation/scheduler";

export async function POST(req: NextRequest) {
  try {
    const result = await runPeriodicAutomations();
    return successResponse(result);
  } catch (error: any) {
    console.error("POST /api/automation/cron error:", error);
    return errorResponse(error.message, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const result = await runPeriodicAutomations();
    return successResponse(result);
  } catch (error: any) {
    console.error("GET /api/automation/cron error:", error);
    return errorResponse(error.message, 500);
  }
}
