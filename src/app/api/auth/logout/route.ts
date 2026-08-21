export const dynamic = "force-dynamic";

import { getCurrentUser, AUTH_COOKIE_OPTIONS } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await createAuditLog({
      user,
      action: "LOGOUT",
      entity: "USER",
      entityId: user.id,
      entityCode: user.staffCode || user.email,
      newValue: `Logged out at ${new Date().toISOString()}`,
    });
  }

  const response = successResponse(null, "Logged out successfully.");
  response.cookies.delete(AUTH_COOKIE_OPTIONS.name);
  return response;
}
