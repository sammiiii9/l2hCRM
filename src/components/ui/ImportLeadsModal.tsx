"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  ClipboardPaste,
  UserCheck,
  Zap,
  Users2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Papa from "papaparse";

interface ImportLeadsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportLeadsModal({ onClose, onSuccess }: ImportLeadsModalProps) {
  const [activeTab, setActiveTab] = useState<"FILE" | "PASTE" | "TEMPLATE">("FILE");
  const [rawContent, setRawContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  // Assignee state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [strategy, setStrategy] = useState<"UNASSIGNED" | "SINGLE_USER" | "ROUND_ROBIN">("SINGLE_USER");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Preview state
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [totalParsedRows, setTotalParsedRows] = useState(0);

  useEffect(() => {
    fetchActiveAdvisors();
  }, []);

  const fetchActiveAdvisors = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const active = data.data.filter((u: any) => u.status === "ACTIVE");
        setUsers(active);
        if (active.length > 0) {
          setSelectedUserId(active[0].id);
          setSelectedUserIds(active.map((u: any) => u.id));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const parseAndPreview = (content: string) => {
    setRawContent(content);
    setError("");

    if (!content.trim()) {
      setPreviewRows([]);
      setTotalParsedRows(0);
      return;
    }

    try {
      const isTab = content.includes("\t") && !content.includes(",");
      const parsed = Papa.parse(content, {
        header: true,
        skipEmptyLines: "greedy",
        delimiter: isTab ? "\t" : undefined,
      });

      if (parsed.data && parsed.data.length > 0) {
        setTotalParsedRows(parsed.data.length);
        setPreviewRows(parsed.data.slice(0, 5));
      } else {
        setPreviewRows([]);
        setTotalParsedRows(0);
      }
    } catch (err) {
      console.error("Preview parse error:", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseAndPreview(text);
    };
    reader.readAsText(file);
  };

  const handleSampleLoad = () => {
    const sample = `Name,Phone,Email,Budget,Location,PropertyType,Source,Remarks
Rohan Mehra,9811992233,rohan.m@gmail.com,₹1.5 Cr,Sector 150 Noida,RESIDENTIAL_APARTMENT,99ACRES,Looking for 3BHK high floor ready to move
Pooja Singhania,9822334455,pooja.s@yahoo.com,₹80 Lakhs,Electronic City Noida,COMMERCIAL,DIGITAL_AD,Interested in commercial retail studio
Amit Chawla,9833445566,amit.c@outlook.com,₹2.2 Cr,Golf Course Ext Gurugram,VILLA,REFERRAL,Wants luxury golf-facing villa
Sunita Deshmukh,9844556677,sunita.d@gmail.com,₹3.5 Cr,Yamuna Expressway,PLOT,MAGICBRICKS,Plot investor with 60 day timeline
Vikas Malhotra,9855667788,vikas.m@gmail.com,₹1.2 Cr,Central Noida,RESIDENTIAL_APARTMENT,WEBSITE,Looking for 2BHK rental yield investment`;
    setFileName("sample-l2h-leads.csv");
    parseAndPreview(sample);
  };

  const handleDownloadTemplate = () => {
    const sample = `Name,Phone,Email,Budget,Location,PropertyType,Source,Remarks
Rohan Mehra,9811992233,rohan.m@gmail.com,₹1.5 Cr,Sector 150 Noida,RESIDENTIAL_APARTMENT,99ACRES,Looking for 3BHK high floor ready to move
Pooja Singhania,9822334455,pooja.s@yahoo.com,₹80 Lakhs,Electronic City Noida,COMMERCIAL,DIGITAL_AD,Interested in commercial retail studio`;
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "l2h_lead_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!rawContent.trim()) {
      setError("Please upload a file, paste data from Google Sheets/Excel, or load the sample.");
      return;
    }

    setImporting(true);
    setError("");

    try {
      const res = await fetch("/api/import/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent: rawContent,
          strategy,
          assignedToId: strategy === "SINGLE_USER" ? selectedUserId : null,
          targetUserIds: strategy === "ROUND_ROBIN" ? selectedUserIds : [],
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.data);
        onSuccess();
      } else {
        setError(data.message || "Import failed.");
      }
    } catch (err: any) {
      setError(err.message || "Network error during import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-zinc-950 text-base">Bulk Lead Ingestion</h3>
              <p className="text-xs text-zinc-500 font-light">
                Import from CSV, Excel, Google Sheets with phone normalization & auto-assignment
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-black p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            /* Post Import Success Summary */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
                <div className="font-serif font-bold text-base text-zinc-950 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Bulk Ingestion Completed!</span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Total Processed</div>
                    <div className="text-xl font-bold font-mono text-zinc-950 mt-0.5">
                      {result.totalProcessed}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Imported & Active</div>
                    <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                      {result.importedCount}
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                    <div className="text-[10px] uppercase font-bold text-amber-700">Duplicates Skipped</div>
                    <div className="text-xl font-bold font-mono text-amber-700 mt-0.5">
                      {result.duplicatesCount}
                    </div>
                  </div>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div className="pt-2 text-xs space-y-1">
                    <span className="font-bold text-zinc-700">Import Notes & Skipped Rows:</span>
                    <div className="bg-white p-3 rounded-xl border border-zinc-200 max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] text-zinc-600">
                      {result.errors.map((err: string, idx: number) => (
                        <div key={idx} className="truncate">
                          • {err}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
                >
                  View Leads in Pipeline →
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Import Source Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-2xl border border-zinc-200 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setActiveTab("FILE")}
                  className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                    activeTab === "FILE" ? "bg-white text-black shadow-xs" : "text-zinc-500 hover:text-black"
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("PASTE")}
                  className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                    activeTab === "PASTE" ? "bg-white text-black shadow-xs" : "text-zinc-500 hover:text-black"
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste Sheets / Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("TEMPLATE")}
                  className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                    activeTab === "TEMPLATE" ? "bg-white text-black shadow-xs" : "text-zinc-500 hover:text-black"
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample Data</span>
                </button>
              </div>

              {/* Tab 1: File Upload */}
              {activeTab === "FILE" && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-zinc-300 hover:border-black rounded-3xl p-8 text-center bg-zinc-50/50 transition cursor-pointer relative group">
                    <input
                      type="file"
                      accept=".csv, .tsv, .txt, .xlsx, .xls"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud className="w-10 h-10 text-zinc-400 group-hover:text-black mx-auto mb-2 transition" />
                    <div className="text-xs font-bold text-zinc-900">
                      {fileName ? fileName : "Click or drag & drop CSV or Excel export"}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 font-light">
                      Supports .csv, .tsv, .txt with headers: Name, Phone, Email, Budget, Location, Source
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Direct Paste (Google Sheets / Excel) */}
              {activeTab === "PASTE" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                      Paste rows directly from Google Sheets or Excel:
                    </label>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Auto-detects Tab & Comma Delimiters
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={rawContent}
                    onChange={(e) => parseAndPreview(e.target.value)}
                    placeholder={`Name\tPhone\tEmail\tBudget\tLocation\nRohan Mehra\t9811992233\trohan@gmail.com\t1.5 Cr\tNoida Sector 150\nPooja Singh\t9822334455\tpooja@yahoo.com\t80 Lakhs\tElectronic City`}
                    className="w-full p-3.5 rounded-2xl border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-black text-xs font-mono bg-zinc-50/50"
                  />
                </div>
              )}

              {/* Tab 3: Sample Template */}
              {activeTab === "TEMPLATE" && (
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3 text-xs">
                  <div className="font-bold text-zinc-900 flex items-center justify-between">
                    <span>L2H Standard Real Estate Lead Columns:</span>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .CSV</span>
                    </button>
                  </div>
                  <p className="text-zinc-500 font-light">
                    The ingestion parser supports standard CRM formats including:
                    <span className="font-bold text-zinc-800">
                      {" "}
                      Name, Phone, Email, Budget, Location, PropertyType, Source, Remarks
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={handleSampleLoad}
                    className="w-full py-2.5 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-xs"
                  >
                    ⚡ Load 5 Sample Indian Real Estate Leads
                  </button>
                </div>
              )}

              {/* Live Preview Table */}
              {previewRows.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Parsed Preview ({totalParsedRows} total rows)
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      ✓ Ready for Ingestion
                    </span>
                  </div>

                  <div className="bg-zinc-50 rounded-2xl border border-zinc-200 overflow-x-auto max-h-40">
                    <table className="min-w-full divide-y divide-zinc-200 text-[11px]">
                      <thead className="bg-zinc-100 font-bold text-zinc-700">
                        <tr>
                          <th className="py-2 px-3 text-left">Name</th>
                          <th className="py-2 px-3 text-left">Phone</th>
                          <th className="py-2 px-3 text-left">Budget</th>
                          <th className="py-2 px-3 text-left">Location</th>
                          <th className="py-2 px-3 text-left">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200/60 text-zinc-700 font-mono">
                        {previewRows.map((r, i) => (
                          <tr key={i} className="hover:bg-white transition-colors">
                            <td className="py-2 px-3 font-sans font-bold text-zinc-900">
                              {r.name || r.Name || r["Full Name"] || "--"}
                            </td>
                            <td className="py-2 px-3 text-emerald-800 font-bold">
                              {r.phone || r.Phone || r.Mobile || r["Phone Number"] || "--"}
                            </td>
                            <td className="py-2 px-3">{r.budget || r.Budget || "--"}</td>
                            <td className="py-2 px-3 font-sans">{r.location || r.Location || "--"}</td>
                            <td className="py-2 px-3">{r.source || r.Source || "IMPORT"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Assignment Strategy Section */}
              <div className="space-y-3 pt-3 border-t border-zinc-100">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 block">
                  Lead Assignment Strategy
                </label>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStrategy("SINGLE_USER")}
                    className={`p-3 rounded-2xl border text-left transition ${
                      strategy === "SINGLE_USER"
                        ? "border-black bg-zinc-50 ring-1 ring-black shadow-xs"
                        : "border-zinc-200 hover:border-zinc-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-xs text-zinc-900 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-zinc-700" />
                      <span>Single Advisor</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Assign all to one member</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStrategy("ROUND_ROBIN")}
                    className={`p-3 rounded-2xl border text-left transition ${
                      strategy === "ROUND_ROBIN"
                        ? "border-black bg-zinc-50 ring-1 ring-black shadow-xs"
                        : "border-zinc-200 hover:border-zinc-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-xs text-zinc-900 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Round-Robin</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Distribute evenly</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStrategy("UNASSIGNED")}
                    className={`p-3 rounded-2xl border text-left transition ${
                      strategy === "UNASSIGNED"
                        ? "border-black bg-zinc-50 ring-1 ring-black shadow-xs"
                        : "border-zinc-200 hover:border-zinc-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-xs text-zinc-900 flex items-center gap-1">
                      <Users2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Unassigned Pool</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Assign manually later</div>
                  </button>
                </div>

                {strategy === "SINGLE_USER" && (
                  <div className="pt-1 space-y-1">
                    <label className="text-[11px] font-bold text-zinc-700">Select Target Advisor:</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:ring-1 focus:ring-black text-xs font-medium bg-white"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role?.name || "Associate"}) • {u._count?.assignedLeads || 0} active leads
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {strategy === "ROUND_ROBIN" && (
                  <div className="pt-1 space-y-1">
                    <label className="text-[11px] font-bold text-zinc-700">
                      Active Advisors in Rotation ({selectedUserIds.length} selected):
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-zinc-50 rounded-xl border border-zinc-200">
                      {users.map((u) => {
                        const isChecked = selectedUserIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                if (selectedUserIds.length > 1) {
                                  setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                                }
                              } else {
                                setSelectedUserIds([...selectedUserIds, u.id]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                              isChecked
                                ? "bg-black text-white"
                                : "bg-white text-zinc-600 border border-zinc-200 hover:border-black"
                            }`}
                          >
                            <span>{u.name}</span>
                            <span className="text-[9px] opacity-70">({u._count?.assignedLeads || 0})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-black rounded-xl hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={importing || !rawContent.trim()}
                  onClick={handleImport}
                  className="px-6 py-2.5 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-2 hover:scale-[1.02]"
                >
                  {importing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {totalParsedRows > 0
                          ? `Ingest ${totalParsedRows} Leads →`
                          : "Ingest Leads →"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
