"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Calendar, Sparkles, Award, Phone, Users } from "lucide-react";

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("THIS_MONTH");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leaderboard?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const podium = data?.podium || {};
  const restOfFloor = data?.restOfFloor || [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950 tracking-tight">
              Floor Leaderboard & Standings
            </h1>
          </div>
          <p className="text-xs text-zinc-500 font-light mt-0.5">
            Results-first rankings — Bookings closed, verified site visits, and qualified call volume.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center space-x-2">
          {["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
                period === p
                  ? "bg-black text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:text-black hover:bg-zinc-200"
              }`}
            >
              {p === "TODAY"
                ? "Today"
                : p === "YESTERDAY"
                ? "Yesterday"
                : p === "THIS_WEEK"
                ? "This Week"
                : "This Month"}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Podium Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base">🏆</span>
            <h2 className="font-serif font-bold text-base text-zinc-950">
              Floor Champions — {period === "THIS_MONTH" ? "This Month" : "Selected Period"}
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-medium">
            {data?.totalCompetitors || 36} active associates
          </span>
        </div>

        {/* The 3 Podium Pillars */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-8 pb-2 max-w-3xl mx-auto">
          {/* 2nd Place (Silver) */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-800 text-white font-serif font-bold text-base sm:text-lg flex items-center justify-center shadow-md mb-2 border-2 border-zinc-600">
              {podium.second?.initials || "AG"}
            </div>
            <div className="font-serif font-bold text-xs sm:text-sm text-zinc-950 text-center">
              {podium.second?.name || "Anamika Gupta"}
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500 text-center font-light">
              {podium.second?.teamName || "Team Roshan"}
            </div>

            <div className="flex items-center space-x-1.5 mt-2 mb-3">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-full flex items-center">
                📍 {podium.second?.visits || 10}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-full flex items-center">
                🤝 {podium.second?.meetings || 4}
              </span>
            </div>

            {/* Silver Podium Box */}
            <div className="w-full bg-zinc-100 rounded-2xl p-4 text-center border border-zinc-300 shadow-xs h-32 flex flex-col justify-center items-center">
              <div className="w-6 h-6 rounded-full bg-zinc-400 text-white font-bold text-xs flex items-center justify-center mb-1">
                2
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-zinc-800">
                {podium.second?.bookings || 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Bookings
              </div>
            </div>
          </div>

          {/* 1st Place (Gold - Center, Tallest) */}
          <div className="flex flex-col items-center -mt-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black text-white font-serif font-bold text-lg sm:text-xl flex items-center justify-center shadow-lg border-2 border-zinc-400 mb-2">
              {podium.first?.initials || "SR"}
            </div>
            <div className="font-serif font-bold text-xs sm:text-base text-zinc-950 text-center">
              {podium.first?.name || "Sumit Rajput"}
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500 text-center font-light">
              {podium.first?.teamName || "Team Sumit"}
            </div>

            <div className="flex items-center space-x-1 mt-2 mb-3">
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-zinc-950 text-white rounded-full flex items-center">
                🏆 {podium.first?.bookings || 2} Deals
              </span>
            </div>

            {/* Gold Podium Box */}
            <div className="w-full bg-zinc-950 text-white rounded-2xl p-5 text-center border border-black shadow-md h-40 flex flex-col justify-center items-center">
              <div className="w-7 h-7 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center mb-1 shadow-xs font-mono">
                1
              </div>
              <div className="text-3xl sm:text-4xl font-mono font-bold text-white">
                {podium.first?.bookings || 2}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Bookings Closed
              </div>
            </div>
          </div>

          {/* 3rd Place (Bronze) */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-700 text-white font-serif font-bold text-base sm:text-lg flex items-center justify-center shadow-md mb-2 border-2 border-zinc-500">
              {podium.third?.initials || "AK"}
            </div>
            <div className="font-serif font-bold text-xs sm:text-sm text-zinc-950 text-center">
              {podium.third?.name || "Ashok Kumar Tiwary"}
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500 text-center font-light">
              {podium.third?.teamName || "Team Shivesh"}
            </div>

            <div className="flex items-center space-x-1.5 mt-2 mb-3">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-full flex items-center">
                📍 {podium.third?.visits || 10}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-full flex items-center">
                🤝 {podium.third?.meetings || 4}
              </span>
            </div>

            {/* Bronze Podium Box */}
            <div className="w-full bg-zinc-100 rounded-2xl p-4 text-center border border-zinc-300 shadow-xs h-32 flex flex-col justify-center items-center">
              <div className="w-6 h-6 rounded-full bg-zinc-500 text-white font-bold text-xs flex items-center justify-center mb-1">
                3
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-zinc-800">
                {podium.third?.bookings || 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Bookings
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. "THE REST OF THE FLOOR" Table */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-sm space-y-3">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          The Rest of the Floor
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100 text-xs">
            <thead>
              <tr className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] text-left">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">NAME</th>
                <th className="py-3 px-4">TEAM</th>
                <th className="py-3 px-4 text-center">🏆 BOOKINGS</th>
                <th className="py-3 px-4 text-center">VISITS</th>
                <th className="py-3 px-4 text-center">MEETINGS</th>
                <th className="py-3 px-4 text-right">CALLS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {restOfFloor.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400 font-light">
                    No other associates logged this period.
                  </td>
                </tr>
              ) : (
                restOfFloor.map((member: any) => (
                  <tr key={member.id} className="hover:bg-zinc-50 transition">
                    <td className="py-3 px-4 font-bold text-zinc-400 font-mono">{member.rank}</td>
                    <td className="py-3 px-4 font-serif font-bold text-zinc-950">{member.name}</td>
                    <td className="py-3 px-4 text-zinc-500 font-light">{member.teamName}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-zinc-900">
                      {member.bookings > 0 ? member.bookings : "•"}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-emerald-700">
                      {member.visits}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-amber-700">
                      {member.meetings}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-950">
                      {member.calls.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Weighted Priority Hierarchy & Tie-Breaking Rules */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-zinc-900" />
          <h3 className="font-serif font-bold text-base text-zinc-950">
            Real-Time Ranking Rules & Weighted Priority Hierarchy
          </h3>
        </div>
        <p className="text-xs text-zinc-500 font-light">
          The leaderboard ranks associates dynamically upon every call logged, site visit scheduled, or booking closed.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-xs">
            <thead className="bg-zinc-50 font-bold uppercase tracking-wider text-zinc-500 text-[10px]">
              <tr>
                <th className="py-3 px-4 text-left">Rank Priority</th>
                <th className="py-3 px-4 text-left">Metric / Event</th>
                <th className="py-3 px-4 text-left">Weightage Rule</th>
                <th className="py-3 px-4 text-left">Example Scenario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              <tr className="bg-zinc-50/50">
                <td className="py-3 px-4 font-bold text-zinc-950">Tier 1 (Highest)</td>
                <td className="py-3 px-4 font-serif font-bold text-zinc-950">Closed Booking 🏆</td>
                <td className="py-3 px-4 text-zinc-600 font-light">Overrides all visits and calls</td>
                <td className="py-3 px-4 font-mono text-[11px] text-zinc-900 font-semibold">1 Booking beats 5 Visits / 400 Calls</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-800">Tier 2</td>
                <td className="py-3 px-4 font-serif font-bold text-zinc-950">Site Visit / Meeting 📍</td>
                <td className="py-3 px-4 text-zinc-600 font-light">Overrides higher call counts without visits</td>
                <td className="py-3 px-4 font-mono text-[11px] text-zinc-900 font-semibold">1 Visit + 250 Calls beats 350 Calls (0 Visits)</td>
              </tr>
              <tr className="bg-zinc-50/50">
                <td className="py-3 px-4 font-bold text-zinc-600">Tier 3</td>
                <td className="py-3 px-4 font-serif font-bold text-zinc-950">Total Calls Logged 📞</td>
                <td className="py-3 px-4 text-zinc-600 font-light">Deciding factor when bookings & visits are equal</td>
                <td className="py-3 px-4 font-mono text-[11px] text-zinc-900 font-semibold">350 Calls beats 300 Calls</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs text-zinc-900 space-y-1">
          <div className="font-bold flex items-center space-x-1.5 text-zinc-950">
            <span>⚖️</span>
            <span>Tie-Breaking Logic:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-700 pl-1 font-light">
            <li>If bookings are equal, higher site visits & meetings take precedence.</li>
            <li>If visits are equal, higher total call volume breaks the tie.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

