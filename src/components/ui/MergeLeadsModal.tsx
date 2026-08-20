"use client";

import React, { useState } from "react";
import { GitMerge, AlertCircle, ArrowRight, X, CheckCircle2 } from "lucide-react";

interface MergeLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  primaryLead: { id: string; name: string; leadCode: string; phone: string };
  secondaryLead?: { id: string; name: string; leadCode: string; phone: string } | null;
}

export default function MergeLeadsModal({
  isOpen,
  onClose,
  onSuccess,
  primaryLead,
  secondaryLead,
}: MergeLeadsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !secondaryLead) return null;

  async function handleMerge() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/leads/${primaryLead.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateLeadId: secondaryLead?.id }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to merge leads");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred during merge");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-zinc-950 text-white flex items-center justify-center">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-zinc-950">Merge Duplicate Leads</h3>
              <p className="text-xs text-zinc-500 font-light">Consolidate history into single primary investor record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-black p-1.5 rounded-full hover:bg-zinc-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Primary Destination
                </span>
                <span className="font-bold text-zinc-950">{primaryLead.name}</span>
                <span className="font-mono text-zinc-500 ml-1.5 text-[11px]">({primaryLead.leadCode})</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold uppercase tracking-wider text-[10px]">
                Retained
              </span>
            </div>

            <div className="border-t border-zinc-200 pt-2 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Duplicate to Merge
                </span>
                <span className="font-bold text-zinc-950">{secondaryLead.name}</span>
                <span className="font-mono text-zinc-500 ml-1.5 text-[11px]">({secondaryLead.leadCode})</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-zinc-200 text-zinc-700 font-bold uppercase tracking-wider text-[10px]">
                Archived
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-zinc-600 font-light">
            <div className="font-bold text-zinc-950 uppercase tracking-wider text-[10px]">What happens during merge:</div>
            <div className="flex items-center space-x-2 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
              <span>All call logs and duration history moved to primary lead</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
              <span>All follow-ups, site visits, and bookings preserved</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
              <span>Lead score automatically recalculated with full history</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
              <span>Immutable audit record generated for compliance</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-950 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleMerge}
            disabled={loading}
            className="px-5 py-2.5 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center space-x-1.5 shadow-sm"
          >
            <span>{loading ? "Merging..." : "Confirm & Merge"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

