"use client";

import React, { useState, useEffect } from "react";
import { PhoneCall, X, Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

interface LogCallModalProps {
  lead: {
    id: string;
    name: string;
    phone: string;
    leadCode?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const OUTCOMES = [
  { value: "CONNECTED", label: "Connected", color: "border-zinc-200 hover:bg-zinc-100 text-zinc-900" },
  { value: "INTERESTED", label: "Interested 🔥", color: "border-amber-200 hover:bg-amber-50 text-amber-800" },
  { value: "SITE_VISIT_AGREED", label: "Site Visit Agreed 📍", color: "border-emerald-200 hover:bg-emerald-50 text-emerald-800" },
  { value: "CALL_BACK", label: "Call Back ⏰", color: "border-zinc-200 hover:bg-zinc-100 text-zinc-900" },
  { value: "BUSY", label: "Busy", color: "border-zinc-200 hover:bg-zinc-100 text-zinc-600" },
  { value: "NO_ANSWER", label: "No Answer", color: "border-zinc-200 hover:bg-zinc-100 text-zinc-600" },
  { value: "SWITCHED_OFF", label: "Switched Off", color: "border-zinc-200 hover:bg-zinc-100 text-zinc-600" },
  { value: "NOT_INTERESTED", label: "Not Interested", color: "border-rose-200 hover:bg-rose-50 text-rose-800" },
  { value: "WRONG_NUMBER", label: "Wrong Number", color: "border-rose-200 hover:bg-rose-50 text-rose-800" },
];

export function LogCallModal({ lead, onClose, onSuccess }: LogCallModalProps) {
  const [outcome, setOutcome] = useState("INTERESTED");
  const [remarks, setRemarks] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Live duration timer
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setError("Please write call remarks or key customer takeaways.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          outcome,
          remarks: remarks.trim(),
          durationSeconds,
          nextFollowUpDate: nextFollowUpDate || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.message || "Failed to log call.");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-zinc-950 text-white flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-zinc-950 text-base">Log Call: {lead.name}</h3>
              <p className="text-xs text-zinc-500 font-mono font-bold">{lead.phone} • {lead.leadCode || "Lead"}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition space-x-1"
              title="Launch phone dialer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Dial</span>
            </a>
            <button onClick={onClose} className="text-zinc-400 hover:text-black p-1 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center border border-rose-200">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Duration Indicator */}
          <div className="flex items-center justify-between bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
            <div className="flex items-center text-xs font-bold uppercase tracking-wider text-zinc-700">
              <Clock className="w-4 h-4 mr-1.5 text-zinc-900" />
              <span>Call Duration:</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="font-mono font-bold text-sm text-zinc-950 bg-white px-2.5 py-1 rounded-md border border-zinc-200">
                {formatTimer(durationSeconds)}
              </span>
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 hover:text-black underline"
              >
                {isTimerRunning ? "Pause" : "Resume"}
              </button>
            </div>
          </div>

          {/* Outcome Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
              Call Outcome *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {OUTCOMES.map((o) => {
                const isSelected = outcome === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOutcome(o.value)}
                    className={`py-2 px-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all text-center ${
                      isSelected
                        ? "bg-black text-white border-black shadow-xs"
                        : `bg-white ${o.color}`
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              Call Remarks & Notes *
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Discussed 3BHK in ATS Knightsbridge. Customer requested brochure on WhatsApp and scheduled site visit."
              className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-light"
            />
          </div>

          {/* Follow-up Schedule */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-zinc-400" />
              Next Follow-up Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-800 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {submitting ? "Saving Call..." : "Save Call Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
