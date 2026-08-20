"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  FileCheck2,
  Search,
  Plus,
  CreditCard,
  Building2,
  CheckCircle2,
  Ban,
  Clock,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { CreateBookingModal } from "@/components/ui/CreateBookingModal";
import { formatINR, maskPhoneNumber } from "@/lib/utils";

export default function BookingsPage() {
  const { user, isAdmin } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [paymentModalBooking, setPaymentModalBooking] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(500000);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/bookings");
      const data = await res.json();
      if (data.success) {
        setBookings(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    const reason = prompt("Please enter the reason for cancellation (inventory will be released back to Available):");
    if (!reason) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationReason: reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        fetchBookings();
      } else {
        alert(data.message || "Failed to cancel booking.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalBooking || paymentAmount <= 0) return;

    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: paymentModalBooking.id,
          amount: paymentAmount,
          paymentMethod,
          paymentStage: "INSTALLMENT",
          remarks: "Milestone payment collected",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentModalBooking(null);
        fetchBookings();
      } else {
        alert(data.message || "Failed to record payment.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-zinc-900" />
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950 tracking-tight">
              Bookings & Deals Pipeline
            </h1>
          </div>
          <p className="text-xs text-zinc-500 font-light mt-0.5">
            Unit reservations, verified token receipts, installment ledgers, and advisor commissions.
          </p>
        </div>

        <button
          onClick={() => setCreateBookingOpen(true)}
          className="inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-800 rounded-xl shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create New Booking
        </button>
      </div>

      {/* 2. Bookings Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-400 uppercase tracking-widest font-semibold animate-pulse">
            Loading bookings ledger...
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-400 space-y-2 font-light">
            <FileCheck2 className="w-8 h-8 text-zinc-300 mx-auto" />
            <p>No active bookings in the pipeline.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-xs">
              <thead className="bg-zinc-50 font-bold uppercase tracking-wider text-zinc-500 text-[10px]">
                <tr>
                  <th className="py-3 px-4 text-left">Booking Code</th>
                  <th className="py-3 px-4 text-left">Customer</th>
                  <th className="py-3 px-4 text-left">Project & Unit</th>
                  <th className="py-3 px-4 text-left">Deal Value</th>
                  <th className="py-3 px-4 text-left">Token Paid</th>
                  <th className="py-3 px-4 text-left">Balance</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Commission</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-950">{b.bookingCode}</td>
                    <td className="py-3 px-4">
                      <div className="font-serif font-bold text-zinc-950">{b.customer?.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">{maskPhoneNumber(b.customer?.phone)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-950">{b.inventoryUnit?.unitNumber}</div>
                      <div className="text-[11px] text-zinc-500 font-light">{b.project?.name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-950">
                      {formatINR(b.totalDealValue)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {formatINR(b.tokenAmountPaid)}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500">
                      {formatINR(b.balanceAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                          b.status === "CONFIRMED" || b.status === "TOKEN_PAID"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : b.status === "COMPLETED"
                            ? "bg-zinc-950 text-white border-black"
                            : b.status === "CANCELLED"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-zinc-900">
                      {formatINR(b.commissionAmount)} ({b.commissionPercentage}%)
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {b.status !== "CANCELLED" && (
                        <>
                          <button
                            onClick={() => setPaymentModalBooking(b)}
                            className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                          >
                            + Collect Payment
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                            >
                              Cancel Deal
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {paymentModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-zinc-200">
            <h3 className="font-serif font-bold text-zinc-950 text-base">
              Collect Payment: {paymentModalBooking.bookingCode}
            </h3>
            <p className="text-xs text-zinc-500 font-light">
              Customer: {paymentModalBooking.customer?.name} • Balance: {formatINR(paymentModalBooking.balanceAmount)}
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Amount to Collect (₹)</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm p-2.5 rounded-xl border border-zinc-200 font-mono font-bold outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 outline-none focus:border-black"
                >
                  <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Credit / Debit Card</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalBooking(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-800 rounded-xl shadow-xs transition"
                >
                  {submittingPayment ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Booking Modal */}
      {createBookingOpen && (
        <CreateBookingModal
          initialLead={null}
          initialUnit={null}
          onClose={() => setCreateBookingOpen(false)}
          onSuccess={fetchBookings}
        />
      )}
    </div>
  );
}

