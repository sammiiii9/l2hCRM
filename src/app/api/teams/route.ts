export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  code: z.string().optional(),
  description: z.string().optional(),
  leaderId: z.string().optional().nullable(),
  location: z.string().default("Noida"),
});

import { getOrSetCache, invalidateCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const cacheKey = `teams:${includeInactive}`;
    const formattedTeams = await getOrSetCache(cacheKey, 30000, async () => {
      const teams = await prisma.team.findMany({
        where: {
          isDeleted: false,
          ...(includeInactive ? {} : { isActive: true }),
        },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              staffCode: true,
              avatar: true,
              designation: true,
            },
          },
          members: {
            where: { isDeleted: false },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              staffCode: true,
              avatar: true,
              designation: true,
              status: true,
              role: { select: { id: true, name: true, slug: true } },
              _count: {
                select: {
                  assignedLeads: { where: { isDeleted: false } },
                  assignedBookings: { where: { isDeleted: false } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return teams.map((team) => {
        const totalLeads = team.members.reduce((acc, m) => acc + (m._count?.assignedLeads || 0), 0);
        const totalBookings = team.members.reduce((acc, m) => acc + (m._count?.assignedBookings || 0), 0);

        return {
          id: team.id,
          name: team.name,
          code: team.code,
          description: team.description,
          location: team.location,
          isActive: team.isActive,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          leader: team.leader,
          leaderId: team.leaderId,
          memberCount: team.members.length,
          members: team.members,
          stats: {
            totalLeads,
            totalBookings,
          },
        };
      });
    });

    return successResponse(formattedTeams, "Teams retrieved successfully.");
  } catch (error) {
    console.error("GET /api/teams error:", error);
    return errorResponse("Failed to fetch teams.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "users.manage")) {
      return forbiddenResponse("Only administrators can create teams.");
    }

    const body = await req.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error.", 400, parsed.error.flatten().fieldErrors);
    }

    const { name, code, description, leaderId, location } = parsed.data;

    // Check duplicate team name
    const existing = await prisma.team.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" }, isDeleted: false },
    });

    if (existing) {
      return errorResponse(`A team named "${name}" already exists.`, 409);
    }

    const teamCode = code || `TM-${name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8)}`;

    const newTeam = await prisma.team.create({
      data: {
        name: name.trim(),
        code: teamCode,
        description: description?.trim() || null,
        leaderId: leaderId || null,
        location: location || "Noida",
        isActive: true,
      },
      include: {
        leader: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // If leader is assigned, update leader's team
    if (leaderId) {
      await prisma.user.update({
        where: { id: leaderId },
        data: { teamId: newTeam.id, teamName: newTeam.name },
      });
    }

    await createAuditLog({
      user,
      action: "CREATE",
      entity: "SETTING",
      entityId: newTeam.id,
      entityCode: newTeam.code || newTeam.name,
      newValue: `Created new Team "${newTeam.name}" (Leader: ${newTeam.leader?.name || "Unassigned"})`,
    });

    invalidateCache("teams");

    return successResponse(newTeam, "Team created successfully.", undefined, 201);
  } catch (error: any) {
    console.error("POST /api/teams error:", error);
    return errorResponse("Failed to create team.", 500);
  }
}
