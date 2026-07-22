"use client";

import { useMemo, useState } from "react";
import {
  MessageSquare,
  Users,
  Wrench,
  Activity,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { useSettings } from "@/hooks/use-settings";
import { useLocale, fmt } from "@/lib/i18n/context";
import { useInteractionsData } from "./use-interactions-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { JsonView } from "@/components/method/json-view";
import type { InteractionView } from "@/lib/types";

const ROLE_COLORS: Record<string, string> = {
  User: "var(--chart-1)",
  Agent: "var(--chart-2)",
  System: "var(--chart-3)",
  Tool: "var(--chart-4)",
};

export default function InteractionsDashboard() {
  const { apiEndpoint } = useSettings();
  const { t } = useLocale();
  const { data, loading, error } = useInteractionsData(apiEndpoint);

  const {
    totalInteractions,
    uniqueUsers,
    totalToolsUsed,
    timeRange,
    dailySeries,
    roleDistribution,
    actionDistribution,
    topTools,
    recentInteractions,
    successRate,
  } = useMemo(() => computeMetrics(data.allInteractions), [data.allInteractions]);

  if (loading) {
    return (
      <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.interactionsTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.dashboard.interactionsDesc}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.dashboard.totalInteractions}
          value={totalInteractions}
          description={timeRange}
          icon={MessageSquare}
          iconClassName="bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
        />
        <StatCard
          title={t.dashboard.uniqueUsers}
          value={uniqueUsers}
          description={t.dashboard.usersWithInteractions}
          icon={Users}
          iconClassName="bg-violet-500/10 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
        />
        <StatCard
          title={t.dashboard.totalToolsUsed}
          value={totalToolsUsed}
          description={t.dashboard.toolInvocations}
          icon={Wrench}
          iconClassName="bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
        />
        <StatCard
          title={t.dashboard.successRate}
          value={successRate}
          description={t.dashboard.nonErrorInteractions}
          icon={Activity}
          iconClassName="bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
          format="percent"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <InteractionsOverTimeChart data={dailySeries} />
        <RoleDistributionChart data={roleDistribution} />
        <ActionDistributionChart data={actionDistribution} />
        <TopToolsChart data={topTools} />
      </div>

      {/* Recent Interactions */}
      <RecentInteractionsTable interactions={recentInteractions} />
    </div>
  );
}

// ─── Metrics Computation ─────────────────────────────────────────────

function computeMetrics(interactions: InteractionView[]) {
  const totalInteractions = interactions.length;

  // Unique users
  const userSet = new Set<string>();
  for (const i of interactions) userSet.add(i.user_id);
  const uniqueUsers = userSet.size;

  // Total tools used
  let totalToolsUsed = 0;
  const toolCount: Record<string, number> = {};
  for (const i of interactions) {
    if (i.tools_used) {
      for (const t of i.tools_used) {
        totalToolsUsed++;
        const name = t.name || "unknown";
        toolCount[name] = (toolCount[name] || 0) + 1;
      }
    }
  }

  // Top tools
  const topTools = Object.entries(toolCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Time range
  const timestamps = interactions
    .map((i) => i.created_at)
    .filter((t) => t > 0)
    .sort((a, b) => a - b);
  const timeRange =
    timestamps.length >= 2
      ? `${new Date(timestamps[0] * 1000).toLocaleDateString()} – ${new Date(timestamps[timestamps.length - 1] * 1000).toLocaleDateString()}`
      : "N/A";

  // Daily time series
  const dayCount: Record<string, number> = {};
  for (const i of interactions) {
    if (i.created_at <= 0) continue;
    const date = new Date(i.created_at * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    dayCount[date] = (dayCount[date] || 0) + 1;
  }
  const dailySeries = Object.entries(dayCount)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      return da.getTime() - db.getTime();
    });

  // Role distribution
  const roleCount: Record<string, number> = {};
  for (const i of interactions) {
    const role = i.role || "Unknown";
    roleCount[role] = (roleCount[role] || 0) + 1;
  }
  const roleDistribution = Object.entries(roleCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Action distribution
  const actionCount: Record<string, number> = {};
  for (const i of interactions) {
    const action = i.user_action || "none";
    actionCount[action] = (actionCount[action] || 0) + 1;
  }
  const actionColorMap: Record<string, string> = {
    none: "var(--muted-foreground)",
    approval_requested: "var(--chart-4)",
    action_required: "var(--chart-5)",
    error: "var(--destructive)",
  };
  const actionDistribution = Object.entries(actionCount)
    .map(([name, value]) => ({
      name,
      value,
      color: actionColorMap[name] || "var(--chart-3)",
    }))
    .sort((a, b) => b.value - a.value);

  // Success rate (non-error / total)
  const errorCount = actionCount["error"] || 0;
  const successRate =
    totalInteractions > 0
      ? ((totalInteractions - errorCount) / totalInteractions) * 100
      : 0;

  // Recent interactions (newest first)
  const recentInteractions = [...interactions]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 20);

  return {
    totalInteractions,
    uniqueUsers,
    totalToolsUsed,
    timeRange,
    dailySeries,
    roleDistribution,
    actionDistribution,
    topTools,
    recentInteractions,
    successRate,
  };
}

// ─── Chart Components ────────────────────────────────────────────────

function InteractionsOverTimeChart({ data }: { data: { date: string; count: number }[] }) {
  const { t } = useLocale();
  const [hidden, setHidden] = useState(false);
  if (hidden || !data.length) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">{t.dashboard.interactionsOverTime}</h3>
          <Button variant="ghost" size="xs" onClick={() => setHidden(false)}>{t.evaluations.show}</Button>
        </div>
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          {!data.length ? t.common.noData : t.evaluations.hidden}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">{t.dashboard.interactionsOverTime}</h3>
        <Button variant="ghost" size="xs" onClick={() => setHidden(true)}>{t.evaluations.hide}</Button>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <defs>
              <linearGradient id="grad-int-over-time" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
            <Tooltip content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                  <p className="font-medium text-foreground">{payload[0].payload.date}</p>
                  <p className="text-muted-foreground">{payload[0].value} {t.dashboard.interactionsLabel}</p>
                </div>
              ) : null
            } />
            <Area type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} fill="url(#grad-int-over-time)" dot={false} activeDot={{ r: 4, stroke: "var(--chart-1)", strokeWidth: 2, fill: "var(--card)" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RoleDistributionChart({ data }: { data: { name: string; value: number }[] }) {
  const { t } = useLocale();
  const [hidden, setHidden] = useState(false);
  if (hidden || !data.length) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">{t.dashboard.messageRoles}</h3>
          <Button variant="ghost" size="xs" onClick={() => setHidden(false)}>{t.evaluations.show}</Button>
        </div>
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">{t.common.noData}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">{t.dashboard.messageRoles}</h3>
        <Button variant="ghost" size="xs" onClick={() => setHidden(true)}>{t.evaluations.hide}</Button>
      </div>
      <div className="p-4 flex items-center justify-center gap-6">
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
              {data.map((entry, i) => (
                <Cell key={i} fill={ROLE_COLORS[entry.name] || "var(--chart-5)"} />
              ))}
            </Pie>
            <Tooltip content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                  <p className="font-medium text-foreground">{payload[0].name}</p>
                  <p className="text-muted-foreground">{payload[0].value} {t.dashboard.messagesLabel}</p>
                </div>
              ) : null
            } />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5 text-xs">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[entry.name] || "var(--chart-5)" }} />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionDistributionChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const { t } = useLocale();
  const [hidden, setHidden] = useState(false);
  if (hidden || !data.length) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">{t.dashboard.userActionBreakdown}</h3>
          <Button variant="ghost" size="xs" onClick={() => setHidden(false)}>{t.evaluations.show}</Button>
        </div>
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">{t.common.noData}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">{t.dashboard.userActionBreakdown}</h3>
        <Button variant="ghost" size="xs" onClick={() => setHidden(true)}>{t.evaluations.hide}</Button>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={110} tickFormatter={(v) => v.replace(/_/g, " ")} />
            <Tooltip content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                  <p className="font-medium text-foreground capitalize">{payload[0].payload.name.replace(/_/g, " ")}</p>
                  <p className="text-muted-foreground">{payload[0].value} {t.dashboard.interactionsLabel}</p>
                </div>
              ) : null
            } />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopToolsChart({ data }: { data: { name: string; count: number }[] }) {
  const { t } = useLocale();
  const [hidden, setHidden] = useState(false);
  if (hidden || !data.length) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">{t.dashboard.topToolsUsed}</h3>
          <Button variant="ghost" size="xs" onClick={() => setHidden(false)}>{t.evaluations.show}</Button>
        </div>
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">{t.dashboard.noToolData}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">{t.dashboard.topToolsUsed}</h3>
        <Button variant="ghost" size="xs" onClick={() => setHidden(true)}>{t.evaluations.hide}</Button>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={Math.max(100, data.length * 32)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={140} />
            <Tooltip content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                  <p className="font-medium text-foreground">{payload[0].payload.name}</p>
                  <p className="text-muted-foreground">{payload[0].value} {t.dashboard.callsLabel}</p>
                </div>
              ) : null
            } />
            <Bar dataKey="count" fill="var(--chart-4)" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RecentInteractionsTable({ interactions }: { interactions: InteractionView[] }) {
  const { t } = useLocale();
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (!interactions.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">{t.dashboard.recentInteractions}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{fmt(t.dashboard.latestInteractions, { n: interactions.length })}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/50 backdrop-blur z-10">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">{t.dashboard.id}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">{t.common.user}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">{t.dashboard.role}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">{t.common.date}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">{t.dashboard.preview}</th>
            </tr>
          </thead>
          <tbody>
            {interactions.map((interaction, i) => (
              <ReactRow
                key={interaction.interaction_id}
                interaction={interaction}
                index={i}
                expanded={expandedRow === i}
                onToggle={() => setExpandedRow(expandedRow === i ? null : i)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReactRow({
  interaction,
  index,
  expanded,
  onToggle,
}: {
  interaction: InteractionView;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const preview =
    interaction.content?.length > 100
      ? interaction.content.slice(0, 100) + "..."
      : interaction.content || "-";

  return (
    <>
      <tr
        className={cn(
          "border-b border-border hover:bg-muted/30 cursor-pointer transition-colors",
          index % 2 === 0 ? "bg-transparent" : "bg-muted/10",
          expanded && "bg-accent/30"
        )}
        onClick={onToggle}
      >
        <td className="px-2 py-1.5 text-muted-foreground">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </td>
        <td className="px-3 py-1.5 font-mono">{interaction.interaction_id}</td>
        <td className="px-3 py-1.5 font-mono max-w-[120px] truncate">{interaction.user_id}</td>
        <td className="px-3 py-1.5">
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
            interaction.role === "User" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            interaction.role === "Agent" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            interaction.role === "Tool" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            interaction.role === "System" && "bg-muted text-muted-foreground",
          )}>
            {interaction.role}
          </span>
        </td>
        <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
          {interaction.created_at > 0
            ? new Date(interaction.created_at * 1000).toLocaleString()
            : "-"}
        </td>
        <td className="px-3 py-1.5 text-muted-foreground max-w-[250px] truncate">
          {preview}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <div className="bg-muted/20 border-b border-border max-h-[400px] overflow-auto">
              <JsonView json={JSON.stringify(interaction, null, 2)} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}