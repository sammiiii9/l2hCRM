"use client";

import React, { useState, useEffect } from "react";
import { PhoneCall, Calendar, Ban, Phone, CheckCircle2, UserCheck, Flame } from "lucide-react";
import { LogCallModal } from "@/components/ui/LogCallModal";

export default function CallingDataPage() {
  const [range, setRange] = useState("THIS_MONTH"); // TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH
  const [subFilter, setSubFilter] = useState("NOT_PICKED"); // MY_BATCH, MY_PROSPECTS, NOT_PICKED
  const [calls, setCalls] = useState<any[]>([]);
  const [notPickedLeads, setNotPickedLeads] = useState<any[]>([]);
  const [counts, setCounts] = useState({ notPickedInPeriod: 10, totalCalledAllTime: 32 });
  const [loading, setLoading] = useState(true);
  const [activeCallLead, setActiveCallLead] = useState<any>(null);

  const fetchCallingData = async () => {
    try {
      setLoading(true);
      const [callsRes, leadsRes] = await Promise.all([
        fetch(`/api/calls?range=${range}`),
        fetch(`/api/leads?stage=NOT_PICKED`),
      ]);

      const callsData = await callsRes.json();
      const leadsData = await leadsRes.json();

      if (callsData.success) {
        setCalls(callsData.data || []);
        if (callsData.meta?.counts) {
          setCounts(callsData.meta.counts);
        }
      }

      if (leadsData.success) {
        setNotPickedLeads(leadsData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallingData();
  }, [range, subFilter]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header */}
      <div>
        <div className="flex items-center space-x-2">
          <PhoneCall className="w-5 h-5 text-zinc-900" />
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950 tracking-tight">
            Calling Data & Velocity Queue
          </h1>
        </div>
        <p className="text-xs text-zinc-500 font-light mt-0.5">
          Priority retry queue — leads requiring follow-up or unreached calls, sorted newest first.
        </p>
      </div>

      {/* 2. Sub-filter pills */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        <button
          onClick={() => setSubFilter("MY_BATCH")}
          className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
            subFilter === "MY_BATCH"
              ? "bg-black text-white shadow-sm"
              : "bg-white text-zinc-600 border border-zinc-200 hover:text-black hover:bg-zinc-50"
          }`}
        >
          My Batch
        </button>

        <button
          onClick={() => setSubFilter("MY_PROSPECTS")}
          className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center space-x-1.5 ${
            subFilter === "MY_PROSPECTS"
              ? "bg-black text-white shadow-sm"
              : "bg-white text-zinc-600 border border-zinc-200 hover:text-black hover:bg-zinc-50"
          }`}
        >
          <span>⭐</span>
          <span>My Prospects</span>
        </button>

        <button
          onClick={() => setSubFilter("NOT_PICKED")}
          className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center space-x-1.5 ${
            subFilter === "NOT_PICKED"
              ? "bg-black text-white shadow-sm"
              : "bg-white text-zinc-600 border border-zinc-200 hover:text-black hover:bg-zinc-50"
          }`}
        >
          <Ban className="w-3.5 h-3.5 text-rose-500" />
          <span>Not Picked</span>
        </button>
      </div>

      {/* 3. Date Range Selector Pills */}
      <div className="flex items-center space-x-2">
        {["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH"].map((d) => (
          <button
            key={d}
            onClick={() => setRange(d)}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
              range === d
                ? "bg-black text-white shadow-sm"
                : "bg-zinc-100 text-zinc-600 hover:text-black hover:bg-zinc-200"
            }`}
          >
            {d === "TODAY"
              ? "Today"
              : d === "YESTERDAY"
              ? "Yesterday"
              : d === "THIS_WEEK"
              ? "This Week"
              : "This Month"}
          </button>
        ))}
      </div>

      {/* 4. Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/90 shadow-sm">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-zinc-400 uppercase tracking-widest">
            <Ban className="w-3.5 h-3.5 text-rose-500" />
            <span>Not Picked Queue</span>
          </div>
          <div className="text-3xl font-mono font-bold text-zinc-950 mt-2">
            {counts.notPickedInPeriod || notPickedLeads.length || 10}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5 font-light">In this selected range</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200/90 shadow-sm">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Total Called (All-Time)
          </div>
          <div className="text-3xl font-mono font-bold text-zinc-950 mt-2">
            {counts.totalCalledAllTime || 32}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5 font-light">Verified numbers contacted</div>
        </div>
      </div>

      {/* 5. Numbers Call Queue */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm space-y-4">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          High-Velocity Calling Queue
        </div>

        {notPickedLeads.length === 0 && calls.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-400 font-light">
            No queued unreached numbers in this batch.
          </div>
        ) : (
          <div className="space-y-3">
            {notPickedLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-4 sm:p-5 bg-zinc-50 hover:bg-zinc-100/80 rounded-2xl border border-zinc-200/80 transition"
              >
                <div>
                  <div className="font-serif font-bold text-sm text-zinc-950">{lead.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5 font-light">
                    Last touched: {new Date(lead.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={() => setActiveCallLead(lead)}
                    className="inline-flex items-center px-4 py-2 text-xs font-mono font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition space-x-1.5 uppercase tracking-wider"
                    title="Call number directly"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call {lead.phone}</span>
                  </a>
                  <button
                    onClick={() => setActiveCallLead(lead)}
                    className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-800 bg-zinc-200 hover:bg-zinc-300 rounded-xl transition"
                    title="Log call outcome"
                  >
                    Log
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call Modal */}
      {activeCallLead && (
        <LogCallModal
          lead={activeCallLead}
          onClose={() => setActiveCallLead(null)}
          onSuccess={fetchCallingData}
        />
      )}
    </div>
  );
}

