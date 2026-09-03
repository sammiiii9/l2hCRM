export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { getOrSetCache } from "@/lib/cache";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const roles = await getOrSetCache("roles:all", 60000, async () => {
      return prisma.role.findMany({
        include: {
          permissions: {
            include: { permission: true },
          },
          _count: { select: { users: true } },
        },
      });
    });

    return successResponse(roles);
  } catch (error) {
    console.error("GET /api/roles error:", error);
    return errorResponse("Failed to fetch roles.", 500);
  }
}
