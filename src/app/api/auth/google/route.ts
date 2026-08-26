export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, AUTH_COOKIE_OPTIONS } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const googleAuthSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(2, "Name required"),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  designation: z.string().optional().default("Sales Associate"),
  dateOfJoining: z.string().optional(),
  teamLeadName: z.string().optional().default("Shahrukh Ali"),
  specializationLocation: z.string().optional().default("Noida"),
  isRegistration: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = googleAuthSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const {
      email,
      name,
      avatar,
      phone,
      designation,
      dateOfJoining,
      teamLeadName,
      specializationLocation,
      isRegistration,
    } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail, isDeleted: false },
      include: { role: true },
    });

    if (existingUser) {
      // Check status
      if (existingUser.status === "PENDING_APPROVAL") {
        return errorResponse(
          "Your Google account is registered but currently pending approval by Team Leads (Shahrukh Ali / Shahnawaz Khan).",
          403,
          { status: ["PENDING_APPROVAL"] }
        );
      }

      if (existingUser.status !== "ACTIVE") {
        return errorResponse(
          "Your account is inactive or suspended. Please contact the administrator.",
          403
        );
      }

      // Update last login & avatar
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          lastLoginAt: new Date(),
          avatar: avatar || existingUser.avatar,
        },
      });

      // Issue JWT
      const token = signToken({ userId: existingUser.id });

      await createAuditLog({
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
          staffCode: existingUser.staffCode,
          roleId: existingUser.roleId,
          roleSlug: existingUser.role.slug,
          roleName: existingUser.role.name,
          teamName: existingUser.teamName,
          designation: existingUser.designation,
          permissions: [],
        },
        action: "LOGIN",
        entity: "USER",
        entityId: existingUser.id,
        entityCode: existingUser.staffCode || existingUser.email,
        newValue: "Logged in via Google OAuth",
      });

      const response = successResponse(
        {
          user: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            phone: existingUser.phone,
            staffCode: existingUser.staffCode,
            roleSlug: existingUser.role.slug,
            roleName: existingUser.role.name,
            teamName: existingUser.teamName,
            designation: existingUser.designation,
            avatar: existingUser.avatar,
          },
        },
        "Google sign-in successful."
      );

      response.cookies.set(
        "l2h_auth_token",
        token,
        AUTH_COOKIE_OPTIONS as any
      );

      return response;
    }

    // 2. User does NOT exist -> If not a registration request, guide them to complete profile
    if (!phone) {
      return successResponse(
        {
          requiresRegistration: true,
          googleProfile: { email: normalizedEmail, name, avatar },
        },
        "Google account verified. Please provide your phone number and team lead to complete registration."
      );
    }

    // 3. Register new user with status = 'PENDING_APPROVAL'
    let memberRole = await prisma.role.findFirst({
      where: { slug: "MEMBER" },
    });

    if (!memberRole) {
      memberRole = await prisma.role.create({
        data: {
          name: "Sales Associate",
          slug: "MEMBER",
          description: "Calling floor sales representative",
          isSystem: true,
        },
      });
    }

    const userCount = await prisma.user.count();
    const staffCode = `STAFF-${(100 + userCount + 1).toString()}`;
    const randomPassword = `google_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    const passwordHash = await hashPassword(randomPassword);

    let computedTeamName = teamLeadName.toLowerCase().includes("shahnawaz")
      ? "Team Shahnawaz"
      : teamLeadName.toLowerCase().includes("shahrukh")
      ? "Executive Leadership"
      : "Team Direct Sales";

    const matchedTeam = await prisma.team.findFirst({
      where: { name: { equals: computedTeamName, mode: "insensitive" }, isDeleted: false },
    });
    const teamId = matchedTeam?.id || null;
    if (matchedTeam) computedTeamName = matchedTeam.name;

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.replace(/[^0-9]/g, "").slice(-10),
        staffCode,
        passwordHash,
        avatar,
        roleId: memberRole.id,
        status: "PENDING_APPROVAL",
        designation,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
        teamLeadName,
        teamId,
        teamName: computedTeamName,
        specializationLocation,
        authProvider: "GOOGLE",
        isAvailable: true,
      },
      include: { role: true },
    });

    // Notify admins
    await prisma.adminAlert.create({
      data: {
        category: "SYSTEM",
        severity: "INFO",
        title: `👤 Google Registration: ${newUser.name}`,
        description: `${newUser.name} registered via Google (${normalizedEmail}) under ${teamLeadName}. Staff Code: ${staffCode}. Awaiting admin approval.`,
        entity: "USER",
        entityId: newUser.id,
        entityCode: staffCode,
        recommendedAction: "Approve account access in Admin Control Center",
        linkUrl: "/admin?tab=users",
        status: "OPEN",
      },
    });

    const adminUsers = await prisma.user.findMany({
      where: { role: { slug: "ADMIN" }, status: "ACTIVE", isDeleted: false },
    });

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: `👤 New Google Registration: ${newUser.name}`,
          message: `${newUser.name} (${normalizedEmail}) registered under ${teamLeadName}. Awaiting approval.`,
          type: "LEAD_ASSIGNED",
          linkUrl: "/admin?tab=users",
        },
      });
    }

    return successResponse(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          staffCode: newUser.staffCode,
          designation: newUser.designation,
          teamLeadName: newUser.teamLeadName,
          status: newUser.status,
        },
      },
      "Registration submitted successfully via Google! Your account is currently pending approval by Team Leads (Shahrukh Ali / Shahnawaz Khan).",
      undefined,
      201
    );
  } catch (error: any) {
    console.error("POST /api/auth/google error:", error);
    return errorResponse(error.message || "Failed to process Google authentication.", 500);
  }
}
