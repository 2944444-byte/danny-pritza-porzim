"""
schedule_service.py
-------------------
Owns the site's weekly availability schedule: which days the site is open and,
for each open day, between which hours. This is the authority the API uses to
decide whether validation (and therefore export/email) is allowed right now.

Storage: a small JSON file (path configurable via SCHEDULE_PATH env var). A
sensible default is created on first use. Times are "HH:MM" (24h). Days are
keyed "0".."6" where 0 = Sunday … 6 = Saturday (Israel/Hebrew week order), which
is also why the default closes Saturday (Shabbat).

Time is evaluated in the schedule's `timezone` (default Asia/Jerusalem) so
"closed on Shabbat" lines up with the local week.
"""

import os
import json
import threading
from datetime import datetime
from typing import Any, Dict, Optional

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover - zoneinfo always present on 3.9+
    ZoneInfo = None  # type: ignore

# 0 = Sunday … 6 = Saturday
DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

DEFAULT_CLOSED_MESSAGE = "אנחנו סגורים בשבת, נסו מאוחר יותר"

# Path to the persisted schedule (overridable for serverless/tmp filesystems).
SCHEDULE_PATH = os.getenv(
    "SCHEDULE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "schedule.json"),
)

# Optional admin token. When set, writing the schedule requires this token.
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

_lock = threading.Lock()


def _default_schedule() -> Dict[str, Any]:
    """Sun–Fri open 08:00–18:00, Saturday (Shabbat) closed."""
    days: Dict[str, Any] = {}
    for idx in range(7):
        days[str(idx)] = {
            "enabled": idx != 6,  # Saturday (6) disabled by default
            "open": "08:00",
            "close": "18:00",
        }
    return {
        "timezone": "Asia/Jerusalem",
        "closed_message": DEFAULT_CLOSED_MESSAGE,
        "days": days,
    }


# --- Persistence -------------------------------------------------------------


def load_schedule() -> Dict[str, Any]:
    """Load the schedule, creating the default file if none exists."""
    with _lock:
        if not os.path.exists(SCHEDULE_PATH):
            schedule = _default_schedule()
            _write(schedule)
            return schedule
        try:
            with open(SCHEDULE_PATH, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            # Corrupt/unreadable → fall back to default (don't crash the API).
            return _default_schedule()


def save_schedule(schedule: Dict[str, Any]) -> Dict[str, Any]:
    """Persist a validated schedule and return it."""
    with _lock:
        _write(schedule)
    return schedule


def _write(schedule: Dict[str, Any]) -> None:
    target = SCHEDULE_PATH
    try:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8") as fh:
            json.dump(schedule, fh, ensure_ascii=False, indent=2)
    except OSError:
        # Read-only filesystem (e.g. some serverless hosts): fall back to /tmp.
        fallback = os.path.join("/tmp", "schedule.json")
        with open(fallback, "w", encoding="utf-8") as fh:
            json.dump(schedule, fh, ensure_ascii=False, indent=2)
        # Remember the writable location for subsequent reads this process.
        globals()["SCHEDULE_PATH"] = fallback


# --- Evaluation --------------------------------------------------------------


def _now(timezone: str) -> datetime:
    if ZoneInfo is not None:
        try:
            return datetime.now(ZoneInfo(timezone))
        except Exception:
            pass
    return datetime.now()


def _to_minutes(hhmm: str) -> int:
    hours, minutes = hhmm.split(":")
    return int(hours) * 60 + int(minutes)


def evaluate(schedule: Optional[Dict[str, Any]] = None, now: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Decide whether the site is currently open.

    Returns:
      {
        "open": bool,
        "reason": "day" | "hours" | None,   # why it's closed (None if open)
        "message": str | None,              # Hebrew message to show when closed
        "now": "<iso>",
        "weekday": int,                     # 0=Sunday … 6=Saturday
        "today": { "enabled", "open", "close" }
      }
    """
    schedule = schedule or load_schedule()
    tz = schedule.get("timezone", "Asia/Jerusalem")
    current = now or _now(tz)

    # Convert Python's Monday=0..Sunday=6 to Sunday=0..Saturday=6.
    weekday = (current.weekday() + 1) % 7
    today = schedule.get("days", {}).get(str(weekday), {"enabled": False, "open": "08:00", "close": "18:00"})

    base = {
        "now": current.isoformat(),
        "weekday": weekday,
        "today": today,
    }

    if not today.get("enabled", False):
        return {
            **base,
            "open": False,
            "reason": "day",
            "message": schedule.get("closed_message", DEFAULT_CLOSED_MESSAGE),
        }

    minutes = current.hour * 60 + current.minute
    try:
        open_min = _to_minutes(today["open"])
        close_min = _to_minutes(today["close"])
    except Exception:
        open_min, close_min = 0, 24 * 60

    if open_min <= minutes < close_min:
        return {**base, "open": True, "reason": None, "message": None}

    hours_msg = (
        f"האתר פתוח היום בין השעות {today['open']} ל-{today['close']}. "
        "נסו שוב מאוחר יותר."
    )
    return {**base, "open": False, "reason": "hours", "message": hours_msg}
