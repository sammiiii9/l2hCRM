import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const approvalActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  roleId: z.string().optional(),
  teamName: z.string().optional(),
  designation: z.string().optional(),
  approvalNotes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin) return unauthorizedResponse();

    // Check admin or users.manage permission
    if (admin.roleSlug !== "ADMIN" && !hasPermission(admin, "users.manage")) {
      return forbiddenResponse("Only administrators or Team Leads can approve registrations.");
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const parsed = approvalActionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid action payload.", 400, parsed.error.flatten().fieldErrors);
    }

    const { action, roleId, teamName, designation, approvalNotes } = parsed.data;

    // Find target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!targetUser) {
      return notFoundResponse("User not found.");
    }

    const now = new Date();

    if (action === "APPROVE") {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          status: "ACTIVE",
          approvedAt: now,
          approvedById: admin.id,
          approvalNotes: approvalNotes || `Approved by ${admin.name}`,
          ...(roleId ? { roleId } : {}),
          ...(teamName ? { teamName } : {}),
          ...(designation ? { designation } : {}),
        },
        include: { role: true },
      });

      // Resolve open registration alerts for this user
      await prisma.adminAlert.updateMany({
        where: {
          entityId: id,
          status: "OPEN",
        },
        data: {
          status: "RESOLVED",
          resolvedById: admin.id,
          resolvedAt: now,
        },
      });

      // Send welcome notification to the user
      await prisma.notification.create({
        data: {
          userId: id,
          title: "🎉 Account Approved & Activated!",
          message: `Welcome to L2H Solution! Your account has been approved by ${admin.name} (${admin.designation || "Team Lead"}). You now have full access to the CRM.`,
          type: "SYSTEM_ANNOUNCEMENT",
          linkUrl: "/",
        },
      });

      // Audit Log
      await createAuditLog({
        user: admin,
        action: "UPDATE",
        entity: "USER",
        entityId: id,
        entityCode: targetUser.staffCode || targetUser.email,
        fieldChanged: "status",
        oldValue: targetUser.status,
        newValue: "ACTIVE",
        metadata: {
          approvedBy: admin.name,
          approvedById: admin.id,
          assignedRole: updatedUser.role.name,
          teamName: updatedUser.teamName,
          notes: approvalNotes,
        },
      });

      return successResponse(
        {
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            staffCode: updatedUser.staffCode,
            status: updatedUser.status,
            roleName: updatedUser.role.name,
            teamName: updatedUser.teamName,
            designation: updatedUser.designation,
          },
        },
        `User ${updatedUser.name} has been approved and activated.`
      );
    } else {
      // REJECT action
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          status: "REJECTED",
          approvalNotes: approvalNotes || `Rejected by ${admin.name}`,
        },
        include: { role: true },
      });

      // Resolve open alerts
      await prisma.adminAlert.updateMany({
        where: {
          entityId: id,
          status: "OPEN",
        },
        data: {
          status: "RESOLVED",
          resolvedById: admin.id,
          resolvedAt: now,
        },
      });

      // Audit Log
      await createAuditLog({
        user: admin,
        action: "UPDATE",
        entity: "USER",
        entityId: id,
        entityCode: targetUser.staffCode || targetUser.email,
        fieldChanged: "status",
        oldValue: targetUser.status,
        newValue: "REJECTED",
        metadata: {
          rejectedBy: admin.name,
          notes: approvalNotes,
        },
      });

      return successResponse(
        {
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            status: updatedUser.status,
          },
        },
        `User registration for ${updatedUser.name} has been rejected.`
      );
    }
  } catch (error: any) {
    console.error("POST /api/admin/users/[id]/approve error:", error);
    return errorResponse(error.message || "Failed to process user approval.", 500);
  }
}
