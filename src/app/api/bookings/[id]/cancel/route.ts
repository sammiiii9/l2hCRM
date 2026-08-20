import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const cancelSchema = z.object({
  cancellationReason: z.string().min(3, "Cancellation reason is required"),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "bookings.manage")) {
      return forbiddenResponse("Only managers can cancel bookings.");
    }

    const body = await req.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const { cancellationReason } = parsed.data;

    // Concurrency-safe atomic cancellation
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: params.id },
        include: { inventoryUnit: true, project: true, lead: true },
      });

      if (!booking) {
        throw new Error("Booking not found.");
      }

      if (booking.status === "CANCELLED") {
        throw new Error("Booking is already cancelled.");
      }

      // 1. Release Inventory Unit back to AVAILABLE
      await tx.inventoryUnit.update({
        where: { id: booking.inventoryUnitId },
        data: {
          status: "AVAILABLE",
          lockedById: null,
          lockedAt: null,
          version: { increment: 1 },
        },
      });

      // 2. Update Booking record
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason,
        },
      });

      // 3. If linked to lead, record activity
      if (booking.leadId) {
        await tx.leadActivity.create({
          data: {
            leadId: booking.leadId,
            userId: user.id,
            type: "STATUS_CHANGE",
            title: `Booking ${booking.bookingCode} Cancelled`,
            description: `Unit ${booking.inventoryUnit.unitNumber} released back to inventory. Reason: ${cancellationReason}`,
          },
        });
      }

      return { booking: updatedBooking, unitNumber: booking.inventoryUnit.unitNumber, projectName: booking.project.name };
    });

    await createAuditLog({
      user,
      action: "UPDATE",
      entity: "BOOKING",
      entityId: result.booking.id,
      entityCode: result.booking.bookingCode,
      fieldChanged: "status",
      oldValue: "CONFIRMED / TOKEN_PAID",
      newValue: "CANCELLED",
      metadata: { reason: cancellationReason, unitReleased: result.unitNumber },
    });

    return successResponse(result.booking, `Booking cancelled and Unit ${result.unitNumber} returned to Available status.`);
  } catch (error: any) {
    console.error("POST /api/bookings/[id]/cancel error:", error);
    return errorResponse(error.message || "Failed to cancel booking.", 400);
  }
}
