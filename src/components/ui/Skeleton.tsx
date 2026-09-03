import React from "react";
import clsx from "clsx";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-xl bg-zinc-200/75 dark:bg-zinc-800/60",
        className
      )}
      {...props}
    />
  );
}

export function LeadCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="w-36 h-4" />
            <Skeleton className="w-24 h-3" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="w-16 h-6 rounded-lg" />
          <Skeleton className="w-20 h-6 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-8 h-8 rounded-xl" />
      </div>
      <Skeleton className="w-32 h-8" />
      <Skeleton className="w-20 h-3" />
    </div>
  );
}
