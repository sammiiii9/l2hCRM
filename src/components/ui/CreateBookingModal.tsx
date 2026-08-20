"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Building2, CreditCard } from "lucide-react";
import { formatINR } from "@/lib/utils";

interface CreateBookingModalProps {
  initialUnit?: any;
  initialLead?: any;
  lead?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBookingModal({ initialUnit, initialLead, lead, onClose, onSuccess }: CreateBookingModalProps) {
  const targetLead = lead || initialLead;
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialUnit?.projectId || "");
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnit?.id || "");
  const [selectedUnit, setSelectedUnit] = useState<any>(initialUnit || null);

  // Customer info
  const [customerName, setCustomerName] = useState(targetLead?.name || "");
  const [customerPhone, setCustomerPhone] = useState(targetLead?.phone || "");
  const [customerEmail, setCustomerEmail] = useState(targetLead?.email || "");

  // Deal info
  const [dealValue, setDealValue] = useState<number>(initialUnit?.totalCalculatedPrice || 0);
  const [tokenPaid, setTokenPaid] = useState<number>(500000);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentPlan, setPaymentPlan] = useState("Construction Linked Plan (CLP)");
  const [commissionRate, setCommissionRate] = useState(2.5);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProjects(data.data);
      });
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetch(`/api/inventory?projectId=${selectedProjectId}&status=AVAILABLE`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAvailableUnits(data.data);
            if (initialUnit && initialUnit.projectId === selectedProjectId) {
              setAvailableUnits((prev) => [initialUnit, ...prev.filter((u) => u.id !== initialUnit.id)]);
            }
          }
        });
    }
  }, [selectedProjectId, initialUnit]);

  const handleUnitSelect = (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = availableUnits.find((u) => u.id === unitId) || initialUnit;
    if (unit) {
      setSelectedUnit(unit);
      setDealValue(unit.totalCalculatedPrice);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedUnitId || !customerName.trim() || !customerPhone.trim()) {
      setError("Please fill all required project, unit, and customer fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          inventoryUnitId: selectedUnitId,
          leadId: initialLead?.id || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          totalDealValue: dealValue,
          tokenAmountPaid: tokenPaid,
          paymentPlan,
          paymentMethod,
          transactionRef: transactionRef.trim() || undefined,
          commissionPercentage: commissionRate,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.message || "Failed to create booking.");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Create Unit Booking & Token Receipt</h3>
              <p className="text-xs text-slate-500">Atomic inventory reservation & customer deal creation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center border border-rose-200">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project & Unit Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Project *</label>
              <select
                required
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedUnitId("");
                  setSelectedUnit(null);
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- Choose Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Available Unit *</label>
              <select
                required
                value={selectedUnitId}
                onChange={(e) => handleUnitSelect(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- Choose Unit --</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unitNumber} ({u.configuration} - {u.tower} - {formatINR(u.totalCalculatedPrice)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Details */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer Details</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rajesh Malhotra"
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9810012345"
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. client@domain.com"
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Token */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
            <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center">
              <CreditCard className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Financials & Token Receipt
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Total Deal Value (₹)</label>
                <input
                  type="number"
                  required
                  value={dealValue}
                  onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Token Paid Now (₹)</label>
                <input
                  type="number"
                  value={tokenPaid}
                  onChange={(e) => setTokenPaid(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="BANK_TRANSFER">Bank NEFT/RTGS</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Transaction Ref / Cheque No.</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. HDFC-NEFT-991823"
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Balance to Collect: <span className="font-bold text-slate-800">{formatINR(dealValue - tokenPaid)}</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {submitting ? "Booking Unit..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
