export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createUnitSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  unitNumber: z.string().min(1, "Unit Number is required"),
  tower: z.string().min(1, "Tower name is required"),
  floor: z.number().min(0, "Floor number is required"),
  configuration: z.string().default("3BHK"),
  carpetArea: z.number().min(100, "Carpet area required"),
  superArea: z.number().min(100, "Super area required"),
  facing: z.string().optional().nullable(),
  view: z.string().optional().nullable(),
  basePrice: z.number().min(100000, "Base price required"),
  plcCharges: z.number().default(0),
  parkingCharges: z.number().default(300000),
  floorRiseCharges: z.number().default(0),
  status: z.enum(["AVAILABLE", "HOLD", "BOOKED", "SOLD", "BLOCKED"]).default("AVAILABLE"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "inventory.view")) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const tower = searchParams.get("tower");
    const status = searchParams.get("status");
    const configuration = searchParams.get("configuration");

    const where: any = {};
    if (projectId && projectId !== "ALL") where.projectId = projectId;
    if (tower && tower !== "ALL") where.tower = tower;
    if (status && status !== "ALL") where.status = status;
    if (configuration && configuration !== "ALL") where.configuration = configuration;

    const units = await prisma.inventoryUnit.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, projectCode: true, location: true },
        },
      },
      orderBy: [{ tower: "asc" }, { floor: "asc" }, { unitNumber: "asc" }],
    });

    // Compute summary stats
    const stats = {
      total: units.length,
      available: units.filter((u) => u.status === "AVAILABLE").length,
      hold: units.filter((u) => u.status === "HOLD").length,
      booked: units.filter((u) => u.status === "BOOKED").length,
      sold: units.filter((u) => u.status === "SOLD").length,
      blocked: units.filter((u) => u.status === "BLOCKED").length,
    };

    return successResponse(units, "Inventory retrieved.", { ...({ stats } as any) });
  } catch (error) {
    console.error("GET /api/inventory error:", error);
    return errorResponse("Failed to fetch inventory.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "inventory.manage")) {
      return forbiddenResponse("Only administrators can add inventory.");
    }

    const body = await req.json();
    const parsed = createUnitSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    // Check duplicate unit in project
    const existing = await prisma.inventoryUnit.findUnique({
      where: {
        projectId_unitNumber: {
          projectId: data.projectId,
          unitNumber: data.unitNumber,
        },
      },
    });

    if (existing) {
      return errorResponse(`Unit ${data.unitNumber} already exists in this project.`, 409);
    }

    const totalCalculatedPrice =
      data.basePrice + data.plcCharges + data.parkingCharges + data.floorRiseCharges;

    const unit = await prisma.inventoryUnit.create({
      data: {
        ...data,
        totalCalculatedPrice,
      },
      include: { project: true },
    });

    await createAuditLog({
      user,
      action: "CREATE",
      entity: "INVENTORY",
      entityId: unit.id,
      entityCode: unit.unitNumber,
      newValue: `Created Unit ${unit.unitNumber} in ${unit.project.name}`,
    });

    return successResponse(unit, "Unit created successfully.", undefined, 201);
  } catch (error) {
    console.error("POST /api/inventory error:", error);
    return errorResponse("Failed to create inventory unit.", 500);
  }
}
