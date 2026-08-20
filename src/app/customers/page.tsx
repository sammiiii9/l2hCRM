"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Users2,
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  Calendar,
  CreditCard,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { formatINR, maskPhoneNumber } from "@/lib/utils";

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      let url = "/api/customers";
      if (searchQuery) url += `?q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const fetchCustomer360 = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCustomer(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users2 className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950 tracking-tight">
              Customer 360 Directory
            </h1>
          </div>
          <p className="text-xs text-zinc-500 font-light mt-0.5">
            Complete high-net-worth investor profiles, property portfolios, linked leads, and closed deals.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, phone, code..."
            className="w-full text-xs pl-9 pr-3.5 py-2 bg-white border border-zinc-200 rounded-xl focus:border-black focus:ring-1 focus:ring-black outline-none shadow-xs font-medium"
          />
        </div>
      </div>

      {/* 2. Customer Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-400 uppercase tracking-widest font-semibold animate-pulse">
          Loading customer directory...
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-zinc-200 shadow-sm space-y-2">
          <Users2 className="w-8 h-8 text-zinc-300 mx-auto" />
          <p className="text-xs text-zinc-400 font-light">No customer profiles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div
              key={c.id}
              onClick={() => fetchCustomer360(c.id)}
              className="bg-white p-6 rounded-2xl border border-zinc-200/90 shadow-sm hover:shadow-md hover:border-zinc-400 transition cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2.5 py-0.5 rounded-md border border-zinc-200">
                  {c.customerCode}
                </span>
                <span className="text-[11px] text-zinc-400 font-light">{c.city}</span>
              </div>

              <div>
                <h3 className="font-serif font-bold text-base text-zinc-950">{c.name}</h3>
                <div className="text-xs text-zinc-500 font-mono mt-0.5">{maskPhoneNumber(c.phone)}</div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-light">Active Bookings:</span>
                <span className="font-mono font-bold text-zinc-950">{c._count?.bookings || 0} Deals</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Customer 360 Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-end p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl shadow-2xl border border-zinc-200 p-6 sm:p-8 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2.5 py-0.5 rounded-md border border-zinc-200">
                  {selectedCustomer.customerCode}
                </span>
                <h2 className="text-2xl font-serif font-bold text-zinc-950 mt-2">{selectedCustomer.name}</h2>
                <div className="text-xs text-zinc-500 font-mono mt-0.5">{selectedCustomer.phone} • {selectedCustomer.email || "No email"}</div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl"
              >
                Close
              </button>
            </div>

            {/* Bookings */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Active Bookings & Deals ({selectedCustomer.bookings?.length || 0})
              </div>
              {selectedCustomer.bookings?.map((b: any) => (
                <div key={b.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-zinc-950">{b.bookingCode}</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                      {b.status}
                    </span>
                  </div>
                  <div className="font-serif font-bold text-zinc-950 text-sm">
                    Unit {b.inventoryUnit?.unitNumber} • {b.project?.name}
                  </div>
                  <div className="text-zinc-600 font-light">
                    Deal Value: <span className="font-mono font-bold text-zinc-950">{formatINR(b.totalDealValue)}</span> • Token Paid: <span className="font-mono font-bold text-emerald-800">{formatINR(b.tokenAmountPaid)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Linked Leads */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Interaction History & Leads ({selectedCustomer.linkedLeads?.length || 0})
              </div>
              {selectedCustomer.linkedLeads?.map((l: any) => (
                <div key={l.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-zinc-900">{l.name} ({l.leadCode})</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-md">
                      {l.stage}
                    </span>
                  </div>
                  {l.latestRemarks && (
                    <p className="text-zinc-600 text-xs bg-white p-2.5 rounded-xl border border-zinc-100 font-light">
                      {l.latestRemarks}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

