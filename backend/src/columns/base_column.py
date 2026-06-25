"""
base_column.py
--------------
Abstract base class for a single table column / cell validator.

(This is the file you provided, unchanged.)
"""

from abc import ABC, abstractmethod
from typing import Any, Optional


class BaseColumn(ABC):
    def __init__(self, name: str, display_name: str, required: bool = True):
        self.name = name  # The backend/JSON key
        self.display_name = display_name
        self.required = required

    @abstractmethod
    def validate(self, value: Any) -> Optional[str]:
        """
        Validates a cell value.
        Returns an error message string if invalid, or None if valid.
        """
        if self.required and (value is None or str(value).strip() == ""):
            return f"{self.display_name} is required and cannot be empty."
        return None
