"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  Users2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  Briefcase,
  MapPin,
} from "lucide-react";

interface AssignLeadsModalProps {
  leadIds: string[];
  leadNames?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignLeadsModal({
  leadIds,
  leadNames = [],
  onClose,
  onSuccess,
}: AssignLeadsModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<"SINGLE_USER" | "ROUND_ROBIN">("SINGLE_USER");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isBulk = leadIds.length > 1;

  useEffect(() => {
    fetchActiveAdvisors();
  }, []);

  const fetchActiveAdvisors = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Filter only active staff
        const activeStaff = data.data.filter((u: any) => u.status === "ACTIVE");
        setUsers(activeStaff);
        if (activeStaff.length > 0) {
          setSelectedUserId(activeStaff[0].id);
          setSelectedUserIds(activeStaff.map((u: any) => u.id));
        }
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load active team members.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      if (selectedUserIds.length === 1) return; // keep at least one
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleAssign = async () => {
    setSubmitting(true);
    setError("");

    try {
      if (!isBulk && strategy === "SINGLE_USER") {
        // Single lead assign
        const leadId = leadIds[0];
        const res = await fetch(`/api/leads/${leadId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignedToId: selectedUserId,
            reason: reason || "Assigned by Admin / Team Lead",
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          onSuccess();
          onClose();
        } else {
          setError(data.message || "Failed to assign lead.");
        }
      } else {
        // Bulk assign or Round-Robin
        const targetIds = strategy === "SINGLE_USER" ? [selectedUserId] : selectedUserIds;
        const res = await fetch("/api/leads/distribute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadIds,
            targetUserIds: targetIds,
            strategy,
            reason: reason || `Bulk assigned (${leadIds.length} leads) by Admin / Team Lead`,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          onSuccess();
          onClose();
        } else {
          setError(data.message || "Failed to distribute leads.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Network error during lead assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-zinc-950 text-base">
                {isBulk ? `Assign ${leadIds.length} Selected Leads` : "Assign Lead to Advisor"}
              </h3>
              <p className="text-xs text-zinc-500 font-light">
                {isBulk
                  ? "Allocate batch leads to a specific agent or distribute evenly via Round-Robin"
                  : leadNames[0]
                  ? `Assigning lead: ${leadNames[0]}`
                  : "Select an active sales associate or team lead"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-black p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Strategy Selection for Bulk */}
          {isBulk && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block">
                Assignment Strategy
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStrategy("SINGLE_USER")}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    strategy === "SINGLE_USER"
                      ? "border-black bg-zinc-50/80 ring-1 ring-black shadow-xs"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  }`}
                >
                  <div className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Single Advisor</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1 font-light">
                    Assign all {leadIds.length} leads to one advisor
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStrategy("ROUND_ROBIN")}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    strategy === "ROUND_ROBIN"
                      ? "border-black bg-zinc-50/80 ring-1 ring-black shadow-xs"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  }`}
                >
                  <div className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Round-Robin</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1 font-light">
                    Split {leadIds.length} leads evenly across active team
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Advisor Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                {strategy === "SINGLE_USER" ? "Select Target Advisor" : "Select Active Advisors for Round-Robin"}
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {users.length} active advisors online
              </span>
            </div>

            {loadingUsers ? (
              <div className="p-8 text-center text-xs text-zinc-400 font-medium animate-pulse">
                Loading team capacity...
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {users.map((u) => {
                  const isSelected =
                    strategy === "SINGLE_USER"
                      ? selectedUserId === u.id
                      : selectedUserIds.includes(u.id);

                  const activeLeadCount = u._count?.assignedLeads || 0;

                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        if (strategy === "SINGLE_USER") {
                          setSelectedUserId(u.id);
                        } else {
                          toggleUserSelection(u.id);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "border-black bg-zinc-50 shadow-xs"
                          : "border-zinc-200 hover:border-zinc-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0 font-serif">
                          {u.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-zinc-950 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            <span className="text-[10px] font-normal text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded border border-zinc-200">
                              {u.role?.name || "Associate"}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 font-light flex items-center gap-2 mt-0.5">
                            <span>{u.teamName || "General Sales"}</span>
                            {u.designation && <span>• {u.designation}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[11px] font-mono font-bold text-zinc-900">
                            {activeLeadCount} active leads
                          </div>
                          <div className="text-[10px] text-emerald-600 font-medium">● Available</div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                            isSelected
                              ? "bg-black border-black text-white"
                              : "border-zinc-300 bg-white"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assignment Note / Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block">
              Assignment Note / Instruction (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Hot buyer for Noida Sector 150 - please call immediately"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-black text-xs font-medium"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-black rounded-xl hover:bg-zinc-100 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting || (strategy === "ROUND_ROBIN" && selectedUserIds.length === 0)}
            onClick={handleAssign}
            className="px-6 py-2.5 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-2 hover:scale-[1.02]"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {isBulk
                    ? strategy === "ROUND_ROBIN"
                      ? `Distribute ${leadIds.length} Leads (${selectedUserIds.length} Advisors)`
                      : `Assign ${leadIds.length} Leads`
                    : "Confirm Lead Assignment"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
