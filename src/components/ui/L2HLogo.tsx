"use client";

import React from "react";

interface L2HLogoProps {
  variant?: "header" | "login" | "compact" | "badge";
  className?: string;
}

export function L2HLogo({ variant = "header", className = "" }: L2HLogoProps) {
  if (variant === "compact") {
    return (
      <div
        className={`bg-white px-2 py-1 rounded-lg border border-white/20 shadow-xs flex items-center justify-center shrink-0 ${className}`}
      >
        <img
          src="/logo.png"
          alt="L2H Solution"
          className="h-6 w-auto object-contain"
        />
      </div>
    );
  }

  if (variant === "login") {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-zinc-200/90 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="L2H Solution — From Land to Legacy. Chosen Around You."
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </div>
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-zinc-300 text-xs font-semibold uppercase tracking-widest backdrop-blur-md shadow-sm ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>L2H • OPERATING SYSTEM</span>
      </div>
    );
  }

  // Default header variant matching website
  return (
    <div className={`flex items-center shrink-0 group ${className}`}>
      <div className="bg-white px-3.5 py-1.5 rounded-xl shadow-xs border border-white/20 group-hover:bg-zinc-50 transition-all flex items-center">
        <img
          src="/logo.png"
          alt="L2H Solution — From Land to Legacy. Chosen Around You."
          className="h-[32px] sm:h-[36px] w-auto object-contain"
        />
      </div>
    </div>
  );
}
