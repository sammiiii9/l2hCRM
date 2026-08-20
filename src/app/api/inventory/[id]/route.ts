import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateUnitSchema = z.object({
  status: z.enum(["AVAILABLE", "HOLD", "BOOKED", "SOLD", "BLOCKED"]).optional(),
  basePrice: z.number().optional(),
  plcCharges: z.number().optional(),
  parkingCharges: z.number().optional(),
  floorRiseCharges: z.number().optional(),
  facing: z.string().optional().nullable(),
  view: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const unit = await prisma.inventoryUnit.findUnique({
      where: { id: params.id },
      include: {
        project: true,
        bookings: {
          include: { customer: true, assignedMember: true },
          where: { isDeleted: false },
        },
      },
    });

    if (!unit) return notFoundResponse("Unit not found.");

    return successResponse(unit);
  } catch (error) {
    console.error("GET /api/inventory/[id] error:", error);
    return errorResponse("Failed to fetch unit.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "inventory.manage")) {
      return forbiddenResponse("Only administrators can modify inventory.");
    }

    const body = await req.json();
    const parsed = updateUnitSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const existingUnit = await prisma.inventoryUnit.findUnique({
      where: { id: params.id },
      include: { project: true },
    });

    if (!existingUnit) return notFoundResponse("Unit not found.");

    const data = parsed.data;
    const basePrice = data.basePrice ?? existingUnit.basePrice;
    const plcCharges = data.plcCharges ?? existingUnit.plcCharges;
    const parkingCharges = data.parkingCharges ?? existingUnit.parkingCharges;
    const floorRiseCharges = data.floorRiseCharges ?? existingUnit.floorRiseCharges;
    const totalCalculatedPrice = basePrice + plcCharges + parkingCharges + floorRiseCharges;

    const updated = await prisma.inventoryUnit.update({
      where: { id: params.id },
      data: {
        ...data,
        totalCalculatedPrice,
      },
    });

    await createAuditLog({
      user,
      action: "UPDATE",
      entity: "INVENTORY",
      entityId: updated.id,
      entityCode: updated.unitNumber,
      fieldChanged: Object.keys(data).join(", "),
      oldValue: { status: existingUnit.status, price: existingUnit.totalCalculatedPrice },
      newValue: { status: updated.status, price: updated.totalCalculatedPrice },
    });

    return successResponse(updated, "Unit updated successfully.");
  } catch (error) {
    console.error("PATCH /api/inventory/[id] error:", error);
    return errorResponse("Failed to update unit.", 500);
  }
}
