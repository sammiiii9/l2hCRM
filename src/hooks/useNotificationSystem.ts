"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  playNotificationChime,
  playUrgentAlertChime,
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  sendDesktopNotification,
  DesktopPermissionStatus,
} from "@/lib/browser-push";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

export interface DueReminder {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadCode?: string | null;
  scheduledAt: string;
  status: string;
  priority: string;
  isOverdue: boolean;
  minutesRemaining: number;
  message: string;
}

export function useNotificationSystem() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dueReminders, setDueReminders] = useState<DueReminder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [desktopPermission, setDesktopPermission] = useState<DesktopPermissionStatus>("default");

  // Keep track of reminders already alerted to avoid duplicate sounds during the same session
  const alertedReminderIdsRef = useRef<Set<string>>(new Set());
  const isInitialMount = useRef<boolean>(true);

  // Initialize permissions and local sound preference
  useEffect(() => {
    setDesktopPermission(getDesktopNotificationPermission());
    const savedSound = localStorage.getItem("l2h_sound_alerts_enabled");
    if (savedSound !== null) {
      setSoundEnabled(savedSound === "true");
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("l2h_sound_alerts_enabled", String(next));
      if (next) {
        playNotificationChime();
      }
      return next;
    });
  }, []);

  const requestDesktopPermission = useCallback(async () => {
    const perm = await requestDesktopNotificationPermission();
    setDesktopPermission(perm);
    if (perm === "granted") {
      sendDesktopNotification("L2H Desktop Alerts Active 🔔", {
        body: "You will now receive instant desktop notifications for upcoming and overdue follow-up calls.",
      });
    }
    return perm;
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        const newNotifications: AppNotification[] = json.data.notifications || [];
        const newUnreadCount: number = json.data.unreadCount || 0;
        const newDueReminders: DueReminder[] = json.data.dueReminders || [];

        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);
        setDueReminders(newDueReminders);

        // Check for new reminders that haven't been sounded/pushed yet
        const newlyDue = newDueReminders.filter(
          (rem) => !alertedReminderIdsRef.current.has(rem.id)
        );

        if (newlyDue.length > 0) {
          newlyDue.forEach((rem) => alertedReminderIdsRef.current.add(rem.id));

          // Trigger Sound Alert
          if (soundEnabled) {
            const hasOverdue = newlyDue.some((r) => r.isOverdue);
            if (hasOverdue) {
              playUrgentAlertChime();
            } else {
              playNotificationChime();
            }
          }

          // Trigger Browser Desktop Push
          newlyDue.forEach((rem) => {
            sendDesktopNotification(
              rem.isOverdue ? `⚠️ Overdue Follow-up: ${rem.leadName}` : `⏰ Call Due in ${Math.max(1, rem.minutesRemaining)}m: ${rem.leadName}`,
              {
                body: `${rem.message} Phone: ${rem.leadPhone}`,
                onClickUrl: `/leads/${rem.leadId}?action=call`,
                tag: `followup-${rem.id}`,
              }
            );
          });
        }
      }
    } catch (err) {
      console.error("Error polling notifications:", err);
    } finally {
      setLoading(false);
      isInitialMount.current = false;
    }
  }, [soundEnabled]);

  // Polling interval (every 30s)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    dueReminders,
    loading,
    soundEnabled,
    toggleSound,
    desktopPermission,
    requestDesktopPermission,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
  };
}
