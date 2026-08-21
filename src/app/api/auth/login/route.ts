export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, AUTH_COOKIE_OPTIONS } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(1, "Phone number, staff code or email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid login credentials.", 400, parsed.error.flatten().fieldErrors);
    }

    const { identifier, password } = parsed.data;

    // Search user by email, phone, or staffCode
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
          { staffCode: identifier },
        ],
        isDeleted: false,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return errorResponse("Invalid credentials or account does not exist.", 401);
    }

    if (user.status === "PENDING_APPROVAL") {
      return errorResponse(
        `Your registration is under review by Team Leads (Shahrukh Ali / Shahnawaz Khan). Please wait for admin approval before signing in.`,
        403,
        { status: ["PENDING_APPROVAL"] }
      );
    }

    if (user.status === "REJECTED") {
      return errorResponse(
        "Your registration was not approved. Please contact the administrator for assistance.",
        403,
        { status: ["REJECTED"] }
      );
    }

    if (user.status !== "ACTIVE") {
      return errorResponse(
        "Your account is inactive or suspended. Please contact the administrator.",
        403,
        { status: [user.status] }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return errorResponse("Invalid credentials.", 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = signToken({ userId: user.id });

    // Log audit
    await createAuditLog({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        staffCode: user.staffCode,
        roleId: user.roleId,
        roleSlug: user.role.slug,
        roleName: user.role.name,
        teamName: user.teamName,
        designation: user.designation,
        permissions: [],
      },
      action: "LOGIN",
      entity: "USER",
      entityId: user.id,
      entityCode: user.staffCode || user.email,
      newValue: `Logged in at ${new Date().toISOString()}`,
    });

    const response = successResponse(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          staffCode: user.staffCode,
          roleSlug: user.role.slug,
          roleName: user.role.name,
          teamName: user.teamName,
          designation: user.designation,
        },
      },
      "Login successful."
    );

    // Set HttpOnly cookie
    response.cookies.set(
      AUTH_COOKIE_OPTIONS.name,
      token,
      AUTH_COOKIE_OPTIONS.options
    );

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("An unexpected error occurred during login.", 500);
  }
}
