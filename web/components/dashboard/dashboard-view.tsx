"use client";

import { TrendingUp, Users, BookOpen, MessageSquare, Activity } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useLocale } from "@/lib/i18n/context";
import { useDashboardData } from "./use-dashboard-data";
import { StatCard } from "./stat-card";
import { TimeSeriesChart } from "./time-series-chart";
import { TopAppliedRules } from "./top-applied-rules";
import { TimeRangeSelector } from "./time-range-selector";

export function DashboardView() {
  const { apiEndpoint } = useSettings();
  const { t } = useLocale();
  const { data, loading, error, daysBack, setDaysBack } = useDashboardData(apiEndpoint);

  const current = data.stats?.current_period;
  const previous = data.stats?.previous_period;

  const calcDelta = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / previous) * 100;
  };

  const interactionsDelta = current && previous
    ? calcDelta(current.total_interactions, previous.total_interactions)
    : null;
  const profilesDelta = current && previous
    ? calcDelta(current.total_profiles, previous.total_profiles)
    : null;
  const playbooksDelta = current && previous
    ? calcDelta(current.total_playbooks, previous.total_playbooks)
    : null;
  const successDelta = current && previous
    ? current.success_rate - previous.success_rate
    : null;

  return (
    <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.dashboardTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.dashboard.dashboardDesc}
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
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t.dashboard.statInteractions}
              value={current?.total_interactions ?? 0}
              description={t.dashboard.statInteractionsDesc}
              delta={interactionsDelta}
              deltaLabel={t.dashboard.vsPreviousPeriod}
              icon={MessageSquare}
              iconClassName="bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
            />
            <StatCard
              title={t.dashboard.statUserProfiles}
              value={current?.total_profiles ?? 0}
              description={t.dashboard.statUserProfilesDesc}
              delta={profilesDelta}
              deltaLabel={t.dashboard.vsPreviousPeriod}
              icon={Users}
              iconClassName="bg-violet-500/10 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
            />
            <StatCard
              title={t.dashboard.statPlaybooks}
              value={current?.total_playbooks ?? 0}
              description={t.dashboard.statPlaybooksDesc}
              delta={playbooksDelta}
              deltaLabel={t.dashboard.vsPreviousPeriod}
              icon={BookOpen}
              iconClassName="bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
            />
            <StatCard
              title={t.dashboard.statSuccessRate}
              value={current?.success_rate ?? 0}
              description={t.dashboard.statSuccessRateDesc}
              delta={successDelta}
              deltaLabel={t.dashboard.vsPreviousPeriod}
              icon={TrendingUp}
              iconClassName="bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
              format="percent"
            />
          </div>

          {/* Time series charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <TimeSeriesChart
              data={data.stats?.interactions_time_series ?? []}
              title={t.dashboard.chartInteractions}
              color="var(--chart-1)"
            />
            <TimeSeriesChart
              data={data.stats?.profiles_time_series ?? []}
              title={t.dashboard.chartProfiles}
              color="var(--chart-2)"
            />
            <TimeSeriesChart
              data={data.stats?.playbooks_time_series ?? []}
              title={t.dashboard.chartPlaybooks}
              color="var(--chart-3)"
            />
            <TimeSeriesChart
              data={data.stats?.evaluations_time_series ?? []}
              title={t.dashboard.chartEvalSuccessRate}
              color="var(--chart-4)"
            />
          </div>

          {/* Top applied rules */}
          <TopAppliedRules stats={data.playbookStats} />
        </>
      )}
    </div>
  );
}