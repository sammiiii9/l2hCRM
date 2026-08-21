export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { dispatchCrmEvent } from "@/lib/automation/engine";
import { z } from "zod";

const createCallSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  durationSeconds: z.number().default(0),
  outcome: z.enum([
    "CONNECTED",
    "BUSY",
    "NO_ANSWER",
    "SWITCHED_OFF",
    "INTERESTED",
    "NOT_INTERESTED",
    "CALL_BACK",
    "WRONG_NUMBER",
    "QUALIFIED",
    "SITE_VISIT_AGREED",
  ]),
  remarks: z.string().min(1, "Call remarks are required"),
  nextFollowUpDate: z.string().optional().nullable(),
  newStage: z.string().optional(),
  newPriority: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "calls.view")) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "THIS_MONTH"; // TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, ALL
    const outcome = searchParams.get("outcome");
    const leadId = searchParams.get("leadId");

    let dateFilter: any = {};
    const now = new Date();

    if (range === "TODAY") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { gte: startOfDay };
    } else if (range === "YESTERDAY") {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { gte: startOfYesterday, lt: endOfYesterday };
    } else if (range === "THIS_WEEK") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      dateFilter = { gte: startOfWeek };
    } else if (range === "THIS_MONTH") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      dateFilter = { gte: startOfMonth };
    }

    const where: any = {};
    if (Object.keys(dateFilter).length > 0) {
      where.callDate = dateFilter;
    }
    if (outcome && outcome !== "ALL") {
      where.outcome = outcome;
    }
    if (leadId) {
      where.leadId = leadId;
    }
    if (!isAdmin(user)) {
      where.userId = user.id;
    }

    const [calls, notPickedCount, totalCalled] = await Promise.all([
      prisma.callLog.findMany({
        where,
        include: {
          lead: {
            select: { id: true, name: true, phone: true, stage: true, priority: true, leadCode: true },
          },
          user: {
            select: { id: true, name: true, teamName: true },
          },
        },
        orderBy: { callDate: "desc" },
        take: 100,
      }),
      prisma.callLog.count({
        where: {
          ...where,
          outcome: { in: ["NO_ANSWER", "BUSY", "SWITCHED_OFF"] },
        },
      }),
      prisma.callLog.count({
        where: !isAdmin(user) ? { userId: user.id } : {},
      }),
    ]);

    return successResponse(calls, "Call logs retrieved.", {
      ...({
        counts: {
          notPickedInPeriod: notPickedCount,
          totalCalledAllTime: totalCalled,
        },
      } as any),
    });
  } catch (error) {
    console.error("GET /api/calls error:", error);
    return errorResponse("Failed to fetch call logs.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "calls.create")) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const parsed = createCallSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    const lead = await prisma.lead.findUnique({
      where: { id: data.leadId, isDeleted: false },
    });

    if (!lead) return errorResponse("Lead not found.", 404);

    // Create call log
    const callLog = await prisma.callLog.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        durationSeconds: data.durationSeconds,
        outcome: data.outcome,
        remarks: data.remarks,
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
      },
    });

    // Determine stage updates if provided or inferred
    let updatedStage = data.newStage || lead.stage;
    let updatedStatus = lead.status;
    let updatedPriority = data.newPriority || lead.priority;

    if (data.outcome === "NOT_INTERESTED") {
      updatedStage = "NOT_INTERESTED";
      updatedStatus = "LOST";
      updatedPriority = "COLD";
    } else if (data.outcome === "NO_ANSWER" || data.outcome === "BUSY" || data.outcome === "SWITCHED_OFF") {
      if (lead.stage === "TO_WORK") {
        updatedStage = "NOT_PICKED";
      }
    } else if (data.outcome === "INTERESTED" || data.outcome === "QUALIFIED") {
      updatedStage = "PROSPECT";
      updatedStatus = "QUALIFIED";
      updatedPriority = "WARM";
    } else if (data.outcome === "SITE_VISIT_AGREED") {
      updatedStage = "PROSPECT";
      updatedStatus = "SITE_VISIT_SCHEDULED";
      updatedPriority = "HOT";
    }

    // Update lead
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastContactedAt: new Date(),
        latestRemarks: data.remarks,
        stage: updatedStage,
        status: updatedStatus,
        priority: updatedPriority,
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : lead.nextFollowUpDate,
      },
    });

    // Create follow-up if requested
    if (data.nextFollowUpDate) {
      await prisma.followUp.create({
        data: {
          leadId: lead.id,
          assignedToId: lead.assignedToId || user.id,
          scheduledAt: new Date(data.nextFollowUpDate),
          status: "PENDING",
          priority: updatedPriority === "HOT" ? "HIGH" : "MEDIUM",
          outcomeRemarks: `Scheduled from call: ${data.remarks}`,
        },
      });
    }

    // Record lead activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        type: "CALL_LOGGED",
        title: `Call Logged: ${data.outcome.replace(/_/g, " ")} (${data.durationSeconds}s)`,
        description: data.remarks,
        metadata: JSON.stringify({ outcome: data.outcome, duration: data.durationSeconds }),
      },
    });

    // Trigger Central Automation Engine (Recalculate score & priority)
    await dispatchCrmEvent({
      eventType: "call.completed",
      entityId: lead.id,
      entityType: "LEAD",
      actorId: user.id,
      actorName: user.name,
      metadata: { outcome: data.outcome, duration: data.durationSeconds },
    });

    return successResponse(callLog, "Call successfully logged.", undefined, 201);
  } catch (error) {
    console.error("POST /api/calls error:", error);
    return errorResponse("Failed to log call.", 500);
  }
}
