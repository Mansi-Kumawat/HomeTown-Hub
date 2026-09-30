"use client";
// SMALL SHARED UI PRIMITIVES — Spinner, Skeleton and EmptyState.
//
// 👉 CONCEPT: "loading / empty / error states" make an app feel finished.
//    Every list page uses these three: shimmer while fetching, a friendly
//    illustration message when there's no data, and toasts for errors.
import { Loader2, type LucideIcon } from "lucide-react";

/** Centered spinner with a subtle label. */
export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-ink/50">
      <Loader2 className="h-5 w-5 animate-spin text-ember" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/** Shimmering placeholder cards shown while data loads. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <div className="skeleton h-36 w-full" />
          <div className="space-y-2 p-4">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Friendly "nothing here yet" panel with an icon and a call to action. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-white/60 px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ember/10">
        <Icon className="h-7 w-7 text-ember" />
      </span>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink/55">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
