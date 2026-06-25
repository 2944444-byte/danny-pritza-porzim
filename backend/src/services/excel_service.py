"""
excel_service.py
----------------
Builds an .xlsx workbook from validated rows, using the schema's display headers
in column order. Shared by the /download-excel endpoint and the email report.
"""

import io
from typing import Any, Dict, List

import openpyxl

from src.tables.table_handler import TableSchemaManager


def build_workbook_bytes(
    rows: List[Dict[str, Any]], schema: TableSchemaManager
) -> bytes:
    """Return the bytes of an .xlsx file containing `rows` under the schema headers."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Phone Mappings"

    # Header row (human-friendly display names).
    ws.append(schema.display_headers)

    # Data rows, in canonical column order.
    for row in rows or []:
        ws.append([row.get(key, "") for key in schema.keys])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()
