import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import {
  getUserNotifications,
  checkDueFollowUpReminders,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notifications/service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    // 1. Check & generate any due/overdue follow-up reminders
    const dueReminders = await checkDueFollowUpReminders(user.id);

    // 2. Fetch latest notifications & unread count
    const { notifications, unreadCount } = await getUserNotifications(user.id);

    return successResponse({
      notifications,
      unreadCount,
      dueReminders,
    });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return errorResponse(error.message || "Failed to fetch notifications.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const body = await req.json().catch(() => ({}));
    const { id, all } = body;

    if (all) {
      await markAllNotificationsAsRead(user.id);
      return successResponse({ success: true, message: "All notifications marked as read." });
    }

    if (id) {
      await markNotificationAsRead(id, user.id);
      return successResponse({ success: true, message: "Notification marked as read." });
    }

    return errorResponse("Missing notification id or all flag.", 400);
  } catch (error: any) {
    console.error("PATCH /api/notifications error:", error);
    return errorResponse(error.message || "Failed to update notification.", 500);
  }
}
