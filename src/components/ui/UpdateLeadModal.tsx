"use client";

import React, { useState } from "react";
import { X, CheckCircle2, AlertCircle, Edit3 } from "lucide-react";

interface UpdateLeadModalProps {
  lead: {
    id: string;
    name: string;
    stage: string;
    status: string;
    priority: string;
    latestRemarks?: string | null;
    budget?: string | null;
    configuration?: string | null;
    preferredLocation?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateLeadModal({ lead, onClose, onSuccess }: UpdateLeadModalProps) {
  const [stage, setStage] = useState(lead.stage || "TO_WORK");
  const [status, setStatus] = useState(lead.status || "NEW");
  const [priority, setPriority] = useState(lead.priority || "WARM");
  const [budget, setBudget] = useState(lead.budget || "");
  const [location, setLocation] = useState(lead.preferredLocation || "");
  const [latestRemarks, setLatestRemarks] = useState(lead.latestRemarks || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          status,
          priority,
          budget,
          preferredLocation: location,
          latestRemarks: latestRemarks.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.message || "Failed to update lead.");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-zinc-950 text-white flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-zinc-950 text-base">Update Lead: {lead.name}</h3>
              <p className="text-xs text-zinc-500 font-light">Quick Stage & Requirements Update</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-black p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center border border-rose-200">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Stage Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Lead Stage *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "TO_WORK", label: "To Work" },
                { val: "SUSPECT", label: "Suspect 🔍" },
                { val: "PROSPECT", label: "Prospect ✨" },
                { val: "NOT_PICKED", label: "Not Picked 📵" },
                { val: "NOT_INTERESTED", label: "Not Interested ❌" },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setStage(s.val)}
                  className={`py-2 px-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${
                    stage === s.val
                      ? "bg-black text-white border-black shadow-xs"
                      : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
              >
                <option value="HOT">🔥 Hot Lead</option>
                <option value="WARM">⚡ Warm Lead</option>
                <option value="COLD">❄ Cold Lead</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
              >
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="SITE_VISIT_SCHEDULED">Site Visit Scheduled</option>
                <option value="SITE_VISIT_DONE">Site Visit Done</option>
                <option value="NEGOTIATION">In Negotiation</option>
                <option value="BOOKED">Booked</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
          </div>

          {/* Budget & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Budget</label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. ₹75 L - ₹1.2 Cr"
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Preferred Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sector 150, Noida"
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
              />
            </div>
          </div>

          {/* Latest Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Latest Remarks / Next Steps</label>
            <textarea
              rows={3}
              value={latestRemarks}
              onChange={(e) => setLatestRemarks(e.target.value)}
              placeholder="Add updated customer notes or feedback..."
              className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-light"
            />
          </div>

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
              {submitting ? "Updating..." : "Save Updates"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

