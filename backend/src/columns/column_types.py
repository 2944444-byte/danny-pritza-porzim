"""
column_types.py
---------------
Concrete column validators (dropdown, integer, phone, text, WKT geometry).

(This is the file you provided, unchanged except for its module location.)
"""

from typing import Any, List, Optional

from .base_column import BaseColumn
from shapely.wkt import loads as load_wkt
from src.consts.consts import GEO_TYPES


class DropdownColumn(BaseColumn):
    def __init__(self, name: str, display_name: str, allowed_values: List[str], **kwargs):
        super().__init__(name, display_name, **kwargs)
        self.allowed_values = allowed_values

    def validate(self, value: Any) -> Optional[str]:
        base_error = super().validate(value)
        if base_error:
            return base_error

        val_str = str(value).strip()
        if val_str not in self.allowed_values:
            return "Must be one of the allowed options."
        return None


class IntegerColumn(BaseColumn):
    def validate(self, value: Any) -> Optional[str]:
        base_error = super().validate(value)
        if base_error:
            return base_error

        try:
            int(value)
        except (ValueError, TypeError):
            return "Must be a valid whole number."
        return None


class PhoneColumn(BaseColumn):
    def validate(self, value: Any) -> Optional[str]:
        base_error = super().validate(value)
        if base_error:
            return base_error

        val_str = str(value).strip()
        if not val_str.isdigit():
            return "Phone number must contain only numbers."
        if len(val_str) < 5:
            return "Phone number must be at least 5 digits long."
        return None


class TextColumn(BaseColumn):
    def validate(self, value: Any) -> Optional[str]:
        return super().validate(value)


class WKTGeometryColumn(BaseColumn):
    def validate(self, value: Any) -> Optional[str]:
        base_error = super().validate(value)
        if base_error:
            return base_error

        val_str = str(value).strip().upper()
        if not any(val_str.startswith(geom) for geom in GEO_TYPES):
            return f"Geometry must start with {' or '.join(GEO_TYPES)}."
        try:
            geom = load_wkt(val_str)
            if geom.geom_type not in ["Point", "MultiPolygon"]:
                return "Must be a valid WKT"
        except Exception:
            return "Invalid WKT geometry syntax (e.g., matching parentheses or coordinates)."
        return None
