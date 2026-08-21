export const dynamic = "force-dynamic";

import { getCurrentUser, AUTH_COOKIE_OPTIONS } from "@/lib/auth";
import { successResponse, unauthorizedResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse("No active session found.");
    }
    return successResponse({ user });
  } catch (error) {
    console.error("Auth Me error:", error);
    return errorResponse("Failed to fetch session.", 500);
  }
}
