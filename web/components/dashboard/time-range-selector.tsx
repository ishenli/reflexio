"use client";

import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface TimeRangeSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

const OPTIONS = [
  { labelKey: "timeRange7d" as const, value: 7 },
  { labelKey: "timeRange14d" as const, value: 14 },
  { labelKey: "timeRange30d" as const, value: 30 },
  { labelKey: "timeRange90d" as const, value: 90 },
];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const { t } = useLocale();
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {t.dashboard[opt.labelKey]}
        </button>
      ))}
    </div>
  );
}