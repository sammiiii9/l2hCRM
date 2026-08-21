import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const distributeSchema = z.object({
  leadIds: z.array(z.string()).min(1, "At least one lead ID is required"),
  targetUserIds: z.array(z.string()).min(1, "At least one target assignee is required"),
  strategy: z.enum(["ROUND_ROBIN", "SINGLE_USER"]).default("ROUND_ROBIN"),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    // Verify permission: Team Leads & Admins have leads.assign permission
    if (!hasPermission(user, "leads.assign")) {
      return forbiddenResponse("You do not have permission to distribute or reassign leads.");
    }

    const body = await req.json();
    const parsed = distributeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const { leadIds, targetUserIds, strategy, reason } = parsed.data;

    // Verify target users are active
    const targetUsers = await prisma.user.findMany({
      where: {
        id: { in: targetUserIds },
        isDeleted: false,
        status: "ACTIVE",
      },
    });

    if (targetUsers.length === 0) {
      return errorResponse("No active target assignees found.", 404);
    }

    // Distribute leads
    const updates: Array<{ leadId: string; targetUserId: string; targetUserName: string }> = [];

    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];
      const targetUser = strategy === "ROUND_ROBIN"
        ? targetUsers[i % targetUsers.length]
        : targetUsers[0];

      updates.push({
        leadId,
        targetUserId: targetUser.id,
        targetUserName: targetUser.name,
      });
    }

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        await tx.lead.update({
          where: { id: u.leadId },
          data: { assignedToId: u.targetUserId },
        });

        await tx.leadActivity.create({
          data: {
            leadId: u.leadId,
            userId: user.id,
            type: "ASSIGNMENT_CHANGED",
            title: `Lead distributed to ${u.targetUserName}`,
            description: reason || `Distributed by Team Lead / Admin ${user.name}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: u.targetUserId,
            title: "New Lead Distributed",
            message: `A lead has been assigned to you by ${user.name}.`,
            type: "LEAD_ASSIGNED",
            linkUrl: `/leads/${u.leadId}`,
          },
        });
      }
    }, { maxWait: 20000, timeout: 45000 });

    // Audit log
    await createAuditLog({
      user,
      action: "BULK_ASSIGN",
      entity: "LEAD",
      fieldChanged: "assignedToId",
      newValue: `${leadIds.length} leads distributed across ${targetUsers.length} associates`,
      metadata: { strategy, reason, leadCount: leadIds.length, assignees: targetUsers.map((t) => t.name) },
    });

    return successResponse(
      { distributedCount: leadIds.length, targetUsersCount: targetUsers.length },
      `Successfully distributed ${leadIds.length} leads across ${targetUsers.length} team members.`
    );
  } catch (error) {
    console.error("POST /api/leads/distribute error:", error);
    return errorResponse("Failed to distribute leads.", 500);
  }
}
