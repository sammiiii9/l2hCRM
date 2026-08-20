"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  BarChart3,
  Users,
  Key,
  History,
  Trash2,
  Settings,
  Plus,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  UserPlus,
  Building,
  DollarSign,
  TrendingUp,
  Bell,
  Zap,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  AlertTriangle,
  Play,
  FileText,
  PhoneCall,
  Clock,
  UserCheck,
  UserMinus,
  MapPin,
  Eye,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { formatINR, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default function AdminControlPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "ANALYTICS" | "DAR" | "ALERTS" | "AUTOMATION" | "USERS" | "ROLES" | "AUDIT" | "TRASH" | "SETTINGS"
  >("ANALYTICS");

  // State
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  
  // DAR State
  const [darData, setDarData] = useState<any>(null);
  const [darDateFilter, setDarDateFilter] = useState<string>(new Date().toISOString().split("T")[0]);
  const [darTeamFilter, setDarTeamFilter] = useState<string>("ALL");
  const [darUserFilter, setDarUserFilter] = useState<string>("ALL");
  const [darStatusFilter, setDarStatusFilter] = useState<string>("ALL");
  const [darScreenshotModal, setDarScreenshotModal] = useState<{ url: string; name: string } | null>(null);
  const [darLoading, setDarLoading] = useState(false);
  
  // Automation State
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertCounts, setAlertCounts] = useState<any>({ critical: 0, warning: 0, info: 0, totalOpen: 0 });
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>("ALL");
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>("OPEN");
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [automationSummary, setAutomationSummary] = useState<any>(null);
  const [runningCron, setRunningCron] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserStaffCode, setNewUserStaffCode] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("agent123");
  const [newUserRoleId, setNewUserRoleId] = useState("");
  const [newUserTeam, setNewUserTeam] = useState("Team Alpha");
  const [newUserDesignation, setNewUserDesignation] = useState("Associate");
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [
        analyticsRes,
        usersRes,
        rolesRes,
        auditRes,
        trashRes,
        settingsRes,
        alertsRes,
        autoSettingsRes,
        autoSummaryRes,
        darRes,
      ] = await Promise.all([
        fetch("/api/analytics/admin"),
        fetch("/api/users"),
        fetch("/api/roles"),
        fetch("/api/audit-logs"),
        fetch("/api/trash"),
        fetch("/api/settings"),
        fetch(`/api/automation/alerts?status=${alertStatusFilter}&severity=${alertSeverityFilter}`),
        fetch("/api/automation/settings"),
        fetch("/api/admin/automation-summary"),
        fetch(`/api/dar?date=${darDateFilter}&team=${darTeamFilter !== "ALL" ? darTeamFilter : ""}&userId=${darUserFilter !== "ALL" ? darUserFilter : ""}&status=${darStatusFilter !== "ALL" ? darStatusFilter : ""}`),
      ]);

      const [aData, uData, rData, audData, tData, sData, alData, autoSetData, autoSumData, dData] =
        await Promise.all([
          analyticsRes.json(),
          usersRes.json(),
          rolesRes.json(),
          auditRes.json(),
          trashRes.json(),
          settingsRes.json(),
          alertsRes.json(),
          autoSettingsRes.json(),
          autoSummaryRes.json(),
          darRes.json(),
        ]);

      if (aData.success) setAnalytics(aData.data);
      if (uData.success) setUsers(uData.data || []);
      if (rData.success) {
        setRoles(rData.data || []);
        if (rData.data?.length > 0) setNewUserRoleId(rData.data[0].id);
      }
      if (audData.success) setAuditLogs(audData.data || []);
      if (tData.success) setTrashItems(tData.data || []);
      if (sData.success) setSettings(sData.data || []);
      if (alData.success) {
        setAlerts(alData.data.alerts || []);
        setAlertCounts(alData.data.counts || { critical: 0, warning: 0, info: 0, totalOpen: 0 });
      }
      if (autoSetData.success) {
        setAutomationRules(autoSetData.data.rules || []);
      }
      if (autoSumData.success) {
        setAutomationSummary(autoSumData.data);
      }
      if (dData.success) {
        setDarData(dData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDarReports = async () => {
    try {
      setDarLoading(true);
      const res = await fetch(
        `/api/dar?date=${darDateFilter}&team=${darTeamFilter !== "ALL" ? darTeamFilter : ""}&userId=${darUserFilter !== "ALL" ? darUserFilter : ""}&status=${darStatusFilter !== "ALL" ? darStatusFilter : ""}`
      );
      const data = await res.json();
      if (data.success) {
        setDarData(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch DAR reports:", err);
    } finally {
      setDarLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin, alertStatusFilter, alertSeverityFilter]);

  useEffect(() => {
    if (isAdmin) {
      fetchDarReports();
    }
  }, [darDateFilter, darTeamFilter, darUserFilter, darStatusFilter]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/automation/alerts/${alertId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESOLVE" }),
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/automation/alerts/${alertId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISMISS" }),
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/automation/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, isEnabled: !currentEnabled }),
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunScheduler = async () => {
    try {
      setRunningCron(true);
      const res = await fetch("/api/automation/cron", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("⚡ Background Automation Scheduler completed successfully!");
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningCron(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          phone: newUserPhone,
          staffCode: newUserStaffCode,
          password: newUserPassword,
          roleId: newUserRoleId,
          teamName: newUserTeam,
          designation: newUserDesignation,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreateUserOpen(false);
        fetchAdminData();
      } else {
        alert(data.message || "Failed to create user.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleApproveUser = async (userId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAdminData();
      } else {
        alert(data.message || "Failed to update user approval status.");
      }
    } catch (err) {
      console.error("handleApproveUser error:", err);
    }
  };

  const handleRestore = async (entity: string, id: string) => {
    try {
      const res = await fetch("/api/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Record restored successfully.");
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Administrator Access Required</h2>
        <p className="text-xs text-slate-500">
          The Admin Control Center is restricted to system administrators.
        </p>
      </div>
    );
  }

  const kpis = analytics?.kpis || {};

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-zinc-950" />
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950 tracking-tight">
              Admin Control Center
            </h1>
          </div>
          <p className="text-xs text-zinc-500 font-light mt-0.5">
            System governance, real-time DAR compliance audit, automation rules, staff management, and immutable audit trails.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-zinc-100 p-1.5 rounded-2xl flex items-center space-x-1 border border-zinc-200 overflow-x-auto no-scrollbar">
          {[
            { key: "ANALYTICS", label: "Analytics", icon: BarChart3 },
            {
              key: "DAR",
              label: `DAR Reports ${darData?.compliance ? `(${darData.compliance.submittedCount}/${darData.compliance.totalActiveMembers})` : ""}`,
              icon: FileText,
              badge: darData?.compliance?.missingCount > 0 ? "bg-amber-500 text-white" : undefined,
            },
            {
              key: "ALERTS",
              label: `Alert Center ${alertCounts.totalOpen > 0 ? `(${alertCounts.totalOpen})` : ""}`,
              icon: Bell,
              badge: alertCounts.critical > 0 ? "bg-rose-500 text-white" : undefined,
            },
            { key: "AUTOMATION", label: "Automation Engine", icon: Zap },
            {
              key: "USERS",
              label: `Staff & Approvals ${users.filter((u) => u.status === "PENDING_APPROVAL").length > 0 ? `(${users.filter((u) => u.status === "PENDING_APPROVAL").length} Pending)` : `(${users.length})`}`,
              icon: Users,
              badge: users.filter((u) => u.status === "PENDING_APPROVAL").length > 0 ? "bg-amber-500 text-white" : undefined,
            },
            { key: "ROLES", label: "RBAC Matrix", icon: Key },
            { key: "AUDIT", label: "Audit Logs", icon: History },
            { key: "TRASH", label: `Recycle Bin (${trashItems.length})`, icon: Trash2 },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`flex items-center px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl whitespace-nowrap transition ${
                  activeTab === t.key
                    ? "bg-black text-white shadow-sm"
                    : "text-zinc-600 hover:text-black hover:bg-zinc-200/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                <span>{t.label}</span>
                {t.badge && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-black ${t.badge}`}>
                    !
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: EXECUTIVE LIVE ANALYTICS */}
      {activeTab === "ANALYTICS" && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Leads</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{kpis.totalLeads ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Qualified</div>
              <div className="text-2xl font-black text-indigo-600 mt-1">{kpis.qualifiedLeads ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Site Visits</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{kpis.siteVisits ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Bookings Won</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{kpis.totalBookings ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Deal Value</div>
              <div className="text-base font-black text-slate-900 mt-1">
                {formatINR(kpis.totalDealValue ?? 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Token Revenue</div>
              <div className="text-base font-black text-emerald-600 mt-1">
                {formatINR(kpis.totalTokenCollected ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY ACTIVITY REPORTS (DAR) */}
      {activeTab === "DAR" && (
        <div className="space-y-6">
          {/* Top Aggregate Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Team Compliance</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  (darData?.compliance?.complianceRate ?? 0) >= 80
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {darData?.compliance?.complianceRate ?? 0}%
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 mt-1">
                {darData?.compliance?.submittedCount ?? 0} / {darData?.compliance?.totalActiveMembers ?? 0}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Members submitted today</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Calls</span>
                <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-xl font-black text-indigo-600 mt-1">
                {darData?.aggregates?.totalCalls ?? 0}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Calls logged across team</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Talk Time</span>
                <Clock className="w-3.5 h-3.5 text-cyan-500" />
              </div>
              <div className="text-xl font-black text-cyan-600 mt-1">
                {darData?.aggregates?.totalTalkTimeMinutes ?? 0} <span className="text-xs font-bold text-slate-400">min</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                ≈ {((darData?.aggregates?.totalTalkTimeMinutes ?? 0) / 60).toFixed(1)} hours duration
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Prospects & Suspects</span>
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-600 mt-1">
                {darData?.aggregates?.totalProspects ?? 0} <span className="text-xs font-bold text-slate-400 font-normal">/ {darData?.aggregates?.totalSuspects ?? 0}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">High intent / new leads</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Meetings & Visits</span>
                <MapPin className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-xl font-black text-purple-600 mt-1">
                {darData?.aggregates?.totalMeetings ?? 0} <span className="text-xs font-bold text-slate-400 font-normal">/ {darData?.aggregates?.totalVisits ?? 0}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Client interactions closed</p>
            </div>
          </div>

          {/* Missing Submissions Alert */}
          {darData?.compliance?.missingMembers?.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs text-amber-900">
                    {darData.compliance.missingCount} Member(s) Have Not Submitted Today's DAR:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {darData.compliance.missingMembers.map((m: any) => (
                      <span
                        key={m.id}
                        className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-medium text-[11px] border border-amber-200"
                      >
                        {m.name} {m.staffCode ? `(${m.staffCode})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Date:</span>
                <input
                  type="date"
                  value={darDateFilter}
                  onChange={(e) => setDarDateFilter(e.target.value)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Team Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Team:</span>
                <select
                  value={darTeamFilter}
                  onChange={(e) => setDarTeamFilter(e.target.value)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Teams</option>
                  <option value="Team Alpha">Team Alpha</option>
                  <option value="Team Beta">Team Beta</option>
                  <option value="Team Adrash">Team Adrash</option>
                </select>
              </div>

              {/* Staff Member Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Member:</span>
                <select
                  value={darUserFilter}
                  onChange={(e) => setDarUserFilter(e.target.value)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Members</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.staffCode || u.teamName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDarDateFilter(new Date().toISOString().split("T")[0]);
                  setDarTeamFilter("ALL");
                  setDarUserFilter("ALL");
                  setDarStatusFilter("ALL");
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition"
              >
                Reset Filters
              </button>
              <button
                onClick={fetchDarReports}
                disabled={darLoading}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${darLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Daily Activity Reports — {darData?.formattedDate || darDateFilter}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified activity metrics and Callyzer call screenshot proofs
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {darData?.dars?.length ?? 0} Submissions Recorded
              </span>
            </div>

            {darLoading ? (
              <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Loading activity reports...</span>
              </div>
            ) : darData?.dars?.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No DAR submissions found for the selected date and filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-700">
                    <tr>
                      <th className="py-3.5 px-4 text-left">Member</th>
                      <th className="py-3.5 px-4 text-left">Team</th>
                      <th className="py-3.5 px-3 text-center">Calls</th>
                      <th className="py-3.5 px-3 text-center">Talk Time</th>
                      <th className="py-3.5 px-3 text-center">Prospects</th>
                      <th className="py-3.5 px-3 text-center">Suspects</th>
                      <th className="py-3.5 px-3 text-center">Meetings</th>
                      <th className="py-3.5 px-3 text-center">Visits</th>
                      <th className="py-3.5 px-4 text-center">Callyzer Report</th>
                      <th className="py-3.5 px-4 text-left">Submitted At</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {darData?.dars?.map((dar: any) => (
                      <tr key={dar.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{dar.user?.name}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {dar.user?.staffCode || dar.user?.email}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {dar.user?.teamName || "--"}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-indigo-600 font-mono text-sm">
                          {dar.calls}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-xs">
                          <span className="font-bold text-slate-900">{dar.talkTimeMinutes}</span>{" "}
                          <span className="text-slate-400 font-medium">min</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-emerald-600 font-mono">
                          {dar.prospects}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-amber-600 font-mono">
                          {dar.suspects}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-purple-600 font-mono">
                          {dar.meetings}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-rose-600 font-mono">
                          {dar.visits}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {dar.callyzerScreenshot ? (
                            <button
                              onClick={() =>
                                setDarScreenshotModal({
                                  url: dar.callyzerScreenshot,
                                  name: `${dar.user?.name} - ${dar.dateString}`,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Proof</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(dar.updatedAt || dar.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Submitted</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CENTRALIZED ADMIN ALERT CENTER */}
      {activeTab === "ALERTS" && (
        <div className="space-y-4">
          {/* Top Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Filter Severity:</span>
              {["ALL", "CRITICAL", "WARNING", "INFO"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setAlertSeverityFilter(sev)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    alertSeverityFilter === sev
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sev === "CRITICAL" ? "🔴 Critical" : sev === "WARNING" ? "🟠 Warning" : sev === "INFO" ? "🔵 Info" : "All"}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              {["OPEN", "RESOLVED", "ALL"].map((st) => (
                <button
                  key={st}
                  onClick={() => setAlertStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    alertStatusFilter === st
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-xs text-slate-400 border border-slate-200">
                🎉 No active alerts matching filter. All systems operational.
              </div>
            ) : (
              alerts.map((al) => (
                <div
                  key={al.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    al.severity === "CRITICAL"
                      ? "bg-rose-50/40 border-rose-200"
                      : al.severity === "WARNING"
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            al.severity === "CRITICAL"
                              ? "bg-rose-600 text-white"
                              : al.severity === "WARNING"
                              ? "bg-amber-500 text-white"
                              : "bg-indigo-600 text-white"
                          }`}
                        >
                          {al.severity}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-900">{al.title}</h4>
                        <span className="text-[10px] text-slate-400">{formatRelativeTime(al.createdAt)}</span>
                      </div>

                      <p className="text-xs text-slate-600">{al.description}</p>

                      {al.recommendedAction && (
                        <div className="text-[11px] font-bold text-emerald-800 bg-emerald-100/60 px-2.5 py-1 rounded-md inline-flex items-center space-x-1 mt-1">
                          <span>🎯 Recommended Action:</span>
                          <span>{al.recommendedAction}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {al.linkUrl && (
                        <Link
                          href={al.linkUrl}
                          className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 rounded-xl transition flex items-center space-x-1"
                        >
                          <span>View Entity</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}

                      {al.status === "OPEN" && (
                        <>
                          <button
                            onClick={() => handleResolveAlert(al.id)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center space-x-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>

                          <button
                            onClick={() => handleDismissAlert(al.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
                            title="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUTOMATION RULES & SCHEDULER */}
      {activeTab === "AUTOMATION" && (
        <div className="space-y-6">
          {/* Automation Summary Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold">L2H Automation & Event Engine</h3>
              </div>
              <p className="text-xs text-indigo-200">
                Automating follow-up generation, explainable scoring, overdue escalations, and duplicate detection.
              </p>
            </div>

            <button
              onClick={handleRunScheduler}
              disabled={runningCron}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center space-x-2 shrink-0 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${runningCron ? "animate-spin" : ""}`} />
              <span>{runningCron ? "Running Scheduler..." : "Run Periodic Jobs Now"}</span>
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Active Rules</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {automationSummary?.rules?.active ?? 0} / {automationSummary?.rules?.total ?? 0}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Auto Follow-ups</div>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {automationSummary?.executions?.automatedFollowUps ?? 0}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Hot Leads (70+)</div>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {automationSummary?.leadScoring?.hot ?? 0}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Executions</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {automationSummary?.executions?.total ?? 0}
              </div>
            </div>
          </div>

          {/* Configurable Automation Rules Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Configurable Automation Workflows</h3>

            <div className="space-y-3">
              {automationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900">{rule.name}</span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                        {rule.eventType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{rule.description}</p>
                  </div>

                  <button
                    onClick={() => handleToggleRule(rule.id, rule.isEnabled)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      rule.isEnabled
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {rule.isEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & STAFF MANAGEMENT + PENDING APPROVALS */}
      {activeTab === "USERS" && (
        <div className="space-y-6">
          {/* Pending Registrations & Approvals Queue */}
          {users.filter((u) => u.status === "PENDING_APPROVAL").length > 0 && (
            <div className="bg-amber-50/50 border-2 border-amber-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                  <h3 className="font-serif font-bold text-base text-amber-950">
                    Pending Advisor Registrations ({users.filter((u) => u.status === "PENDING_APPROVAL").length})
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-amber-800 font-light">
                New advisors and sales associates registered via Email or Google awaiting activation by Team Leads (Shahrukh Ali / Shahnawaz Khan).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {users
                  .filter((u) => u.status === "PENDING_APPROVAL")
                  .map((u) => (
                    <div
                      key={u.id}
                      className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-serif font-bold text-sm text-zinc-950">{u.name}</h4>
                          <div className="text-[11px] text-zinc-500 font-mono">{u.email}</div>
                          <div className="text-[11px] text-zinc-600 font-mono">{u.phone || "--"}</div>
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          {u.staffCode}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Designation:</span>
                          <span className="font-bold text-zinc-900">{u.designation || "Sales Associate"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Team Lead:</span>
                          <span className="font-bold text-zinc-900">{u.teamLeadName || u.teamName || "Shahrukh Ali"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Date of Joining:</span>
                          <span className="font-medium text-zinc-800">
                            {u.dateOfJoining ? new Date(u.dateOfJoining).toLocaleDateString("en-IN") : "Today"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Auth Method:</span>
                          <span className="font-bold uppercase text-[10px] text-indigo-600">
                            {u.authProvider || "EMAIL"}
                          </span>
                        </div>
                      </div>

                      {/* Approval Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleApproveUser(u.id, "APPROVE")}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Activate</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to reject registration for ${u.name}?`)) {
                              handleApproveUser(u.id, "REJECT");
                            }
                          }}
                          className="py-2 px-3 bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 text-zinc-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-200 transition"
                          title="Reject Registration"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Active Staff & Associates Table */}
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-zinc-950">Active Staff & Associates</h3>
            <button
              onClick={() => setCreateUserOpen(true)}
              className="px-3.5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center space-x-1.5 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-zinc-200 text-xs">
              <thead className="bg-zinc-50 font-bold text-zinc-700">
                <tr>
                  <th className="py-3.5 px-4 text-left font-serif">Staff Name</th>
                  <th className="py-3.5 px-4 text-left">Email & Phone</th>
                  <th className="py-3.5 px-4 text-left">Role</th>
                  <th className="py-3.5 px-4 text-left">Team & Designation</th>
                  <th className="py-3.5 px-4 text-left">DOJ</th>
                  <th className="py-3.5 px-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900 font-serif">{u.name}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-600">
                      {u.email} • {u.phone || "--"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {u.role?.name || "Associate"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600">
                      {u.teamName} ({u.designation})
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                      {u.dateOfJoining ? new Date(u.dateOfJoining).toLocaleDateString("en-IN") : "--"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          u.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : u.status === "PENDING_APPROVAL"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: RBAC MATRIX */}
      {activeTab === "ROLES" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Role-Based Access Control (RBAC) Matrix</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-sm text-slate-900">{r.name}</div>
                <div className="font-mono text-[11px] text-indigo-600 font-bold">{r.slug}</div>
                <p className="text-xs text-slate-500">{r.description}</p>
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-200">
                  {r.permissions?.length || 0} permissions assigned
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === "AUDIT" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Immutable Audit Trail</h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{log.userName || "SYSTEM"}</span>
                  <span className="text-slate-500 ml-2 font-mono">[{log.action}]</span>
                  <span className="text-slate-700 ml-2">{log.entity} {log.entityCode || log.entityId}</span>
                  {log.newValue && <span className="text-slate-500 text-[11px] ml-2 block sm:inline">• {log.newValue}</span>}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: RECYCLE BIN */}
      {activeTab === "TRASH" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Recycle Bin (Soft Deleted Records)</h3>
          {trashItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Recycle bin is empty.</div>
          ) : (
            <div className="space-y-2">
              {trashItems.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{item.name || item.bookingCode || item.leadCode}</span>
                    <span className="text-slate-500 ml-2">({item.entity})</span>
                    <span className="text-rose-600 text-[11px] ml-2">• Reason: {item.deletedReason || "Deleted by user"}</span>
                  </div>
                  <button
                    onClick={() => handleRestore(item.entity, item.id)}
                    className="px-3 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {createUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Add New Staff / Associate Account</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Staff Code *</label>
                  <input
                    type="text"
                    required
                    value={newUserStaffCode}
                    onChange={(e) => setNewUserStaffCode(e.target.value)}
                    placeholder="e.g. AGT-101"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={newUserRoleId}
                    onChange={(e) => setNewUserRoleId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateUserOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                >
                  {creatingUser ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Callyzer Screenshot Full Preview Modal */}
      {darScreenshotModal && (
        <div
          onClick={() => setDarScreenshotModal(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">
                  {darScreenshotModal.name} — Callyzer Report Screenshot
                </span>
              </div>
              <button
                onClick={() => setDarScreenshotModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-950">
              <img
                src={darScreenshotModal.url}
                alt="Full Screenshot Preview"
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
