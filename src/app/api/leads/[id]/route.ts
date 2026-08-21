export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { dispatchCrmEvent } from "@/lib/automation/engine";
import { z } from "zod";

const updateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  source: z.string().optional(),
  campaign: z.string().optional().nullable(),
  assignedToId: z.string().optional(),
  status: z.string().optional(),
  stage: z.string().optional(),
  priority: z.string().optional(),
  budget: z.string().optional().nullable(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  preferredLocation: z.string().optional().nullable(),
  propertyType: z.string().optional(),
  purpose: z.string().optional(),
  configuration: z.string().optional(),
  requirementNotes: z.string().optional().nullable(),
  projectInterestId: z.string().optional().nullable(),
  latestRemarks: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  leadScore: z.number().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "leads.view")) {
      return forbiddenResponse();
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id, isDeleted: false },
      include: {
        assignedTo: { select: { id: true, name: true, phone: true, email: true, teamName: true } },
        createdBy: { select: { id: true, name: true } },
        projectInterest: true,
        activities: { orderBy: { createdAt: "desc" } },
        callLogs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        followUps: {
          include: { assignedTo: { select: { id: true, name: true } } },
          orderBy: { scheduledAt: "desc" },
        },
        siteVisits: {
          include: { project: true, assignedTo: { select: { id: true, name: true } } },
          orderBy: { scheduledDate: "desc" },
        },
        bookings: {
          include: { project: true, inventoryUnit: true },
        },
      },
    });

    if (!lead) return notFoundResponse("Lead not found.");

    // Check ownership if not admin
    if (!isAdmin(user) && lead.assignedToId !== user.id && lead.createdById !== user.id) {
      return forbiddenResponse("You do not have access to this lead.");
    }

    return successResponse(lead, "Lead 360 profile retrieved.");
  } catch (error) {
    console.error("GET /api/leads/[id] error:", error);
    return errorResponse("Failed to retrieve lead.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "leads.update")) {
      return forbiddenResponse();
    }

    const existingLead = await prisma.lead.findUnique({
      where: { id: params.id, isDeleted: false },
    });

    if (!existingLead) return notFoundResponse("Lead not found.");

    if (!isAdmin(user) && existingLead.assignedToId !== user.id && existingLead.createdById !== user.id) {
      return forbiddenResponse("You do not have permission to edit this lead.");
    }

    const body = await req.json();
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed.", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    // Track stage/status changes for activity logging
    const changes: string[] = [];
    if (data.stage && data.stage !== existingLead.stage) {
      changes.push(`Stage updated from ${existingLead.stage} to ${data.stage}`);
    }
    if (data.status && data.status !== existingLead.status) {
      changes.push(`Status updated from ${existingLead.status} to ${data.status}`);
    }
    if (data.priority && data.priority !== existingLead.priority) {
      changes.push(`Priority changed from ${existingLead.priority} to ${data.priority}`);
    }

    const updatedLead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        ...data,
        lastContactedAt: data.latestRemarks ? new Date() : existingLead.lastContactedAt,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        projectInterest: { select: { id: true, name: true } },
      },
    });

    // Record activity log if status/stage changed or remarks added
    if (changes.length > 0 || data.latestRemarks) {
      await prisma.leadActivity.create({
        data: {
          leadId: updatedLead.id,
          userId: user.id,
          type: data.stage !== existingLead.stage ? "STAGE_CHANGED" : "STATUS_CHANGE",
          title: changes.join(" • ") || "Lead updated",
          description: data.latestRemarks || undefined,
        },
      });
    }

    // Record audit log
    await createAuditLog({
      user,
      action: "UPDATE",
      entity: "LEAD",
      entityId: updatedLead.id,
      entityCode: updatedLead.leadCode,
      fieldChanged: Object.keys(data).join(", "),
      oldValue: { stage: existingLead.stage, status: existingLead.status, remarks: existingLead.latestRemarks },
      newValue: { stage: updatedLead.stage, status: updatedLead.status, remarks: updatedLead.latestRemarks },
    });

    // Trigger Central Automation Engine
    if (data.stage && data.stage !== existingLead.stage) {
      await dispatchCrmEvent({
        eventType: "lead.stage_changed",
        entityId: updatedLead.id,
        entityType: "LEAD",
        actorId: user.id,
        actorName: user.name,
        metadata: { oldStage: existingLead.stage, newStage: data.stage },
      });
    } else if (data.status && data.status !== existingLead.status) {
      await dispatchCrmEvent({
        eventType: "lead.status_changed",
        entityId: updatedLead.id,
        entityType: "LEAD",
        actorId: user.id,
        actorName: user.name,
        metadata: { oldStatus: existingLead.status, newStatus: data.status },
      });
    } else {
      await dispatchCrmEvent({
        eventType: "lead.updated",
        entityId: updatedLead.id,
        entityType: "LEAD",
        actorId: user.id,
        actorName: user.name,
      });
    }

    return successResponse(updatedLead, "Lead updated successfully.");
  } catch (error) {
    console.error("PATCH /api/leads/[id] error:", error);
    return errorResponse("Failed to update lead.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "leads.delete")) {
      return forbiddenResponse("Only authorized users can delete leads.");
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id, isDeleted: false },
    });

    if (!lead) return notFoundResponse("Lead not found.");

    // Soft delete
    await prisma.lead.update({
      where: { id: params.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.name,
        deletedReason: "Deleted by user request",
      },
    });

    await createAuditLog({
      user,
      action: "DELETE",
      entity: "LEAD",
      entityId: lead.id,
      entityCode: lead.leadCode,
      newValue: `Soft deleted lead ${lead.name} (${lead.leadCode})`,
    });

    return successResponse(null, "Lead moved to trash / recycle bin.");
  } catch (error) {
    console.error("DELETE /api/leads/[id] error:", error);
    return errorResponse("Failed to delete lead.", 500);
  }
}
