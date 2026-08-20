"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Flame,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  ArrowLeft,
  Edit3,
  Plus,
  FileCheck2,
  Trash2,
  UserCheck,
  Tag,
  MapPin,
  Compass,
  Zap,
  Sparkles,
  RefreshCw,
  GitMerge,
  AlertTriangle,
  History,
} from "lucide-react";
import { LogCallModal } from "@/components/ui/LogCallModal";
import { UpdateLeadModal } from "@/components/ui/UpdateLeadModal";
import { CreateBookingModal } from "@/components/ui/CreateBookingModal";
import { AssignLeadsModal } from "@/components/ui/AssignLeadsModal";
import MergeLeadsModal from "@/components/ui/MergeLeadsModal";
import { formatINR, formatRelativeTime, maskPhoneNumber, getWhatsAppUrl } from "@/lib/utils";

export default function LeadDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TIMELINE" | "CALLS" | "FOLLOWUPS" | "VISITS" | "BOOKINGS">("TIMELINE");

  // Scoring & Automation State
  const [scoreData, setScoreData] = useState<any>(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [selectedMergeLead, setSelectedMergeLead] = useState<any>(null);

  // Modals
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leads/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setLead(data.data);
        fetchScoreDetails();
        checkDuplicates(data.data);
      } else {
        router.push("/leads");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScoreDetails = async (recalculate = false) => {
    try {
      setLoadingScore(true);
      const res = await fetch(`/api/leads/${id}/score${recalculate ? "?recalculate=true" : ""}`);
      const data = await res.json();
      if (data.success) {
        setScoreData(data.data);
      }
    } catch (err) {
      console.error("Score fetch error:", err);
    } finally {
      setLoadingScore(false);
    }
  };

  const checkDuplicates = async (leadData: any) => {
    try {
      const res = await fetch("/api/leads/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: leadData.phone,
          whatsapp: leadData.whatsapp,
          email: leadData.email,
          name: leadData.name,
          excludeLeadId: id,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.duplicates) {
        setDuplicates(data.data.duplicates);
      }
    } catch (err) {
      console.error("Duplicate check error:", err);
    }
  };

  useEffect(() => {
    if (id) fetchLeadDetails();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to move this lead to the recycle bin?")) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/leads");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-xs text-zinc-400 font-semibold uppercase tracking-widest animate-pulse">
        Loading Lead 360 Profile...
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => router.push("/leads")}
          className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-zinc-700 hover:text-black bg-white px-3.5 py-2 rounded-xl border border-zinc-200 shadow-xs transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Leads
        </button>

        <div className="flex items-center space-x-2.5 flex-wrap">
          <button
            onClick={() => setLogCallOpen(true)}
            className="inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-800 rounded-xl shadow-xs transition"
          >
            <Phone className="w-3.5 h-3.5 mr-1 text-white" />
            Log Call
          </button>

          <button
            onClick={() => setBookingOpen(true)}
            className="inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
          >
            <FileCheck2 className="w-3.5 h-3.5 mr-1" />
            Create Booking
          </button>

          <button
            onClick={() => setUpdateOpen(true)}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl shadow-xs transition"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1 text-zinc-500" />
            Update
          </button>

          {isAdmin && (
            <button
              onClick={handleDelete}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-zinc-200"
              title="Delete Lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Duplicate Warning Banner */}
      {duplicates.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center space-x-3 text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-bold text-xs">
                ⚠️ Duplicate Warning: {duplicates.length} other lead(s) share this phone/email.
              </div>
              <div className="text-[11px] text-amber-800 font-light">
                Matched on: {duplicates.map((d) => `${d.name} (${d.leadCode})`).join(", ")}
              </div>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setSelectedMergeLead(duplicates[0]);
                setMergeModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center space-x-1.5 shadow-xs shrink-0"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Merge Duplicate</span>
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Left Column Info + Right Column 360 Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lead Profile Card & Explainable Scoring */}
        <div className="space-y-4">
          {/* 1. Lead Profile Card */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
                  {lead.leadCode}
                </span>
                <h2 className="text-xl font-serif font-bold text-zinc-950 mt-2">{lead.name}</h2>
              </div>
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-full">
                {lead.stage}
              </span>
            </div>

            {/* Quick Contact Links */}
            <div className="space-y-2 pt-3 border-t border-zinc-100 text-xs">
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                <span className="text-zinc-500 flex items-center font-medium">
                  <Phone className="w-3.5 h-3.5 mr-2 text-zinc-700" />
                  Phone
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-zinc-900">{lead.phone}</span>
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={() => setLogCallOpen(true)}
                    className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center shadow-xs"
                    title="Call number directly"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Call
                  </a>
                </div>
              </div>

              <a
                href={getWhatsAppUrl(lead.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition shadow-xs space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>

              {lead.email && (
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <span className="text-zinc-500 flex items-center font-medium">
                    <Mail className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                    Email
                  </span>
                  <span className="font-medium text-zinc-900 truncate max-w-[160px]">{lead.email}</span>
                </div>
              )}
            </div>

            {/* Requirements Matrix */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-100 text-xs">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Property Requirement
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Budget</div>
                  <div className="font-bold text-zinc-950 mt-0.5">{lead.budget || "--"}</div>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Configuration</div>
                  <div className="font-bold text-zinc-950 mt-0.5">{lead.configuration || "--"}</div>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Preferred Location</div>
                <div className="font-semibold text-zinc-900 mt-0.5">{lead.preferredLocation || "--"}</div>
              </div>

              {lead.projectInterest && (
                <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-xl">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Interested Project</div>
                  <div className="font-serif font-bold text-zinc-950 mt-0.5">{lead.projectInterest.name}</div>
                  <div className="text-[10px] text-zinc-500 font-light">{lead.projectInterest.location}</div>
                </div>
              )}
            </div>

            {/* Ownership */}
            <div className="pt-3 border-t border-zinc-100 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-500 font-medium">Assigned To:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-900">{lead.assignedTo?.name || "Unassigned"}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(true)}
                    className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-md border border-zinc-200 transition"
                  >
                    Reassign
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. AUTOMATION: Explainable Lead Score Card */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-zinc-900" />
                <h3 className="font-serif font-bold text-sm text-zinc-950">Explainable Lead Score</h3>
              </div>

              <button
                onClick={() => fetchScoreDetails(true)}
                disabled={loadingScore}
                className="text-xs text-zinc-700 hover:text-black flex items-center space-x-1 font-bold uppercase tracking-wider"
                title="Recalculate Score"
              >
                <RefreshCw className={`w-3 h-3 ${loadingScore ? "animate-spin" : ""}`} />
                <span>Recalculate</span>
              </button>
            </div>

            {/* Score Category Badge & Gauge */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Lead Classification
                </div>
                <div className="text-xl font-black text-zinc-950 mt-0.5 flex items-center space-x-1.5 font-mono">
                  <span>{scoreData?.breakdown?.category === "HOT" ? "🔥" : "🟡"}</span>
                  <span>{scoreData?.breakdown?.category || lead.priority}</span>
                  <span className="text-sm font-semibold text-zinc-400">
                    ({scoreData?.breakdown?.total ?? lead.leadScore}/100)
                  </span>
                </div>
              </div>

              <div
                className={`text-2xl font-black px-4 py-2 rounded-2xl border font-mono ${
                  (scoreData?.breakdown?.total ?? lead.leadScore) >= 70
                    ? "bg-zinc-950 text-white border-black"
                    : (scoreData?.breakdown?.total ?? lead.leadScore) >= 40
                    ? "bg-zinc-100 text-zinc-900 border-zinc-300"
                    : "bg-zinc-50 text-zinc-600 border-zinc-200"
                }`}
              >
                {scoreData?.breakdown?.total ?? lead.leadScore}
              </div>
            </div>

            {/* Explainable Factor Reasons */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Why this score? (Factor Breakdown)
              </div>
              <div className="space-y-1.5">
                {scoreData?.breakdown?.reasons?.map((reason: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 font-medium flex items-center space-x-2 font-light"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score History Timeline */}
            {scoreData?.history?.length > 0 && (
              <div className="pt-3 border-t border-zinc-100 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  <History className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Score History Timeline</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {scoreData.history.map((h: any) => (
                    <div key={h.id} className="text-[11px] p-2 bg-zinc-50 rounded-lg flex items-center justify-between border border-zinc-100">
                      <div className="truncate mr-2">
                        <span className="font-bold text-zinc-900 font-mono">{h.oldScore} → {h.newScore}</span>
                        <span className="text-zinc-500 ml-1.5 truncate">({h.reason})</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 shrink-0">
                        {formatRelativeTime(h.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 360 Tabbed Activities */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-sm space-y-4">
          {/* Tab Navigation */}
          <div className="flex items-center space-x-2 border-b border-zinc-100 pb-3 overflow-x-auto no-scrollbar">
            {[
              { key: "TIMELINE", label: `Timeline (${lead.activities?.length || 0})` },
              { key: "CALLS", label: `Call Logs (${lead.callLogs?.length || 0})` },
              { key: "FOLLOWUPS", label: `Follow-ups (${lead.followUps?.length || 0})` },
              { key: "VISITS", label: `Site Visits (${lead.siteVisits?.length || 0})` },
              { key: "BOOKINGS", label: `Deals (${lead.bookings?.length || 0})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
                  activeTab === t.key
                    ? "bg-black text-white shadow-sm"
                    : "text-zinc-600 hover:text-black hover:bg-zinc-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "TIMELINE" && (
            <div className="space-y-3">
              {lead.activities?.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 font-light">No activity recorded yet.</div>
              ) : (
                lead.activities?.map((act: any) => (
                  <div
                    key={act.id}
                    className={`p-4 rounded-2xl border transition ${
                      act.isAutomated
                        ? "bg-zinc-50 border-zinc-200"
                        : "bg-white border-zinc-100 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        {act.isAutomated && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-900 text-[9px] font-bold uppercase tracking-wider">
                            🤖 AI / AUTO
                          </span>
                        )}
                        <span className="font-serif font-bold text-zinc-950">{act.title}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">{formatRelativeTime(act.createdAt)}</span>
                    </div>
                    {act.description && <p className="text-xs text-zinc-600 mt-1 font-light">{act.description}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "CALLS" && (
            <div className="space-y-3">
              {lead.callLogs?.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 font-light">No calls logged yet.</div>
              ) : (
                lead.callLogs?.map((c: any) => (
                  <div key={c.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">Outcome: {c.outcome.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-zinc-400">{formatRelativeTime(c.callDate)}</span>
                    </div>
                    {c.remarks && <p className="text-xs text-zinc-600 font-light">{c.remarks}</p>}
                    <div className="text-[10px] text-zinc-400 font-mono">Duration: {c.durationSeconds}s</div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "FOLLOWUPS" && (
            <div className="space-y-3">
              {lead.followUps?.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 font-light">No follow-ups scheduled.</div>
              ) : (
                lead.followUps?.map((f: any) => (
                  <div key={f.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        {f.isAutomated && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[9px] font-bold uppercase tracking-wider">
                            🤖 AUTO
                          </span>
                        )}
                        <span className="font-bold text-zinc-900">
                          {new Date(f.scheduledAt).toLocaleDateString("en-IN")} at{" "}
                          {new Date(f.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          f.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : f.status === "PENDING"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200"
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                    {f.outcomeRemarks && <p className="text-xs text-zinc-600 font-light">{f.outcomeRemarks}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "VISITS" && (
            <div className="space-y-3">
              {lead.siteVisits?.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 font-light">No site visits recorded.</div>
              ) : (
                lead.siteVisits?.map((v: any) => (
                  <div key={v.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-900">
                        {new Date(v.scheduledDate).toLocaleDateString("en-IN")}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {v.status}
                      </span>
                    </div>
                    {v.feedback && <p className="text-xs text-zinc-600 font-light">{v.feedback}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "BOOKINGS" && (
            <div className="space-y-3">
              {lead.bookings?.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 font-light">No deals or bookings closed yet.</div>
              ) : (
                lead.bookings?.map((b: any) => (
                  <div key={b.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-zinc-950">{b.bookingCode}</span>
                      <span className="font-mono font-bold text-emerald-800">{formatINR(b.totalDealValue)}</span>
                    </div>
                    <div className="text-xs text-zinc-600 font-light">
                      Unit: {b.inventoryUnit?.unitNumber} ({b.project?.name})
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {logCallOpen && (
        <LogCallModal
          lead={lead}
          onClose={() => setLogCallOpen(false)}
          onSuccess={fetchLeadDetails}
        />
      )}

      {updateOpen && (
        <UpdateLeadModal
          lead={lead}
          onClose={() => setUpdateOpen(false)}
          onSuccess={fetchLeadDetails}
        />
      )}

      {bookingOpen && (
        <CreateBookingModal
          lead={lead}
          onClose={() => setBookingOpen(false)}
          onSuccess={fetchLeadDetails}
        />
      )}

      {mergeModalOpen && selectedMergeLead && (
        <MergeLeadsModal
          isOpen={mergeModalOpen}
          onClose={() => setMergeModalOpen(false)}
          onSuccess={fetchLeadDetails}
          primaryLead={lead}
          secondaryLead={selectedMergeLead}
        />
      )}

      {assignModalOpen && (
        <AssignLeadsModal
          leadIds={[lead.id]}
          leadNames={[lead.name]}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={fetchLeadDetails}
        />
      )}
    </div>
  );
}

