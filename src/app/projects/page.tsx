"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  Search,
  Filter,
  Plus,
  MapPin,
  CheckCircle2,
  Layers,
  Sparkles,
  Lock,
  FileCheck2,
} from "lucide-react";
import { CreateBookingModal } from "@/components/ui/CreateBookingModal";
import { formatINR } from "@/lib/utils";

export default function ProjectsPage() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [inventory, setInventory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingUnit, setBookingUnit] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProjects(data.data);
          if (data.data.length > 0) {
            setSelectedProjectId(data.data[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchInventory = async () => {
    if (!selectedProjectId) return;
    try {
      let url = `/api/inventory?projectId=${selectedProjectId}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInventory(data.data || []);
        if (data.meta?.stats) setStats(data.meta.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedProjectId, statusFilter]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Group inventory units by Tower
  const towers = Array.from(new Set(inventory.map((u) => u.tower)));

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950 tracking-tight">
              Master Projects & Inventory Matrix
            </h1>
          </div>
          <p className="text-xs text-zinc-500 font-light mt-0.5">
            Real-time unit availability, luxury floorplans, pricing calculator, and instant deal locking.
          </p>
        </div>

        {/* Project Selector Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition whitespace-nowrap ${
                selectedProjectId === p.id
                  ? "bg-black text-white shadow-sm"
                  : "bg-white text-zinc-700 border border-zinc-200 hover:text-black hover:bg-zinc-50"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Selected Project Overview Card */}
      {selectedProject && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2.5 py-0.5 rounded-md border border-zinc-200">
                  {selectedProject.projectCode}
                </span>
                <span className="text-xs font-semibold text-zinc-500">
                  {selectedProject.developer?.name || "Premier Infra"}
                </span>
                {selectedProject.reraNumber && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    RERA: {selectedProject.reraNumber}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-serif font-bold text-zinc-950 mt-2">{selectedProject.name}</h2>
              <div className="text-xs text-zinc-500 flex items-center mt-1 font-light">
                <MapPin className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                {selectedProject.location}
              </div>
            </div>

            <div className="flex items-center space-x-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Units</div>
                <div className="font-mono font-bold text-sm text-zinc-950">{selectedProject.totalUnits}</div>
              </div>
              <div className="h-6 w-px bg-zinc-200"></div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Price Range</div>
                <div className="font-mono font-bold text-sm text-zinc-950">
                  {formatINR(selectedProject.priceRangeMin)} - {formatINR(selectedProject.priceRangeMax)}
                </div>
              </div>
            </div>
          </div>

          {selectedProject.amenities && (
            <div className="pt-3 border-t border-zinc-100 flex flex-wrap gap-1.5">
              {selectedProject.amenities.split(",").map((a: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-[11px] font-medium bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200"
                >
                  ✨ {a.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Inventory Status Filter & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200/90 shadow-sm">
        {/* Status Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {[
            { key: "ALL", label: `All Units (${stats?.total || inventory.length})` },
            { key: "AVAILABLE", label: `🟢 Available (${stats?.available || 0})` },
            { key: "HOLD", label: `🟡 On Hold (${stats?.hold || 0})` },
            { key: "BOOKED", label: `🔵 Booked (${stats?.booked || 0})` },
            { key: "SOLD", label: `⚪ Sold (${stats?.sold || 0})` },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition whitespace-nowrap ${
                statusFilter === s.key
                  ? "bg-black text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:text-black hover:bg-zinc-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-zinc-400 font-light">Click any available unit to reserve or lock instantly.</div>
      </div>

      {/* 4. Tower & Floor Unit Matrix */}
      <div className="space-y-6">
        {towers.map((tower) => {
          const towerUnits = inventory.filter((u) => u.tower === tower);
          return (
            <div
              key={tower}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-zinc-900" />
                  <h3 className="font-serif font-bold text-base text-zinc-950">{tower}</h3>
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  {towerUnits.length} units
                </span>
              </div>

              {/* Units Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {towerUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50/60 hover:bg-white hover:border-zinc-400 hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-base text-zinc-950">
                        {unit.unitNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                          unit.status === "AVAILABLE"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : unit.status === "HOLD"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : unit.status === "BOOKED"
                            ? "bg-zinc-950 text-white border-black"
                            : "bg-zinc-200 text-zinc-700 border-zinc-300"
                        }`}
                      >
                        {unit.status}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-600 space-y-1 font-light">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Configuration:</span>
                        <span className="font-bold text-zinc-950 font-sans">{unit.configuration}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Super Area:</span>
                        <span className="font-mono">{unit.superArea} sq ft</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Floor / View:</span>
                        <span className="truncate max-w-[140px]">{unit.floor}th Floor • {unit.view}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-zinc-200 font-bold">
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Total Price:</span>
                        <span className="text-zinc-950 font-mono text-sm">
                          {formatINR(unit.totalCalculatedPrice)}
                        </span>
                      </div>
                    </div>

                    {unit.status === "AVAILABLE" ? (
                      <button
                        onClick={() => setBookingUnit(unit)}
                        className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Reserve / Book Unit</span>
                      </button>
                    ) : (
                      <div className="py-2.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-400 bg-zinc-100 border border-zinc-200 rounded-xl">
                        Unit {unit.status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Modal */}
      {bookingUnit && (
        <CreateBookingModal
          initialUnit={bookingUnit}
          initialLead={null}
          onClose={() => setBookingUnit(null)}
          onSuccess={fetchInventory}
        />
      )}
    </div>
  );
}

