"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  BarChart3,
  Users,
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
  Edit2,
  MoreVertical,
  Briefcase,
  Layers,
  Search,
  Filter,
  Shield,
} from "lucide-react";
import { formatINR, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default function AdminControlPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "ANALYTICS" | "TEAMS" | "USERS" | "DAR" | "ALERTS" | "AUTOMATION" | "TRASH"
  >("ANALYTICS");

  // Loaded tabs tracker for lazy loading
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(["ANALYTICS"]));

  // Global State
  const [analytics, setAnalytics] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User Filter & Search State
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userTeamFilter, setUserTeamFilter] = useState("ALL");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");

  // DAR State
  const [darData, setDarData] = useState<any>(null);
  const [darDateFilter, setDarDateFilter] = useState<string>(new Date().toISOString().split("T")[0]);
  const [darTeamFilter, setDarTeamFilter] = useState<string>("ALL");
  const [darUserFilter, setDarUserFilter] = useState<string>("ALL");
  const [darStatusFilter, setDarStatusFilter] = useState<string>("ALL");
  const [darScreenshotModal, setDarScreenshotModal] = useState<{ url: string; name: string } | null>(null);
  const [darLoading, setDarLoading] = useState(false);

  // Automation & Alerts State
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertCounts, setAlertCounts] = useState<any>({ critical: 0, warning: 0, info: 0, totalOpen: 0 });
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>("ALL");
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>("OPEN");
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [automationSummary, setAutomationSummary] = useState<any>(null);
  const [runningCron, setRunningCron] = useState(false);

  // Staff Modals State
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserStaffCode, setNewUserStaffCode] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("agent123");
  const [newUserRoleId, setNewUserRoleId] = useState("");
  const [newUserTeamId, setNewUserTeamId] = useState("");
  const [newUserTeamName, setNewUserTeamName] = useState("Direct Sales");
  const [newUserDesignation, setNewUserDesignation] = useState("Sales Associate");
  const [newUserLocation, setNewUserLocation] = useState("Noida");
  const [newUserProperty, setNewUserProperty] = useState("RESIDENTIAL_APARTMENT");
  const [newUserMaxLoad, setNewUserMaxLoad] = useState(50);
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit Staff Modal State
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPhone, setEditUserPhone] = useState("");
  const [editUserStaffCode, setEditUserStaffCode] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserRoleId, setEditUserRoleId] = useState("");
  const [editUserTeamId, setEditUserTeamId] = useState("");
  const [editUserTeamName, setEditUserTeamName] = useState("");
  const [editUserDesignation, setEditUserDesignation] = useState("");
  const [editUserStatus, setEditUserStatus] = useState("ACTIVE");
  const [editUserLocation, setEditUserLocation] = useState("Noida");
  const [editUserProperty, setEditUserProperty] = useState("RESIDENTIAL_APARTMENT");
  const [editUserMaxLoad, setEditUserMaxLoad] = useState(50);
  const [savingUser, setSavingUser] = useState(false);

  // Team Modals State
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamLeaderId, setTeamLeaderId] = useState("");
  const [teamLocation, setTeamLocation] = useState("Noida");
  const [teamIsActive, setTeamIsActive] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);

  // Initial Load: Fetch essential data
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch tab-specific data on tab switch
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, usersRes, rolesRes, teamsRes] = await Promise.all([
        fetch("/api/analytics/admin"),
        fetch("/api/users"),
        fetch("/api/roles"),
        fetch("/api/teams"),
      ]);

      const [aData, uData, rData, tmData] = await Promise.all([
        analyticsRes.json(),
        usersRes.json(),
        rolesRes.json(),
        teamsRes.json(),
      ]);

      if (aData.success) setAnalytics(aData.data);
      if (uData.success) setUsers(uData.data || []);
      if (tmData.success) {
        setTeams(tmData.data || []);
        if (tmData.data?.length > 0) {
          setNewUserTeamId(tmData.data[0].id);
          setNewUserTeamName(tmData.data[0].name);
        }
      }
      if (rData.success) {
        setRoles(rData.data || []);
        if (rData.data?.length > 0) setNewUserRoleId(rData.data[0].id);
      }
    } catch (err) {
      console.error("fetchInitialData error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (tab: typeof activeTab) => {
    try {
      if (tab === "TEAMS") {
        const res = await fetch("/api/teams");
        const json = await res.json();
        if (json.success) setTeams(json.data || []);
      } else if (tab === "USERS") {
        const [uRes, tRes, rRes] = await Promise.all([fetch("/api/users"), fetch("/api/teams"), fetch("/api/roles")]);
        const [uData, tData, rData] = await Promise.all([uRes.json(), tRes.json(), rRes.json()]);
        if (uData.success) setUsers(uData.data || []);
        if (tData.success) setTeams(tData.data || []);
        if (rData.success) setRoles(rData.data || []);
      } else if (tab === "DAR") {
        fetchDarReports();
      } else if (tab === "ALERTS") {
        const res = await fetch(`/api/automation/alerts?status=${alertStatusFilter}&severity=${alertSeverityFilter}`);
        const json = await res.json();
        if (json.success) {
          setAlerts(json.data.alerts || []);
          setAlertCounts(json.data.counts || { critical: 0, warning: 0, info: 0, totalOpen: 0 });
        }
      } else if (tab === "AUTOMATION") {
        const [setRes, sumRes] = await Promise.all([
          fetch("/api/automation/settings"),
          fetch("/api/admin/automation-summary"),
        ]);
        const [setData, sumData] = await Promise.all([setRes.json(), sumRes.json()]);
        if (setData.success) setAutomationRules(setData.data.rules || []);
        if (sumData.success) setAutomationSummary(sumData.data);
      } else if (tab === "TRASH") {
        const res = await fetch("/api/trash");
        const json = await res.json();
        if (json.success) setTrashItems(json.data || []);
      }
      setLoadedTabs((prev) => new Set([...prev, tab]));
    } catch (err) {
      console.error(`Error loading tab ${tab}:`, err);
    }
  };

  const fetchDarReports = async () => {
    try {
      setDarLoading(true);
      const url = `/api/dar?date=${darDateFilter}&team=${darTeamFilter !== "ALL" ? encodeURIComponent(darTeamFilter) : ""}&userId=${darUserFilter !== "ALL" ? darUserFilter : ""}&status=${darStatusFilter !== "ALL" ? darStatusFilter : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setDarData(json.data);
    } catch (err) {
      console.error("fetchDarReports error:", err);
    } finally {
      setDarLoading(false);
    }
  };

  // ----------------------------------------------------
  // STAFF (USER) ACTIONS
  // ----------------------------------------------------
  const handleOpenCreateUser = () => {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPhone("");
    setNewUserStaffCode(`AGT-${Math.floor(100 + Math.random() * 900)}`);
    setNewUserPassword("agent123");
    if (roles.length > 0) setNewUserRoleId(roles.find((r) => r.slug === "MEMBER")?.id || roles[0].id);
    if (teams.length > 0) {
      setNewUserTeamId(teams[0].id);
      setNewUserTeamName(teams[0].name);
    }
    setNewUserDesignation("Sales Associate");
    setCreateUserOpen(true);
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
          teamId: newUserTeamId || null,
          teamName: newUserTeamName,
          designation: newUserDesignation,
          status: "ACTIVE",
          specializationLocation: newUserLocation,
          specializationProperty: newUserProperty,
          maxActiveLeadLoad: Number(newUserMaxLoad),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreateUserOpen(false);
        loadTabData("USERS");
        loadTabData("TEAMS");
      } else {
        alert(data.message || "Failed to create user.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleOpenEditUser = (u: any) => {
    setEditingUserId(u.id);
    setEditUserName(u.name || "");
    setEditUserEmail(u.email || "");
    setEditUserPhone(u.phone || "");
    setEditUserStaffCode(u.staffCode || "");
    setEditUserPassword("");
    setEditUserRoleId(u.role?.id || (roles.length > 0 ? roles[0].id : ""));
    setEditUserTeamId(u.teamId || "");
    setEditUserTeamName(u.teamName || "Direct Sales");
    setEditUserDesignation(u.designation || "Associate");
    setEditUserStatus(u.status || "ACTIVE");
    setEditUserLocation(u.specializationLocation || "Noida");
    setEditUserProperty(u.specializationProperty || "RESIDENTIAL_APARTMENT");
    setEditUserMaxLoad(u.maxActiveLeadLoad || 50);
    setEditUserModalOpen(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setSavingUser(true);
    try {
      const payload: any = {
        name: editUserName,
        email: editUserEmail,
        phone: editUserPhone,
        staffCode: editUserStaffCode,
        roleId: editUserRoleId,
        teamId: editUserTeamId || null,
        teamName: editUserTeamName,
        designation: editUserDesignation,
        status: editUserStatus,
        specializationLocation: editUserLocation,
        specializationProperty: editUserProperty,
        maxActiveLeadLoad: Number(editUserMaxLoad),
      };

      if (editUserPassword.trim().length > 0) {
        payload.password = editUserPassword.trim();
      }

      const res = await fetch(`/api/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditUserModalOpen(false);
        loadTabData("USERS");
        loadTabData("TEAMS");
      } else {
        alert(data.message || "Failed to update user.");
      }
    } catch (err) {
      console.error("handleSaveEditUser error:", err);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (targetUser: any, permanent: boolean = false) => {
    const promptMsg = permanent
      ? `Are you sure you want to PERMANENTLY DELETE ${targetUser.name}? This will remove all their data.`
      : `Are you sure you want to remove ${targetUser.name}? Their account will be deactivated.`;

    if (!confirm(promptMsg)) return;

    try {
      const res = await fetch(`/api/users/${targetUser.id}${permanent ? "?permanent=true" : ""}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loadTabData("USERS");
        loadTabData("TEAMS");
      } else {
        alert(data.message || "Failed to delete user.");
      }
    } catch (err) {
      console.error("handleDeleteUser error:", err);
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
        loadTabData("USERS");
      } else {
        alert(data.message || "Failed to update user approval status.");
      }
    } catch (err) {
      console.error("handleApproveUser error:", err);
    }
  };

  // ----------------------------------------------------
  // TEAMS ACTIONS
  // ----------------------------------------------------
  const handleOpenCreateTeam = () => {
    setTeamName("");
    setTeamCode("");
    setTeamDescription("");
    setTeamLeaderId(users.find((u) => u.role?.slug === "ADMIN" || u.role?.slug === "TEAM_LEAD")?.id || "");
    setTeamLocation("Noida");
    setCreateTeamOpen(true);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTeam(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          code: teamCode || undefined,
          description: teamDescription,
          leaderId: teamLeaderId || null,
          location: teamLocation,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreateTeamOpen(false);
        loadTabData("TEAMS");
      } else {
        alert(data.message || "Failed to create team.");
      }
    } catch (err) {
      console.error("handleCreateTeam error:", err);
    } finally {
      setSavingTeam(false);
    }
  };

  const handleOpenEditTeam = (t: any) => {
    setEditingTeamId(t.id);
    setTeamName(t.name || "");
    setTeamCode(t.code || "");
    setTeamDescription(t.description || "");
    setTeamLeaderId(t.leaderId || "");
    setTeamLocation(t.location || "Noida");
    setTeamIsActive(t.isActive !== false);
    setEditTeamOpen(true);
  };

  const handleSaveEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeamId) return;
    setSavingTeam(true);
    try {
      const res = await fetch(`/api/teams/${editingTeamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          code: teamCode,
          description: teamDescription,
          leaderId: teamLeaderId || null,
          location: teamLocation,
          isActive: teamIsActive,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditTeamOpen(false);
        loadTabData("TEAMS");
        loadTabData("USERS");
      } else {
        alert(data.message || "Failed to update team.");
      }
    } catch (err) {
      console.error("handleSaveEditTeam error:", err);
    } finally {
      setSavingTeam(false);
    }
  };

  const handleDeleteTeam = async (t: any) => {
    if (!confirm(`Are you sure you want to delete Team "${t.name}"? Members will be set to Unassigned.`)) return;
    try {
      const res = await fetch(`/api/teams/${t.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        loadTabData("TEAMS");
        loadTabData("USERS");
      } else {
        alert(data.message || "Failed to delete team.");
      }
    } catch (err) {
      console.error("handleDeleteTeam error:", err);
    }
  };

  // ----------------------------------------------------
  // AUTOMATION & ALERTS ACTIONS
  // ----------------------------------------------------
  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/automation/alerts/${alertId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESOLVE" }),
      });
      if (res.ok) loadTabData("ALERTS");
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
      if (res.ok) loadTabData("ALERTS");
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
      if (res.ok) loadTabData("AUTOMATION");
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
        loadTabData("AUTOMATION");
        loadTabData("ALERTS");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningCron(false);
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
        loadTabData("TRASH");
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

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      !userSearchQuery ||
      u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.phone?.includes(userSearchQuery) ||
      u.staffCode?.toLowerCase().includes(userSearchQuery.toLowerCase());

    const matchesTeam = userTeamFilter === "ALL" || u.teamName === userTeamFilter || u.teamId === userTeamFilter;
    const matchesRole = userRoleFilter === "ALL" || u.role?.slug === userRoleFilter || u.role?.name === userRoleFilter;
    const matchesStatus = userStatusFilter === "ALL" || u.status === userStatusFilter;

    return matchesQuery && matchesTeam && matchesRole && matchesStatus;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24">
      {/* 1. Admin Header & Tab Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-zinc-950" />
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950 tracking-tight">
              Admin & Operations Control
            </h1>
          </div>
          <p className="text-xs text-zinc-500 font-light mt-0.5">
            Full-control team hierarchy, real-time staff CRUD, daily DAR audits, and automation engine.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-zinc-100 p-1.5 rounded-2xl flex items-center space-x-1 border border-zinc-200 overflow-x-auto no-scrollbar shadow-inner">
          {[
            { key: "ANALYTICS", label: "Analytics", icon: BarChart3 },
            { key: "TEAMS", label: `Teams (${teams.length})`, icon: Building },
            {
              key: "USERS",
              label: `Staff & Members ${users.filter((u) => u.status === "PENDING_APPROVAL").length > 0 ? `(${users.filter((u) => u.status === "PENDING_APPROVAL").length} Pending)` : `(${users.length})`}`,
              icon: Users,
              badge: users.filter((u) => u.status === "PENDING_APPROVAL").length > 0 ? "bg-amber-500 text-white" : undefined,
            },
            {
              key: "DAR",
              label: `DAR Audit ${darData?.compliance ? `(${darData.compliance.submittedCount}/${darData.compliance.totalActiveMembers})` : ""}`,
              icon: FileText,
              badge: darData?.compliance?.missingCount > 0 ? "bg-amber-500 text-white" : undefined,
            },
            {
              key: "ALERTS",
              label: `Alerts ${alertCounts.totalOpen > 0 ? `(${alertCounts.totalOpen})` : ""}`,
              icon: Bell,
              badge: alertCounts.critical > 0 ? "bg-rose-500 text-white" : undefined,
            },
            { key: "AUTOMATION", label: "Automation Engine", icon: Zap },
            { key: "TRASH", label: `Trash (${trashItems.length})`, icon: Trash2 },
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Total Leads</div>
              <div className="text-2xl font-black text-zinc-900 mt-1">{kpis.totalLeads ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Qualified</div>
              <div className="text-2xl font-black text-indigo-600 mt-1">{kpis.qualifiedLeads ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Site Visits</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{kpis.siteVisits ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Bookings Won</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{kpis.totalBookings ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Total Deal Value</div>
              <div className="text-base font-black text-zinc-900 mt-1">
                {formatINR(kpis.totalDealValue ?? 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Token Revenue</div>
              <div className="text-base font-black text-emerald-600 mt-1">
                {formatINR(kpis.totalTokenCollected ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEAMS MANAGEMENT (FULL CRUD) */}
      {activeTab === "TEAMS" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-zinc-900" />
                <h3 className="font-serif font-bold text-lg text-zinc-950">Organizational Teams & Hierarchy</h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure teams, assign team leaders, manage location desks, and review performance capacity.
              </p>
            </div>
            <button
              onClick={handleOpenCreateTeam}
              className="px-4 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center space-x-2 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Team</span>
            </button>
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-3xl border border-zinc-200/90 shadow-sm p-5 space-y-4 hover:border-zinc-400 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-serif font-bold text-base text-zinc-950">{t.name}</h4>
                        {t.code && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {t.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-light mt-1">
                        {t.description || "Active operational sales team."}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.isActive ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Leader Info */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1 text-xs">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Team Leader
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-[10px] flex items-center justify-center">
                        {t.leader?.name ? t.leader.name.charAt(0).toUpperCase() : "TL"}
                      </div>
                      <div className="font-bold text-zinc-900">{t.leader?.name || "Unassigned"}</div>
                      {t.leader?.phone && (
                        <span className="text-zinc-500 font-mono text-[11px]">({t.leader.phone})</span>
                      )}
                    </div>
                  </div>

                  {/* Location & Members Count */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Desk Location</div>
                      <div className="font-bold text-zinc-800 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        <span>{t.location || "Noida"}</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Team Size</div>
                      <div className="font-bold text-zinc-800 flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-zinc-400" />
                        <span>{t.memberCount ?? t.members?.length ?? 0} Members</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Members Mini Avatars */}
                  {t.members && t.members.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Assigned Associates</div>
                      <div className="flex flex-wrap gap-1.5">
                        {t.members.slice(0, 5).map((m: any) => (
                          <span
                            key={m.id}
                            className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-200"
                          >
                            {m.name}
                          </span>
                        ))}
                        {t.members.length > 5 && (
                          <span className="px-2 py-0.5 rounded-lg bg-zinc-200 text-zinc-700 text-[11px] font-bold">
                            +{t.members.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Team Card Actions */}
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() => handleOpenEditTeam(t)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs transition flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    <span>Edit Team</span>
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(t)}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STAFF & MEMBERS MANAGEMENT (FULL CRUD) */}
      {activeTab === "USERS" && (
        <div className="space-y-6">
          {/* Pending Registrations & Approvals Queue */}
          {users.filter((u) => u.status === "PENDING_APPROVAL").length > 0 && (
            <div className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                  <h3 className="font-serif font-bold text-base text-amber-950">
                    Pending Advisor Registrations ({users.filter((u) => u.status === "PENDING_APPROVAL").length})
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-amber-900 font-light">
                New staff registrations awaiting activation. Review details and approve into active teams.
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
                          <span className="text-zinc-400">Assigned Team:</span>
                          <span className="font-bold text-zinc-900">{u.teamName || "Unassigned"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Date of Joining:</span>
                          <span className="font-medium text-zinc-800">
                            {u.dateOfJoining ? new Date(u.dateOfJoining).toLocaleDateString("en-IN") : "Today"}
                          </span>
                        </div>
                      </div>

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
                            if (confirm(`Reject registration for ${u.name}?`)) {
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

          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search by name, email, phone, staff code..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              {/* Team Filter */}
              <select
                value={userTeamFilter}
                onChange={(e) => setUserTeamFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:border-black"
              >
                <option value="ALL">All Teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:border-black"
              >
                <option value="ALL">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:border-black"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>

            <button
              onClick={handleOpenCreateUser}
              className="px-4 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center space-x-1.5 shadow-sm shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          {/* Active Staff & Teammates Table */}
          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-zinc-200 text-xs">
              <thead className="bg-zinc-50 font-bold text-zinc-700">
                <tr>
                  <th className="py-3.5 px-4 text-left font-serif">Staff Member</th>
                  <th className="py-3.5 px-4 text-left">Contact & Staff Code</th>
                  <th className="py-3.5 px-4 text-left">Role</th>
                  <th className="py-3.5 px-4 text-left">Team & Designation</th>
                  <th className="py-3.5 px-4 text-center">Active Leads</th>
                  <th className="py-3.5 px-4 text-left">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400 font-light">
                      No staff members match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-zinc-900 font-serif">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-950 font-serif">{u.name}</div>
                            <div className="text-[10px] text-zinc-400 font-normal">
                              {u.specializationLocation || "Noida"} • {u.specializationProperty || "Apartments"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-600">
                        <div>{u.email}</div>
                        <div className="text-zinc-500 font-bold">{u.phone || "--"}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px]">
                          {u.staffCode || "STAFF"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] border font-bold ${
                            u.role?.slug === "ADMIN"
                              ? "bg-purple-100 text-purple-900 border-purple-200"
                              : u.role?.slug === "TEAM_LEAD"
                              ? "bg-blue-100 text-blue-900 border-blue-200"
                              : "bg-zinc-100 text-zinc-800 border-zinc-200"
                          }`}
                        >
                          {u.role?.name || "Sales Associate"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600">
                        <div className="font-bold text-zinc-900">{u.teamName || "Unassigned"}</div>
                        <div className="text-zinc-500 text-[11px]">{u.designation || "Associate"}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-900">
                        {u._count?.assignedLeads ?? 0}
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
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="px-2.5 py-1 text-xs font-bold text-zinc-800 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition flex items-center gap-1"
                            title="Edit Teammate"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u, false)}
                            className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Deactivate / Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DAR AUDIT */}
      {activeTab === "DAR" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Team Compliance</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    (darData?.compliance?.complianceRate ?? 0) >= 80
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {darData?.compliance?.complianceRate ?? 0}%
                </span>
              </div>
              <div className="text-xl font-black text-zinc-900 mt-1">
                {darData?.compliance?.submittedCount ?? 0} / {darData?.compliance?.totalActiveMembers ?? 0}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Members submitted today</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Calls</span>
                <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-xl font-black text-zinc-900 mt-1">
                {darData?.totals?.totalCalls?.toLocaleString() ?? 0}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Logged calls</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Talk Time</span>
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-xl font-black text-zinc-900 mt-1">
                {darData?.totals?.formattedTotalTalkTime ?? "0h 0m"}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Floor talk duration</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Site Visits</span>
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-600 mt-1">
                {darData?.totals?.totalVisits ?? 0}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Conducted visits</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Prospects</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-600 mt-1">
                {darData?.totals?.totalProspects ?? 0}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Generated</p>
            </div>
          </div>

          {/* Dynamic Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-500">Date:</span>
                <input
                  type="date"
                  value={darDateFilter}
                  onChange={(e) => setDarDateFilter(e.target.value)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:border-black"
                />
              </div>

              {/* Dynamic Teams Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-500">Team:</span>
                <select
                  value={darTeamFilter}
                  onChange={(e) => setDarTeamFilter(e.target.value)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:border-black"
                >
                  <option value="ALL">All Teams</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Member Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-500">Member:</span>
                <select
                  value={darUserFilter}
                  onChange={(e) => setDarUserFilter(e.target.value)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:border-black"
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
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-xs font-medium transition"
              >
                Reset
              </button>
              <button
                onClick={fetchDarReports}
                disabled={darLoading}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${darLoading ? "animate-spin" : ""}`} />
                <span>Refresh Audit</span>
              </button>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">
                  Daily Activity Reports — {darData?.formattedDate || darDateFilter}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Verified activity metrics and Callyzer call screenshot proofs
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-xs">
                <thead className="bg-zinc-50 font-bold text-zinc-700">
                  <tr>
                    <th className="py-3 px-4 text-left">Staff Member</th>
                    <th className="py-3 px-4 text-left">Team & Designation</th>
                    <th className="py-3 px-4 text-center">Calls</th>
                    <th className="py-3 px-4 text-center">Talk Time</th>
                    <th className="py-3 px-4 text-center">Prospects</th>
                    <th className="py-3 px-4 text-center">Visits</th>
                    <th className="py-3 px-4 text-center">Proof Screenshot</th>
                    <th className="py-3 px-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {darData?.reports?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-400 font-light">
                        No Daily Activity Reports submitted for this date.
                      </td>
                    </tr>
                  ) : (
                    darData?.reports?.map((rep: any) => (
                      <tr key={rep.id} className="hover:bg-zinc-50 transition">
                        <td className="py-3 px-4 font-bold text-zinc-900 font-serif">
                          {rep.user?.name}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                          {rep.user?.teamName || "Direct Sales"} • {rep.user?.designation || "Associate"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-zinc-900">
                          {rep.calls}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">
                          {rep.formattedTalkTime || `${rep.talkTimeMinutes}m`}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                          {rep.prospects}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                          {rep.visits}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {rep.callyzerScreenshot ? (
                            <button
                              onClick={() =>
                                setDarScreenshotModal({
                                  url: rep.callyzerScreenshot,
                                  name: rep.user?.name,
                                })
                              }
                              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-lg text-[10px] border border-zinc-200 transition inline-flex items-center gap-1"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>View Proof</span>
                            </button>
                          ) : (
                            <span className="text-zinc-400 text-[10px]">No image</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {rep.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ALERTS */}
      {activeTab === "ALERTS" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900">Operational Alerts & SLA Watchdog</h3>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">No active alerts! Everything is operating normally.</div>
              ) : (
                alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            al.severity === "CRITICAL"
                              ? "bg-rose-100 text-rose-800"
                              : al.severity === "WARNING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {al.severity}
                        </span>
                        <span className="font-bold text-xs text-zinc-900">{al.title}</span>
                      </div>
                      <p className="text-xs text-zinc-600">{al.description}</p>
                    </div>

                    {al.status === "OPEN" && (
                      <button
                        onClick={() => handleResolveAlert(al.id)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUTOMATION */}
      {activeTab === "AUTOMATION" && (
        <div className="space-y-6">
          <div className="bg-zinc-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold">L2H Automation & Event Engine</h3>
              </div>
              <p className="text-xs text-zinc-300">
                Automating follow-up generation, explainable scoring, overdue escalations, and duplicate detection.
              </p>
            </div>

            <button
              onClick={handleRunScheduler}
              disabled={runningCron}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-xl shadow-lg transition flex items-center space-x-2 shrink-0 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${runningCron ? "animate-spin" : ""}`} />
              <span>{runningCron ? "Running..." : "Run Scheduler Jobs Now"}</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-zinc-200 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900">Configured Automation Rules</h3>
            <div className="space-y-3">
              {automationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between"
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-zinc-900">{rule.name}</span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800">
                        {rule.eventType}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{rule.description}</p>
                  </div>

                  <button
                    onClick={() => handleToggleRule(rule.id, rule.isEnabled)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      rule.isEnabled
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
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

      {/* TAB 7: RECYCLE BIN */}
      {activeTab === "TRASH" && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900">Recycle Bin (Soft Deleted Records)</h3>
          {trashItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">Recycle bin is empty.</div>
          ) : (
            <div className="space-y-2">
              {trashItems.map((item) => (
                <div key={item.id} className="p-3 bg-zinc-50 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-zinc-900">{item.name || item.bookingCode || item.leadCode}</span>
                    <span className="text-zinc-500 ml-2">({item.entity})</span>
                    <span className="text-rose-600 text-[11px] ml-2">• Reason: {item.deletedReason || "Deleted by user"}</span>
                  </div>
                  <button
                    onClick={() => handleRestore(item.entity, item.id)}
                    className="px-3 py-1 text-xs font-bold text-zinc-900 hover:bg-zinc-200 rounded-lg transition flex items-center space-x-1"
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

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Create Team Modal */}
      {createTeamOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-serif font-bold text-zinc-950 text-base">Create New Team Desk</h3>
              <button onClick={() => setCreateTeamOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Team Commercial Alpha"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Team Code</label>
                  <input
                    type="text"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    placeholder="e.g. TM-ALPHA"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Desk Location</label>
                  <input
                    type="text"
                    value={teamLocation}
                    onChange={(e) => setTeamLocation(e.target.value)}
                    placeholder="e.g. Noida Sector 150"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Assign Team Leader</label>
                <select
                  value={teamLeaderId}
                  onChange={(e) => setTeamLeaderId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                >
                  <option value="">-- No Leader Assigned --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role?.name || "Staff"} • {u.staffCode || u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Description / Focus</label>
                <textarea
                  rows={2}
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="e.g. Focus on luxury high-ticket residential apartments in Noida Expressway."
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setCreateTeamOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-xs transition"
                >
                  {savingTeam ? "Creating..." : "Save Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editTeamOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-serif font-bold text-zinc-950 text-base">Edit Team Details</h3>
              <button onClick={() => setEditTeamOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTeam} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Team Code</label>
                  <input
                    type="text"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Desk Location</label>
                  <input
                    type="text"
                    value={teamLocation}
                    onChange={(e) => setTeamLocation(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Assign Team Leader</label>
                <select
                  value={teamLeaderId}
                  onChange={(e) => setTeamLeaderId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                >
                  <option value="">-- No Leader Assigned --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role?.name || "Staff"} • {u.staffCode || u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="teamIsActive"
                  checked={teamIsActive}
                  onChange={(e) => setTeamIsActive(e.target.checked)}
                  className="rounded border-zinc-300 text-black focus:ring-black"
                />
                <label htmlFor="teamIsActive" className="text-xs font-bold text-zinc-800">
                  Team is Active & Open for Lead Assignment
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditTeamOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-xs transition"
                >
                  {savingTeam ? "Saving..." : "Update Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {createUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-serif font-bold text-zinc-950 text-base">Add New Staff / Teammate</h3>
              <button onClick={() => setCreateUserOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Rajesh Verma"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Staff Code *</label>
                  <input
                    type="text"
                    required
                    value={newUserStaffCode}
                    onChange={(e) => setNewUserStaffCode(e.target.value)}
                    placeholder="e.g. AGT-102"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="rajesh@l2hcrm.com"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Role *</label>
                  <select
                    value={newUserRoleId}
                    onChange={(e) => setNewUserRoleId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.slug})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Team *</label>
                  <select
                    value={newUserTeamId}
                    onChange={(e) => {
                      setNewUserTeamId(e.target.value);
                      const t = teams.find((tm) => tm.id === e.target.value);
                      if (t) setNewUserTeamName(t.name);
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={newUserDesignation}
                    onChange={(e) => setNewUserDesignation(e.target.value)}
                    placeholder="Senior Sales Advisor"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Specialization Location</label>
                  <input
                    type="text"
                    value={newUserLocation}
                    onChange={(e) => setNewUserLocation(e.target.value)}
                    placeholder="Noida / Gurugram"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Max Active Lead Load</label>
                  <input
                    type="number"
                    value={newUserMaxLoad}
                    onChange={(e) => setNewUserMaxLoad(Number(e.target.value))}
                    min={5}
                    max={200}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setCreateUserOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-xs transition"
                >
                  {creatingUser ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-serif font-bold text-zinc-950 text-base">Edit Teammate Profile & Access</h3>
              <button onClick={() => setEditUserModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Staff Code *</label>
                  <input
                    type="text"
                    required
                    value={editUserStaffCode}
                    onChange={(e) => setEditUserStaffCode(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editUserPhone}
                    onChange={(e) => setEditUserPhone(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Role *</label>
                  <select
                    value={editUserRoleId}
                    onChange={(e) => setEditUserRoleId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.slug})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Assigned Team *</label>
                  <select
                    value={editUserTeamId}
                    onChange={(e) => {
                      setEditUserTeamId(e.target.value);
                      const t = teams.find((tm) => tm.id === e.target.value);
                      if (t) setEditUserTeamName(t.name);
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  >
                    <option value="">-- Unassigned / Direct --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={editUserDesignation}
                    onChange={(e) => setEditUserDesignation(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Account Status</label>
                  <select
                    value={editUserStatus}
                    onChange={(e) => setEditUserStatus(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Location Focus</label>
                  <input
                    type="text"
                    value={editUserLocation}
                    onChange={(e) => setEditUserLocation(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-xs transition"
                >
                  {savingUser ? "Saving..." : "Save Changes"}
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
            className="relative max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">
                  {darScreenshotModal.name} — Callyzer Report Screenshot
                </span>
              </div>
              <button
                onClick={() => setDarScreenshotModal(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-zinc-950">
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
