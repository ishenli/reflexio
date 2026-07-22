from unittest.mock import patch

import reflexio.server.llm.rerank.cross_encoder_reranker as reranker
from reflexio.server.llm.rerank.cross_encoder_reranker import (
    CrossEncoderUnavailableError,
)


def test_prewarm_returns_true_when_model_loads():
    with patch(
        "reflexio.server.llm.rerank.cross_encoder_reranker.score_pairs",
        return_value=[0.0],
    ) as mock_score:
        assert reranker.prewarm() is True
    mock_score.assert_called_once()


def test_prewarm_returns_false_when_unavailable():
    with patch(
        "reflexio.server.llm.rerank.cross_encoder_reranker.score_pairs",
        side_effect=CrossEncoderUnavailableError("no model"),
    ):
        assert reranker.prewarm() is False


def test_prewarm_returns_false_on_unexpected_error():
    with patch(
        "reflexio.server.llm.rerank.cross_encoder_reranker.score_pairs",
        side_effect=RuntimeError("predict blew up"),
    ):
        assert reranker.prewarm() is False


def test_prewarm_async_starts_background_thread(monkeypatch):
    started: list[tuple[object, bool, str | None]] = []

    class FakeThread:
        def __init__(self, *, target, daemon, name):
            started.append((target, daemon, name))

        def start(self):
            started.append(("started", True, None))

    monkeypatch.setattr(reranker, "_PREWARM_STARTED", False)
    monkeypatch.delenv("REFLEXIO_RERANK_PREWARM_SYNC", raising=False)
    with patch.object(reranker.threading, "Thread", FakeThread):
        assert reranker.prewarm_async() is True
        assert reranker.prewarm_async() is False

    assert started == [
        (reranker.prewarm, True, "cross-encoder-prewarm"),
        ("started", True, None),
    ]


def test_prewarm_async_can_run_synchronously(monkeypatch):
    monkeypatch.setenv("REFLEXIO_RERANK_PREWARM_SYNC", "1")
    with patch.object(reranker, "prewarm", return_value=True) as mock_prewarm:
        assert reranker.prewarm_async() is True
    mock_prewarm.assert_called_once()


def test_maybe_start_prewarm_skips_by_default(monkeypatch):
    monkeypatch.delenv("REFLEXIO_RERANK_STARTUP_PREWARM", raising=False)
    with patch.object(reranker, "prewarm_async") as mock_prewarm_async:
        assert reranker.maybe_start_prewarm() is False
    mock_prewarm_async.assert_not_called()


def test_maybe_start_prewarm_runs_when_enabled(monkeypatch):
    monkeypatch.setenv("REFLEXIO_RERANK_STARTUP_PREWARM", "1")
    with patch.object(reranker, "prewarm_async", return_value=True) as mock_prewarm_async:
        assert reranker.maybe_start_prewarm() is True
    mock_prewarm_async.assert_called_once()
