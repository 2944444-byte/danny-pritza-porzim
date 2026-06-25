"""
offices_service.py
------------------
Owns the list of valid office names (the "Office Name" dropdown / closed list).
Admin-editable and persisted to JSON, so offices can change without touching
code or restarting. Defaults to OFFICE_NAMES from consts on first use.

Mirrors schedule_service's persistence approach (SCHEDULE/OFFICES path override,
/tmp fallback for read-only filesystems).
"""

import os
import json
import threading
from typing import List

from src.consts.consts import OFFICE_NAMES

OFFICES_PATH = os.getenv(
    "OFFICES_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "offices.json"),
)

_lock = threading.Lock()


def _normalize(offices: List[str]) -> List[str]:
    """Trim, drop empties, de-duplicate (preserving order)."""
    seen = set()
    out: List[str] = []
    for office in offices or []:
        name = str(office).strip()
        if name and name not in seen:
            seen.add(name)
            out.append(name)
    return out


def load_offices() -> List[str]:
    """Load the offices list, creating the default file if none exists."""
    with _lock:
        if not os.path.exists(OFFICES_PATH):
            default = list(OFFICE_NAMES)
            _write(default)
            return default
        try:
            with open(OFFICES_PATH, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, list):
                return [str(x) for x in data]
        except Exception:
            pass
        return list(OFFICE_NAMES)


def save_offices(offices: List[str]) -> List[str]:
    """Validate + persist the offices list, returning the cleaned result."""
    cleaned = _normalize(offices)
    with _lock:
        _write(cleaned)
    return cleaned


def _write(offices: List[str]) -> None:
    try:
        os.makedirs(os.path.dirname(OFFICES_PATH), exist_ok=True)
        with open(OFFICES_PATH, "w", encoding="utf-8") as fh:
            json.dump(offices, fh, ensure_ascii=False, indent=2)
    except OSError:
        fallback = os.path.join("/tmp", "offices.json")
        with open(fallback, "w", encoding="utf-8") as fh:
            json.dump(offices, fh, ensure_ascii=False, indent=2)
        globals()["OFFICES_PATH"] = fallback
