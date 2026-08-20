"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Flame, Building2, User, FileCheck, Phone, ArrowRight } from "lucide-react";
import { maskPhoneNumber } from "@/lib/utils";

interface GlobalSearchModalProps {
  onClose: () => void;
}

export function GlobalSearchModal({ onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    leads: any[];
    customers: any[];
    projects: any[];
    units: any[];
    bookings: any[];
  }>({ leads: [], customers: [], projects: [], units: [], bookings: [] });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ leads: [], customers: [], projects: [], units: [], bookings: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setResults(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults =
    results.leads.length > 0 ||
    results.customers.length > 0 ||
    results.projects.length > 0 ||
    results.units.length > 0 ||
    results.bookings.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Bar Input */}
        <div className="flex items-center px-5 py-4 border-b border-zinc-100">
          <Search className="w-5 h-5 text-zinc-400 mr-3.5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads, phone numbers, projects, units, bookings..."
            className="flex-1 text-sm bg-transparent outline-none text-zinc-950 placeholder-zinc-400 font-medium"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1 text-zinc-400 hover:text-black mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-[11px] font-mono font-bold text-zinc-500 bg-zinc-100 hover:bg-zinc-200 rounded-lg border border-zinc-200"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="py-8 text-center text-xs text-zinc-400 uppercase tracking-widest font-semibold animate-pulse">
              Searching L2H records...
            </div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <div className="py-8 text-center text-xs text-zinc-400 font-light">
              No matching records found for "{query}".
            </div>
          )}

          {/* Leads */}
          {results.leads.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center">
                <Flame className="w-3.5 h-3.5 text-zinc-900 mr-1.5" />
                Leads ({results.leads.length})
              </div>
              <div className="space-y-1.5">
                {results.leads.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => {
                      router.push(`/leads/${l.id}`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-2xl cursor-pointer transition border border-transparent hover:border-zinc-200"
                  >
                    <div>
                      <div className="font-serif font-bold text-sm text-zinc-950">{l.name}</div>
                      <div className="text-xs text-zinc-500 flex items-center space-x-2 font-mono">
                        <span>{maskPhoneNumber(l.phone)}</span>
                        <span>•</span>
                        <span className="font-bold text-zinc-900">{l.leadCode}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-md">
                        {l.stage}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center">
                <Building2 className="w-3.5 h-3.5 text-zinc-900 mr-1.5" />
                Projects ({results.projects.length})
              </div>
              <div className="space-y-1.5">
                {results.projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      router.push(`/projects`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-2xl cursor-pointer transition border border-transparent hover:border-zinc-200"
                  >
                    <div>
                      <div className="font-serif font-bold text-sm text-zinc-950">{p.name}</div>
                      <div className="text-xs text-zinc-500 font-light">{p.location}</div>
                    </div>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-md">
                      {p.propertyType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Units */}
          {results.units.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Inventory Units ({results.units.length})
              </div>
              <div className="space-y-1.5">
                {results.units.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      router.push(`/projects`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-2xl cursor-pointer transition border border-transparent hover:border-zinc-200"
                  >
                    <div>
                      <span className="font-mono font-bold text-sm text-zinc-950">{u.unitNumber}</span>
                      <span className="text-xs text-zinc-600 ml-2 font-light">in {u.project?.name}</span>
                    </div>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-md">
                      {u.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
