export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, getOwnershipFilter } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createBookingSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(2, "Customer name is required").optional(),
  customerPhone: z.string().min(10, "Customer phone is required").optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  leadId: z.string().optional().nullable(),
  projectId: z.string().min(1, "Project ID is required"),
  inventoryUnitId: z.string().min(1, "Inventory Unit ID is required"),
  assignedMemberId: z.string().optional(),
  totalDealValue: z.number().min(100000, "Deal value required"),
  tokenAmountPaid: z.number().min(0).default(0),
  paymentPlan: z.string().default("Construction Linked Plan (CLP)"),
  paymentMethod: z.string().default("BANK_TRANSFER"),
  transactionRef: z.string().optional().nullable(),
  commissionPercentage: z.number().default(2.5),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "bookings.view")) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    const ownershipWhere = getOwnershipFilter(user, "assignedMemberId");
    const where: any = {
      ...ownershipWhere,
      isDeleted: false,
    };

    if (status && status !== "ALL") where.status = status;
    if (projectId && projectId !== "ALL") where.projectId = projectId;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: true,
        project: { select: { id: true, name: true, projectCode: true, location: true } },
        inventoryUnit: true,
        assignedMember: { select: { id: true, name: true, teamName: true } },
        payments: { orderBy: { paymentDate: "desc" } },
      },
      orderBy: { bookingDate: "desc" },
    });

    return successResponse(bookings, "Bookings retrieved.");
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return errorResponse("Failed to fetch bookings.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "bookings.create")) {
      return forbiddenResponse("You do not have permission to create bookings.");
    }

    const body = await req.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed.", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    // Concurrency-safe atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify inventory unit availability
      const unit = await tx.inventoryUnit.findUnique({
        where: { id: data.inventoryUnitId },
        include: { project: true },
      });

      if (!unit) {
        throw new Error("Selected inventory unit not found.");
      }

      if (unit.status === "SOLD" || unit.status === "BOOKED" || unit.status === "BLOCKED") {
        throw new Error(`Unit ${unit.unitNumber} is already ${unit.status} and cannot be booked.`);
      }

      // 2. Resolve Customer
      let customerId = data.customerId;
      if (!customerId) {
        if (!data.customerName || !data.customerPhone) {
          throw new Error("Customer name and phone are required to create a new customer record.");
        }
        // Check if customer exists by phone
        let existingCust = await tx.customer.findFirst({
          where: { phone: data.customerPhone, isDeleted: false },
        });

        if (!existingCust) {
          const custCount = await tx.customer.count();
          const customerCode = `CUST-${2000 + custCount + 1}`;
          existingCust = await tx.customer.create({
            data: {
              customerCode,
              name: data.customerName,
              phone: data.customerPhone,
              email: data.customerEmail || null,
              assignedToId: data.assignedMemberId || user.id,
              createdById: user.id,
            },
          });
        }
        customerId = existingCust.id;
      }

      // 3. Update Inventory Unit to BOOKED
      await tx.inventoryUnit.update({
        where: { id: unit.id },
        data: {
          status: "BOOKED",
          lockedById: user.id,
          lockedAt: new Date(),
          version: { increment: 1 },
        },
      });

      // 4. Generate unique Booking Code
      const bookingCount = await tx.booking.count();
      const bookingCode = `BK-${5000 + bookingCount + 1}`;

      const commissionAmount = (data.totalDealValue * data.commissionPercentage) / 100;
      const balanceAmount = data.totalDealValue - data.tokenAmountPaid;

      // 5. Create Booking Record
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          customerId,
          leadId: data.leadId || null,
          projectId: data.projectId,
          inventoryUnitId: unit.id,
          assignedMemberId: data.assignedMemberId || user.id,
          createdById: user.id,
          status: data.tokenAmountPaid > 0 ? "TOKEN_PAID" : "REQUESTED",
          totalDealValue: data.totalDealValue,
          tokenAmountPaid: data.tokenAmountPaid,
          balanceAmount,
          paymentPlan: data.paymentPlan,
          commissionPercentage: data.commissionPercentage,
          commissionAmount,
        },
        include: {
          customer: true,
          project: true,
          inventoryUnit: true,
          assignedMember: { select: { id: true, name: true } },
        },
      });

      // 6. Record Initial Token Payment if amount paid > 0
      if (data.tokenAmountPaid > 0) {
        const paymentCount = await tx.payment.count();
        const paymentNumber = `RCPT-${1000 + paymentCount + 1}`;

        await tx.payment.create({
          data: {
            paymentNumber,
            bookingId: newBooking.id,
            amount: data.tokenAmountPaid,
            paymentMethod: data.paymentMethod,
            transactionRef: data.transactionRef || "TOKEN-INITIAL",
            paymentStage: "TOKEN",
            status: "CLEARED",
            remarks: `Initial token payment of ₹${data.tokenAmountPaid.toLocaleString("en-IN")}`,
            createdById: user.id,
          },
        });
      }

      // 7. If linked to a lead, update lead to BOOKED
      if (data.leadId) {
        await tx.lead.update({
          where: { id: data.leadId },
          data: {
            status: "BOOKED",
            stage: "PROSPECT",
            priority: "HOT",
            latestRemarks: `Unit ${unit.unitNumber} booked. Booking Code: ${bookingCode}`,
          },
        });

        await tx.leadActivity.create({
          data: {
            leadId: data.leadId,
            userId: user.id,
            type: "BOOKING_CREATED",
            title: `Deal Closed! Unit ${unit.unitNumber} Booked`,
            description: `Total Deal Value: ₹${data.totalDealValue.toLocaleString("en-IN")}, Token: ₹${data.tokenAmountPaid.toLocaleString("en-IN")}`,
          },
        });
      }

      return newBooking;
    });

    // Record Audit Log
    await createAuditLog({
      user,
      action: "CREATE",
      entity: "BOOKING",
      entityId: result.id,
      entityCode: result.bookingCode,
      newValue: `Booked Unit ${result.inventoryUnit.unitNumber} in ${result.project.name} for deal value of ₹${result.totalDealValue}`,
    });

    return successResponse(result, "Booking created and unit reserved successfully.", undefined, 201);
  } catch (error: any) {
    console.error("POST /api/bookings error:", error);
    return errorResponse(error.message || "Failed to create booking.", 400);
  }
}
