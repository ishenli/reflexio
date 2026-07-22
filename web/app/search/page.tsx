"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Loader2,
  User,
  BookMarked,
  BookOpen,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useLocale } from "@/lib/i18n/context";
import { useSearchData } from "./use-search-data";
import { useUserListFromProfiles } from "./use-user-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  ProfileView,
  AgentPlaybookView,
  UserPlaybookView,
} from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SearchPage() {
  const { apiEndpoint } = useSettings();
  const { t } = useLocale();
  const { data, search, clear } = useSearchData(apiEndpoint);
  const { userIds, loading: usersLoading } = useUserListFromProfiles(apiEndpoint);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const handleSearch = useCallback(() => {
    search(query, selectedUserId || undefined);
  }, [query, selectedUserId, search]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );

  const results = data.results;
  const loading = data.loading;
  const error = data.error;

  return (
    <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t.searchPage.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.searchPage.desc}
        </p>
      </div>

      {/* Search Form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Query Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.searchPage.searchPlaceholder}
              className="h-10 pl-9"
            />
          </div>

          {/* User Filter Select */}
          <Select
            value={selectedUserId || null}
            onValueChange={(value) => setSelectedUserId(value || "")}
            disabled={usersLoading}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-10">
              <SelectValue placeholder={t.searchPage.selectUser} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t.searchPage.allUsers}</SelectItem>
              {userIds.map((userId) => (
                <SelectItem key={userId} value={userId}>
                  {userId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search Button */}
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Search className="h-4 w-4 mr-1.5" />
            )}
            {t.searchPage.searchButton}
          </Button>
        </div>

        {/* User Filter Hint */}
        {selectedUserId && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>
              {t.searchPage.userFilter}: <span className="font-medium text-foreground">{selectedUserId}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-0.5 text-xs"
              onClick={() => setSelectedUserId("")}
            >
              {t.common.clear}
            </Button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="space-y-6">
          {/* Reformulated query hint */}
          {results.reformulated_query && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 px-4 py-2 text-sm text-blue-800 dark:text-blue-200">
              {t.searchPage.reformulatedQuery}:{" "}
              <span className="font-medium">
                &ldquo;{results.reformulated_query}&rdquo;
              </span>
            </div>
          )}

          {/* No results */}
          {results.profiles.length === 0 &&
            results.agent_playbooks.length === 0 &&
            results.user_playbooks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border bg-card">
                <Search className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t.searchPage.noResults}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {t.searchPage.noResultsHint}
                </p>
              </div>
            )}

          {/* Profiles */}
          {results.profiles.length > 0 && (
            <ResultGroup
              title={t.searchPage.profiles}
              count={results.profiles.length}
              icon={User}
              iconClassName="bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
            >
              {results.profiles.map((p) => (
                <ProfileCard key={p.profile_id} profile={p} />
              ))}
            </ResultGroup>
          )}

          {/* Agent Playbooks */}
          {results.agent_playbooks.length > 0 && (
            <ResultGroup
              title={t.searchPage.agentPlaybooks}
              count={results.agent_playbooks.length}
              icon={BookMarked}
              iconClassName="bg-violet-500/10 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
            >
              {results.agent_playbooks.map((ap) => (
                <AgentPlaybookCard key={ap.agent_playbook_id} playbook={ap} />
              ))}
            </ResultGroup>
          )}

          {/* User Playbooks */}
          {results.user_playbooks.length > 0 && (
            <ResultGroup
              title={t.searchPage.userPlaybooks}
              count={results.user_playbooks.length}
              icon={BookOpen}
              iconClassName="bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
            >
              {results.user_playbooks.map((up) => (
                <UserPlaybookCard key={up.user_playbook_id} playbook={up} />
              ))}
            </ResultGroup>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ResultGroup ───────────────────────────────────────────────

function ResultGroup({
  title,
  count,
  icon: Icon,
  iconClassName,
  children,
}: {
  title: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <div
          className={cn(
            "flex items-center justify-center h-7 w-7 rounded-md",
            iconClassName
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground ml-auto">{count}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

// ─── ProfileCard ───────────────────────────────────────────────

function ProfileCard({ profile }: { profile: ProfileView }) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono text-xs font-medium truncate">
            {profile.profile_id}
          </span>
        </div>
        {profile.status && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground shrink-0">
            {profile.status}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>user: {profile.user_id}</span>
        {profile.extractor_names && profile.extractor_names.length > 0 && (
          <span>extractors: {profile.extractor_names.join(", ")}</span>
        )}
      </div>
      {profile.content && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {profile.content}
        </p>
      )}
      {profile.tags && profile.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AgentPlaybookCard ─────────────────────────────────────────

function AgentPlaybookCard({
  playbook,
}: {
  playbook: AgentPlaybookView;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BookMarked className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium truncate">
            {playbook.playbook_name}
          </span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground shrink-0">
          {playbook.playbook_status || playbook.status}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>agent: {playbook.agent_version}</span>
        <span>id: {playbook.agent_playbook_id}</span>
      </div>
      {playbook.content && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {playbook.content}
        </p>
      )}
    </div>
  );
}

// ─── UserPlaybookCard ──────────────────────────────────────────

function UserPlaybookCard({
  playbook,
}: {
  playbook: UserPlaybookView;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium truncate">
            {playbook.playbook_name}
          </span>
        </div>
        {playbook.status && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground shrink-0">
            {playbook.status}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>user: {playbook.user_id || "—"}</span>
        <span>agent: {playbook.agent_version}</span>
      </div>
      {playbook.content && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {playbook.content}
        </p>
      )}
    </div>
  );
}
