export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const restoreSchema = z.object({
  entity: z.enum(["LEAD", "CUSTOMER", "PROJECT", "USER", "BOOKING"]),
  id: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "settings.manage")) {
      return forbiddenResponse("Only administrators can access the recycle bin.");
    }

    const [deletedLeads, deletedCustomers, deletedProjects, deletedUsers, deletedBookings] =
      await Promise.all([
        prisma.lead.findMany({
          where: { isDeleted: true },
          select: { id: true, name: true, leadCode: true, deletedAt: true, deletedBy: true, deletedReason: true },
        }),
        prisma.customer.findMany({
          where: { isDeleted: true },
          select: { id: true, name: true, customerCode: true, deletedAt: true, deletedBy: true, deletedReason: true },
        }),
        prisma.project.findMany({
          where: { isDeleted: true },
          select: { id: true, name: true, projectCode: true, deletedAt: true, deletedBy: true, deletedReason: true },
        }),
        prisma.user.findMany({
          where: { isDeleted: true },
          select: { id: true, name: true, email: true, staffCode: true, deletedAt: true, deletedBy: true, deletedReason: true },
        }),
        prisma.booking.findMany({
          where: { isDeleted: true },
          select: { id: true, bookingCode: true, totalDealValue: true, deletedAt: true, deletedBy: true, deletedReason: true },
        }),
      ]);

    const items = [
      ...deletedLeads.map((i) => ({ ...i, entity: "LEAD", displayName: `${i.name} (${i.leadCode})` })),
      ...deletedCustomers.map((i) => ({ ...i, entity: "CUSTOMER", displayName: `${i.name} (${i.customerCode})` })),
      ...deletedProjects.map((i) => ({ ...i, entity: "PROJECT", displayName: `${i.name} (${i.projectCode})` })),
      ...deletedUsers.map((i) => ({ ...i, entity: "USER", displayName: `${i.name} (${i.staffCode || i.email})` })),
      ...deletedBookings.map((i) => ({ ...i, entity: "BOOKING", displayName: `Booking ${i.bookingCode}` })),
    ];

    return successResponse(items, "Recycle bin items retrieved.");
  } catch (error) {
    console.error("GET /api/trash error:", error);
    return errorResponse("Failed to fetch trash.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "settings.manage")) {
      return forbiddenResponse("Only administrators can restore deleted records.");
    }

    const body = await req.json();
    const parsed = restoreSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const { entity, id } = parsed.data;

    if (entity === "LEAD") {
      await prisma.lead.update({
        where: { id },
        data: { isDeleted: false, deletedAt: null, deletedBy: null, deletedReason: null },
      });
    } else if (entity === "CUSTOMER") {
      await prisma.customer.update({
        where: { id },
        data: { isDeleted: false, deletedAt: null, deletedBy: null, deletedReason: null },
      });
    } else if (entity === "PROJECT") {
      await prisma.project.update({
        where: { id },
        data: { isDeleted: false, deletedAt: null, deletedBy: null, deletedReason: null },
      });
    } else if (entity === "USER") {
      await prisma.user.update({
        where: { id },
        data: { isDeleted: false, deletedAt: null, deletedBy: null, deletedReason: null, status: "ACTIVE" },
      });
    } else if (entity === "BOOKING") {
      await prisma.booking.update({
        where: { id },
        data: { isDeleted: false, deletedAt: null, deletedBy: null, deletedReason: null },
      });
    }

    await createAuditLog({
      user,
      action: "RESTORE",
      entity: entity as any,
      entityId: id,
      newValue: `Restored ${entity} record from recycle bin`,
    });

    return successResponse(null, `${entity} restored successfully.`);
  } catch (error) {
    console.error("POST /api/trash error:", error);
    return errorResponse("Failed to restore item.", 500);
  }
}
