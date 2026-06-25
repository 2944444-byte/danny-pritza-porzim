"""
consts.py
---------
Shared constants for the validation backend.

This is the file referenced by the column validators as
`from src.consts.consts import GEO_TYPES`.
"""

# Allowed WKT geometry prefixes. A geometry cell must start with one of these
# (case-insensitive) and parse into a Point or MultiPolygon (see
# WKTGeometryColumn).
GEO_TYPES = ["POINT", "MULTIPOLYGON"]

# Allowed values for the "Office Name" dropdown column. These are served to the
# UI via GET /schema-meta so the front-end dropdown stays in sync with the
# backend's notion of valid offices. Edit this list to change the offices.
OFFICE_NAMES = [
    "New York HQ",
    "London Office",
    "Tel Aviv R&D",
    "Berlin Sales",
    "Tokyo Branch",
]
