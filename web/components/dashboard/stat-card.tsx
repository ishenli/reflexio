"use client";

import { cn } from "@/lib/utils";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  delta?: number | null;
  deltaLabel?: string;
  icon: LucideIcon;
  iconClassName?: string;
  className?: string;
  format?: "number" | "percent";
}

export function StatCard({
  title,
  value,
  description,
  delta,
  deltaLabel,
  icon: Icon,
  iconClassName,
  className,
  format = "number",
}: StatCardProps) {
  const isPositive = delta !== null && delta !== undefined && delta >= 0;
  const formattedValue =
    format === "percent"
      ? `${Number(value).toFixed(1)}%`
      : Number(value).toLocaleString();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold tabular-nums tracking-tight">
            {formattedValue}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10",
            iconClassName
          )}
        >
          <Icon className="size-5 text-primary" />
        </div>
      </div>
      {delta !== null && delta !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
              isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            {isPositive ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {Math.abs(delta!).toFixed(1)}{format === "percent" ? "pp" : "%"}
          </span>
          {deltaLabel && (
            <span className="text-xs text-muted-foreground">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}