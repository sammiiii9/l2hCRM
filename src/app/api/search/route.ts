export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return successResponse({ leads: [], customers: [], projects: [], units: [], bookings: [] });
    }

    const leadWhere: any = {
      isDeleted: false,
      OR: [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { leadCode: { contains: q } },
      ],
    };
    if (!isAdmin(user)) {
      leadWhere.assignedToId = user.id;
    }

    const [leads, customers, projects, units, bookings] = await Promise.all([
      // Leads
      prisma.lead.findMany({
        where: leadWhere,
        select: { id: true, name: true, phone: true, stage: true, priority: true, leadCode: true },
        take: 6,
      }),
      // Customers
      prisma.customer.findMany({
        where: {
          isDeleted: false,
          OR: [{ name: { contains: q } }, { phone: { contains: q } }, { customerCode: { contains: q } }],
        },
        select: { id: true, name: true, phone: true, customerCode: true, city: true },
        take: 6,
      }),
      // Projects
      prisma.project.findMany({
        where: {
          isDeleted: false,
          OR: [{ name: { contains: q } }, { projectCode: { contains: q } }, { location: { contains: q } }],
        },
        select: { id: true, name: true, projectCode: true, location: true, propertyType: true },
        take: 6,
      }),
      // Inventory Units
      prisma.inventoryUnit.findMany({
        where: {
          unitNumber: { contains: q },
        },
        include: { project: { select: { name: true } } },
        take: 6,
      }),
      // Bookings
      prisma.booking.findMany({
        where: {
          isDeleted: false,
          bookingCode: { contains: q },
        },
        include: {
          customer: { select: { name: true } },
          project: { select: { name: true } },
        },
        take: 6,
      }),
    ]);

    return successResponse({
      leads,
      customers,
      projects,
      units,
      bookings,
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return errorResponse("Search failed.", 500);
  }
}
