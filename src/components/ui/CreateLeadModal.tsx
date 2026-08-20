"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import DuplicateLeadWarningModal from "./DuplicateLeadWarningModal";

interface CreateLeadModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateLeadModal({ onClose, onSuccess }: CreateLeadModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("CALL_FLOOR");
  const [priority, setPriority] = useState("WARM");
  const [stage, setStage] = useState("TO_WORK");
  const [budget, setBudget] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [propertyType, setPropertyType] = useState("RESIDENTIAL_APARTMENT");
  const [configuration, setConfiguration] = useState("3BHK");
  const [requirementNotes, setRequirementNotes] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Duplicate Warning State
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProjects(data.data);
        }
      })
      .catch(console.error);

    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const active = data.data.filter((u: any) => u.status === "ACTIVE");
          setAdvisors(active);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Lead name and phone number are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Pre-creation Duplicate Check
      const checkRes = await fetch("/api/leads/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          preferredLocation: preferredLocation.trim() || undefined,
        }),
      });

      const checkData = await checkRes.json();
      if (checkData.success && checkData.data?.duplicates?.length > 0) {
        setDuplicates(checkData.data.duplicates);
        setDuplicateWarningOpen(true);
        setSubmitting(false);
        return;
      }

      // 2. If no duplicates, proceed with creation
      await executeCreateLead();
    } catch (err: any) {
      setError(err.message || "Network error.");
      setSubmitting(false);
    }
  };

  const executeCreateLead = async () => {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          source,
          priority,
          stage,
          budget: budget.trim() || undefined,
          preferredLocation: preferredLocation.trim() || undefined,
          propertyType,
          configuration,
          requirementNotes: requirementNotes.trim() || undefined,
          projectInterestId: projectId || null,
          assignedToId: assignedToId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(data.message || "Failed to create lead.");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
      setDuplicateWarningOpen(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-zinc-950 text-white flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-zinc-950 text-base">Add New Real Estate Lead</h3>
                <p className="text-xs text-zinc-500 font-light">Capture investor details and advisory requirements</p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-black p-1 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center border border-rose-200">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Momin Salman"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 917505610239"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-mono"
                />
              </div>
            </div>

            {/* Email & Source */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. momin@gmail.com"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
                >
                  <option value="CALL_FLOOR">Calling Floor / Cold Call</option>
                  <option value="DIGITAL_AD">Digital Ad / Meta / Google</option>
                  <option value="WEBSITE">Direct Website</option>
                  <option value="REFERRAL">Referral / Channel Partner</option>
                  <option value="99ACRES">99acres</option>
                  <option value="MAGICBRICKS">MagicBricks</option>
                  <option value="HOUSING">Housing.com</option>
                </select>
              </div>
            </div>

            {/* Project & Property Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Property Type</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
                >
                  <option value="RESIDENTIAL_APARTMENT">Residential Apartment</option>
                  <option value="VILLA">Luxury Villa</option>
                  <option value="COMMERCIAL">Commercial / Retail</option>
                  <option value="PLOT">Residential Plot</option>
                  <option value="PENTHOUSE">Penthouse</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Project Interest</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
                >
                  <option value="">-- General Inquiry --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Budget, Location, Config */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Budget</label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. ₹1.2 Cr"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Preferred Location</label>
                <input
                  type="text"
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                  placeholder="e.g. Sector 150 Noida"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Configuration</label>
                <select
                  value={configuration}
                  onChange={(e) => setConfiguration(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium"
                >
                  <option value="1BHK">1 BHK</option>
                  <option value="2BHK">2 BHK</option>
                  <option value="3BHK">3 BHK</option>
                  <option value="4BHK">4 BHK</option>
                  <option value="STUDIO">Studio / Retail</option>
                  <option value="PENTHOUSE">Penthouse</option>
                </select>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Requirement Notes & Remarks</label>
              <textarea
                rows={2}
                value={requirementNotes}
                onChange={(e) => setRequirementNotes(e.target.value)}
                placeholder="e.g. Interested in investment with guaranteed rental yield..."
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-light"
              />
            </div>

            {/* Advisor Assignment */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Assign To Sales Advisor (Optional)
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none font-medium bg-white"
              >
                <option value="">-- Assign to Me (Default) --</option>
                {advisors.map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {adv.name} ({adv.role?.name || "Associate"}) • {adv._count?.assignedLeads || 0} active leads
                  </option>
                ))}
              </select>
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
                {submitting ? "Checking & Creating..." : "Create Lead"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Duplicate Lead Warning Modal */}
      {duplicateWarningOpen && (
        <DuplicateLeadWarningModal
          isOpen={duplicateWarningOpen}
          onClose={() => setDuplicateWarningOpen(false)}
          onContinueAnyway={executeCreateLead}
          duplicates={duplicates}
        />
      )}
    </>
  );
}
