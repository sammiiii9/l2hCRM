export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const assignSchema = z.object({
  assignedToId: z.string().min(1, "Target assignee ID is required"),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "leads.assign")) {
      return forbiddenResponse("You do not have permission to reassign leads.");
    }

    const body = await req.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const { assignedToId, reason } = parsed.data;

    const [lead, targetUser] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: params.id, isDeleted: false },
        include: { assignedTo: true },
      }),
      prisma.user.findUnique({
        where: { id: assignedToId, isDeleted: false, status: "ACTIVE" },
      }),
    ]);

    if (!lead) return notFoundResponse("Lead not found.");
    if (!targetUser) return errorResponse("Target team member not found or inactive.", 404);

    const oldAssigneeName = lead.assignedTo?.name || "Unassigned";

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: { assignedToId: targetUser.id },
      include: { assignedTo: { select: { id: true, name: true, phone: true } } },
    });

    // Record activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        type: "ASSIGNMENT_CHANGED",
        title: `Reassigned from ${oldAssigneeName} to ${targetUser.name}`,
        description: reason || `Assigned by ${user.name}`,
      },
    });

    // Notify new assignee
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title: "New Lead Assigned",
        message: `${lead.name} (${lead.leadCode}) has been assigned to you.`,
        type: "LEAD_ASSIGNED",
        linkUrl: `/leads/${lead.id}`,
      },
    });

    // Audit log
    await createAuditLog({
      user,
      action: "REASSIGN",
      entity: "LEAD",
      entityId: lead.id,
      entityCode: lead.leadCode,
      fieldChanged: "assignedToId",
      oldValue: oldAssigneeName,
      newValue: targetUser.name,
      metadata: { reason },
    });

    return successResponse(updated, `Lead successfully assigned to ${targetUser.name}.`);
  } catch (error) {
    console.error("POST /api/leads/[id]/assign error:", error);
    return errorResponse("Failed to reassign lead.", 500);
  }
}
