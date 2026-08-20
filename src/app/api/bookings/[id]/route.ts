import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateBookingSchema = z.object({
  status: z.enum([
    "REQUESTED",
    "TOKEN_PAID",
    "CONFIRMED",
    "DOCUMENTATION",
    "PAYMENT_IN_PROGRESS",
    "REGISTERED",
    "COMPLETED",
    "CANCELLED",
  ]).optional(),
  paymentPlan: z.string().optional(),
  commissionPercentage: z.number().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const booking = await prisma.booking.findUnique({
      where: { id: params.id, isDeleted: false },
      include: {
        customer: true,
        project: true,
        inventoryUnit: true,
        assignedMember: { select: { id: true, name: true, phone: true, teamName: true } },
        payments: { orderBy: { paymentDate: "desc" } },
      },
    });

    if (!booking) return notFoundResponse("Booking not found.");

    return successResponse(booking);
  } catch (error) {
    console.error("GET /api/bookings/[id] error:", error);
    return errorResponse("Failed to fetch booking.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "bookings.manage")) {
      return forbiddenResponse("Only managers can update booking statuses.");
    }

    const body = await req.json();
    const parsed = updateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const existingBooking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { inventoryUnit: true },
    });

    if (!existingBooking) return notFoundResponse("Booking not found.");

    const data = parsed.data;
    let commissionAmount = existingBooking.commissionAmount;
    if (data.commissionPercentage) {
      commissionAmount = (existingBooking.totalDealValue * data.commissionPercentage) / 100;
    }

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: {
        ...data,
        commissionAmount,
      },
    });

    await createAuditLog({
      user,
      action: "UPDATE",
      entity: "BOOKING",
      entityId: updated.id,
      entityCode: updated.bookingCode,
      fieldChanged: "status",
      oldValue: existingBooking.status,
      newValue: updated.status,
    });

    return successResponse(updated, "Booking updated successfully.");
  } catch (error) {
    console.error("PATCH /api/bookings/[id] error:", error);
    return errorResponse("Failed to update booking.", 500);
  }
}
