"""
Language utilities for LLM-generated content.

Controls what language the extraction prompts instruct the LLM to output.
"""

from __future__ import annotations

from typing import Literal

# Supported language codes (must match frontend Locale type)
LanguageCode = Literal["en", "zh"]

# Default language when none is configured
_DEFAULT_LANGUAGE: LanguageCode = "zh"

# Language to display name mapping
_LANGUAGE_DISPLAY: dict[LanguageCode, str] = {
    "en": "English",
    "zh": "中文",
}


def resolve_language(raw: str | None) -> LanguageCode:
    """Resolve a raw language value to a supported LanguageCode.

    Falls back to the default when the value is None, empty, or unknown.

    Args:
        raw: Raw language value from config (e.g. ``"zh"``, ``"en"``).

    Returns:
        A validated ``LanguageCode``.
    """
    if raw and raw.strip().lower() in _LANGUAGE_DISPLAY:
        return raw.strip().lower()  # type: ignore[return-value]
    return _DEFAULT_LANGUAGE


def content_language_instruction(language: LanguageCode | str | None) -> str:
    """Return a sentence instructing the LLM what language to output content in.

    Args:
        language: The configured language code.

    Returns:
        A one-sentence instruction (with leading newline) to append to extraction
        definition prompts, or an empty string when the language is English (the
        default model behaviour).
    """
    resolved = resolve_language(language)
    if resolved == "en":
        return ""
    return (
        "\n\nIMPORTANT: Output all profile content in Chinese (中文). "
        "Use Chinese for the 'content' field and any other natural-language text. "
        "The JSON field names and schema must remain in English."
    )