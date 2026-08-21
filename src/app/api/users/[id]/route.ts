export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "users.view")) {
      return forbiddenResponse();
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id, isDeleted: false },
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
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: { assignedLeads: true, assignedBookings: true, callLogs: true },
        },
      },
    });

    if (!target) return notFoundResponse("User not found.");

    return successResponse(target);
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return errorResponse("Failed to fetch user.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "users.manage")) {
      return forbiddenResponse("Only administrators can update staff accounts.");
    }

    const body = await req.json();
    const updateData: any = { ...body };

    if (body.password) {
      updateData.passwordHash = await hashPassword(body.password);
      delete updateData.password;
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: { role: true },
    });

    await createAuditLog({
      user,
      action: "UPDATE",
      entity: "USER",
      entityId: updated.id,
      entityCode: updated.staffCode || updated.email,
      fieldChanged: Object.keys(body).join(", "),
      newValue: body.status ? `Status changed to ${body.status}` : "Profile updated",
    });

    return successResponse(
      {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        staffCode: updated.staffCode,
        role: updated.role,
        teamName: updated.teamName,
        designation: updated.designation,
        status: updated.status,
      },
      "Staff account updated successfully."
    );
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return errorResponse("Failed to update user.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "users.manage")) {
      return forbiddenResponse("Only administrators can delete staff accounts.");
    }

    if (params.id === user.id) {
      return errorResponse("You cannot delete your own administrator account.", 400);
    }

    const deleted = await prisma.user.update({
      where: { id: params.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.name,
        status: "INACTIVE",
      },
    });

    await createAuditLog({
      user,
      action: "DELETE",
      entity: "USER",
      entityId: deleted.id,
      entityCode: deleted.staffCode || deleted.email,
      newValue: `Soft deleted staff account ${deleted.name}`,
    });

    return successResponse(null, "Staff account moved to recycle bin.");
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return errorResponse("Failed to delete user.", 500);
  }
}
