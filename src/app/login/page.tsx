"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { L2HLogo } from "@/components/ui/L2HLogo";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your phone number / staff code and password.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await login(identifier.trim(), password.trim());
    if (res.success) {
      router.push("/");
    } else {
      setError(res.message || "Invalid login credentials.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (email: string, name: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Google authentication failed.");
        setLoading(false);
        setGoogleModalOpen(false);
        return;
      }

      if (data.data?.requiresRegistration) {
        router.push(`/signup?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`);
      } else if (data.data?.user?.status === "ACTIVE") {
        window.location.href = "/";
      } else {
        setError(data.message || "Your account is pending admin approval.");
        setLoading(false);
        setGoogleModalOpen(false);
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
      setLoading(false);
      setGoogleModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#09090b] text-white">
      {/* Left Column: L2H Architectural Brand & Manifesto */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 lg:p-16 overflow-hidden border-r border-white/10 bg-black">
        {/* Background Architectural Image with Luxury Glass Gradients */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85"
            alt="L2H Solution Luxury Real Estate"
            className="w-full h-full object-cover opacity-35 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50" />
        </div>

        {/* Top: L2H Logo */}
        <div className="relative z-10">
          <L2HLogo variant="header" />
        </div>

        {/* Middle: Brand Philosophy */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-zinc-300 text-[11px] font-semibold uppercase tracking-widest backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-zinc-200" />
            <span>Private Operating System</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white tracking-tight leading-[1.15]">
            From Land to Legacy. <br />
            <span className="font-normal italic text-zinc-300">
              Chosen Around You.
            </span>
          </h1>

          <p className="text-zinc-400 text-sm leading-relaxed font-light">
            The internal command center and portfolio management platform for L2H
            Solution advisors, team leads, and investment analysts across Delhi NCR.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-zinc-300 font-medium">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                ✓
              </div>
              <span>Real-Time Call Floor Intelligence & Activity Reports (DAR)</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-300 font-medium">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                ✓
              </div>
              <span>Explainable Lead Scoring & Multi-Level Hot Lead Escalations</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-300 font-medium">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                ✓
              </div>
              <span>Capacity-Aware Matchmaking & Safe History Merging</span>
            </div>
          </div>
        </div>

        {/* Bottom: Legal & RERA Note */}
        <div className="relative z-10 text-[11px] text-zinc-500 font-medium">
          L2H Solution Advisory LLP • Enterprise Security & Access Control
        </div>
      </div>

      {/* Right Column: Clean, Minimalist Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white text-zinc-950">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Brand Logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <L2HLogo variant="login" />
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              Advisor Access
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950 tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-light">
              Sign in to your L2H CRM & Call Floor workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                Phone Number or Staff Code
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 8439654385 or admin@l2hcrm.com"
                className="w-full text-sm px-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition font-medium text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your secure password"
                className="w-full text-sm px-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition font-medium text-zinc-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 hover:scale-[1.01]"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Workspace"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={() => setGoogleModalOpen(true)}
              className="w-full py-3.5 px-4 bg-white hover:bg-zinc-50 border border-zinc-300 hover:border-zinc-400 text-zinc-800 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-2.5"
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
              <span>Sign in with Google</span>
            </button>

            {/* Register Link */}
            <div className="pt-1 text-center">
              <p className="text-xs text-zinc-500">
                New Sales Advisor or Team Member?{" "}
                <Link href="/signup" className="font-bold text-black hover:underline">
                  Register Account →
                </Link>
              </p>
            </div>

            <p className="text-center text-[11px] text-zinc-400">
              Protected by L2H Enterprise Security Protocols.
            </p>
          </form>
        </div>
      </div>

      {/* Google Sign-in Modal */}
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

            <div className="space-y-4">
              <p className="text-xs text-zinc-500">
                Enter your verified Google Workspace email address to sign in:
              </p>

              <div className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@l2hsolution.com or gmail.com"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm focus:ring-1 focus:ring-black font-medium text-zinc-900 outline-none"
                />
                <button
                  type="button"
                  disabled={!googleCustomEmail || loading}
                  onClick={() => handleGoogleLogin(googleCustomEmail, googleCustomEmail.split("@")[0])}
                  className="w-full py-3.5 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md"
                >
                  {loading ? "Authenticating..." : "Continue with Google →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

