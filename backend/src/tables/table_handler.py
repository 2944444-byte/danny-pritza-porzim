"""
table_handler.py
----------------
Defines the table schema (which columns exist and how each cell is validated)
and provides the operations the API exposes:

  - get_dropdown_options()  -> options for dropdown columns (for the UI)
  - validate_table(rows)    -> per-cell validation errors

The column `name`s here are the canonical JSON keys shared with the front-end
(see ../../../src/config/columns.js). Keep them in sync.

NOTE: This module reconstructs the `TableSchemaManager` referenced by main.py
(the original file was not provided). It is intentionally small and declarative
so the schema is easy to change in one place.
"""

from typing import Any, Dict, List

from src.columns.base_column import BaseColumn
from src.columns.column_types import (
    DropdownColumn,
    IntegerColumn,
    PhoneColumn,
    TextColumn,
    WKTGeometryColumn,
)
from src.services import offices_service


class TableSchemaManager:
    """Owns the ordered list of columns and runs validation over table rows."""

    def __init__(self) -> None:
        # Keep a reference to the office column so its allowed values can be kept
        # in sync with the admin-editable offices list.
        self.office_column = DropdownColumn(
            "office_name", "Office Name", allowed_values=offices_service.load_offices()
        )
        # The schema: order here is the canonical column order.
        self.columns: List[BaseColumn] = [
            PhoneColumn("phone_number", "Phone Number"),
            self.office_column,
            WKTGeometryColumn("geographic_location", "Geographic Location (WKT)"),
            TextColumn("department_name", "Department Name"),
            IntegerColumn("importance", "Importance"),
        ]

    def _sync_offices(self) -> None:
        """Refresh the office dropdown's allowed values from the offices store."""
        self.office_column.allowed_values = offices_service.load_offices()

    # -- Schema metadata ------------------------------------------------------

    def get_dropdown_options(self) -> Dict[str, List[str]]:
        """
        Return { column_name: [allowed values] } for every dropdown column.
        Consumed by the UI to populate <select> inputs.
        """
        self._sync_offices()
        return {
            col.name: col.allowed_values
            for col in self.columns
            if isinstance(col, DropdownColumn)
        }

    # -- Validation -----------------------------------------------------------

    def validate_table(self, table_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate every cell of every row.

        Returns a stable, UI-friendly shape:
            {
              "is_valid": bool,
              "errors": [ { "row": <int>, "column": <key>, "message": <str> }, ... ]
            }

        The front-end's validationAdapter understands this shape directly.
        """
        self._sync_offices()
        errors: List[Dict[str, Any]] = []

        for row_index, row in enumerate(table_data or []):
            for col in self.columns:
                value = row.get(col.name) if isinstance(row, dict) else None
                message = col.validate(value)
                if message:
                    errors.append(
                        {"row": row_index, "column": col.name, "message": message}
                    )

        return {"is_valid": len(errors) == 0, "errors": errors}

    # -- Helpers used by export/email ----------------------------------------

    @property
    def display_headers(self) -> List[str]:
        """Human-friendly headers in column order (for Excel export)."""
        return [col.display_name for col in self.columns]

    @property
    def keys(self) -> List[str]:
        """Canonical keys in column order."""
        return [col.name for col in self.columns]
