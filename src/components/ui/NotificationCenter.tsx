"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  BellRing,
  Clock,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  CheckCircle2,
  Phone,
  Volume2,
  VolumeX,
  CheckCheck,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";
import { AppNotification, DueReminder } from "@/hooks/useNotificationSystem";
import { formatRelativeTime } from "@/lib/utils";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  dueReminders: DueReminder[];
  soundEnabled: boolean;
  toggleSound: () => void;
  desktopPermission: string;
  requestDesktopPermission: () => Promise<string>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  onCallLead?: (lead: { id: string; name: string; phone: string; leadCode?: string }) => void;
}

export function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  dueReminders,
  soundEnabled,
  toggleSound,
  desktopPermission,
  requestDesktopPermission,
  markAsRead,
  markAllAsRead,
  onCallLead,
}: NotificationCenterProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "FOLLOWUP_REMINDER":
        return <Clock className="w-4 h-4 text-emerald-400" />;
      case "OVERDUE_ALERT":
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case "LEAD_ASSIGNED":
        return <UserCheck className="w-4 h-4 text-blue-400" />;
      case "ESCALATION_ALERT":
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case "BOOKING_UPDATE":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
      onClose();
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-14 w-[380px] sm:w-[440px] bg-[#0c0c0e] border border-white/15 rounded-3xl shadow-2xl z-50 text-white overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* 1. Header Bar */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-white flex items-center gap-2">
              <span>Notifications & Reminders</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <p className="text-[10px] text-zinc-400">Real-time follow-up alerts & updates</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg text-xs flex items-center gap-1 transition"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Read All</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Quick Settings Bar (Sound & Desktop Push) */}
      <div className="px-5 py-2.5 bg-black/60 border-b border-white/10 flex items-center justify-between text-xs">
        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition text-[11px] font-semibold ${
            soundEnabled
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-zinc-900 border-zinc-700 text-zinc-400"
          }`}
          title={soundEnabled ? "Audio chimes active" : "Audio chimes muted"}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{soundEnabled ? "Chime On" : "Muted"}</span>
        </button>

        {/* Desktop Push Notification Permission */}
        {desktopPermission === "granted" ? (
          <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Desktop Alerts Active ✓</span>
          </div>
        ) : (
          <button
            onClick={requestDesktopPermission}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold uppercase tracking-wider transition"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-300" />
            <span>Enable Desktop Alerts</span>
          </button>
        )}
      </div>

      {/* 3. Urgent Active Follow-Up Reminders Banner (Due in ≤15 mins or Overdue) */}
      {dueReminders.length > 0 && (
        <div className="p-3 bg-amber-950/30 border-b border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
              <span>Active Follow-Up Reminders ({dueReminders.length})</span>
            </span>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
            {dueReminders.map((rem) => (
              <div
                key={rem.id}
                className={`p-3 rounded-2xl border transition ${
                  rem.isOverdue
                    ? "bg-rose-950/40 border-rose-500/40 text-rose-100"
                    : "bg-zinc-900/90 border-white/15 text-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-serif font-bold text-xs text-white">
                        {rem.leadName}
                      </span>
                      {rem.leadCode && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-zinc-300">
                          {rem.leadCode}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      {rem.isOverdue ? (
                        <span className="text-rose-400 font-semibold">
                          ⚠️ {Math.abs(rem.minutesRemaining)}m overdue
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">
                          ⏰ Due in {Math.max(1, rem.minutesRemaining)} min(s)
                        </span>
                      )}{" "}
                      • Scheduled: {new Date(rem.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <a
                      href={`tel:${rem.leadPhone}`}
                      onClick={() => {
                        if (onCallLead) {
                          onCallLead({
                            id: rem.leadId,
                            name: rem.leadName,
                            phone: rem.leadPhone,
                            leadCode: rem.leadCode || undefined,
                          });
                        }
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                    <Link
                      href={`/leads/${rem.leadId}`}
                      onClick={onClose}
                      className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition"
                      title="Open Lead 360"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Notification Items List */}
      <div className="max-h-[340px] overflow-y-auto divide-y divide-white/5 no-scrollbar">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 space-y-2">
            <BellOff className="w-8 h-8 mx-auto text-zinc-600" />
            <p className="text-xs font-medium">All caught up!</p>
            <p className="text-[10px] text-zinc-500">No new notifications right now.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors ${
                n.isRead
                  ? "hover:bg-white/5 opacity-75"
                  : "bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                {getNotificationIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold truncate ${n.isRead ? "text-zinc-300" : "text-white"}`}>
                    {n.title}
                  </span>
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap font-mono">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {n.message}
                </p>
              </div>

              {!n.isRead && (
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5 ring-2 ring-blue-500/30"></div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 5. Footer */}
      <div className="p-3 bg-white/[0.02] border-t border-white/10 text-center">
        <Link
          href="/leads"
          onClick={onClose}
          className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition"
        >
          View All Leads & Activity →
        </Link>
      </div>
    </div>
  );
}
