"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lock,
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Users2,
  MapPin,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { L2HLogo } from "@/components/ui/L2HLogo";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    designation: "Sales Associate",
    dateOfJoining: new Date().toISOString().split("T")[0],
    teamLeadName: "Shahrukh Ali",
    specializationLocation: "Noida",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.phone.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to submit registration.");
        setLoading(false);
        return;
      }

      setSubmittedData(data.data.user);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (selectedGoogleEmail: string, selectedGoogleName: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedGoogleEmail,
          name: selectedGoogleName,
          phone: formData.phone || "9876543210",
          designation: formData.designation,
          dateOfJoining: formData.dateOfJoining,
          teamLeadName: formData.teamLeadName,
          specializationLocation: formData.specializationLocation,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Google authentication failed.");
        setLoading(false);
        setGoogleModalOpen(false);
        return;
      }

      if (data.data?.user?.status === "ACTIVE") {
        router.push("/");
      } else {
        setSubmittedData(data.data.user);
        setGoogleModalOpen(false);
      }
    } catch (err: any) {
      setError(err.message || "Google registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#09090b] text-white">
      {/* Left Column: L2H Architectural Brand & Manifesto */}
      <div className="relative hidden lg:flex lg:w-5/12 flex-col justify-between p-12 lg:p-14 overflow-hidden border-r border-white/10 bg-black">
        {/* Background Architectural Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85"
            alt="L2H Solution Luxury Real Estate"
            className="w-full h-full object-cover opacity-30 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/60" />
        </div>

        {/* Top: L2H Logo */}
        <div className="relative z-10">
          <L2HLogo variant="header" />
        </div>

        {/* Middle: Brand Philosophy */}
        <div className="relative z-10 space-y-5 my-auto max-w-md">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-zinc-300 text-[11px] font-semibold uppercase tracking-widest backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-zinc-200" />
            <span>Advisory & Sales Network</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-[1.2]">
            Join the Premier <br />
            <span className="font-normal italic text-zinc-300">
              Real Estate Advisory.
            </span>
          </h1>

          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-light">
            Register your advisor account to access the L2H Call Floor Command Center,
            explainable lead scoring, automated follow-up reminders, and portfolio deal matrix.
          </p>

          <div className="space-y-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-3 text-xs text-zinc-300 font-medium">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                ✓
              </div>
              <span>Admin-Verified Role & Micro-Market Lead Allocation</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-300 font-medium">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                ✓
              </div>
              <span>Real-Time DAR Submissions & Weighted Floor Leaderboard</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-300 font-medium">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                ✓
              </div>
              <span>Automated Multi-Level Hot Lead Escalations</span>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-[11px] text-zinc-500 font-medium">
          L2H Solution Advisory LLP • Enterprise Security & Access Control
        </div>
      </div>

      {/* Right Column: Registration Form / Post-Submission Screen */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white text-zinc-950 overflow-y-auto">
        <div className="w-full max-w-xl space-y-6">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center pb-2">
            <L2HLogo variant="login" />
          </div>

          {submittedData ? (
            /* Post-Submission Awaiting Approval Screen */
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-8 h-8 text-amber-600" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950">
                  Registration Submitted!
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto">
                  Your account has been created and is currently <span className="font-bold text-amber-700">pending review and approval</span> by Team Leads / Administrators.
                </p>
              </div>

              {/* Registration Summary Card */}
              <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200 text-left space-y-3 text-xs max-w-md mx-auto">
                <div className="flex justify-between border-b border-zinc-200 pb-2">
                  <span className="text-zinc-500 font-medium">Applicant Name:</span>
                  <span className="font-bold text-zinc-900">{submittedData.name}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 pb-2">
                  <span className="text-zinc-500 font-medium">Email Address:</span>
                  <span className="font-mono text-zinc-900">{submittedData.email}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 pb-2">
                  <span className="text-zinc-500 font-medium">Staff Code:</span>
                  <span className="font-mono font-bold text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-200">
                    {submittedData.staffCode}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 pb-2">
                  <span className="text-zinc-500 font-medium">Assigned Team Lead:</span>
                  <span className="font-bold text-zinc-900">{submittedData.teamLeadName}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-zinc-500 font-medium">Account Status:</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    ⏳ Pending Admin Approval
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>
          ) : (
            /* Signup Form */
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950">
                  Advisor Registration
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 font-light">
                  Create your profile to join the L2H Operating System. All registrations are verified by Team Leads.
                </p>
              </div>

              {/* Direct with Google Button */}
              <div>
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(true)}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-zinc-300 hover:border-zinc-400 bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs uppercase tracking-wider shadow-xs transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-zinc-200 w-full" />
                <span className="bg-white px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest absolute">
                  or register with details
                </span>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Full Name *</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Vikram Sharma"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-xs transition"
                    />
                  </div>

                  {/* Work Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Work Email *</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="vikram@l2hcrm.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-xs transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Phone Number *</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-xs transition font-mono"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Password *</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-xs transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Designation / Role */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Designation / Role *</span>
                    </label>
                    <select
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-xs transition bg-white"
                    >
                      <option value="Sales Associate">Sales Associate</option>
                      <option value="Senior Relationship Manager">Senior Relationship Manager</option>
                      <option value="Assistant Team Lead">Assistant Team Lead</option>
                      <option value="Portfolio Investment Advisor">Portfolio Investment Advisor</option>
                      <option value="Calling Executive">Calling Executive</option>
                    </select>
                  </div>

                  {/* Date of Joining (DOJ) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Date of Joining (DOJ) *</span>
                    </label>
                    <input
                      type="date"
                      name="dateOfJoining"
                      required
                      value={formData.dateOfJoining}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-xs transition bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Assigned / Preferred Team Lead */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <Users2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Team Lead *</span>
                    </label>
                    <select
                      name="teamLeadName"
                      value={formData.teamLeadName}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-xs transition bg-white"
                    >
                      <option value="Shahrukh Ali">Shahrukh Ali (Executive Leadership)</option>
                      <option value="Shahnawaz Khan">Shahnawaz Khan (Team Shahnawaz)</option>
                      <option value="Team Direct Sales">Team Direct Sales</option>
                      <option value="Management / Head Office">Management / Head Office</option>
                    </select>
                  </div>

                  {/* Specialization Location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Primary Location *</span>
                    </label>
                    <select
                      name="specializationLocation"
                      value={formData.specializationLocation}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-xs transition bg-white"
                    >
                      <option value="Noida">Noida / Greater Noida</option>
                      <option value="Gurugram">Gurugram / Golf Course Ext.</option>
                      <option value="Yamuna Expressway">Yamuna Expressway</option>
                      <option value="Delhi Commercial">Delhi NCR Commercial</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:scale-[1.01] flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Registration for Admin Approval</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center">
                <p className="text-xs text-zinc-500">
                  Already have an approved account?{" "}
                  <Link href="/login" className="font-bold text-black hover:underline">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Authentication Modal */}
      {googleModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-zinc-950 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="font-serif font-bold text-sm">Sign in with Google</span>
              </div>
              <button
                onClick={() => setGoogleModalOpen(false)}
                className="text-zinc-400 hover:text-black text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Choose an account or enter your Google email to register with L2H Solution:
              </p>

              <button
                type="button"
                onClick={() => handleGoogleAuth("shahrukh.ali@l2hsolution.com", "Shahrukh Ali")}
                className="w-full flex items-center justify-between p-3 rounded-2xl border border-zinc-200 hover:border-black hover:bg-zinc-50 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                    SA
                  </div>
                  <div>
                    <div className="font-bold text-xs text-zinc-900">Shahrukh Ali</div>
                    <div className="text-[10px] text-zinc-500 font-mono">shahrukh.ali@l2hsolution.com</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase text-zinc-400">Team Lead</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleAuth("shahnawaz.khan@l2hsolution.com", "Shahnawaz Khan")}
                className="w-full flex items-center justify-between p-3 rounded-2xl border border-zinc-200 hover:border-black hover:bg-zinc-50 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                    SK
                  </div>
                  <div>
                    <div className="font-bold text-xs text-zinc-900">Shahnawaz Khan</div>
                    <div className="text-[10px] text-zinc-500 font-mono">shahnawaz.khan@l2hsolution.com</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase text-zinc-400">Team Lead</span>
              </button>

              <div className="pt-2 border-t border-zinc-100 space-y-2">
                <label className="text-[11px] font-bold text-zinc-700">Or use a custom Google Account:</label>
                <input
                  type="text"
                  placeholder="Your Name (e.g. Rahul Verma)"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-1 focus:ring-black"
                />
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-1 focus:ring-black font-mono"
                />
                <button
                  type="button"
                  disabled={!googleEmail || !googleName || loading}
                  onClick={() => handleGoogleAuth(googleEmail, googleName)}
                  className="w-full py-2.5 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
                >
                  {loading ? "Authenticating..." : "Continue with this Google Account →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
