export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, getOwnershipFilter } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createCustomerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  phone: z.string().min(10, "Phone number is required"),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  panNumber: z.string().optional(),
  aadharNumber: z.string().optional(),
  currentAddress: z.string().optional(),
  city: z.string().default("Noida"),
  state: z.string().default("Uttar Pradesh"),
  pincode: z.string().optional(),
  occupation: z.string().optional(),
  annualIncome: z.number().optional(),
  assignedToId: z.string().optional(),
  propertyTypeRequirement: z.string().optional(),
  budgetMinRequirement: z.number().optional(),
  budgetMaxRequirement: z.number().optional(),
  preferredLocationRequirement: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "customers.view")) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const ownershipWhere = getOwnershipFilter(user, "assignedToId");
    const where: any = {
      ...ownershipWhere,
      isDeleted: false,
    };

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { customerCode: { contains: q } },
        { city: { contains: q } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        requirements: true,
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return successResponse(customers, "Customers retrieved.");
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return errorResponse("Failed to fetch customers.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "customers.manage")) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    // Check duplicate phone
    const existing = await prisma.customer.findFirst({
      where: { phone: data.phone, isDeleted: false },
    });
    if (existing) {
      return errorResponse(`Customer with phone ${data.phone} already exists (${existing.name} - ${existing.customerCode}).`, 409);
    }

    const count = await prisma.customer.count();
    const customerCode = `CUST-${2000 + count + 1}`;

    const customer = await prisma.customer.create({
      data: {
        customerCode,
        name: data.name,
        phone: data.phone,
        whatsapp: data.whatsapp || data.phone,
        email: data.email || null,
        panNumber: data.panNumber,
        aadharNumber: data.aadharNumber,
        currentAddress: data.currentAddress,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        occupation: data.occupation,
        annualIncome: data.annualIncome,
        assignedToId: data.assignedToId || user.id,
        createdById: user.id,
        requirements: {
          create: {
            propertyType: data.propertyTypeRequirement || "RESIDENTIAL_APARTMENT",
            budgetMin: data.budgetMinRequirement || 0,
            budgetMax: data.budgetMaxRequirement || 0,
            preferredLocation: data.preferredLocationRequirement || data.city,
          },
        },
      },
      include: {
        requirements: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      user,
      action: "CREATE",
      entity: "USER", // Customer mapped to user/lead
      entityId: customer.id,
      entityCode: customer.customerCode,
      newValue: `Created customer profile for ${customer.name} (${customer.customerCode})`,
    });

    return successResponse(customer, "Customer profile created.", undefined, 201);
  } catch (error) {
    console.error("POST /api/customers error:", error);
    return errorResponse("Failed to create customer.", 500);
  }
}
