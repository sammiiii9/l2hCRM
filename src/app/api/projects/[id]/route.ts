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

    if (!hasPermission(user, "projects.view")) {
      return forbiddenResponse();
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id, isDeleted: false },
      include: {
        developer: true,
        inventory: {
          orderBy: [{ tower: "asc" }, { floor: "asc" }, { unitNumber: "asc" }],
        },
        siteVisits: {
          include: { lead: { select: { name: true, phone: true } }, assignedTo: { select: { name: true } } },
          orderBy: { scheduledDate: "desc" },
          take: 10,
        },
        bookings: {
          include: { customer: { select: { name: true, phone: true } }, inventoryUnit: true },
          take: 10,
        },
      },
    });

    if (!project) return notFoundResponse("Project not found.");

    return successResponse(project, "Project details retrieved.");
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return errorResponse("Failed to fetch project.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "projects.manage")) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: body,
    });

    await createAuditLog({
      user,
      action: "UPDATE",
      entity: "PROJECT",
      entityId: updated.id,
      entityCode: updated.projectCode,
      fieldChanged: Object.keys(body).join(", "),
      newValue: body,
    });

    return successResponse(updated, "Project updated successfully.");
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error);
    return errorResponse("Failed to update project.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "projects.manage")) {
      return forbiddenResponse();
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.name,
      },
    });

    await createAuditLog({
      user,
      action: "DELETE",
      entity: "PROJECT",
      entityId: project.id,
      entityCode: project.projectCode,
      newValue: `Soft deleted project ${project.name}`,
    });

    return successResponse(null, "Project moved to trash.");
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return errorResponse("Failed to delete project.", 500);
  }
}
