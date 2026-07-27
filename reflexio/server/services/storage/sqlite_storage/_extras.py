"""Analytics and change log methods for SQLite storage."""

import sqlite3
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any, Literal, cast

from reflexio.models.api_schema.braintrust_schema import (
    BraintrustConnection,
    ImportedScore,
)
from reflexio.models.api_schema.internal_schema import SessionCitation
from reflexio.models.api_schema.retriever_schema import PlaybookApplicationStat
from reflexio.models.api_schema.service_schemas import (
    Interaction,
)

from ._base import (
    SQLiteStorageBase,
    _epoch_now,
    _epoch_to_iso,
    _iso_to_epoch,
    _json_dumps,
    _json_loads,
    _row_to_interaction,
)

type _CitationKind = Literal["playbook", "profile", "user_playbook", "agent_playbook"]

_SUPPORTED_CITATION_KINDS: tuple[_CitationKind, ...] = (
    "playbook",
    "profile",
    "user_playbook",
    "agent_playbook",
)


class ExtrasMixin:
    """Mixin providing analytics, change log, and misc operations."""

    # Type hints for instance attributes/methods provided by SQLiteStorageBase via MRO
    _lock: Any
    conn: sqlite3.Connection
    _execute: Any
    _fetchall: Any

    # ------------------------------------------------------------------
    # Interaction helpers
    # ------------------------------------------------------------------

    @SQLiteStorageBase.handle_exceptions
    def get_interactions_by_request_ids(
        self, request_ids: list[str]
    ) -> list[Interaction]:
        if not request_ids:
            return []
        ph = ",".join("?" for _ in request_ids)
        rows = self._fetchall(
            f"SELECT * FROM interactions WHERE request_id IN ({ph}) ORDER BY created_at ASC",  # noqa: S608
            request_ids,
        )
        return [_row_to_interaction(r) for r in rows]

    @SQLiteStorageBase.handle_exceptions
    def get_interactions_by_ids(self, interaction_ids: list[int]) -> list[Interaction]:
        if not interaction_ids:
            return []
        ph = ",".join("?" for _ in interaction_ids)
        rows = self._fetchall(
            f"SELECT * FROM interactions WHERE interaction_id IN ({ph}) ORDER BY created_at ASC",  # noqa: S608
            interaction_ids,
        )
        return [_row_to_interaction(r) for r in rows]

    _fetchone: Any
    _fetchall: Any

    # ------------------------------------------------------------------
    # Dashboard / Analytics methods
    # ------------------------------------------------------------------

    @SQLiteStorageBase.handle_exceptions
    def get_dashboard_stats(self, days_back: int = 30) -> dict:
        current_time = _epoch_now()
        seconds_in_period = days_back * 24 * 60 * 60
        current_start = current_time - seconds_in_period
        previous_start = current_start - seconds_in_period

        current_start_iso = _epoch_to_iso(current_start)
        current_time_iso = _epoch_to_iso(current_time)
        previous_start_iso = _epoch_to_iso(previous_start)

        def count_in(table: str, time_col: str, start: Any, end: Any) -> int:
            row = self._fetchone(
                f"SELECT COUNT(*) as cnt FROM {table} WHERE {time_col} >= ? AND {time_col} <= ?",
                (start, end),
            )
            return row["cnt"] if row else 0

        def count_in_lt(table: str, time_col: str, start: Any, end: Any) -> int:
            row = self._fetchone(
                f"SELECT COUNT(*) as cnt FROM {table} WHERE {time_col} >= ? AND {time_col} < ?",
                (start, end),
            )
            return row["cnt"] if row else 0

        current_stats: dict[str, int | float] = {
            "total_interactions": count_in(
                "interactions", "created_at", current_start_iso, current_time_iso
            ),
            "total_profiles": count_in(
                "profiles", "last_modified_timestamp", current_start, current_time
            ),
            "total_playbooks": (
                count_in(
                    "user_playbooks", "created_at", current_start_iso, current_time_iso
                )
                + count_in(
                    "agent_playbooks", "created_at", current_start_iso, current_time_iso
                )
            ),
        }

        previous_stats: dict[str, int | float] = {
            "total_interactions": count_in_lt(
                "interactions", "created_at", previous_start_iso, current_start_iso
            ),
            "total_profiles": count_in_lt(
                "profiles", "last_modified_timestamp", previous_start, current_start
            ),
            "total_playbooks": (
                count_in_lt(
                    "user_playbooks",
                    "created_at",
                    previous_start_iso,
                    current_start_iso,
                )
                + count_in_lt(
                    "agent_playbooks",
                    "created_at",
                    previous_start_iso,
                    current_start_iso,
                )
            ),
        }

        # Success rates
        def calc_success_rate(rows: list[sqlite3.Row]) -> float:
            if not rows:
                return 0.0
            total = len(rows)
            success = sum(1 for r in rows if r["is_success"])
            return success / total * 100

        eval_current = self._fetchall(
            "SELECT is_success FROM agent_success_evaluation_result WHERE created_at >= ? AND created_at <= ?",
            (current_start_iso, current_time_iso),
        )
        eval_previous = self._fetchall(
            "SELECT is_success FROM agent_success_evaluation_result WHERE created_at >= ? AND created_at < ?",
            (previous_start_iso, current_start_iso),
        )
        current_stats["success_rate"] = calc_success_rate(eval_current)
        previous_stats["success_rate"] = calc_success_rate(eval_previous)

        # Time series
        interactions_ts = self._fetchall(
            "SELECT created_at FROM interactions WHERE created_at >= ? AND created_at <= ? ORDER BY created_at",
            (current_start_iso, current_time_iso),
        )
        profiles_ts = self._fetchall(
            "SELECT last_modified_timestamp FROM profiles WHERE last_modified_timestamp >= ? AND last_modified_timestamp <= ? ORDER BY last_modified_timestamp",
            (current_start, current_time),
        )
        # Playbooks span two tables; mirror the total_playbooks count above
        # (user_playbooks + agent_playbooks) so the chart matches the stat card.
        user_playbooks_ts = self._fetchall(
            "SELECT created_at FROM user_playbooks WHERE created_at >= ? AND created_at <= ?",
            (current_start_iso, current_time_iso),
        )
        agent_playbooks_ts = self._fetchall(
            "SELECT created_at FROM agent_playbooks WHERE created_at >= ? AND created_at <= ?",
            (current_start_iso, current_time_iso),
        )
        evals_ts = self._fetchall(
            "SELECT created_at, is_success FROM agent_success_evaluation_result WHERE created_at >= ? AND created_at <= ? ORDER BY created_at",
            (current_start_iso, current_time_iso),
        )

        def day_bucket(timestamp: int) -> int:
            return int(
                datetime.fromtimestamp(timestamp, tz=UTC)
                .replace(hour=0, minute=0, second=0, microsecond=0)
                .timestamp()
            )

        def count_series(timestamps: list[int]) -> list[dict[str, int]]:
            buckets: dict[int, int] = defaultdict(int)
            for timestamp in timestamps:
                buckets[day_bucket(timestamp)] += 1
            return [
                {"timestamp": timestamp, "value": value}
                for timestamp, value in sorted(buckets.items())
            ]

        def rate_series(rows: list[sqlite3.Row]) -> list[dict[str, int | float]]:
            buckets: dict[int, dict[str, int]] = defaultdict(
                lambda: {"success": 0, "count": 0}
            )
            for row in rows:
                bucket = day_bucket(_iso_to_epoch(row["created_at"]))
                buckets[bucket]["count"] += 1
                if row["is_success"]:
                    buckets[bucket]["success"] += 1
            return [
                {
                    "timestamp": timestamp,
                    "value": (
                        100.0 * aggregate["success"] / aggregate["count"]
                        if aggregate["count"]
                        else 0.0
                    ),
                    "count": aggregate["count"],
                }
                for timestamp, aggregate in sorted(buckets.items())
            ]

        return {
            "current_period": current_stats,
            "previous_period": previous_stats,
            "interactions_time_series": count_series(
                [_iso_to_epoch(r["created_at"]) for r in interactions_ts]
            ),
            "profiles_time_series": count_series(
                [r["last_modified_timestamp"] for r in profiles_ts]
            ),
            "playbooks_time_series": count_series(
                [
                    _iso_to_epoch(r["created_at"])
                    for r in (*user_playbooks_ts, *agent_playbooks_ts)
                ]
            ),
            "evaluations_time_series": rate_series(evals_ts),
        }

    @SQLiteStorageBase.handle_exceptions
    def get_playbook_application_stats(
        self, days_back: int = 30
    ) -> list[PlaybookApplicationStat]:
        """Return per-rule citation counts from the ``interactions`` table.

        Aggregates the JSON ``citations`` column over the look-back window and
        groups by ``(kind, real_id)``. Iteration is done in Python (rather
        than pushing into SQL via ``json_each``) because volumes are bounded
        per org and the resulting code is easier to maintain. Titles come
        from the citation rows themselves — they are captured at injection
        time when the rule is rendered into context.

        Args:
            days_back (int): Look-back window in days. Must be positive.

        Returns:
            list[PlaybookApplicationStat]: One row per cited ``(kind,
                real_id)``, sorted by ``applied_count`` descending and then
                by ``last_applied_at`` descending. Empty when no interactions
                in the window carry citations.
        """
        if days_back <= 0:
            return []

        current_time = _epoch_now()
        start_iso = _epoch_to_iso(current_time - days_back * 24 * 60 * 60)
        rows = self._fetchall(
            "SELECT interaction_id, created_at, citations FROM interactions "
            "WHERE created_at >= ? "
            "AND citations IS NOT NULL AND citations != '' AND citations != '[]' "
            "ORDER BY created_at DESC, interaction_id DESC",
            (start_iso,),
        )
        if not rows:
            return []

        aggregates: dict[tuple[_CitationKind, str], dict[str, Any]] = defaultdict(
            lambda: {
                "applied_count": 0,
                "title": "",
                "last_applied_at": None,
                "last_interaction_id": None,
            }
        )
        for row in rows:
            citations = _json_loads(row["citations"])
            if not isinstance(citations, list):
                continue
            seen_keys_in_interaction: set[tuple[_CitationKind, str]] = set()
            for c in citations:
                if not isinstance(c, dict):
                    continue
                kind = c.get("kind")
                real_id = c.get("real_id")
                if kind not in _SUPPORTED_CITATION_KINDS or not real_id:
                    continue
                key: tuple[_CitationKind, str] = (
                    cast(_CitationKind, kind),
                    str(real_id),
                )
                if key in seen_keys_in_interaction:
                    continue
                seen_keys_in_interaction.add(key)
                agg = aggregates[key]
                agg["applied_count"] += 1
                if agg["last_applied_at"] is None:
                    # rows ordered DESC, so the first time we see this key
                    # is the most recent occurrence
                    agg["last_applied_at"] = _iso_to_epoch(row["created_at"])
                    agg["last_interaction_id"] = row["interaction_id"]
                if not agg["title"]:
                    title = c.get("title") or ""
                    if isinstance(title, str) and title.strip():
                        agg["title"] = title.strip()

        stats = [
            PlaybookApplicationStat(
                real_id=real_id,
                kind=kind,
                title=agg["title"],
                applied_count=agg["applied_count"],
                last_applied_at=agg["last_applied_at"],
                last_interaction_id=agg["last_interaction_id"],
            )
            for (kind, real_id), agg in aggregates.items()
        ]
        stats.sort(
            key=lambda s: (
                -s.applied_count,
                -(s.last_applied_at if s.last_applied_at is not None else 0),
            )
        )
        return stats

    # ------------------------------------------------------------------
    # Statistics methods
    # ------------------------------------------------------------------

    @SQLiteStorageBase.handle_exceptions
    def get_profile_statistics(self) -> dict:
        current_ts = _epoch_now()
        expiring_soon_ts = current_ts + (7 * 24 * 60 * 60)

        rows = self._fetchall(
            "SELECT status, expiration_timestamp FROM profiles WHERE expiration_timestamp >= ?",
            (current_ts,),
        )
        stats = {
            "current_count": 0,
            "pending_count": 0,
            "archived_count": 0,
            "expiring_soon_count": 0,
        }
        for r in rows:
            s = r["status"]
            exp = r["expiration_timestamp"]
            if s is None:
                stats["current_count"] += 1
                if exp is not None and exp <= expiring_soon_ts:
                    stats["expiring_soon_count"] += 1
            elif s == "pending":
                stats["pending_count"] += 1
            elif s == "archived":
                stats["archived_count"] += 1
        return stats

    # ------------------------------------------------------------------
    # Evaluation-overview support (Plan B-backend)
    # ------------------------------------------------------------------

    @SQLiteStorageBase.handle_exceptions
    def count_sessions_with_shadow_content(self, from_ts: int, to_ts: int) -> int:
        """Count distinct sessions with at least one non-empty shadow interaction.

        Joins `interactions` with `requests` since `session_id` is on the
        request, not the interaction.

        Args:
            from_ts (int): Window start, unix epoch seconds.
            to_ts (int): Window end, unix epoch seconds.

        Returns:
            int: Distinct count of sessions in the window with shadow content.
        """
        rows = self._fetchall(
            """SELECT COUNT(DISTINCT r.session_id) AS n
               FROM interactions i
               JOIN requests r ON i.request_id = r.request_id
               WHERE COALESCE(i.shadow_content, '') != ''
                 AND r.session_id != ''
                 AND i.created_at >= ?
                 AND i.created_at <= ?""",
            (_epoch_to_iso(from_ts), _epoch_to_iso(to_ts)),
        )
        if not rows:
            return 0
        return int(rows[0][0] or 0)

    @SQLiteStorageBase.handle_exceptions
    def get_session_stats(self) -> dict:
        """Return aggregate session-level statistics via SQL aggregate queries."""
        with self._lock:
            # Total sessions — count distinct session_ids (exclude empty/null)
            session_count = self._fetchone(
                "SELECT COUNT(DISTINCT session_id) FROM requests "
                "WHERE session_id IS NOT NULL AND session_id != ''"
            )
            total_sessions = int(session_count[0] or 0) if session_count else 0

            # Total requests
            req_count = self._fetchone("SELECT COUNT(*) FROM requests")
            total_requests = int(req_count[0] or 0) if req_count else 0

            # Total interactions
            int_count = self._fetchone("SELECT COUNT(*) FROM interactions")
            total_interactions = int(int_count[0] or 0) if int_count else 0

            # Unique users
            user_count = self._fetchone(
                "SELECT COUNT(DISTINCT user_id) FROM requests"
            )
            unique_users = int(user_count[0] or 0) if user_count else 0

        return {
            "total_sessions": total_sessions,
            "total_requests": total_requests,
            "total_interactions": total_interactions,
            "unique_users": unique_users,
        }

    @SQLiteStorageBase.handle_exceptions
    def get_interactions_by_session(self, session_id: str) -> list[Interaction]:
        """Return interactions for a session, ordered by created_at.

        Joins `interactions` with `requests` so we can filter by
        Request.session_id.

        Args:
            session_id (str): The session whose interactions to fetch.

        Returns:
            list[Interaction]: Interactions in the session, possibly empty.
        """
        if not session_id:
            return []
        rows = self._fetchall(
            """SELECT i.*
               FROM interactions i
               JOIN requests r ON i.request_id = r.request_id
               WHERE r.session_id = ?
               ORDER BY i.created_at ASC""",
            (session_id,),
        )
        return [_row_to_interaction(r) for r in rows]

    @SQLiteStorageBase.handle_exceptions
    def get_citations_by_session_ids(
        self,
        session_ids: list[str],
    ) -> list[SessionCitation]:
        if not session_ids:
            return []
        out: list[SessionCitation] = []
        ids = sorted(set(session_ids))
        chunk_size = 500
        for i in range(0, len(ids), chunk_size):
            chunk = ids[i : i + chunk_size]
            ph = ",".join("?" for _ in chunk)
            rows = self._fetchall(
                f"""SELECT r.user_id, r.session_id, i.citations
                    FROM requests r
                    JOIN interactions i ON i.request_id = r.request_id
                    WHERE r.session_id IN ({ph})
                      AND i.citations IS NOT NULL
                      AND i.citations != ''
                      AND i.citations != '[]'
                    ORDER BY r.session_id ASC, i.created_at ASC""",  # noqa: S608
                chunk,
            )
            for row in rows:
                citations = _json_loads(row["citations"]) or []
                if not isinstance(citations, list):
                    continue
                for citation in citations:
                    if not isinstance(citation, dict):
                        continue
                    kind = citation.get("kind")
                    real_id = citation.get("real_id")
                    if kind in _SUPPORTED_CITATION_KINDS and real_id:
                        out.append(
                            SessionCitation(
                                user_id=row["user_id"],
                                session_id=row["session_id"],
                                kind=cast(_CitationKind, kind),
                                real_id=str(real_id),
                                title=str(citation.get("title") or ""),
                            )
                        )
        return out

    # ------------------------------------------------------------------
    # Braintrust connector storage (Plan C-backend + Plan C-overview)
    # ------------------------------------------------------------------

    @SQLiteStorageBase.handle_exceptions
    def save_braintrust_connection(self, connection: BraintrustConnection) -> None:
        """Upsert the org's Braintrust connection.

        Args:
            connection (BraintrustConnection): Encrypted connection record.
        """
        self._execute(
            """INSERT INTO braintrust_connection
                 (org_id, api_key_enc, workspace_id, workspace_name,
                  project_ids, last_sync_ts, last_error)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(org_id) DO UPDATE SET
                 api_key_enc = excluded.api_key_enc,
                 workspace_id = excluded.workspace_id,
                 workspace_name = excluded.workspace_name,
                 project_ids = excluded.project_ids,
                 last_sync_ts = excluded.last_sync_ts,
                 last_error = excluded.last_error""",
            (
                connection.org_id,
                connection.api_key_enc,
                connection.workspace_id,
                connection.workspace_name,
                _json_dumps(connection.project_ids),
                connection.last_sync_ts,
                connection.last_error,
            ),
        )

    @SQLiteStorageBase.handle_exceptions
    def get_braintrust_connection(self, org_id: str) -> BraintrustConnection | None:
        """Fetch the org's Braintrust connection or None if not connected."""
        rows = self._fetchall(
            """SELECT api_key_enc, workspace_id, workspace_name, project_ids,
                      last_sync_ts, last_error
               FROM braintrust_connection
               WHERE org_id = ?""",
            (org_id,),
        )
        if not rows:
            return None
        row = rows[0]
        return BraintrustConnection(
            org_id=org_id,
            api_key_enc=row[0],
            workspace_id=row[1],
            workspace_name=row[2] or "",
            project_ids=list(_json_loads(row[3]) or []),
            last_sync_ts=row[4],
            last_error=row[5],
        )

    @SQLiteStorageBase.handle_exceptions
    def delete_braintrust_connection(self, org_id: str) -> None:
        """Delete the org's connection (idempotent)."""
        self._execute("DELETE FROM braintrust_connection WHERE org_id = ?", (org_id,))

    @SQLiteStorageBase.handle_exceptions
    def save_imported_scores(self, scores: list[ImportedScore]) -> None:
        """Upsert imported scores by (org_id, source, source_run_id, scorer_name)."""
        if not scores:
            return
        rows = [
            (
                s.org_id,
                s.source,
                s.source_run_id,
                s.session_id,
                s.scorer_name,
                s.value,
                s.ts,
            )
            for s in scores
        ]
        with self._lock:
            self.conn.executemany(
                """INSERT INTO imported_score
                     (org_id, source, source_run_id, session_id,
                      scorer_name, value, ts)
                   VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(org_id, source, source_run_id, scorer_name)
                   DO UPDATE SET
                     session_id = excluded.session_id,
                     value = excluded.value,
                     ts = excluded.ts""",
                rows,
            )
            self.conn.commit()

    @SQLiteStorageBase.handle_exceptions
    def get_imported_scores(
        self, org_id: str, from_ts: int, to_ts: int
    ) -> list[ImportedScore]:
        """Return imported scores for the org in `[from_ts, to_ts]`."""
        rows = self._fetchall(
            """SELECT source, source_run_id, session_id, scorer_name, value, ts
               FROM imported_score
               WHERE org_id = ?
                 AND ts >= ?
                 AND ts <= ?
               ORDER BY ts ASC""",
            (org_id, from_ts, to_ts),
        )
        return [
            ImportedScore(
                org_id=org_id,
                source=cast(Literal["braintrust"], row[0]),
                source_run_id=row[1],
                session_id=row[2],
                scorer_name=row[3],
                value=float(row[4]),
                ts=int(row[5]),
            )
            for row in rows
        ]

    # ------------------------------------------------------------------
    # Search logging and analytics
    # ------------------------------------------------------------------

    @SQLiteStorageBase.handle_exceptions
    def insert_search_log(self, log_entry: dict) -> None:
        """Insert a search log record (fire-and-forget).

        Uses ``_execute`` which auto-commits outside a ``commit_scope``,
        making this safe for ``BackgroundTasks`` concurrent writes.
        """
        _get = log_entry.get
        self._execute(
            """INSERT INTO search_logs
                 (org_id, query_text, reformulated_query, search_mode,
                  effective_search_mode, entity_types, total_results,
                  profile_results, agent_playbook_results,
                  user_playbook_results, interaction_results,
                  threshold, top_k, latency_ms,
                  caller_type, request_id, session_id, user_id,
                  reformulation_enabled, embedding_failed,
                  recency_on, floor_on, endpoint)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                _get("org_id", ""),
                _get("query_text", ""),
                _get("reformulated_query"),
                _get("search_mode", "hybrid"),
                _get("effective_search_mode"),
                _get("entity_types"),
                _get("total_results", 0),
                _get("profile_results", 0),
                _get("agent_playbook_results", 0),
                _get("user_playbook_results", 0),
                _get("interaction_results", 0),
                _get("threshold"),
                _get("top_k"),
                _get("latency_ms"),
                _get("caller_type"),
                _get("request_id"),
                _get("session_id"),
                _get("user_id"),
                _get("reformulation_enabled", 0),
                _get("embedding_failed", 0),
                _get("recency_on", 0),
                _get("floor_on", 0),
                _get("endpoint", ""),
            ),
        )

    @SQLiteStorageBase.handle_exceptions
    def get_search_analytics(self, org_id: str, days_back: int = 30) -> dict:
        """Return search analytics for the given org and look-back window.

        Buckets results per day, computes aggregate summary stats, ranks
        top queries, and tabulates search-mode distribution — all in
        Python, following the ``get_playbook_application_stats`` pattern.
        """
        current_time = _epoch_now()
        seconds_in_period = days_back * 24 * 60 * 60
        current_start = current_time - seconds_in_period
        current_start_iso = _epoch_to_iso(current_start)
        current_time_iso = _epoch_to_iso(current_time)

        rows = self._fetchall(
            """SELECT created_at, total_results, latency_ms, search_mode, query_text
               FROM search_logs
               WHERE org_id = ?
                 AND created_at >= ?
                 AND created_at <= ?
               ORDER BY created_at""",
            (org_id, current_start_iso, current_time_iso),
        )

        if not rows:
            return {
                "searches_time_series": [],
                "results_time_series": [],
                "latency_time_series": [],
                "summary": {
                    "total_searches": 0,
                    "avg_results_per_search": 0.0,
                    "zero_result_rate": 0.0,
                    "avg_latency_ms": 0.0,
                },
                "top_queries": [],
                "mode_distribution": [],
            }

        # --- Daily bucketing ---
        day_buckets: dict[str, dict] = {}
        for row in rows:
            created_iso = row["created_at"]
            # Extract just the date portion (YYYY-MM-DD)
            day_key = created_iso[:10] if created_iso else ""
            if day_key not in day_buckets:
                day_buckets[day_key] = {
                    "search_count": 0,
                    "total_results_sum": 0,
                    "total_latency_ms": 0,
                }
            bucket = day_buckets[day_key]
            bucket["search_count"] += 1
            bucket["total_results_sum"] += int(row["total_results"] or 0)
            if row["latency_ms"] is not None:
                bucket["total_latency_ms"] += int(row["latency_ms"])

        searches_ts = []
        results_ts = []
        latency_ts = []
        for day_key in sorted(day_buckets):
            b = day_buckets[day_key]
            try:
                ts = int(datetime.strptime(day_key, "%Y-%m-%d").replace(
                    tzinfo=UTC).timestamp())
            except (ValueError, OSError):
                continue
            n = b["search_count"]
            searches_ts.append({"timestamp": ts, "value": float(n)})
            if n > 0:
                results_ts.append({
                    "timestamp": ts,
                    "value": float(b["total_results_sum"]) / n,
                })
                latency_ts.append({
                    "timestamp": ts,
                    "value": float(b["total_latency_ms"]) / n,
                })

        # --- Summary stats ---
        total_searches = len(rows)
        zero_result_count = sum(1 for r in rows if int(r["total_results"] or 0) == 0)
        total_results_sum = sum(int(r["total_results"] or 0) for r in rows)
        total_latency_sum = sum(
            int(r["latency_ms"]) for r in rows if r["latency_ms"] is not None
        )
        latency_count = sum(1 for r in rows if r["latency_ms"] is not None)

        summary = {
            "total_searches": total_searches,
            "avg_results_per_search": (
                round(total_results_sum / total_searches, 2)
                if total_searches > 0
                else 0.0
            ),
            "zero_result_rate": (
                round(zero_result_count / total_searches * 100, 2)
                if total_searches > 0
                else 0.0
            ),
            "avg_latency_ms": (
                round(total_latency_sum / latency_count, 2)
                if latency_count > 0
                else 0.0
            ),
        }

        # --- Top queries ---
        query_counter: dict[str, int] = {}
        for row in rows:
            q = (row["query_text"] or "").strip()
            if q:
                query_counter[q] = query_counter.get(q, 0) + 1
        sorted_queries = sorted(
            query_counter.items(), key=lambda kv: -kv[1]
        )[:20]
        top_queries = [
            {"query": q, "count": c} for q, c in sorted_queries
        ]

        # --- Mode distribution ---
        mode_counter: dict[str, int] = {}
        for row in rows:
            mode = (row["search_mode"] or "unknown").lower()
            mode_counter[mode] = mode_counter.get(mode, 0) + 1
        mode_distribution = [
            {"mode": m, "count": c}
            for m, c in sorted(mode_counter.items(), key=lambda kv: -kv[1])
        ]

        return {
            "searches_time_series": searches_ts,
            "results_time_series": results_ts,
            "latency_time_series": latency_ts,
            "summary": summary,
            "top_queries": top_queries,
            "mode_distribution": mode_distribution,
        }
