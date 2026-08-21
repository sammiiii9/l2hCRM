export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, getOwnershipFilter } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { dispatchCrmEvent } from "@/lib/automation/engine";
import { z } from "zod";

const createLeadSchema = z.object({
  name: z.string().min(2, "Lead name must be at least 2 characters"),
  phone: z.string().min(10, "Valid phone number is required"),
  whatsapp: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  source: z.string().default("CALL_FLOOR"),
  campaign: z.string().optional(),
  assignedToId: z.string().optional(),
  status: z.string().default("NEW"),
  stage: z.string().default("TO_WORK"),
  priority: z.string().default("WARM"),
  budget: z.string().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  preferredLocation: z.string().optional(),
  propertyType: z.string().default("RESIDENTIAL_APARTMENT"),
  purpose: z.string().default("SELF_USE"),
  configuration: z.string().default("3BHK"),
  requirementNotes: z.string().optional(),
  projectInterestId: z.string().optional().nullable(),
  tags: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "leads.view")) {
      return forbiddenResponse("You do not have permission to view leads.");
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const stage = searchParams.get("stage");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedToId = searchParams.get("assignedToId");
    const projectId = searchParams.get("projectId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Base ownership restriction
    const ownershipWhere = getOwnershipFilter(user, "assignedToId");

    // Dynamic filters
    const where: any = {
      ...ownershipWhere,
      isDeleted: false,
    };

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { leadCode: { contains: q } },
        { preferredLocation: { contains: q } },
        { latestRemarks: { contains: q } },
      ];
    }

    if (stage && stage !== "ALL") {
      where.stage = stage;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (priority && priority !== "ALL") {
      where.priority = priority;
    }

    if (assignedToId && assignedToId !== "ALL" && user.roleSlug === "ADMIN") {
      where.assignedToId = assignedToId;
    }

    if (projectId && projectId !== "ALL") {
      where.projectInterestId = projectId;
    }

    // Fetch leads, total and stage breakdown in parallel
    const [leads, total, stageCountsGroup] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, name: true, phone: true, teamName: true },
          },
          projectInterest: {
            select: { id: true, name: true, projectCode: true, location: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
      prisma.lead.groupBy({
        by: ["stage"],
        where: { ...ownershipWhere, isDeleted: false },
        _count: { id: true },
      }),
    ]);

    const stageMap: Record<string, number> = {};
    let totalAll = 0;
    for (const g of stageCountsGroup) {
      stageMap[g.stage] = g._count.id;
      totalAll += g._count.id;
    }

    const toWorkCount = stageMap["TO_WORK"] || 0;
    const suspectCount = stageMap["SUSPECT"] || 0;
    const prospectCount = stageMap["PROSPECT"] || 0;
    const notPickedCount = stageMap["NOT_PICKED"] || 0;
    const notInterestedCount = stageMap["NOT_INTERESTED"] || 0;

    return successResponse(leads, "Leads retrieved successfully.", {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      ...({
        counts: {
          toWork: toWorkCount,
          suspect: suspectCount,
          prospect: prospectCount,
          notPicked: notPickedCount,
          notInterested: notInterestedCount,
          totalAll,
        },
      } as any),
    });
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return errorResponse("Failed to retrieve leads.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "leads.create")) {
      return forbiddenResponse("You do not have permission to create leads.");
    }

    const body = await req.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    // Check duplicate phone
    const existing = await prisma.lead.findFirst({
      where: { phone: data.phone, isDeleted: false },
    });
    if (existing) {
      return errorResponse(`A lead with phone number ${data.phone} already exists (${existing.name} - ${existing.leadCode}).`, 409);
    }

    // Generate unique Lead Code
    const count = await prisma.lead.count();
    const leadCode = `LD-${1000 + count + 1}`;

    const newLead = await prisma.lead.create({
      data: {
        leadCode,
        name: data.name,
        phone: data.phone,
        whatsapp: data.whatsapp || data.phone,
        email: data.email || null,
        source: data.source,
        campaign: data.campaign,
        assignedToId: data.assignedToId || user.id,
        createdById: user.id,
        status: data.status,
        stage: data.stage,
        priority: data.priority,
        budget: data.budget,
        budgetMin: data.budgetMin || 0,
        budgetMax: data.budgetMax || 0,
        preferredLocation: data.preferredLocation,
        propertyType: data.propertyType,
        purpose: data.purpose,
        configuration: data.configuration,
        requirementNotes: data.requirementNotes,
        projectInterestId: data.projectInterestId || null,
        tags: data.tags,
        latestRemarks: data.requirementNotes || "Lead created in CRM",
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        projectInterest: { select: { id: true, name: true } },
      },
    });

    // Record activity
    await prisma.leadActivity.create({
      data: {
        leadId: newLead.id,
        userId: user.id,
        type: "STAGE_CHANGED",
        title: `Lead created with Stage: ${newLead.stage}`,
        description: `Source: ${newLead.source}, Priority: ${newLead.priority}`,
      },
    });

    // Audit log
    await createAuditLog({
      user,
      action: "CREATE",
      entity: "LEAD",
      entityId: newLead.id,
      entityCode: newLead.leadCode,
      newValue: `Created lead ${newLead.name} (${newLead.leadCode})`,
      metadata: { phone: newLead.phone, stage: newLead.stage, assignedToId: newLead.assignedToId },
    });

    // Trigger Central Automation Engine (Auto-scoring & high-value alerts)
    await dispatchCrmEvent({
      eventType: "lead.created",
      entityId: newLead.id,
      entityType: "LEAD",
      actorId: user.id,
      actorName: user.name,
      metadata: { budget: newLead.budget, source: newLead.source },
    });

    return successResponse(newLead, "Lead created successfully.", undefined, 201);
  } catch (error) {
    console.error("POST /api/leads error:", error);
    return errorResponse("Failed to create lead.", 500);
  }
}
