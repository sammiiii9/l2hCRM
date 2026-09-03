export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { getOrSetCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, "reports.view")) {
      return forbiddenResponse();
    }

    const payload = await getOrSetCache("admin:analytics", 15000, async () => {
      const [
        totalMembers,
        activeMembers,
        totalLeads,
        newLeads,
        qualifiedLeads,
        siteVisits,
        totalBookings,
        revenueResult,
        leadsBySource,
        leadsByStage,
        recentBookings,
      ] = await Promise.all([
        prisma.user.count({ where: { isDeleted: false } }),
        prisma.user.count({ where: { isDeleted: false, status: "ACTIVE" } }),
        prisma.lead.count({ where: { isDeleted: false } }),
        prisma.lead.count({ where: { isDeleted: false, status: "NEW" } }),
        prisma.lead.count({ where: { isDeleted: false, status: "QUALIFIED" } }),
        prisma.siteVisit.count(),
        prisma.booking.count({ where: { isDeleted: false, status: { not: "CANCELLED" } } }),
        prisma.booking.aggregate({
          _sum: { totalDealValue: true, tokenAmountPaid: true, commissionAmount: true },
          where: { isDeleted: false, status: { not: "CANCELLED" } },
        }),
        prisma.lead.groupBy({
          by: ["source"],
          _count: { id: true },
          where: { isDeleted: false },
        }),
        prisma.lead.groupBy({
          by: ["stage"],
          _count: { id: true },
          where: { isDeleted: false },
        }),
        prisma.booking.findMany({
          where: { isDeleted: false },
          include: {
            customer: { select: { name: true } },
            project: { select: { name: true } },
            inventoryUnit: { select: { unitNumber: true } },
            assignedMember: { select: { name: true } },
          },
          orderBy: { bookingDate: "desc" },
          take: 5,
        }),
      ]);

      const totalRevenue = revenueResult._sum.totalDealValue || 0;
      const totalCollected = revenueResult._sum.tokenAmountPaid || 0;
      const totalCommission = revenueResult._sum.commissionAmount || 0;
      const conversionRate = totalLeads > 0 ? ((totalBookings / totalLeads) * 100).toFixed(1) : "0";

      // Funnel Data
      const funnel = [
        { stage: "Total Leads", count: totalLeads },
        { stage: "Qualified", count: qualifiedLeads },
        { stage: "Site Visits", count: siteVisits },
        { stage: "Bookings Won", count: totalBookings },
      ];

      return {
        kpis: {
          totalMembers,
          activeMembers,
          totalLeads,
          newLeads,
          qualifiedLeads,
          siteVisits,
          totalBookings,
          totalRevenue,
          totalCollected,
          totalCommission,
          conversionRate: `${conversionRate}%`,
        },
        funnel,
        leadsBySource: leadsBySource.map((s) => ({ source: s.source, count: s._count.id })),
        leadsByStage: leadsByStage.map((s) => ({ stage: s.stage, count: s._count.id })),
        recentBookings,
      };
    });

    return successResponse(payload);
  } catch (error) {
    console.error("GET /api/analytics/admin error:", error);
    return errorResponse("Failed to fetch admin analytics.", 500);
  }
}
