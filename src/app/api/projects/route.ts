export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(2, "Project name required"),
  developerId: z.string().optional().nullable(),
  location: z.string().min(2, "Location is required"),
  city: z.string().default("Noida"),
  state: z.string().default("Uttar Pradesh"),
  propertyType: z.string().default("RESIDENTIAL"),
  projectType: z.string().default("UNDER_CONSTRUCTION"),
  status: z.string().default("ACTIVE"),
  priceRangeMin: z.number().default(5000000),
  priceRangeMax: z.number().default(25000000),
  reraNumber: z.string().optional().nullable(),
  totalUnits: z.number().default(100),
  availableUnits: z.number().default(100),
  amenities: z.string().optional().nullable(),
  connectivity: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "projects.view")) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const city = searchParams.get("city");
    const propertyType = searchParams.get("propertyType");
    const status = searchParams.get("status");

    const where: any = { isDeleted: false };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { location: { contains: q } },
        { reraNumber: { contains: q } },
        { projectCode: { contains: q } },
      ];
    }
    if (city && city !== "ALL") where.city = city;
    if (propertyType && propertyType !== "ALL") where.propertyType = propertyType;
    if (status && status !== "ALL") where.status = status;

    const projects = await prisma.project.findMany({
      where,
      include: {
        developer: true,
        _count: {
          select: { inventory: true, leads: true, bookings: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return successResponse(projects, "Projects retrieved.");
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return errorResponse("Failed to fetch projects.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "projects.manage")) {
      return forbiddenResponse("Only administrators can create projects.");
    }

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;
    const count = await prisma.project.count();
    const projectCode = `PRJ-${100 + count + 1}`;

    const project = await prisma.project.create({
      data: {
        ...data,
        projectCode,
        coverImage: data.coverImage || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80",
      },
      include: { developer: true },
    });

    await createAuditLog({
      user,
      action: "CREATE",
      entity: "PROJECT",
      entityId: project.id,
      entityCode: project.projectCode,
      newValue: `Created project ${project.name} (${project.projectCode})`,
    });

    return successResponse(project, "Project created successfully.", undefined, 201);
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return errorResponse("Failed to create project.", 500);
  }
}
