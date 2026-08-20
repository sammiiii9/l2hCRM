import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, getOwnershipFilter } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { z } from "zod";

const createFollowUpSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  scheduledAt: z.string().min(1, "Follow-up date and time is required"),
  priority: z.string().default("MEDIUM"),
  outcomeRemarks: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "followups.manage")) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "PENDING"; // PENDING, OVERDUE, TODAY, COMPLETED, ALL

    const ownershipWhere = getOwnershipFilter(user, "assignedToId");
    const where: any = {
      ...ownershipWhere,
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    if (filter === "PENDING") {
      where.status = "PENDING";
    } else if (filter === "OVERDUE") {
      where.status = "PENDING";
      where.scheduledAt = { lt: startOfToday };
    } else if (filter === "TODAY") {
      where.status = "PENDING";
      where.scheduledAt = { gte: startOfToday, lt: endOfToday };
    } else if (filter === "COMPLETED") {
      where.status = "COMPLETED";
    }

    const [followups, overdueCount, todayCount, totalPending] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          lead: {
            select: { id: true, name: true, phone: true, stage: true, priority: true, leadCode: true, projectInterest: { select: { name: true } } },
          },
          assignedTo: {
            select: { id: true, name: true },
          },
        },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.followUp.count({
        where: { ...ownershipWhere, status: "PENDING", scheduledAt: { lt: startOfToday } },
      }),
      prisma.followUp.count({
        where: { ...ownershipWhere, status: "PENDING", scheduledAt: { gte: startOfToday, lt: endOfToday } },
      }),
      prisma.followUp.count({
        where: { ...ownershipWhere, status: "PENDING" },
      }),
    ]);

    return successResponse(followups, "Follow-ups retrieved.", {
      ...({
        counts: {
          overdue: overdueCount,
          today: todayCount,
          totalPending,
        },
      } as any),
    });
  } catch (error) {
    console.error("GET /api/followups error:", error);
    return errorResponse("Failed to fetch follow-ups.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "followups.manage")) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const parsed = createFollowUpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed.", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;
    const lead = await prisma.lead.findUnique({
      where: { id: data.leadId, isDeleted: false },
    });
    if (!lead) return errorResponse("Lead not found.", 404);

    const followUp = await prisma.followUp.create({
      data: {
        leadId: lead.id,
        assignedToId: lead.assignedToId || user.id,
        scheduledAt: new Date(data.scheduledAt),
        priority: data.priority,
        outcomeRemarks: data.outcomeRemarks,
        status: "PENDING",
      },
    });

    // Update lead next follow up date
    await prisma.lead.update({
      where: { id: lead.id },
      data: { nextFollowUpDate: new Date(data.scheduledAt) },
    });

    // Record activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        type: "FOLLOWUP_SCHEDULED",
        title: `Follow-up Scheduled for ${new Date(data.scheduledAt).toLocaleString("en-IN")}`,
        description: data.outcomeRemarks,
      },
    });

    return successResponse(followUp, "Follow-up scheduled.", undefined, 201);
  } catch (error) {
    console.error("POST /api/followups error:", error);
    return errorResponse("Failed to create follow-up.", 500);
  }
}
