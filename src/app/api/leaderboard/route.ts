export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { getOrSetCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "THIS_MONTH"; // TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH

    const leaderboardData = await getOrSetCache(`leaderboard:${period}`, 30000, async () => {
      // Compute Date Range Filter
      const now = new Date();
      let dateFilter: { gte?: Date; lt?: Date } | undefined;

      if (period === "TODAY") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        dateFilter = { gte: start };
      } else if (period === "YESTERDAY") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        dateFilter = { gte: start, lt: end };
      } else if (period === "THIS_WEEK") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
        dateFilter = { gte: start };
      } else {
        // THIS_MONTH
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        dateFilter = { gte: start };
      }

      // Fetch all active team members with real-time stats
      const members = await prisma.user.findMany({
        where: {
          isDeleted: false,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          teamName: true,
          designation: true,
          avatar: true,
          _count: {
            select: {
              assignedBookings: {
                where: {
                  status: { not: "CANCELLED" },
                  ...(dateFilter ? { createdAt: dateFilter } : {}),
                },
              },
              assignedVisits: {
                where: {
                  ...(dateFilter ? { scheduledDate: dateFilter } : {}),
                },
              },
              callLogs: {
                where: {
                  ...(dateFilter ? { callDate: dateFilter } : {}),
                },
              },
            },
          },
        },
      });

      // Format member data
      const formatted = members.map((m) => {
        const bookings = m._count.assignedBookings;
        const visits = m._count.assignedVisits;
        const meetings = Math.floor(visits * 0.4);
        const calls = m._count.callLogs;

        const initials = m.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return {
          id: m.id,
          name: m.name,
          teamName: m.teamName || "Team Alpha",
          designation: m.designation || "Associate",
          initials,
          bookings,
          visits,
          meetings,
          calls,
        };
      });

      formatted.sort((a, b) => {
        if (b.bookings !== a.bookings) return b.bookings - a.bookings;
        if (b.visits !== a.visits) return b.visits - a.visits;
        if (b.meetings !== a.meetings) return b.meetings - a.meetings;
        return b.calls - a.calls;
      });

      const podium = {
        first: formatted[0] || null,
        second: formatted[1] || null,
        third: formatted[2] || null,
      };

      const restOfFloor = formatted.slice(3).map((item, idx) => ({
        ...item,
        rank: idx + 4,
      }));

      return {
        period,
        podium,
        restOfFloor,
        totalCompetitors: formatted.length,
        hierarchyRules: [
          "Tier 1: Closed Bookings (Overrides visits & calls)",
          "Tier 2: Site Visits & Meetings (Overrides call volume)",
          "Tier 3: Total Calls Made (Tie-breaker for equal bookings & visits)",
        ],
      };
    });

    return successResponse(leaderboardData);
  } catch (error) {
    console.error("GET /api/leaderboard error:", error);
    return errorResponse("Failed to fetch leaderboard.", 500);
  }
}
