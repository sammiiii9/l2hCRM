"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  FileText,
  PhoneCall,
  GraduationCap,
  BarChart3,
  Flame,
  Star,
  Trophy,
  FileCheck2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Phone,
  MessageSquare,
  Building2,
  Calendar,
  CheckCircle2,
  Zap,
  Target,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { LogCallModal } from "@/components/ui/LogCallModal";
import { DailyActivityReportModal } from "@/components/ui/DailyActivityReportModal";
import { formatINR, formatRelativeTime, maskPhoneNumber, getWhatsAppUrl } from "@/lib/utils";
import Link from "next/link";

export default function HomePage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<any>(null);
  const [briefing, setBriefing] = useState<any>(null);
  const [darStatus, setDarStatus] = useState<any>(null);
  const [darModalOpen, setDarModalOpen] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeCallLead, setActiveCallLead] = useState<any>(null);

  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());

  const toggleRevealPhone = (leadId: string) => {
    setRevealedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const fetchDashboardData = async () => {
    try {
      setLoadingStats(true);
      const [resAnalytics, resBriefing, resDar] = await Promise.all([
        fetch("/api/analytics/member"),
        fetch("/api/automation/briefing"),
        fetch("/api/dar/today"),
      ]);

      const dataAnalytics = await resAnalytics.json();
      if (dataAnalytics.success) {
        setAnalytics(dataAnalytics.data);
      }

      const dataBriefing = await resBriefing.json();
      if (dataBriefing.success) {
        setBriefing(dataBriefing.data);
      }

      const dataDar = await resDar.json();
      if (dataDar.success) {
        setDarStatus(dataDar.data);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      fetchDashboardData();
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-xs text-zinc-400 uppercase tracking-widest font-semibold animate-pulse">
          Loading L2H Workspace...
        </div>
      </div>
    );
  }

  // Time-aware greeting
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const actionCards = [
    {
      title: darStatus?.isSubmitted ? "View Today's DAR" : "Submit Today",
      subtitle: darStatus?.isSubmitted
        ? `Submitted ✓ (${new Date(darStatus.dar.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})`
        : "Daily Activity Report (DAR)",
      icon: FileText,
      iconBg: darStatus?.isSubmitted ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30" : "bg-zinc-950 text-white",
      action: () => setDarModalOpen(true),
      badge: darStatus?.isSubmitted ? "Submitted ✓" : "Mandatory",
      badgeColor: darStatus?.isSubmitted ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-zinc-900 text-white font-bold",
    },
    {
      title: "Calling Data",
      subtitle: "Your next batch",
      icon: PhoneCall,
      iconBg: "bg-zinc-900 text-zinc-100",
      action: () => router.push("/calling-data"),
    },
    {
      title: "Learn & Pitch",
      subtitle: "Advisory Playbooks",
      icon: GraduationCap,
      iconBg: "bg-zinc-900 text-zinc-100",
      action: () => alert("🎓 L2H Real Estate Academy: Module 1: Pitching Luxury Golf Properties & Due Diligence is active!"),
    },
    {
      title: "My Numbers",
      subtitle: "Performance metrics",
      icon: BarChart3,
      iconBg: "bg-zinc-900 text-zinc-100",
      action: () => router.push("/admin"),
    },
    {
      title: "My Leads",
      subtitle: "Work active leads",
      icon: Flame,
      iconBg: "bg-zinc-900 text-zinc-100",
      action: () => router.push("/leads"),
    },
    {
      title: "Prospects",
      subtitle: "Qualified pipelines",
      icon: Star,
      iconBg: "bg-zinc-900 text-zinc-100",
      action: () => router.push("/leads?stage=PROSPECT"),
    },
    {
      title: "Leaderboard",
      subtitle: "Rank & performance",
      icon: Trophy,
      iconBg: "bg-zinc-900 text-zinc-100",
      action: () => router.push("/leaderboard"),
    },
    {
      title: "Bookings",
      subtitle: "Closed transactions",
      icon: FileCheck2,
      iconBg: "bg-zinc-900 text-zinc-100",
      action: () => router.push("/bookings"),
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. L2H Command Center Hero Card */}
      <div className="l2h-hero-card rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-zinc-300 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-zinc-300" />
                <span>From Land to Legacy • Call Floor Command Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-white">
                {timeGreeting}, {user.name.split(" ")[0]}
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm font-light max-w-xl">
                Your AI-prioritized daily action queue is synced. Complete overdue follow-ups and log your daily activity.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Prominent DAR Quick Action */}
              <button
                onClick={() => setDarModalOpen(true)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md hover:scale-[1.02] ${
                  darStatus?.isSubmitted
                    ? "bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md"
                    : "bg-white hover:bg-zinc-200 text-black border border-white"
                }`}
              >
                {darStatus?.isSubmitted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Today's DAR: Submitted ✓</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-black" />
                    <span>Submit Today's DAR →</span>
                  </>
                )}
              </button>

              {briefing?.overdueFollowUpsCount > 0 && (
                <div className="flex items-center space-x-2 bg-rose-950/80 border border-rose-500/30 px-3.5 py-2.5 rounded-xl backdrop-blur-md">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                    {briefing.overdueFollowUpsCount} Overdue
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                {briefing?.hotLeadsCount ?? 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                🔥 Hot Leads
              </div>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                {briefing?.callsLoggedToday ?? 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                📞 Calls Today
              </div>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                {briefing?.followUpsDueToday ?? 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                ⏰ Due Today
              </div>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-300 font-mono">
                {briefing?.overdueFollowUpsCount ?? 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                ⚠️ Overdue
              </div>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                {briefing?.upcomingSiteVisitsCount ?? 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                🏠 Site Visits
              </div>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400 font-mono">
                {briefing?.activeOpportunitiesCount ?? 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                💰 Active Deals
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Action Grid: Quick Access • Call Floor & Operations */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          Quick Access • Call Floor & Operations
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                onClick={card.action}
                className="bg-white hover:bg-zinc-50 p-5 rounded-2xl border border-zinc-200/90 shadow-sm hover:shadow-md hover:border-black transition-all duration-200 text-left group flex items-start space-x-3.5"
              >
                <div
                  className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="font-bold text-sm text-zinc-950 group-hover:text-zinc-600 transition-colors truncate font-serif">
                      {card.title}
                    </div>
                    {card.badge && (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${card.badgeColor || "bg-zinc-100 text-zinc-700"}`}>
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 truncate font-light">{card.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. AUTOMATION: "WHAT SHOULD I DO NEXT?" DAILY PRIORITY ACTION QUEUE */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-zinc-950 flex items-center space-x-2">
                <span>Today's Priority: What Should I Do Next?</span>
              </h2>
              <p className="text-xs text-zinc-500 font-light mt-0.5">
                Ranked dynamically by buying timeline, lead score, overdue urgency, and deal value.
              </p>
            </div>
          </div>

          <Link
            href="/leads"
            className="text-xs font-bold uppercase tracking-wider text-zinc-900 hover:text-black flex items-center space-x-1 self-start sm:self-auto group"
          >
            <span>View All Leads</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {briefing?.topPriorities?.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-200/60 font-medium">
            🎉 All priorities clear! No overdue follow-ups or pending actions right now.
          </div>
        ) : (
          <div className="space-y-3">
            {briefing?.topPriorities?.map((item: any, idx: number) => {
              const isRevealed = revealedPhones.has(item.leadId);
              const displayPhone = isRevealed ? item.phone : maskPhoneNumber(item.phone);

              return (
                <div
                  key={item.leadId}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                    item.followUpStatus === "OVERDUE"
                      ? "bg-rose-50/30 border-rose-200 hover:border-rose-300"
                      : item.scoreCategory === "HOT"
                      ? "bg-zinc-50 border-zinc-300 hover:border-black"
                      : "bg-white border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left: Lead Profile & Explainable Priority */}
                    <div className="flex items-start space-x-3.5">
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-mono font-bold text-zinc-400">#{idx + 1}</span>
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs mt-1 border ${
                            item.scoreCategory === "HOT"
                              ? "bg-zinc-900 text-white border-black"
                              : item.scoreCategory === "WARM"
                              ? "bg-zinc-100 text-zinc-800 border-zinc-300"
                              : "bg-zinc-50 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {item.scoreCategory === "HOT" ? "🔥" : "🟡"}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <Link
                            href={`/leads/${item.leadId}`}
                            className="font-serif font-bold text-base text-zinc-950 hover:text-zinc-600 transition"
                          >
                            {item.name}
                          </Link>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {item.leadCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              item.scoreCategory === "HOT"
                                ? "bg-zinc-950 text-white border-black"
                                : "bg-zinc-100 text-zinc-700 border-zinc-200"
                            }`}
                          >
                            Score: {item.leadScore} ({item.scoreCategory})
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                            Priority: {item.priorityRankScore}/100
                          </span>
                        </div>

                        <div className="text-xs text-zinc-600 flex items-center space-x-3 flex-wrap">
                          {item.budget && <span className="font-semibold text-zinc-900">{item.budget}</span>}
                          {item.preferredLocation && <span>• {item.preferredLocation}</span>}
                          {item.configuration && <span>• {item.configuration}</span>}
                          <span className="font-mono text-zinc-600">
                            {displayPhone}
                            {!isRevealed && (
                              <button
                                onClick={() => toggleRevealPhone(item.leadId)}
                                className="ml-2 text-[10px] text-zinc-900 hover:underline font-bold uppercase tracking-wider"
                              >
                                Reveal
                              </button>
                            )}
                          </span>
                        </div>

                        {/* Explainable Rank Reason & Recommended Action */}
                        <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
                          <span className="text-[11px] font-medium text-zinc-500">
                            {item.rankReason}
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className="text-[11px] font-bold text-zinc-900 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                            🎯 Next Action: {item.recommendedAction}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: 1-Click Quick Actions */}
                    <div className="flex items-center space-x-2 self-end lg:self-center shrink-0">
                      <a
                        href={getWhatsAppUrl(item.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 text-emerald-700 hover:bg-emerald-50 rounded-xl transition border border-emerald-200"
                        title="WhatsApp Client"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>

                      {isRevealed ? (
                        <a
                          href={`tel:${item.phone}`}
                          onClick={() =>
                            setActiveCallLead({
                              id: item.leadId,
                              name: item.name,
                              phone: item.phone,
                              leadCode: item.leadCode,
                              stage: item.stage,
                              priority: item.scoreCategory,
                            })
                          }
                          className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call ({item.phone})</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            toggleRevealPhone(item.leadId);
                            setActiveCallLead({
                              id: item.leadId,
                              name: item.name,
                              phone: item.phone,
                              leadCode: item.leadCode,
                              stage: item.stage,
                              priority: item.scoreCategory,
                            });
                          }}
                          className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-800 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Reveal & Call</span>
                        </button>
                      )}

                      <Link
                        href={`/leads/${item.leadId}`}
                        className="p-2.5 text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-xl transition border border-zinc-200"
                        title="Open Lead 360"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Call Logger Modal */}
      {activeCallLead && (
        <LogCallModal
          lead={activeCallLead}
          onClose={() => setActiveCallLead(null)}
          onSuccess={fetchDashboardData}
        />
      )}

      {/* Daily Activity Report (DAR) Modal */}
      <DailyActivityReportModal
        isOpen={darModalOpen}
        onClose={() => setDarModalOpen(false)}
        onSuccess={fetchDashboardData}
        user={user}
      />
    </div>
  );
}

