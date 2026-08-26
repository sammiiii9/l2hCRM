"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  PhoneCall,
  Flame,
  Star,
  Trophy,
  FileCheck2,
  Building2,
  Users2,
  ShieldAlert,
  Search,
  Bell,
  LogOut,
  Sparkles,
  Plus,
} from "lucide-react";
import { L2HLogo } from "../ui/L2HLogo";
import { GlobalSearchModal } from "../ui/GlobalSearchModal";
import { CreateLeadModal } from "../ui/CreateLeadModal";
import { NotificationCenter } from "../ui/NotificationCenter";
import { LogCallModal } from "../ui/LogCallModal";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [activeCallLead, setActiveCallLead] = useState<{
    id: string;
    name: string;
    phone: string;
    leadCode?: string;
  } | null>(null);

  const isPollingEnabled = !!user && pathname !== "/login" && pathname !== "/signup";

  const {
    notifications,
    unreadCount,
    dueReminders,
    soundEnabled,
    toggleSound,
    desktopPermission,
    requestDesktopPermission,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotificationSystem(isPollingEnabled);

  if (pathname === "/login" || pathname === "/signup") return null;

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Calling Data", href: "/calling-data", icon: PhoneCall },
    { label: "Leads", href: "/leads", icon: Flame },
    { label: "Prospects", href: "/leads?stage=PROSPECT", icon: Star },
    { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { label: "Bookings", href: "/bookings", icon: FileCheck2 },
    { label: "Projects & Inventory", href: "/projects", icon: Building2 },
    { label: "Customers", href: "/customers", icon: Users2 },
    ...(isAdmin
      ? [{ label: "Admin Control", href: "/admin", icon: ShieldAlert }]
      : []),
  ];

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SA";

  return (
    <>
      <header className="bg-black/95 backdrop-blur-md border-b border-white/10 text-white sticky top-0 z-40 shadow-md">
        {/* Top bar: L2H Brand, Search, & Profile Controls */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: L2H Official Brand Logo */}
            <div className="flex items-center space-x-4 shrink-0">
              <Link href="/" className="flex items-center">
                <L2HLogo variant="header" />
              </Link>
              <div className="hidden lg:flex items-center pl-3 border-l border-white/15">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                  Operating System
                </span>
              </div>
            </div>

            {/* Middle Quick Search trigger */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-zinc-400 bg-white/5 hover:bg-white/10 rounded-xl border border-white/15 transition-all shadow-inner"
              >
                <span className="flex items-center">
                  <Search className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                  Search leads, customers, projects, inventory...
                </span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/10 border border-white/20 rounded text-zinc-300">
                  Ctrl K
                </kbd>
              </button>
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => setCreateLeadOpen(true)}
                className="hidden sm:inline-flex items-center px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-zinc-200 rounded-xl shadow-sm transition-all hover:scale-[1.02]"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-black" />
                Add Lead
              </button>

              {/* Notification Center Trigger */}
              <div className="relative">
                <button
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className={`relative p-2 rounded-xl border transition ${
                    notificationOpen
                      ? "bg-white text-black border-white"
                      : dueReminders.length > 0
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                      : "text-zinc-300 hover:text-white hover:bg-white/10 border-white/10"
                  }`}
                  title="Follow-up alerts & notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-md animate-pulse">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {dueReminders.length > 0 && unreadCount === 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>

                <NotificationCenter
                  isOpen={notificationOpen}
                  onClose={() => setNotificationOpen(false)}
                  notifications={notifications}
                  unreadCount={unreadCount}
                  dueReminders={dueReminders}
                  soundEnabled={soundEnabled}
                  toggleSound={toggleSound}
                  desktopPermission={desktopPermission}
                  requestDesktopPermission={requestDesktopPermission}
                  markAsRead={markAsRead}
                  markAllAsRead={markAllAsRead}
                  onCallLead={(lead) => {
                    setNotificationOpen(false);
                    setActiveCallLead(lead);
                  }}
                />
              </div>

              <div className="flex items-center space-x-1.5 bg-white/10 text-zinc-200 border border-white/15 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] uppercase tracking-wider font-semibold">live</span>
              </div>

              {/* User Profile Pill */}
              <div className="flex items-center space-x-2 pl-2 border-l border-white/15">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold flex items-center justify-center text-xs border border-white/20 shadow-xs">
                  {userInitials}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-white text-xs leading-none">
                      {user?.name || "User"}
                    </span>
                    {isAdmin && (
                      <span className="px-1 py-0.2 text-[9px] font-bold bg-white/20 text-zinc-200 border border-white/20 rounded">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {user?.designation || "Associate"}{user?.teamName ? ` • ${user.teamName}` : ""}
                  </div>
                </div>
              </div>

              <button
                onClick={() => logout()}
                title="Log out"
                className="inline-flex items-center p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg border border-white/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom tab navigation: Highlighted & Heightened (+20% height, high-contrast luxury command bar) */}
        <div className="border-t border-b border-white/15 bg-[#09090b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center space-x-1.5 overflow-x-auto py-2.5 sm:py-3 no-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href.split("?")[0]));

                return (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className={`group flex items-center px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-200 uppercase tracking-wider ${
                      isActive
                        ? "bg-white text-black shadow-md ring-1 ring-white/30 scale-[1.02]"
                        : "text-zinc-200 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/20"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mr-2 transition-transform duration-200 ${
                        isActive
                          ? "text-black scale-105"
                          : "text-zinc-400 group-hover:text-white group-hover:scale-105"
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {searchOpen && <GlobalSearchModal onClose={() => setSearchOpen(false)} />}

      {/* Create Lead Modal */}
      {createLeadOpen && <CreateLeadModal onClose={() => setCreateLeadOpen(false)} />}

      {/* Active Call Logger Modal from Notification Center */}
      {activeCallLead && (
        <LogCallModal
          lead={activeCallLead}
          onClose={() => setActiveCallLead(null)}
          onSuccess={refreshNotifications}
        />
      )}
    </>
  );
}

