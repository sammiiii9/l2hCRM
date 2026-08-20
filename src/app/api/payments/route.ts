import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  amount: z.number().min(1, "Payment amount must be greater than 0"),
  paymentMethod: z.string().default("BANK_TRANSFER"),
  transactionRef: z.string().optional().nullable(),
  paymentStage: z.string().default("INSTALLMENT"),
  remarks: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "bookings.create")) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed.", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: data.bookingId },
      });

      if (!booking) throw new Error("Booking not found.");

      const paymentCount = await tx.payment.count();
      const paymentNumber = `RCPT-${1000 + paymentCount + 1}`;

      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          bookingId: booking.id,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          transactionRef: data.transactionRef,
          paymentStage: data.paymentStage,
          status: "CLEARED",
          remarks: data.remarks,
          createdById: user.id,
        },
      });

      // Update booking balance
      const newBalance = Math.max(0, booking.balanceAmount - data.amount);
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          balanceAmount: newBalance,
          tokenAmountPaid: booking.tokenAmountPaid + data.amount,
        },
      });

      return payment;
    });

    await createAuditLog({
      user,
      action: "CREATE",
      entity: "BOOKING",
      entityId: data.bookingId,
      newValue: `Recorded payment of ₹${data.amount} (Receipt: ${result.paymentNumber})`,
    });

    return successResponse(result, "Payment recorded successfully.", undefined, 201);
  } catch (error: any) {
    console.error("POST /api/payments error:", error);
    return errorResponse(error.message || "Failed to record payment.", 400);
  }
}
