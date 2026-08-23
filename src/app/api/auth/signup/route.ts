export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Valid email address is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Valid 10-digit phone number is required"),
  designation: z.string().optional().default("Sales Associate"),
  dateOfJoining: z.string().optional(),
  teamLeadName: z.string().optional().default("Shahrukh Ali"),
  teamName: z.string().optional(),
  specializationLocation: z.string().optional().default("Noida"),
  authProvider: z.enum(["EMAIL", "GOOGLE"]).optional().default("EMAIL"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const {
      name,
      email,
      password,
      phone,
      designation,
      dateOfJoining,
      teamLeadName,
      teamName,
      specializationLocation,
      authProvider,
    } = parsed.data;

    // 1. Normalize phone & email
    const cleanedPhone = phone.replace(/[^0-9]/g, "").slice(-10);
    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check for duplicate email or phone (check globally across all records)
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { phone: cleanedPhone },
          { phone: `+91${cleanedPhone}` },
          { phone: `+91 ${cleanedPhone}` },
          { phone: { endsWith: cleanedPhone } },
        ],
      },
    });

    if (existing) {
      if (existing.status === "PENDING_APPROVAL") {
        return errorResponse(
          "Your registration is already submitted and currently awaiting admin approval. Please contact your Team Lead (Shahrukh Ali / Shahnawaz Khan).",
          409,
          { status: ["PENDING_APPROVAL"] }
        );
      }
      return errorResponse(
        "An account with this email or phone number already exists. Please sign in with your password.",
        409
      );
    }

    // 3. Find default 'MEMBER' role
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

    // 4. Generate next Staff Code (e.g. STAFF-106)
    const userCount = await prisma.user.count();
    const staffCode = `STAFF-${(100 + userCount + 1).toString()}`;

    // 5. Hash password
    const passwordHash = await hashPassword(password);

    // 6. Determine team name
    const computedTeamName =
      teamName ||
      (teamLeadName.toLowerCase().includes("shahnawaz")
        ? "Team Shahnawaz"
        : teamLeadName.toLowerCase().includes("shahrukh")
        ? "Team Adrash"
        : "Team Alpha");

    // 7. Create user with status = 'PENDING_APPROVAL'
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: cleanedPhone,
        staffCode,
        passwordHash,
        roleId: memberRole.id,
        status: "PENDING_APPROVAL",
        designation,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
        teamLeadName,
        teamName: computedTeamName,
        specializationLocation,
        authProvider,
        isAvailable: true,
      },
      include: {
        role: true,
      },
    });

    // 8. Create Admin Alert for review
    await prisma.adminAlert.create({
      data: {
        category: "SYSTEM",
        severity: "INFO",
        title: `👤 New Agent Registration: ${newUser.name}`,
        description: `${newUser.name} registered as ${designation} under ${teamLeadName} (${computedTeamName}). Staff Code: ${staffCode}. Awaiting admin activation.`,
        entity: "USER",
        entityId: newUser.id,
        entityCode: staffCode,
        recommendedAction: "Review credentials and approve account access in Admin Control Center",
        linkUrl: "/admin?tab=users",
        status: "OPEN",
      },
    });

    // 9. Send in-app notification to all Admins (Shahrukh, Shahnawaz, Managing Director)
    const adminUsers = await prisma.user.findMany({
      where: {
        role: { slug: "ADMIN" },
        status: "ACTIVE",
        isDeleted: false,
      },
    });

    if (adminUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminUsers.map((admin) => ({
          userId: admin.id,
          title: `👤 New Registration: ${newUser.name}`,
          message: `${newUser.name} (${designation}, ${teamLeadName}) is awaiting account activation.`,
          type: "LEAD_ASSIGNED",
          linkUrl: "/admin?tab=users",
        })),
      });
    }

    // 10. Audit Log
    await createAuditLog({
      action: "CREATE",
      entity: "USER",
      entityId: newUser.id,
      entityCode: staffCode,
      newValue: `Registered via ${authProvider} with status PENDING_APPROVAL. Team Lead: ${teamLeadName}`,
    });

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
      "Registration submitted successfully! Your account is currently pending approval by Team Leads (Shahrukh Ali / Shahnawaz Khan).",
      undefined,
      201
    );
  } catch (error: any) {
    console.error("POST /api/auth/signup error:", error);
    if (error?.code === "P2002") {
      const target = error.meta?.target || [];
      const isPhone = Array.isArray(target) ? target.includes("phone") : String(target).includes("phone");
      const isEmail = Array.isArray(target) ? target.includes("email") : String(target).includes("email");
      if (isPhone) {
        return errorResponse("A user with this phone number is already registered in the system. Please sign in with your credentials.", 409);
      }
      if (isEmail) {
        return errorResponse("A user with this email address is already registered in the system. Please sign in with your credentials.", 409);
      }
      return errorResponse("An account with these details already exists. Please sign in.", 409);
    }
    return errorResponse(error.message || "Failed to process registration.", 500);
  }
}
