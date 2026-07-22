"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TimeSeriesDataPoint } from "@/lib/types";

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title: string;
  color?: string;
  className?: string;
  yAxisLabel?: string;
}

export function TimeSeriesChart({
  data,
  title,
  color = "var(--chart-1)",
  className,
}: TimeSeriesChartProps) {
  const [hidden, setHidden] = useState(false);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .map((d) => ({
        timestamp: d.timestamp * 1000,
        value: d.value,
        date: new Date(d.timestamp * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  if (hidden || !chartData.length) {
    return (
      <div
        className={cn(
          "flex flex-col rounded-xl border border-border bg-card",
          className
        )}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setHidden(false)}
          >
            Show
          </Button>
        </div>
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          {!data?.length ? "No data available" : "Chart hidden"}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card",
        className
      )}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setHidden(true)}
        >
          Hide
        </Button>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 4, left: -16 }}
          >
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium text-foreground">
                      {payload[0].payload.date}
                    </p>
                    <p className="text-muted-foreground">
                      Value:{" "}
                      <span className="font-semibold text-foreground">
                        {Number(payload[0].value).toLocaleString()}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${title})`}
              dot={false}
              activeDot={{
                r: 4,
                stroke: color,
                strokeWidth: 2,
                fill: "var(--card)",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}