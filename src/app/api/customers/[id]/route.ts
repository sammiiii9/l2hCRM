export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "customers.view")) {
      return forbiddenResponse();
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id, isDeleted: false },
      include: {
        assignedTo: { select: { id: true, name: true, phone: true } },
        requirements: true,
        bookings: {
          include: {
            project: true,
            inventoryUnit: true,
            payments: { orderBy: { paymentDate: "desc" } },
          },
          where: { isDeleted: false },
        },
      },
    });

    if (!customer) return notFoundResponse("Customer not found.");

    // Fetch related leads by phone or email
    const linkedLeads = await prisma.lead.findMany({
      where: {
        OR: [{ phone: customer.phone }, { email: customer.email || undefined }],
        isDeleted: false,
      },
      include: {
        callLogs: { orderBy: { callDate: "desc" }, take: 5 },
        followUps: { orderBy: { scheduledAt: "desc" }, take: 5 },
        siteVisits: { include: { project: true } },
      },
    });

    return successResponse({
      ...customer,
      linkedLeads,
    }, "Customer 360 profile retrieved.");
  } catch (error) {
    console.error("GET /api/customers/[id] error:", error);
    return errorResponse("Failed to fetch customer 360.", 500);
  }
}
