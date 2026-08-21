export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "THIS_MONTH"; // TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH

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
      // Derived or logged meetings
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

    /**
     * DYNAMIC WEIGHTED PRIORITY HIERARCHY & TIE-BREAKING:
     * Tier 1 (Highest): Closed Bookings (Overrides all visits and calls: 1 Booking beats 5 Visits / 400 Calls)
     * Tier 2: Site Visits & Meetings (Overrides higher call counts: 1 Visit beats 350 Calls with 0 Visits)
     * Tier 3: Total Calls Logged (Deciding factor when bookings & visits are equal)
     * Tie-Breaking:
     * - If bookings are equal -> higher (visits + meetings) takes precedence
     * - If visits are equal -> higher total call volume breaks the tie
     * - Final fallback: alphabetical by name
     */
    formatted.sort((a, b) => {
      // 1. Tier 1: Closed Bookings
      if (b.bookings !== a.bookings) {
        return b.bookings - a.bookings;
      }

      // 2. Tier 2: Site Visits / Meetings
      const bVisitsTotal = b.visits + b.meetings;
      const aVisitsTotal = a.visits + a.meetings;
      if (bVisitsTotal !== aVisitsTotal) {
        return bVisitsTotal - aVisitsTotal;
      }

      // 3. Tier 3: Total Calls Made
      if (b.calls !== a.calls) {
        return b.calls - a.calls;
      }

      // 4. Alphabetical tie-breaker
      return a.name.localeCompare(b.name);
    });

    // Top 3 Podium
    const podium = {
      first: formatted[0] || null,
      second: formatted[1] || null,
      third: formatted[2] || null,
    };

    // The Rest of the Floor
    const restOfFloor = formatted.slice(3).map((item, idx) => ({
      ...item,
      rank: idx + 4,
    }));

    return successResponse({
      period,
      podium,
      restOfFloor,
      totalCompetitors: formatted.length,
      hierarchyRules: [
        "Tier 1: Closed Bookings (Overrides visits & calls)",
        "Tier 2: Site Visits & Meetings (Overrides call volume)",
        "Tier 3: Total Calls Made (Tie-breaker for equal bookings & visits)",
      ],
    });
  } catch (error) {
    console.error("GET /api/leaderboard error:", error);
    return errorResponse("Failed to fetch leaderboard.", 500);
  }
}
