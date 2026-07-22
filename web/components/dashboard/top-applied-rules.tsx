"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { PlaybookApplicationStat } from "@/lib/types";

interface TopAppliedRulesProps {
  stats: PlaybookApplicationStat[];
  className?: string;
}

export function TopAppliedRules({ stats, className }: TopAppliedRulesProps) {
  const chartData = useMemo(() => {
    if (!stats?.length) return [];
    return stats
      .slice(0, 10)
      .map((s) => ({
        name: s.title || s.real_id.slice(0, 12),
        count: s.applied_count,
        kind: s.kind,
        fullTitle: s.title || s.real_id,
      }));
  }, [stats]);

  if (!chartData.length) {
    return (
      <div className={cn("rounded-xl border border-border bg-card", className)}>
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">Top Applied Rules</h3>
        </div>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No rule application data available
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">Top Applied Rules</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Most frequently applied playbooks and profiles
        </p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 32, bottom: 4, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={140}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium text-foreground">{row.fullTitle}</p>
                    <p className="text-muted-foreground">
                      Applied{" "}
                      <span className="font-semibold text-foreground">
                        {row.count}
                      </span>{" "}
                      time{row.count !== 1 ? "s" : ""}
                    </p>
                    <p className="text-muted-foreground capitalize">
                      Type: {row.kind.replace("_", " ")}
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--chart-5)"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}