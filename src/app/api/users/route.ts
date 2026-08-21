export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2, "Full name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Phone number required"),
  staffCode: z.string().min(2, "Staff code required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string().min(1, "Role is required"),
  teamName: z.string().default("Team Alpha"),
  designation: z.string().default("Associate"),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "users.view")) {
      return forbiddenResponse("Only administrators can view staff members.");
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const where: any = { isDeleted: false };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { staffCode: { contains: q } },
        { teamName: { contains: q } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        staffCode: true,
        role: { select: { id: true, name: true, slug: true } },
        status: true,
        teamName: true,
        designation: true,
        dateOfJoining: true,
        teamLeadName: true,
        authProvider: true,
        approvalNotes: true,
        approvedAt: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: { assignedLeads: true, assignedBookings: true, callLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(users, "Users retrieved.");
  } catch (error) {
    console.error("GET /api/users error:", error);
    return errorResponse("Failed to fetch users.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "users.manage")) {
      return forbiddenResponse("Only administrators can create staff accounts.");
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    // Check unique email, phone, staffCode
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }, { staffCode: data.staffCode }],
        isDeleted: false,
      },
    });

    if (existing) {
      return errorResponse("A user with this email, phone, or staff code already exists.", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        staffCode: data.staffCode,
        passwordHash,
        roleId: data.roleId,
        teamName: data.teamName,
        designation: data.designation,
        status: data.status,
      },
      include: { role: true },
    });

    await createAuditLog({
      user,
      action: "CREATE",
      entity: "USER",
      entityId: newUser.id,
      entityCode: newUser.staffCode || newUser.email,
      newValue: `Created staff member ${newUser.name} with role ${newUser.role.name}`,
    });

    return successResponse(
      {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        staffCode: newUser.staffCode,
        role: newUser.role,
        teamName: newUser.teamName,
        designation: newUser.designation,
        status: newUser.status,
      },
      "Staff account created successfully.",
      undefined,
      201
    );
  } catch (error) {
    console.error("POST /api/users error:", error);
    return errorResponse("Failed to create user.", 500);
  }
}
