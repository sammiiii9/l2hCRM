export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const team = await prisma.team.findUnique({
      where: { id: params.id, isDeleted: false },
      include: {
        leader: {
          select: { id: true, name: true, email: true, phone: true, staffCode: true, avatar: true },
        },
        members: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            staffCode: true,
            designation: true,
            status: true,
            role: { select: { name: true, slug: true } },
          },
        },
      },
    });

    if (!team) return notFoundResponse("Team not found.");

    return successResponse(team);
  } catch (error) {
    console.error("GET /api/teams/[id] error:", error);
    return errorResponse("Failed to fetch team details.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "users.manage")) {
      return forbiddenResponse("Only administrators can edit teams.");
    }

    const body = await req.json();
    const { name, code, description, leaderId, location, isActive } = body;

    const team = await prisma.team.findUnique({ where: { id: params.id } });
    if (!team) return notFoundResponse("Team not found.");

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (leaderId !== undefined) updateData.leaderId = leaderId || null;
    if (location !== undefined) updateData.location = location || "Noida";
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.team.update({
      where: { id: params.id },
      data: updateData,
      include: {
        leader: { select: { id: true, name: true, email: true } },
      },
    });

    // If team name changed, update teamName on all member users for consistency
    if (name && name.trim() !== team.name) {
      await prisma.user.updateMany({
        where: { teamId: params.id },
        data: { teamName: name.trim() },
      });
    }

    // If new leader is assigned, update leader's team
    if (leaderId && leaderId !== team.leaderId) {
      await prisma.user.update({
        where: { id: leaderId },
        data: { teamId: params.id, teamName: updated.name },
      });
    }

    await createAuditLog({
      user,
      action: "UPDATE",
      entity: "SETTING",
      entityId: updated.id,
      entityCode: updated.name,
      newValue: `Updated Team "${updated.name}"`,
    });

    return successResponse(updated, "Team updated successfully.");
  } catch (error) {
    console.error("PATCH /api/teams/[id] error:", error);
    return errorResponse("Failed to update team.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "users.manage")) {
      return forbiddenResponse("Only administrators can delete teams.");
    }

    const team = await prisma.team.findUnique({ where: { id: params.id } });
    if (!team) return notFoundResponse("Team not found.");

    // Soft delete team
    await prisma.team.update({
      where: { id: params.id },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
        deletedBy: user.name,
      },
    });

    // Unassign team from users
    await prisma.user.updateMany({
      where: { teamId: params.id },
      data: {
        teamId: null,
        teamName: "Unassigned",
      },
    });

    await createAuditLog({
      user,
      action: "DELETE",
      entity: "SETTING",
      entityId: team.id,
      entityCode: team.name,
      newValue: `Deleted Team "${team.name}"`,
    });

    return successResponse(null, `Team "${team.name}" deleted successfully.`);
  } catch (error) {
    console.error("DELETE /api/teams/[id] error:", error);
    return errorResponse("Failed to delete team.", 500);
  }
}
