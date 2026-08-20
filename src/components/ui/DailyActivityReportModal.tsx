"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  PhoneCall,
  Clock,
  UserCheck,
  UserMinus,
  Users,
  MapPin,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Trash2,
  RefreshCw,
  Eye,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface DailyActivityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user?: {
    id: string;
    name: string;
    email?: string;
    staffCode?: string | null;
    teamName?: string | null;
    designation?: string | null;
  };
}

export function DailyActivityReportModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: DailyActivityReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // DAR Info
  const [todayDateString, setTodayDateString] = useState("");
  const [formattedDate, setFormattedDate] = useState("");
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [existingDar, setExistingDar] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(user || null);

  // 6 Metric inputs
  const [calls, setCalls] = useState<string>("");
  const [talkTimeMinutes, setTalkTimeMinutes] = useState<string>("");
  const [prospects, setProspects] = useState<string>("");
  const [suspects, setSuspects] = useState<string>("");
  const [meetings, setMeetings] = useState<string>("");
  const [visits, setVisits] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Callyzer Screenshot
  const [screenshotData, setScreenshotData] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [previewZoomOpen, setPreviewZoomOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch today's DAR status on modal open
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    fetch("/api/dar/today")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTodayDateString(data.todayDateString);
          setFormattedDate(data.formattedDate);
          if (data.user) {
            setCurrentUser(data.user);
          }

          if (data.isSubmitted && data.dar) {
            setIsAlreadySubmitted(true);
            setExistingDar(data.dar);
            setCalls(String(data.dar.calls));
            setTalkTimeMinutes(String(data.dar.talkTimeMinutes));
            setProspects(String(data.dar.prospects));
            setSuspects(String(data.dar.suspects));
            setMeetings(String(data.dar.meetings));
            setVisits(String(data.dar.visits));
            setRemarks(data.dar.remarks || "");
            setScreenshotData(data.dar.callyzerScreenshot || "");
            setFileName(data.dar.callyzerFileName || "callyzer_report_screenshot.png");
            setFileSize(data.dar.callyzerFileSize || 0);
          } else {
            setIsAlreadySubmitted(false);
            setExistingDar(null);
            // Default 0s for clean operational entry
            setCalls("0");
            setTalkTimeMinutes("0");
            setProspects("0");
            setSuspects("0");
            setMeetings("0");
            setVisits("0");
            setRemarks("");
            setScreenshotData("");
            setFileName("");
            setFileSize(0);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load today's DAR:", err);
        setError("Failed to load today's DAR status. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Validate image format
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
      setError("Please upload a valid image file (PNG, JPG, or JPEG).");
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit. Please upload a smaller screenshot.");
      return;
    }

    setError(null);
    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setScreenshotData(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshotData("");
    setFileName("");
    setFileSize(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Validation
  const isValidInteger = (val: string) => {
    if (val === "" || val === undefined || val === null) return false;
    const num = Number(val);
    return Number.isInteger(num) && num >= 0;
  };

  const isFormValid =
    isValidInteger(calls) &&
    isValidInteger(talkTimeMinutes) &&
    isValidInteger(prospects) &&
    isValidInteger(suspects) &&
    isValidInteger(meetings) &&
    isValidInteger(visits) &&
    screenshotData.trim().length > 0;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        calls: Math.floor(Number(calls)),
        talkTimeMinutes: Math.floor(Number(talkTimeMinutes)),
        prospects: Math.floor(Number(prospects)),
        suspects: Math.floor(Number(suspects)),
        meetings: Math.floor(Number(meetings)),
        visits: Math.floor(Number(visits)),
        callyzerScreenshot: screenshotData,
        callyzerFileName: fileName,
        callyzerFileSize: fileSize,
        remarks: remarks.trim() || undefined,
      };

      const res = await fetch("/api/dar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit DAR");
      }

      setSuccessMessage(
        isAlreadySubmitted
          ? "Your Daily Activity Report (DAR) has been updated successfully."
          : "Your Daily Activity Report (DAR) for today has been recorded."
      );
      setIsAlreadySubmitted(true);
      setExistingDar(data.data.dar);

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error("DAR Submission Error:", err);
      setError(err.message || "An unexpected error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-5 border-b border-slate-800/80 bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Daily Activity Report (DAR)
                </h2>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  {formattedDate || "Today's Activity Log"}
                </p>
              </div>
            </div>

            {/* Member & Status Badge */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{currentUser?.name || "Team Member"}</span>
                {currentUser?.staffCode && (
                  <span className="text-slate-400">({currentUser.staffCode})</span>
                )}
                {currentUser?.teamName && (
                  <span className="text-slate-400">• {currentUser.teamName}</span>
                )}
              </div>

              {isAlreadySubmitted ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    Submitted ✓
                    {existingDar?.updatedAt && (
                      <span className="font-normal text-emerald-400/80 ml-1">
                        at{" "}
                        {new Date(existingDar.updatedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Not Submitted</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs font-medium">Loading DAR records...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Alerts */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-emerald-300">DAR Submitted Successfully</div>
                    <div className="mt-0.5 text-emerald-400/90">{successMessage}</div>
                  </div>
                </div>
              )}

              {/* 2×3 Activity Metrics Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Activity Metrics
                  </label>
                  <span className="text-[11px] text-slate-400">All fields required (≥ 0)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* 1. Calls */}
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium text-xs">
                        <PhoneCall className="w-3.5 h-3.5 text-indigo-400" />
                        <span>No. of Calls</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Dialed</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={calls}
                      onChange={(e) => setCalls(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-base font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Total calls made today</p>
                  </div>

                  {/* 2. Talk Time */}
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium text-xs">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Total Talk Time</span>
                      </div>
                      <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                        min
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={talkTimeMinutes}
                        onChange={(e) => setTalkTimeMinutes(e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-3 pr-11 py-2 text-white font-mono text-base font-semibold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 font-mono pointer-events-none">
                        min
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {talkTimeMinutes && Number(talkTimeMinutes) > 0
                        ? `≈ ${(Number(talkTimeMinutes) / 60).toFixed(1)} hrs total duration`
                        : "Total duration in minutes"}
                    </p>
                  </div>

                  {/* 3. Prospects */}
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium text-xs">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>No. of Prospects</span>
                      </div>
                      <span className="text-[10px] text-emerald-400/80 font-mono">Hot / Warm</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={prospects}
                      onChange={(e) => setProspects(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">High-intent verified leads</p>
                  </div>

                  {/* 4. Suspects */}
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium text-xs">
                        <UserMinus className="w-3.5 h-3.5 text-amber-400" />
                        <span>No. of Suspects</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">New / Raw</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={suspects}
                      onChange={(e) => setSuspects(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-base font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Unqualified potential leads</p>
                  </div>

                  {/* 5. Meetings */}
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium text-xs">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        <span>No. of Meetings</span>
                      </div>
                      <span className="text-[10px] text-purple-400/80 font-mono">Video / Office</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={meetings}
                      onChange={(e) => setMeetings(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-base font-semibold focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Direct meetings conducted</p>
                  </div>

                  {/* 6. Visits */}
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium text-xs">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>No. of Visits</span>
                      </div>
                      <span className="text-[10px] text-rose-400/80 font-mono">Site / Project</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={visits}
                      onChange={(e) => setVisits(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-base font-semibold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Client site visits completed</p>
                  </div>
                </div>
              </div>

              {/* Callyzer Screenshot Upload Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span>Callyzer Report Screenshot</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">PNG, JPG, JPEG (Max 10MB)</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {screenshotData ? (
                  <div className="relative p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        onClick={() => setPreviewZoomOpen(true)}
                        className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-600 shrink-0 cursor-pointer group"
                      >
                        <img
                          src={screenshotData}
                          alt="Callyzer Screenshot Preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-white truncate">
                            {fileName || "callyzer_report_screenshot.png"}
                          </p>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            Attached ✓
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {fileSize > 0 ? formatBytes(fileSize) : "Verified image upload"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewZoomOpen(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={removeScreenshot}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                        title="Remove Screenshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-slate-700 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="mx-auto w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-2">
                      <UploadCloud className="w-5 h-5 text-indigo-400" />
                    </div>
                    <p className="text-xs font-semibold text-slate-200">
                      Upload Callyzer Report Screenshot
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Drag & drop your screenshot here, or{" "}
                      <span className="text-indigo-400 underline font-medium">browse file</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Optional Remarks */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Remarks / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add any specific highlights, client blockers, or floor feedback..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                    isFormValid && !submitting
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 cursor-pointer"
                      : "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-75"
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording DAR...</span>
                    </>
                  ) : isAlreadySubmitted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Update DAR</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Submit DAR</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Screenshot Zoom Modal */}
      {previewZoomOpen && screenshotData && (
        <div
          onClick={() => setPreviewZoomOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white truncate max-w-xs">
                  {fileName || "Callyzer Report Screenshot"}
                </span>
              </div>
              <button
                onClick={() => setPreviewZoomOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center">
              <img
                src={screenshotData}
                alt="Full Screenshot Preview"
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
