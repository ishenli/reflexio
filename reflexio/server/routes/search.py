"""Search/retrieval route handlers (extracted from api.py, Tier3 A2)."""

import json
import logging
import time
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    pass

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Request,
)

from reflexio.models.api_schema.retriever_schema import (
    RerankUserProfilesRequest,
    SearchAgentPlaybookRequest,
    SearchAgentPlaybooksViewResponse,
    SearchInteractionRequest,
    SearchInteractionsViewResponse,
    SearchProfilesViewResponse,
    SearchUserPlaybookRequest,
    SearchUserPlaybooksViewResponse,
    SearchUserProfileRequest,
    UnifiedSearchRequest,
    UnifiedSearchViewResponse,
)
from reflexio.models.api_schema.ui.converters import (
    to_agent_playbook_view,
    to_interaction_view,
    to_profile_view,
    to_user_playbook_view,
)
from reflexio.server.auth import (
    default_billing_gate,
    default_get_caller_type,
    default_get_org_id,
)
from reflexio.server.cache import reflexio_cache
from reflexio.server.rate_limit import limiter
from reflexio.server.routes._common import _run_limited_api
from reflexio.server.routes._metering import (
    _meter_applied_learnings,
    _meter_search_request,
    _stamp_search_dependencies_done,
)
from reflexio.server.tracing import profile_step

logger = logging.getLogger(__name__)
router = APIRouter()


def _log_search_request(
    *,
    org_id: str,
    log_entry: dict,
) -> None:
    """Write a search log entry to storage (fire-and-forget).

    Follows the ``_meter_search_request`` pattern: resolves the Reflexio
    instance through the cache, calls ``insert_search_log``, and silently
    catches exceptions so a logging failure never affects the response.
    """
    try:
        reflexio = reflexio_cache.get_reflexio(org_id=org_id)
        if (storage := reflexio._get_storage()) is not None:  # noqa: SLF001
            storage.insert_search_log(log_entry)
    except Exception:
        logger.warning(
            "search-log write failed for org %s", org_id, exc_info=True,
        )


def _entity_types_json(entity_types: list[str] | None) -> str | None:
    """Serialize entity types list to JSON for storage."""
    if not entity_types:
        return None
    return json.dumps(entity_types)


@router.post(
    "/api/search_profiles",
    response_model=SearchProfilesViewResponse,
    response_model_exclude_none=True,
)
@limiter.limit("120/minute")  # Rate limit for read operations
def search_user_profiles(
    request: Request,
    payload: SearchUserProfileRequest,
    background_tasks: BackgroundTasks,
    org_id: str = Depends(default_get_org_id),
    caller_type: str = Depends(default_get_caller_type),
    _gate: None = Depends(default_billing_gate("application")),  # noqa: B008
) -> SearchProfilesViewResponse:
    t0 = time.monotonic()
    response = _run_limited_api(
        org_id,
        "search",
        lambda: reflexio_cache.get_reflexio(org_id=org_id).search_user_profiles(
            payload
        ),
    )
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    resp = SearchProfilesViewResponse(
        success=response.success,
        user_profiles=[to_profile_view(p) for p in response.user_profiles],
        msg=response.msg,
    )
    _meter_search_request(
        org_id=org_id,
        caller_type=caller_type,
        request_id=getattr(payload, "request_id", None),
        session_id=getattr(payload, "session_id", None),
    )
    _meter_applied_learnings(
        org_id=org_id,
        caller_type=caller_type,
        surfaced_count=len(resp.user_profiles),
        request_id=getattr(payload, "request_id", None),
        session_id=getattr(payload, "session_id", None),
    )
    background_tasks.add_task(
        _log_search_request,
        org_id=org_id,
        log_entry={
            "org_id": org_id,
            "query_text": payload.query or "",
            "search_mode": payload.search_mode.value
            if hasattr(payload.search_mode, "value")
            else str(payload.search_mode),
            "total_results": len(resp.user_profiles),
            "profile_results": len(resp.user_profiles),
            "threshold": payload.threshold,
            "top_k": payload.top_k,
            "latency_ms": elapsed_ms,
            "caller_type": caller_type,
            "request_id": getattr(payload, "request_id", None),
            "session_id": getattr(payload, "session_id", None),
            "user_id": payload.user_id,
            "endpoint": "search_profiles",
        },
    )
    return resp


@router.post(
    "/api/rerank_user_profiles",
    response_model=SearchProfilesViewResponse,
    response_model_exclude_none=True,
)
@limiter.limit("120/minute")  # Rate limit for read operations
def rerank_user_profiles(
    request: Request,
    payload: RerankUserProfilesRequest,
    background_tasks: BackgroundTasks,
    org_id: str = Depends(default_get_org_id),
) -> SearchProfilesViewResponse:
    """Rerank a list of profile ids by query relevance using a cross-encoder.

    Args:
        request (Request): The HTTP request object (for rate limiting)
        payload (RerankUserProfilesRequest): The rerank request
        org_id (str): Organization ID

    Returns:
        SearchProfilesViewResponse: Reranked profiles, top_k entries.
    """
    t0 = time.monotonic()
    response = _run_limited_api(
        org_id,
        "search",
        lambda: reflexio_cache.get_reflexio(org_id=org_id).rerank_user_profiles(
            payload
        ),
    )
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    background_tasks.add_task(
        _log_search_request,
        org_id=org_id,
        log_entry={
            "org_id": org_id,
            "query_text": payload.query,
            "total_results": len(response.user_profiles),
            "profile_results": len(response.user_profiles),
            "top_k": payload.top_k,
            "latency_ms": elapsed_ms,
            "user_id": payload.user_id,
            "endpoint": "rerank_user_profiles",
        },
    )
    return SearchProfilesViewResponse(
        success=response.success,
        user_profiles=[to_profile_view(p) for p in response.user_profiles],
        msg=response.msg,
    )


@router.post(
    "/api/search_interactions",
    response_model=SearchInteractionsViewResponse,
    response_model_exclude_none=True,
)
@limiter.limit("120/minute")  # Rate limit for read operations
def search_interactions(
    request: Request,
    payload: SearchInteractionRequest,
    background_tasks: BackgroundTasks,
    org_id: str = Depends(default_get_org_id),
) -> SearchInteractionsViewResponse:
    t0 = time.monotonic()
    response = _run_limited_api(
        org_id,
        "search",
        lambda: reflexio_cache.get_reflexio(org_id=org_id).search_interactions(payload),
    )
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    resp = SearchInteractionsViewResponse(
        success=response.success,
        interactions=[to_interaction_view(i) for i in response.interactions],
        msg=response.msg,
    )
    background_tasks.add_task(
        _log_search_request,
        org_id=org_id,
        log_entry={
            "org_id": org_id,
            "query_text": payload.query or "",
            "search_mode": payload.search_mode.value
            if hasattr(payload.search_mode, "value")
            else str(payload.search_mode),
            "total_results": len(resp.interactions),
            "interaction_results": len(resp.interactions),
            "threshold": payload.threshold,
            "top_k": payload.top_k,
            "latency_ms": elapsed_ms,
            "request_id": getattr(payload, "request_id", None),
            "user_id": payload.user_id,
            "endpoint": "search_interactions",
        },
    )
    return resp


@router.post(
    "/api/search_user_playbooks",
    response_model=SearchUserPlaybooksViewResponse,
    response_model_exclude_none=True,
)
@limiter.limit("120/minute")  # Rate limit for read operations
def search_user_playbooks_endpoint(
    request: Request,
    payload: SearchUserPlaybookRequest,
    background_tasks: BackgroundTasks,
    org_id: str = Depends(default_get_org_id),
    caller_type: str = Depends(default_get_caller_type),
    _gate: None = Depends(default_billing_gate("application")),  # noqa: B008
) -> SearchUserPlaybooksViewResponse:
    """Search user playbooks with semantic search and advanced filtering.

    Supports filtering by user_id (via request_id linkage), agent_version,
    playbook_name, datetime range, and status.

    Args:
        request (Request): The HTTP request object (for rate limiting)
        payload (SearchUserPlaybookRequest): The search request
        org_id (str): Organization ID
        caller_type (str): Billing caller classification (injected via dependency).

    Returns:
        SearchUserPlaybooksViewResponse: Response containing matching user playbooks
    """
    t0 = time.monotonic()
    response = _run_limited_api(
        org_id,
        "search",
        lambda: reflexio_cache.get_reflexio(org_id=org_id).search_user_playbooks(
            payload
        ),
    )
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    resp = SearchUserPlaybooksViewResponse(
        success=response.success,
        user_playbooks=[to_user_playbook_view(rf) for rf in response.user_playbooks],
        msg=response.msg,
    )
    _meter_search_request(
        org_id=org_id,
        caller_type=caller_type,
        request_id=getattr(payload, "request_id", None),
        session_id=getattr(payload, "session_id", None),
    )
    _meter_applied_learnings(
        org_id=org_id,
        caller_type=caller_type,
        surfaced_count=len(resp.user_playbooks),
        request_id=getattr(payload, "request_id", None),
        session_id=getattr(payload, "session_id", None),
    )
    background_tasks.add_task(
        _log_search_request,
        org_id=org_id,
        log_entry={
            "org_id": org_id,
            "query_text": payload.query or "",
            "search_mode": payload.search_mode.value
            if hasattr(payload.search_mode, "value")
            else str(payload.search_mode),
            "total_results": len(resp.user_playbooks),
            "user_playbook_results": len(resp.user_playbooks),
            "threshold": payload.threshold,
            "top_k": payload.top_k,
            "latency_ms": elapsed_ms,
            "caller_type": caller_type,
            "request_id": getattr(payload, "request_id", None),
            "session_id": getattr(payload, "session_id", None),
            "user_id": payload.user_id,
            "reformulation_enabled": 1 if payload.enable_reformulation else 0,
            "endpoint": "search_user_playbooks",
        },
    )
    return resp


@router.post(
    "/api/search_agent_playbooks",
    response_model=SearchAgentPlaybooksViewResponse,
    response_model_exclude_none=True,
)
@limiter.limit("120/minute")  # Rate limit for read operations
def search_agent_playbooks_endpoint(
    request: Request,
    payload: SearchAgentPlaybookRequest,
    background_tasks: BackgroundTasks,
    org_id: str = Depends(default_get_org_id),
    caller_type: str = Depends(default_get_caller_type),
    _gate: None = Depends(default_billing_gate("application")),  # noqa: B008
) -> SearchAgentPlaybooksViewResponse:
    """Search agent playbooks with semantic search and advanced filtering.

    Supports filtering by agent_version, playbook_name, datetime range,
    status_filter, and playbook_status_filter.

    Args:
        request (Request): The HTTP request object (for rate limiting)
        payload (SearchAgentPlaybookRequest): The search request
        org_id (str): Organization ID
        caller_type (str): Billing caller classification (injected via dependency).

    Returns:
        SearchAgentPlaybooksViewResponse: Response containing matching agent playbooks
    """
    t0 = time.monotonic()
    response = _run_limited_api(
        org_id,
        "search",
        lambda: reflexio_cache.get_reflexio(org_id=org_id).search_agent_playbooks(
            payload
        ),
    )
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    resp = SearchAgentPlaybooksViewResponse(
        success=response.success,
        agent_playbooks=[to_agent_playbook_view(fb) for fb in response.agent_playbooks],
        msg=response.msg,
    )
    _meter_search_request(
        org_id=org_id,
        caller_type=caller_type,
        request_id=getattr(payload, "request_id", None),
        session_id=getattr(payload, "session_id", None),
    )
    _meter_applied_learnings(
        org_id=org_id,
        caller_type=caller_type,
        surfaced_count=len(resp.agent_playbooks),
        request_id=getattr(payload, "request_id", None),
        session_id=getattr(payload, "session_id", None),
    )
    background_tasks.add_task(
        _log_search_request,
        org_id=org_id,
        log_entry={
            "org_id": org_id,
            "query_text": payload.query or "",
            "search_mode": payload.search_mode.value
            if hasattr(payload.search_mode, "value")
            else str(payload.search_mode),
            "total_results": len(resp.agent_playbooks),
            "agent_playbook_results": len(resp.agent_playbooks),
            "threshold": payload.threshold,
            "top_k": payload.top_k,
            "latency_ms": elapsed_ms,
            "caller_type": caller_type,
            "request_id": getattr(payload, "request_id", None),
            "session_id": getattr(payload, "session_id", None),
            "reformulation_enabled": 1 if payload.enable_reformulation else 0,
            "endpoint": "search_agent_playbooks",
        },
    )
    return resp


@router.post(
    "/api/search",
    response_model=UnifiedSearchViewResponse,
    response_model_exclude_none=True,
)
@limiter.limit("120/minute")
def unified_search_endpoint(
    request: Request,
    payload: UnifiedSearchRequest,
    background_tasks: BackgroundTasks,
    org_id: str = Depends(default_get_org_id),
    caller_type: str = Depends(default_get_caller_type),
    _gate: None = Depends(default_billing_gate("application")),  # noqa: B008
    _deps_done: None = Depends(_stamp_search_dependencies_done),
) -> UnifiedSearchViewResponse:
    """Search across all entity types (profiles, agent playbooks, user playbooks).

    Runs query rewriting and embedding generation in parallel, then searches
    all entity types in parallel. Query rewriting is gated behind the
    enable_reformulation request param.

    Args:
        request (Request): The HTTP request object (for rate limiting)
        payload (UnifiedSearchRequest): The unified search request
        org_id (str): Organization ID
        caller_type (str): Billing caller classification (injected via dependency).

    Returns:
        UnifiedSearchViewResponse: Combined search results
    """
    deps_done = getattr(request.state, "search_deps_done_monotonic", None)
    deps_to_body_ms = (
        int((time.monotonic() - deps_done) * 1000) if deps_done is not None else None
    )
    with profile_step(
        "search.endpoint",
        enabled=bool(payload.enable_reformulation),
        has_conversation_history=bool(payload.conversation_history),
        search_mode=payload.search_mode,
    ) as endpoint_span:
        endpoint_span.set_data("deps_to_body_ms", deps_to_body_ms)
        endpoint_span.set_data(
            "tp_borrowed", getattr(request.state, "tp_borrowed", None)
        )
        endpoint_span.set_data("tp_total", getattr(request.state, "tp_total", None))
        endpoint_span.set_data("tp_waiting", getattr(request.state, "tp_waiting", None))

        def run_search() -> Any:
            with profile_step("search.reflexio_cache"):
                reflexio = reflexio_cache.get_reflexio(org_id=org_id)
            return reflexio.unified_search(payload, org_id=org_id)

        t0 = time.monotonic()
        response = _run_limited_api(org_id, "search", run_search)
        elapsed_ms = int((time.monotonic() - t0) * 1000)
        num_profiles = len(response.profiles)
        num_agent_playbooks = len(response.agent_playbooks)
        num_user_playbooks = len(response.user_playbooks)
        total_results = num_profiles + num_agent_playbooks + num_user_playbooks

        with profile_step("search.response_view"):
            resp = UnifiedSearchViewResponse(
                success=response.success,
                profiles=[to_profile_view(p) for p in response.profiles],
                agent_playbooks=[
                    to_agent_playbook_view(fb) for fb in response.agent_playbooks
                ],
                user_playbooks=[
                    to_user_playbook_view(rf) for rf in response.user_playbooks
                ],
                reformulated_query=response.reformulated_query,
                msg=response.msg,
                agent_trace=response.agent_trace,
                rehydrated_text=response.rehydrated_text,
            )
        background_tasks.add_task(
            _meter_search_request,
            org_id=org_id,
            caller_type=caller_type,
            request_id=getattr(payload, "request_id", None),
            session_id=getattr(payload, "session_id", None),
        )
        background_tasks.add_task(
            _meter_applied_learnings,
            org_id=org_id,
            caller_type=caller_type,
            surfaced_count=total_results,
            request_id=getattr(payload, "request_id", None),
            session_id=getattr(payload, "session_id", None),
        )
        background_tasks.add_task(
            _log_search_request,
            org_id=org_id,
            log_entry={
                "org_id": org_id,
                "query_text": payload.query,
                "reformulated_query": response.reformulated_query,
                "search_mode": payload.search_mode.value
                if hasattr(payload.search_mode, "value")
                else str(payload.search_mode),
                "effective_search_mode": response.search_mode_effective,
                "entity_types": _entity_types_json(
                    [
                        str(e) if not hasattr(e, "value") else e.value
                        for e in (payload.entity_types or [])
                    ]
                    if payload.entity_types
                    else None
                ),
                "total_results": total_results,
                "profile_results": num_profiles,
                "agent_playbook_results": num_agent_playbooks,
                "user_playbook_results": num_user_playbooks,
                "threshold": payload.threshold,
                "top_k": payload.top_k,
                "latency_ms": elapsed_ms,
                "caller_type": caller_type,
                "request_id": getattr(payload, "request_id", None),
                "session_id": getattr(payload, "session_id", None),
                "user_id": payload.user_id,
                "reformulation_enabled": 1 if payload.enable_reformulation else 0,
                "embedding_failed": 1 if response.degraded else 0,
                "endpoint": "unified_search",
            },
        )
    return resp