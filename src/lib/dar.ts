import { prisma } from "./prisma";
import { createAuditLog } from "./audit";
import { SessionUser } from "./auth";

/**
 * Returns today's date string in Indian Standard Time (IST - UTC+5:30) as YYYY-MM-DD
 */
export function getTodayISTDateString(): string {
  const now = new Date();
  // IST offset is +5.5 hours = 330 minutes = 19800000 ms
  const istTime = new Date(now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000);
  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, "0");
  const day = String(istTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns a Date object representing 00:00:00.000 IST today
 */
export function getTodayISTDate(): Date {
  const dateStr = getTodayISTDateString();
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Formats a YYYY-MM-DD date string into a friendly display string (e.g. "Thursday, 20 August 2026")
 */
export function formatDarDisplayDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(`${dateInput}T00:00:00.000Z`) : dateInput;
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export interface UpsertDarInput {
  user: SessionUser;
  calls: number;
  talkTimeMinutes: number;
  prospects: number;
  suspects: number;
  meetings: number;
  visits: number;
  callyzerScreenshot: string;
  callyzerFileName?: string;
  callyzerFileSize?: number;
  remarks?: string;
}

export interface DarValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateDarInput(input: Partial<UpsertDarInput>): DarValidationResult {
  const errors: string[] = [];

  if (input.calls === undefined || input.calls === null || isNaN(input.calls) || !Number.isInteger(Number(input.calls)) || Number(input.calls) < 0) {
    errors.push("No. of Calls must be a whole number greater than or equal to 0.");
  }
  if (input.talkTimeMinutes === undefined || input.talkTimeMinutes === null || isNaN(input.talkTimeMinutes) || !Number.isInteger(Number(input.talkTimeMinutes)) || Number(input.talkTimeMinutes) < 0) {
    errors.push("Total Talk Time must be a whole number of minutes greater than or equal to 0.");
  }
  if (input.prospects === undefined || input.prospects === null || isNaN(input.prospects) || !Number.isInteger(Number(input.prospects)) || Number(input.prospects) < 0) {
    errors.push("No. of Prospects must be a whole number greater than or equal to 0.");
  }
  if (input.suspects === undefined || input.suspects === null || isNaN(input.suspects) || !Number.isInteger(Number(input.suspects)) || Number(input.suspects) < 0) {
    errors.push("No. of Suspects must be a whole number greater than or equal to 0.");
  }
  if (input.meetings === undefined || input.meetings === null || isNaN(input.meetings) || !Number.isInteger(Number(input.meetings)) || Number(input.meetings) < 0) {
    errors.push("No. of Meetings must be a whole number greater than or equal to 0.");
  }
  if (input.visits === undefined || input.visits === null || isNaN(input.visits) || !Number.isInteger(Number(input.visits)) || Number(input.visits) < 0) {
    errors.push("No. of Visits must be a whole number greater than or equal to 0.");
  }
  if (!input.callyzerScreenshot || typeof input.callyzerScreenshot !== "string" || input.callyzerScreenshot.trim().length === 0) {
    errors.push("Callyzer Report Screenshot is mandatory.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Fetch today's DAR for a specific user
 */
export async function getUserTodayDar(userId: string) {
  const dateString = getTodayISTDateString();
  return prisma.dailyActivityReport.findUnique({
    where: {
      userId_dateString: {
        userId,
        dateString,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          staffCode: true,
          teamName: true,
          designation: true,
          avatar: true,
        },
      },
    },
  });
}

/**
 * Upserts today's DAR record for the authenticated user.
 * Guarantees that duplicate daily records are never created for the same user on the same day.
 */
export async function upsertDailyActivityReport(input: UpsertDarInput) {
  const validation = validateDarInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join("; "));
  }

  const dateString = getTodayISTDateString();
  const reportDate = getTodayISTDate();

  const existing = await prisma.dailyActivityReport.findUnique({
    where: {
      userId_dateString: {
        userId: input.user.id,
        dateString,
      },
    },
  });

  const isUpdate = !!existing;

  const dar = await prisma.dailyActivityReport.upsert({
    where: {
      userId_dateString: {
        userId: input.user.id,
        dateString,
      },
    },
    create: {
      userId: input.user.id,
      reportDate,
      dateString,
      calls: Math.floor(Number(input.calls)),
      talkTimeMinutes: Math.floor(Number(input.talkTimeMinutes)),
      prospects: Math.floor(Number(input.prospects)),
      suspects: Math.floor(Number(input.suspects)),
      meetings: Math.floor(Number(input.meetings)),
      visits: Math.floor(Number(input.visits)),
      callyzerScreenshot: input.callyzerScreenshot,
      callyzerFileName: input.callyzerFileName || null,
      callyzerFileSize: input.callyzerFileSize ? Math.floor(Number(input.callyzerFileSize)) : null,
      remarks: input.remarks || null,
      status: "SUBMITTED",
    },
    update: {
      calls: Math.floor(Number(input.calls)),
      talkTimeMinutes: Math.floor(Number(input.talkTimeMinutes)),
      prospects: Math.floor(Number(input.prospects)),
      suspects: Math.floor(Number(input.suspects)),
      meetings: Math.floor(Number(input.meetings)),
      visits: Math.floor(Number(input.visits)),
      callyzerScreenshot: input.callyzerScreenshot,
      callyzerFileName: input.callyzerFileName || existing?.callyzerFileName || null,
      callyzerFileSize: input.callyzerFileSize ? Math.floor(Number(input.callyzerFileSize)) : existing?.callyzerFileSize || null,
      remarks: input.remarks !== undefined ? input.remarks : existing?.remarks,
      status: "SUBMITTED",
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          staffCode: true,
          teamName: true,
          designation: true,
        },
      },
    },
  });

  // Audit log entry
  await createAuditLog({
    user: input.user,
    action: isUpdate ? "DAR_UPDATE" : "DAR_SUBMIT",
    entity: "DAR",
    entityId: dar.id,
    entityCode: `DAR-${dateString}-${input.user.staffCode || input.user.id}`,
    fieldChanged: isUpdate ? "METRICS_UPDATED" : "DAR_RECORDED",
    newValue: JSON.stringify({
      calls: dar.calls,
      talkTimeMinutes: dar.talkTimeMinutes,
      prospects: dar.prospects,
      suspects: dar.suspects,
      meetings: dar.meetings,
      visits: dar.visits,
      dateString,
    }),
  });

  return {
    success: true,
    dar,
    isUpdate,
    message: isUpdate ? "DAR Updated Successfully" : "DAR Submitted Successfully",
  };
}

export interface ListDarOptions {
  dateString?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  teamName?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Lists Daily Activity Reports with filtering, aggregation, and compliance calculations
 */
export async function listDailyActivityReports(options: ListDarOptions = {}) {
  const {
    dateString = getTodayISTDateString(),
    startDate,
    endDate,
    userId,
    teamName,
    status,
    page = 1,
    limit = 50,
  } = options;

  const whereClause: any = {};

  if (startDate && endDate) {
    whereClause.dateString = {
      gte: startDate,
      lte: endDate,
    };
  } else if (dateString) {
    whereClause.dateString = dateString;
  }

  if (userId) {
    whereClause.userId = userId;
  }

  if (status) {
    whereClause.status = status;
  }

  if (teamName) {
    whereClause.user = {
      teamName,
      isDeleted: false,
    };
  }

  const skip = (page - 1) * limit;

  const [dars, totalCount] = await Promise.all([
    prisma.dailyActivityReport.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            staffCode: true,
            teamName: true,
            designation: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.dailyActivityReport.count({ where: whereClause }),
  ]);

  // Aggregate totals
  const aggregates = dars.reduce(
    (acc, curr) => {
      acc.totalCalls += curr.calls;
      acc.totalTalkTimeMinutes += curr.talkTimeMinutes;
      acc.totalProspects += curr.prospects;
      acc.totalSuspects += curr.suspects;
      acc.totalMeetings += curr.meetings;
      acc.totalVisits += curr.visits;
      return acc;
    },
    {
      totalCalls: 0,
      totalTalkTimeMinutes: 0,
      totalProspects: 0,
      totalSuspects: 0,
      totalMeetings: 0,
      totalVisits: 0,
    }
  );

  // Active users count for compliance checking
  const activeMembers = await prisma.user.findMany({
    where: {
      isDeleted: false,
      status: "ACTIVE",
      ...(teamName ? { teamName } : {}),
    },
    select: {
      id: true,
      name: true,
      staffCode: true,
      teamName: true,
      avatar: true,
    },
  });

  const submittedUserIds = new Set(dars.map((d) => d.userId));
  const missingMembers = activeMembers.filter((m) => !submittedUserIds.has(m.id));

  const complianceRate = activeMembers.length > 0
    ? Math.round((submittedUserIds.size / activeMembers.length) * 100)
    : 0;

  return {
    dars,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    targetDate: dateString,
    formattedDate: formatDarDisplayDate(dateString),
    aggregates,
    compliance: {
      totalActiveMembers: activeMembers.length,
      submittedCount: submittedUserIds.size,
      missingCount: missingMembers.length,
      complianceRate,
      missingMembers,
    },
  };
}
