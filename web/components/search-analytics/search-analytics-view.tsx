"use client";

import {
  Search,
  BarChart3,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useLocale } from "@/lib/i18n/context";
import { useSearchAnalyticsData } from "./use-search-analytics-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { TimeSeriesChart } from "@/components/dashboard/time-series-chart";
import { TimeRangeSelector } from "@/components/dashboard/time-range-selector";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SearchAnalyticsView() {
  const { apiEndpoint } = useSettings();
  const { t } = useLocale();
  const { data, loading, error, daysBack, setDaysBack } =
    useSearchAnalyticsData(apiEndpoint);

  const summary = data?.summary;

  return (
    <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {(t as any).searchAnalytics?.title ?? "Search Analytics"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {(t as any).searchAnalytics?.desc ??
              "Track search usage and effectiveness over time"}
          </p>
        </div>
        <TimeRangeSelector value={daysBack} onChange={setDaysBack} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={(t as any).searchAnalytics?.statTotalSearches ?? "Total Searches"}
              value={summary?.total_searches ?? 0}
              description={
                (t as any).searchAnalytics?.statTotalSearchesDesc ??
                "All search requests in period"
              }
              icon={Search}
              iconClassName="bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
            />
            <StatCard
              title={(t as any).searchAnalytics?.statAvgResults ?? "Avg Results/Search"}
              value={summary?.avg_results_per_search ?? 0}
              description={
                (t as any).searchAnalytics?.statAvgResultsDesc ??
                "Average results returned per query"
              }
              icon={BarChart3}
              iconClassName="bg-violet-500/10 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
            />
            <StatCard
              title={(t as any).searchAnalytics?.statZeroResultRate ?? "Zero-Result Rate"}
              value={summary?.zero_result_rate ?? 0}
              format="percent"
              description={
                (t as any).searchAnalytics?.statZeroResultRateDesc ??
                "Searches returning no results"
              }
              icon={AlertCircle}
              iconClassName="bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
            />
            <StatCard
              title={(t as any).searchAnalytics?.statAvgLatency ?? "Avg Latency"}
              value={
                summary?.avg_latency_ms
                  ? `${summary.avg_latency_ms.toFixed(0)}ms`
                  : "0ms"
              }
              description={
                (t as any).searchAnalytics?.statAvgLatencyDesc ??
                "Average search response time"
              }
              icon={Clock}
              iconClassName="bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
            />
          </div>

          {/* Time series charts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <TimeSeriesChart
              data={data?.searches_time_series ?? []}
              title={
                (t as any).searchAnalytics?.chartSearchesPerDay ??
                "Searches per Day"
              }
              color="#3b82f6"
            />
            <TimeSeriesChart
              data={data?.results_time_series ?? []}
              title={
                (t as any).searchAnalytics?.chartResultsPerDay ??
                "Avg Results per Day"
              }
              color="#8b5cf6"
            />
            <TimeSeriesChart
              data={data?.latency_time_series ?? []}
              title={
                (t as any).searchAnalytics?.chartLatencyPerDay ??
                "Avg Latency (ms) per Day"
              }
              color="#10b981"
            />
          </div>

          {/* Bottom row: top queries + mode distribution */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top Queries table */}
            <div className="rounded-xl border border-border bg-card">
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-sm font-semibold">
                  {(t as any).searchAnalytics?.topQueries ?? "Top Queries"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(t as any).searchAnalytics?.topQueriesDesc ??
                    "Most frequent search queries"}
                </p>
              </div>
              <ScrollArea className="h-72">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-5 py-2 font-medium">
                        {(t as any).searchAnalytics?.queryColumn ?? "Query"}
                      </th>
                      <th className="px-5 py-2 font-medium w-20 text-right">
                        {(t as any).searchAnalytics?.countColumn ?? "Count"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.top_queries?.length ?? 0) === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-5 py-8 text-center text-muted-foreground"
                        >
                          No query data available yet
                        </td>
                      </tr>
                    ) : (
                      data?.top_queries?.map((item, i) => (
                        <tr
                          key={i}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-5 py-2.5 font-mono text-xs truncate max-w-[300px]">
                            {item.query}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums font-medium">
                            {item.count}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            {/* Mode Distribution — simple horizontal bar chart */}
            <div className="rounded-xl border border-border bg-card">
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-sm font-semibold">
                  {(t as any).searchAnalytics?.modeDistribution ??
                    "Search Mode Distribution"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(t as any).searchAnalytics?.modeDistributionDesc ??
                    "Breakdown by search mode"}
                </p>
              </div>
              <ScrollArea className="h-72">
                <div className="p-5 space-y-3">
                  {(data?.mode_distribution?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No mode data available yet
                    </p>
                  ) : (
                    data?.mode_distribution?.map((item, i) => {
                      const total =
                        data.mode_distribution?.reduce(
                          (s, d) => s + d.count,
                          0
                        ) ?? 1;
                      const pct = ((item.count / total) * 100).toFixed(1);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium capitalize">
                              {item.mode}
                            </span>
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{
                                width: `${Math.max(
                                  2,
                                  (item.count / total) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </>
      )}
    </div>
  );
}