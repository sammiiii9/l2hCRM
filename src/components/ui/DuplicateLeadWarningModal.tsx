"use client";

import React from "react";
import { AlertTriangle, UserCheck, Phone, Mail, Calendar, ArrowRight, X, ExternalLink } from "lucide-react";
import Link from "next/link";

export interface DuplicateLeadInfo {
  leadId: string;
  leadCode: string;
  name: string;
  phone: string;
  email: string | null;
  assignedToName: string | null;
  stage: string;
  status: string;
  leadScore: number;
  lastContactedAt: string | Date | null;
  confidence: "HIGH" | "MEDIUM" | "POSSIBLE";
  matchedOn: string;
}

interface DuplicateLeadWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueAnyway: () => void;
  onOpenMerge?: (leadId: string) => void;
  duplicates: DuplicateLeadInfo[];
}

export default function DuplicateLeadWarningModal({
  isOpen,
  onClose,
  onContinueAnyway,
  onOpenMerge,
  duplicates,
}: DuplicateLeadWarningModalProps) {
  if (!isOpen || duplicates.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-amber-50 border-b border-amber-200/60 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-amber-950">
            <div className="w-9 h-9 rounded-full bg-amber-200/80 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-900" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-zinc-950">Possible Duplicate Lead Found</h3>
              <p className="text-xs text-amber-900 font-light">
                {duplicates.length} existing record(s) matched these contact details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-black p-1.5 rounded-full hover:bg-white/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-zinc-600 font-light">
            To maintain clean data and prevent lead leakage, please review the existing record before creating a duplicate:
          </p>

          <div className="space-y-3">
            {duplicates.map((dup) => (
              <div
                key={dup.leadId}
                className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 hover:border-zinc-400 transition space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-serif font-bold text-sm text-zinc-950">{dup.name}</span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-800">
                        {dup.leadCode}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-amber-800">
                      Match: {dup.matchedOn} ({dup.confidence} confidence)
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                      dup.leadScore >= 70
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : dup.leadScore >= 40
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-zinc-100 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    Score: {dup.leadScore}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 font-light">
                  <div className="flex items-center space-x-1.5 truncate">
                    <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span className="font-mono">{dup.phone}</span>
                  </div>
                  {dup.email && (
                    <div className="flex items-center space-x-1.5 truncate">
                      <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="truncate">{dup.email}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1.5">
                    <UserCheck className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>Agent: {dup.assignedToName || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>Stage: {dup.stage}</span>
                  </div>
                </div>

                {/* Actions per duplicate */}
                <div className="pt-2 flex items-center justify-between border-t border-zinc-200">
                  <Link
                    href={`/leads/${dup.leadId}`}
                    target="_blank"
                    className="inline-flex items-center space-x-1 text-xs font-bold uppercase tracking-wider text-zinc-950 hover:underline"
                  >
                    <span>View Existing Lead</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  {onOpenMerge && (
                    <button
                      type="button"
                      onClick={() => onOpenMerge(dup.leadId)}
                      className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-xl transition border border-amber-300/60"
                    >
                      Merge into this Lead
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-950 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onContinueAnyway}
            className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center space-x-1.5 shadow-sm"
          >
            <span>Continue & Create Anyway</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
