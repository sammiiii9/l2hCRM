import { prisma } from "@/lib/prisma";

export interface DueReminderItem {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadCode?: string | null;
  scheduledAt: Date;
  status: string;
  priority: string;
  isOverdue: boolean;
  minutesRemaining: number;
  message: string;
}

/**
 * Checks for follow-ups due in the next 15 minutes or currently overdue for the user.
 * Automatically generates in-app notifications if not already generated.
 */
export async function checkDueFollowUpReminders(userId: string): Promise<DueReminderItem[]> {
  const now = new Date();
  const fifteenMinsAhead = new Date(now.getTime() + 15 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. Query pending follow-ups assigned to this user that are overdue (within 24h) or due in next 15m
  const followUps = await prisma.followUp.findMany({
    where: {
      assignedToId: userId,
      status: "PENDING",
      scheduledAt: {
        gte: twentyFourHoursAgo,
        lte: fifteenMinsAhead,
      },
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          leadCode: true,
          budget: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  const dueItems: DueReminderItem[] = [];

  for (const f of followUps) {
    const scheduledTime = new Date(f.scheduledAt).getTime();
    const isOverdue = scheduledTime < now.getTime();
    const diffMins = Math.round((scheduledTime - now.getTime()) / (60 * 1000));
    const timeStr = new Date(f.scheduledAt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const message = isOverdue
      ? `⚠️ Overdue Follow-up: Call with ${f.lead.name} was scheduled for ${timeStr}.`
      : `⏰ Upcoming Follow-up: Call with ${f.lead.name} is due in ${Math.max(1, diffMins)} minute(s) at ${timeStr}.`;

    dueItems.push({
      id: f.id,
      leadId: f.lead.id,
      leadName: f.lead.name,
      leadPhone: f.lead.phone,
      leadCode: f.lead.leadCode,
      scheduledAt: f.scheduledAt,
      status: f.status,
      priority: f.priority,
      isOverdue,
      minutesRemaining: diffMins,
      message,
    });

    // Check if an in-app notification already exists for this follow-up in the last 2 hours
    const recentNotification = await prisma.notification.findFirst({
      where: {
        userId,
        linkUrl: `/leads/${f.lead.id}`,
        createdAt: {
          gte: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        },
        type: isOverdue ? "OVERDUE_ALERT" : "FOLLOWUP_REMINDER",
      },
    });

    if (!recentNotification) {
      await prisma.notification.create({
        data: {
          userId,
          title: isOverdue ? `⚠️ Overdue Follow-up: ${f.lead.name}` : `⏰ Follow-up Due: ${f.lead.name}`,
          message,
          type: isOverdue ? "OVERDUE_ALERT" : "FOLLOWUP_REMINDER",
          linkUrl: `/leads/${f.lead.id}`,
        },
      });
    }
  }

  return dueItems;
}

/**
 * Retrieves the latest notifications for a user along with the total unread count.
 */
export async function getUserNotifications(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      isRead: true,
    },
  });
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}
