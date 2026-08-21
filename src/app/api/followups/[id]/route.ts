export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { dispatchCrmEvent } from "@/lib/automation/engine";
import { z } from "zod";

const updateFollowUpSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "RESCHEDULED", "MISSED", "CANCELLED"]).optional(),
  outcomeRemarks: z.string().optional(),
  newScheduledAt: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "followups.manage")) {
      return forbiddenResponse();
    }

    const followUp = await prisma.followUp.findUnique({
      where: { id: params.id },
      include: { lead: true },
    });

    if (!followUp) return notFoundResponse("Follow-up not found.");

    const body = await req.json();
    const parsed = updateFollowUpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const { status, outcomeRemarks, newScheduledAt } = parsed.data;

    let updatedData: any = {};
    if (status) {
      updatedData.status = status;
      if (status === "COMPLETED") {
        updatedData.completedAt = new Date();
      }
    }
    if (outcomeRemarks) {
      updatedData.outcomeRemarks = outcomeRemarks;
    }
    if (newScheduledAt) {
      updatedData.scheduledAt = new Date(newScheduledAt);
      updatedData.status = "PENDING";
    }

    const updated = await prisma.followUp.update({
      where: { id: params.id },
      data: updatedData,
    });

    // If completed or rescheduled, record lead activity
    await prisma.leadActivity.create({
      data: {
        leadId: followUp.leadId,
        userId: user.id,
        type: "FOLLOWUP_SCHEDULED",
        title: `Follow-up marked as ${status || "Updated"}`,
        description: outcomeRemarks || undefined,
      },
    });

    if (status === "COMPLETED") {
      await dispatchCrmEvent({
        eventType: "followup.completed",
        entityId: followUp.leadId,
        entityType: "LEAD",
        actorId: user.id,
        actorName: user.name,
      });
    }

    return successResponse(updated, "Follow-up updated successfully.");
  } catch (error) {
    console.error("PATCH /api/followups/[id] error:", error);
    return errorResponse("Failed to update follow-up.", 500);
  }
}
