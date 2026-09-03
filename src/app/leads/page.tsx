"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Flame,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Phone,
  MessageSquare,
  Eye,
  Edit3,
  Calendar,
  CheckCircle2,
  Filter,
  Columns,
  List,
  LayoutGrid,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Users2,
  Zap,
  CheckSquare,
  Square,
  ChevronDown,
} from "lucide-react";
import { LogCallModal } from "@/components/ui/LogCallModal";
import { UpdateLeadModal } from "@/components/ui/UpdateLeadModal";
import { CreateLeadModal } from "@/components/ui/CreateLeadModal";
import { ImportLeadsModal } from "@/components/ui/ImportLeadsModal";
import { AssignLeadsModal } from "@/components/ui/AssignLeadsModal";
import { formatINR, formatRelativeTime, maskPhoneNumber, getWhatsAppUrl } from "@/lib/utils";
import { LeadCardSkeleton } from "@/components/ui/Skeleton";
import { TopProgressBar } from "@/components/ui/TopProgressBar";

// Memory cache for instant stage switching
const stageCache = new Map<string, { leads: any[]; counts: any; timestamp: number }>();

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin } = useAuth();

  const [leads, setLeads] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    toWork: 0,
    suspect: 0,
    prospect: 0,
    notPicked: 0,
    notInterested: 0,
    totalAll: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isRevalidating, setIsRevalidating] = useState(false);

  // Filters
  const [activeStage, setActiveStage] = useState<string>(searchParams.get("stage") || "ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"FEED" | "TABLE" | "KANBAN">("FEED");

  // Selection & Bulk Actions
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Revealed Phone Numbers set
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());

  // Modals
  const [activeCallLead, setActiveCallLead] = useState<any>(null);
  const [activeUpdateLead, setActiveUpdateLead] = useState<any>(null);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetLeadIds, setAssignTargetLeadIds] = useState<string[]>([]);
  const [assignTargetLeadNames, setAssignTargetLeadNames] = useState<string[]>([]);
  const [addLeadDropdownOpen, setAddLeadDropdownOpen] = useState(false);

  const prefetchStage = async (stage: string) => {
    const cacheKey = `stage:${stage}`;
    if (stageCache.has(cacheKey)) return;
    try {
      const res = await fetch(`/api/leads?stage=${stage}`);
      const data = await res.json();
      if (data.success) {
        stageCache.set(cacheKey, {
          leads: data.data || [],
          counts: data.meta?.counts || counts,
          timestamp: Date.now(),
        });
      }
    } catch (e) {}
  };

  const fetchLeads = async (force: boolean = false) => {
    const cacheKey = `stage:${activeStage}:${searchQuery}`;
    const cached = stageCache.get(cacheKey);

    // Instant optimistic render from cache
    if (cached && !force) {
      setLeads(cached.leads);
      if (cached.counts) setCounts(cached.counts);
      setLoading(false);
      setIsRevalidating(true);
    } else {
      if (leads.length === 0) setLoading(true);
      else setIsRevalidating(true);
    }

    try {
      let url = `/api/leads?stage=${activeStage}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data || []);
        if (data.meta?.counts) {
          setCounts(data.meta.counts);
        }
        stageCache.set(cacheKey, {
          leads: data.data || [],
          counts: data.meta?.counts || counts,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    setSelectedLeadIds([]);
  }, [activeStage, searchQuery]);

  const toggleRevealPhone = (leadId: string) => {
    setRevealedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const handleToggleSelectLead = (leadId: string) => {
    if (selectedLeadIds.includes(leadId)) {
      setSelectedLeadIds(selectedLeadIds.filter((id) => id !== leadId));
    } else {
      setSelectedLeadIds([...selectedLeadIds, leadId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  const openSingleAssign = (lead: any) => {
    setAssignTargetLeadIds([lead.id]);
    setAssignTargetLeadNames([lead.name]);
    setAssignModalOpen(true);
  };

  const openBulkAssign = () => {
    if (selectedLeadIds.length === 0) return;
    const names = leads
      .filter((l) => selectedLeadIds.includes(l.id))
      .map((l) => l.name);
    setAssignTargetLeadIds(selectedLeadIds);
    setAssignTargetLeadNames(names);
    setAssignModalOpen(true);
  };

  const handleExport = () => {
    window.location.href = "/api/export/leads";
  };

  const stageTabs = [
    { key: "TO_WORK", label: "To work", count: counts.toWork, desc: "not yet actioned" },
    { key: "SUSPECT", label: "Suspect", count: counts.suspect, desc: "worth a second look" },
    { key: "PROSPECT", label: "Prospects", count: counts.prospect, desc: "qualified pipeline" },
    { key: "NOT_PICKED", label: "Not picked", count: counts.notPicked, desc: "no answer" },
    { key: "NOT_INTERESTED", label: "Not interested", count: counts.notInterested, desc: "closed out" },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 relative">
      <TopProgressBar isFetching={isRevalidating} />
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950 tracking-tight">
              Leads & Pipelines
            </h1>
          </div>
          <p className="text-xs text-zinc-500 font-light mt-0.5">
            Work active leads, assign advisors, import in bulk from Sheets/Excel, and track pipeline flow.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap">
          {/* View switcher */}
          <div className="bg-zinc-100 p-1 rounded-xl flex items-center border border-zinc-200">
            <button
              onClick={() => setViewMode("FEED")}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                viewMode === "FEED" ? "bg-white text-black shadow-sm" : "text-zinc-600 hover:text-black"
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                viewMode === "TABLE" ? "bg-white text-black shadow-sm" : "text-zinc-600 hover:text-black"
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("KANBAN")}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                viewMode === "KANBAN" ? "bg-white text-black shadow-sm" : "text-zinc-600 hover:text-black"
              }`}
            >
              Pipeline
            </button>
          </div>

          {/* Import Bulk Button */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl shadow-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
            <span>Import Leads</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
            <span>Export</span>
          </button>

          {/* Add Lead Action with Dropdown */}
          <div className="relative">
            <div className="inline-flex rounded-xl shadow-sm">
              <button
                onClick={() => setCreateLeadOpen(true)}
                className="inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-800 rounded-l-xl transition"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-white" />
                <span>Add Lead</span>
              </button>
              <button
                onClick={() => setAddLeadDropdownOpen(!addLeadDropdownOpen)}
                className="px-2 py-2 text-white bg-black hover:bg-zinc-800 rounded-r-xl border-l border-zinc-700 transition"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {addLeadDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-zinc-200 py-1.5 z-30 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setAddLeadDropdownOpen(false);
                    setCreateLeadOpen(true);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-zinc-800 hover:bg-zinc-50 flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Quick Add Single Lead</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddLeadDropdownOpen(false);
                    setImportModalOpen(true);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-zinc-800 hover:bg-zinc-50 flex items-center gap-2 border-t border-zinc-100"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Bulk Import (CSV / Sheets / Excel)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Counter Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {stageTabs.map((s) => {
          const isSelected = activeStage === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveStage(isSelected ? "ALL" : s.key)}
              onMouseEnter={() => prefetchStage(s.key)}
              className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all text-left shadow-sm ${
                isSelected
                  ? "border-black ring-1 ring-black shadow-md bg-zinc-50/50"
                  : "border-zinc-200/90 hover:border-zinc-400"
              }`}
            >
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {s.label}
              </div>
              <div className="text-2xl font-bold mt-1 text-zinc-950 font-mono">{s.count}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5 truncate font-light">{s.desc}</div>
            </button>
          );
        })}
      </div>

      {/* 3. Sub-filter pills & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200/90 shadow-sm">
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {["ALL", "TO_WORK", "SUSPECT", "NOT_PICKED", "PROSPECT", "NOT_INTERESTED"].map((st) => (
            <button
              key={st}
              onClick={() => setActiveStage(st)}
              onMouseEnter={() => prefetchStage(st)}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl whitespace-nowrap transition ${
                activeStage === st
                  ? "bg-black text-white shadow-sm"
                  : "text-zinc-600 hover:text-black hover:bg-zinc-100"
              }`}
            >
              {st === "ALL"
                ? "All mine"
                : st === "TO_WORK"
                ? "To work"
                : st === "SUSPECT"
                ? "Suspect"
                : st === "NOT_PICKED"
                ? "Not picked"
                : st === "PROSPECT"
                ? "Prospects"
                : "Not interested"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, project..."
            className="w-full text-xs pl-9 pr-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition font-medium"
          />
        </div>
      </div>

      {/* 4. Leads Content (FEED / TABLE / KANBAN) */}
      {loading ? (
        <div className="space-y-3.5 py-2">
          <LeadCardSkeleton />
          <LeadCardSkeleton />
          <LeadCardSkeleton />
          <LeadCardSkeleton />
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 shadow-sm space-y-3">
          <Flame className="w-10 h-10 text-zinc-300 mx-auto" />
          <h3 className="font-serif font-bold text-base text-zinc-800">No leads found in this view</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto font-light">
            Try adjusting your stage filter or import new leads for your portfolio.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setCreateLeadOpen(true)}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-800 rounded-xl shadow-sm"
            >
              Create New Lead
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-xl border border-zinc-200"
            >
              Import Leads
            </button>
          </div>
        </div>
      ) : viewMode === "FEED" ? (
        /* CALL FLOOR CARD FEED VIEW */
        <div className="space-y-3.5">
          {/* Select all bar if leads present */}
          {leads.length > 0 && (
            <div className="flex items-center justify-between px-2 text-xs text-zinc-500">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-700 hover:text-black"
              >
                {selectedLeadIds.length === leads.length ? (
                  <CheckSquare className="w-4 h-4 text-black" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-400" />
                )}
                <span>Select All ({leads.length} Leads)</span>
              </button>
              {selectedLeadIds.length > 0 && (
                <span className="font-mono font-bold text-black">{selectedLeadIds.length} selected</span>
              )}
            </div>
          )}

          {leads.map((lead) => {
            const isRevealed = revealedPhones.has(lead.id);
            const displayPhone = isRevealed ? lead.phone : maskPhoneNumber(lead.phone);
            const isSelected = selectedLeadIds.includes(lead.id);

            return (
              <div
                key={lead.id}
                className={`bg-white rounded-2xl p-5 border transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSelected
                    ? "border-black ring-1 ring-black bg-zinc-50/40 shadow-md"
                    : "border-zinc-200/90 hover:border-zinc-400 shadow-sm"
                }`}
              >
                {/* Left Accent Bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                    lead.stage === "PROSPECT"
                      ? "bg-emerald-500"
                      : lead.stage === "SUSPECT"
                      ? "bg-amber-500"
                      : "bg-zinc-800"
                  }`}
                ></div>

                {/* Lead Info */}
                <div className="space-y-2 flex-1 pl-2">
                  <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleSelectLead(lead.id)}
                      className="text-zinc-400 hover:text-black"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-black" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-300" />
                      )}
                    </button>

                    <button
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="font-serif font-bold text-base text-zinc-950 hover:text-zinc-600 transition text-left"
                    >
                      {lead.name}
                    </button>

                    <span className="text-xs text-zinc-500 font-medium">
                      {lead.preferredLocation || "General"}
                    </span>

                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-full">
                      ✓ {lead.stage}
                    </span>

                    {/* Assigned Advisor Chip with 1-click Reassign */}
                    <button
                      type="button"
                      onClick={() => openSingleAssign(lead)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border transition ${
                        lead.assignedTo
                          ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300"
                          : "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 animate-pulse"
                      }`}
                      title="Click to assign/reassign lead"
                    >
                      <UserCheck className="w-3 h-3 text-zinc-600" />
                      <span>{lead.assignedTo?.name || "Unassigned"}</span>
                    </button>

                    <span className="text-[11px] text-zinc-400">
                      {formatRelativeTime(lead.lastContactedAt || lead.createdAt)}
                    </span>
                  </div>

                  {/* Phone & Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <div
                      className={`flex items-center space-x-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border transition ${
                        isRevealed
                          ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                          : "bg-zinc-100 text-zinc-900 border-zinc-200"
                      }`}
                    >
                      <Phone className={`w-3.5 h-3.5 ${isRevealed ? "text-emerald-600" : "text-zinc-600"}`} />
                      <span>{displayPhone}</span>
                      {!isRevealed ? (
                        <button
                          onClick={() => toggleRevealPhone(lead.id)}
                          className="ml-1 text-[10px] font-bold text-zinc-900 hover:underline uppercase tracking-wider"
                          title="Reveal phone number"
                        >
                          Reveal
                        </button>
                      ) : (
                        <span className="ml-1 text-[9px] font-bold uppercase bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded">
                          Revealed
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                        (lead.leadScore || 50) >= 70
                          ? "bg-zinc-950 text-white border-black"
                          : (lead.leadScore || 50) >= 40
                          ? "bg-zinc-100 text-zinc-800 border-zinc-300"
                          : "bg-zinc-50 text-zinc-600 border-zinc-200"
                      }`}
                    >
                      {(lead.leadScore || 50) >= 70 ? "🔥" : (lead.leadScore || 50) >= 40 ? "🟡" : "🔵"} Score: {lead.leadScore || 50}
                    </span>

                    {lead.priority === "HOT" && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                        Hot
                      </span>
                    )}
                    {lead.priority === "WARM" && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                        Warm
                      </span>
                    )}

                    {lead.nextFollowUpDate && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-md flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-zinc-400" />
                        {new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}

                    {lead.budget && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-md">
                        {lead.budget}
                      </span>
                    )}
                  </div>

                  {/* Remarks Snippet */}
                  {lead.latestRemarks && (
                    <div className="text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 flex items-start space-x-1.5 font-light">
                      <span className="text-zinc-400">💬</span>
                      <p className="line-clamp-2">{lead.latestRemarks}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-center">
                  {/* Send on WhatsApp Pill */}
                  <a
                    href={getWhatsAppUrl(lead.phone, `Hello ${lead.name}, regarding your property requirement with L2H Real Estate Advisory...`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all space-x-1.5 uppercase tracking-wider"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Reveal & Call / Direct Call Button */}
                  {!isRevealed ? (
                    <button
                      onClick={() => {
                        toggleRevealPhone(lead.id);
                        setActiveCallLead(lead);
                      }}
                      className="inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-800 rounded-xl shadow-xs transition space-x-1.5"
                      title="Reveal phone number and launch call logger"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Reveal & Call</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={() => setActiveCallLead(lead)}
                        className="inline-flex items-center px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition space-x-1.5"
                        title="Call number directly"
                      >
                        <Phone className="w-3.5 h-3.5 animate-pulse" />
                        <span>Call</span>
                      </a>
                      <button
                        onClick={() => setActiveCallLead(lead)}
                        className="inline-flex items-center px-2.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-xl border border-zinc-200 transition"
                        title="Log call outcome"
                      >
                        Log
                      </button>
                    </div>
                  )}

                  {/* Assign Quick Button */}
                  <button
                    onClick={() => openSingleAssign(lead)}
                    className="inline-flex items-center px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl border border-zinc-200 transition space-x-1"
                    title="Assign or reassign advisor"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Assign</span>
                  </button>

                  {/* Update */}
                  <button
                    onClick={() => setActiveUpdateLead(lead)}
                    className="inline-flex items-center px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl border border-zinc-200 transition space-x-1"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Update</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "TABLE" ? (
        /* HIGH DENSITY TABLE VIEW */
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-xs">
            <thead className="bg-zinc-50 font-bold uppercase tracking-wider text-zinc-500 text-[10px]">
              <tr>
                <th className="py-3 px-3 text-left w-8">
                  <button type="button" onClick={handleSelectAll} className="text-zinc-500 hover:text-black">
                    {selectedLeadIds.length === leads.length && leads.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-black" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 text-left">Code</th>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Phone</th>
                <th className="py-3 px-4 text-left">Assigned To</th>
                <th className="py-3 px-4 text-left">Stage</th>
                <th className="py-3 px-4 text-left">Priority</th>
                <th className="py-3 px-4 text-left">Budget</th>
                <th className="py-3 px-4 text-left">Project Interest</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {leads.map((lead) => {
                const isRevealed = revealedPhones.has(lead.id);
                const displayPhone = isRevealed ? lead.phone : maskPhoneNumber(lead.phone);
                const isSelected = selectedLeadIds.includes(lead.id);

                return (
                  <tr
                    key={lead.id}
                    className={`transition ${isSelected ? "bg-zinc-50 font-medium" : "hover:bg-zinc-50/70"}`}
                  >
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectLead(lead.id)}
                        className="text-zinc-400 hover:text-black"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-black" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-300" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-zinc-900">{lead.leadCode}</td>
                    <td
                      className="py-3 px-4 font-serif font-bold text-zinc-950 cursor-pointer"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      {lead.name}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="flex items-center space-x-1.5">
                        <span className={isRevealed ? "font-bold text-emerald-800" : "text-zinc-600"}>
                          {displayPhone}
                        </span>
                        {!isRevealed && (
                          <button
                            onClick={() => toggleRevealPhone(lead.id)}
                            className="text-[10px] text-zinc-900 hover:underline font-bold uppercase tracking-wider"
                          >
                            Reveal
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => openSingleAssign(lead)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                          lead.assignedTo
                            ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
                            : "bg-amber-100 hover:bg-amber-200 text-amber-900"
                        }`}
                      >
                        <UserCheck className="w-3 h-3 text-zinc-500" />
                        <span>{lead.assignedTo?.name || "Unassigned"}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-md">
                        {lead.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {lead.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{lead.budget || "--"}</td>
                    <td className="py-3 px-4 text-zinc-500">{lead.projectInterest?.name || "General"}</td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {isRevealed ? (
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={() => setActiveCallLead(lead)}
                          className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            toggleRevealPhone(lead.id);
                            setActiveCallLead(lead);
                          }}
                          className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-800 rounded-lg"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Reveal & Call
                        </button>
                      )}
                      <button
                        onClick={() => setActiveUpdateLead(lead)}
                        className="p-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg border border-zinc-200"
                        title="Update"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* KANBAN PIPELINE VIEW */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {["TO_WORK", "SUSPECT", "PROSPECT", "NOT_INTERESTED"].map((columnStage) => {
            const colLeads = leads.filter((l) => l.stage === columnStage);
            return (
              <div key={columnStage} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/90 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="font-bold text-xs text-zinc-800 uppercase tracking-widest">{columnStage}</span>
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-white text-zinc-700 rounded-full border border-zinc-200 font-mono">
                    {colLeads.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colLeads.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => router.push(`/leads/${l.id}`)}
                      className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md hover:border-black transition cursor-pointer space-y-2"
                    >
                      <div className="font-serif font-bold text-sm text-zinc-950">{l.name}</div>
                      <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                        <span className="font-mono">{maskPhoneNumber(l.phone)}</span>
                        <span className="font-bold text-zinc-900">{l.budget || ""}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 flex items-center justify-between border-t border-zinc-100 pt-1.5">
                        <span className="font-medium">{l.assignedTo?.name || "Unassigned"}</span>
                        <span className="font-bold uppercase text-[9px] bg-zinc-100 px-1.5 py-0.2 rounded">
                          {l.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Bulk Action Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 pr-2 border-r border-white/20">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-serif font-bold text-sm">{selectedLeadIds.length} Leads Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openBulkAssign}
              className="px-4 py-2 bg-white hover:bg-zinc-100 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-zinc-900" />
              <span>Assign to Advisor...</span>
            </button>

            <button
              type="button"
              onClick={() => {
                openBulkAssign();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Round-Robin</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedLeadIds([])}
              className="px-3 py-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeCallLead && (
        <LogCallModal
          lead={activeCallLead}
          onClose={() => setActiveCallLead(null)}
          onSuccess={fetchLeads}
        />
      )}

      {activeUpdateLead && (
        <UpdateLeadModal
          lead={activeUpdateLead}
          onClose={() => setActiveUpdateLead(null)}
          onSuccess={fetchLeads}
        />
      )}

      {createLeadOpen && (
        <CreateLeadModal
          onClose={() => setCreateLeadOpen(false)}
          onSuccess={fetchLeads}
        />
      )}

      {importModalOpen && (
        <ImportLeadsModal
          onClose={() => setImportModalOpen(false)}
          onSuccess={fetchLeads}
        />
      )}

      {assignModalOpen && (
        <AssignLeadsModal
          leadIds={assignTargetLeadIds}
          leadNames={assignTargetLeadNames}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={() => {
            fetchLeads();
            setSelectedLeadIds([]);
          }}
        />
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1440px] mx-auto px-4 py-16 text-center text-xs text-zinc-400 uppercase tracking-widest font-semibold">
          Loading Leads Command Center...
        </div>
      }
    >
      <LeadsContent />
    </Suspense>
  );
}
