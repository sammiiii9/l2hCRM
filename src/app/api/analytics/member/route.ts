import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [
      leadsInToday,
      stageCountsGroup,
      todayFollowUps,
      overdueFollowUps,
      todayCallsCount,
      myBookingsCount,
      myCommissionResult,
      upcomingFollowUpsList,
      recentCallsList,
    ] = await Promise.all([
      // Leads In Today
      prisma.lead.count({
        where: {
          assignedToId: user.id,
          isDeleted: false,
          createdAt: { gte: startOfToday },
        },
      }),
      // Consolidated Stage Counts via groupBy
      prisma.lead.groupBy({
        by: ["stage"],
        where: { assignedToId: user.id, isDeleted: false },
        _count: { id: true },
      }),
      // Follow-ups Today
      prisma.followUp.count({
        where: {
          assignedToId: user.id,
          status: "PENDING",
          scheduledAt: { gte: startOfToday, lt: endOfToday },
        },
      }),
      // Overdue Follow-ups
      prisma.followUp.count({
        where: {
          assignedToId: user.id,
          status: "PENDING",
          scheduledAt: { lt: startOfToday },
        },
      }),
      // Today's Calls
      prisma.callLog.count({
        where: {
          userId: user.id,
          callDate: { gte: startOfToday },
        },
      }),
      // My Bookings
      prisma.booking.count({
        where: { assignedMemberId: user.id, isDeleted: false, status: { not: "CANCELLED" } },
      }),
      // My Commission
      prisma.booking.aggregate({
        _sum: { commissionAmount: true },
        where: { assignedMemberId: user.id, isDeleted: false, status: { not: "CANCELLED" } },
      }),
      // Top 5 upcoming follow ups
      prisma.followUp.findMany({
        where: { assignedToId: user.id, status: "PENDING" },
        include: {
          lead: { select: { id: true, name: true, phone: true, stage: true, priority: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
      // Top 5 recent calls
      prisma.callLog.findMany({
        where: { userId: user.id },
        include: {
          lead: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { callDate: "desc" },
        take: 5,
      }),
    ]);

    const stageMap: Record<string, number> = {};
    let totalMyLeads = 0;
    for (const g of stageCountsGroup) {
      stageMap[g.stage] = g._count.id;
      totalMyLeads += g._count.id;
    }

    const myProspects = stageMap["PROSPECT"] || 0;
    const mySuspects = stageMap["SUSPECT"] || 0;
    const myNotPicked = stageMap["NOT_PICKED"] || 0;
    const myNotInterested = stageMap["NOT_INTERESTED"] || 0;
    const myEarnedCommission = myCommissionResult._sum.commissionAmount || 0;

    return successResponse({
      hero: {
        userName: user.name,
        teamName: user.teamName || "Team Adrash",
        designation: user.designation || "Associate",
        leadsInToday,
        yourProspects: myProspects,
        todayCalls: todayCallsCount,
      },
      counts: {
        totalLeads: totalMyLeads,
        prospects: myProspects,
        suspects: mySuspects,
        notPicked: myNotPicked,
        notInterested: myNotInterested,
        todayFollowUps,
        overdueFollowUps,
        myBookings: myBookingsCount,
        myEarnedCommission,
      },
      upcomingFollowUps: upcomingFollowUpsList,
      recentCalls: recentCallsList,
    });
  } catch (error) {
    console.error("GET /api/analytics/member error:", error);
    return errorResponse("Failed to fetch member analytics.", 500);
  }
}
