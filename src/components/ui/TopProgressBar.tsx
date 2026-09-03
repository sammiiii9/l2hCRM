"use client";

import React from "react";

export function TopProgressBar({ isFetching }: { isFetching: boolean }) {
  if (!isFetching) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent overflow-hidden pointer-events-none">
      <div className="h-full w-full bg-gradient-to-r from-zinc-900 via-amber-500 to-zinc-900 animate-[progress_1s_ease-in-out_infinite]" />
      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
