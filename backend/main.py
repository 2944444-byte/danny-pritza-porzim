"""
main.py
-------
FastAPI application exposing the phone-mapping validation API.

Endpoints
  GET  /schema-meta       -> dropdown options for the UI
  POST /validate-table    -> per-cell validation errors
  POST /upload-excel      -> parse an uploaded .xlsx into rows
  GET  /download-template -> a blank, correctly-formatted template
  POST /download-excel    -> export the (validated) rows as .xlsx
  POST /send-email        -> email the (validated) rows as an .xlsx report

This is the file you provided, with three fixes so it actually runs:
  1. Removed the proprietary `import pritza_cube_infra` (not needed here).
  2. Implemented the previously-commented download/email endpoints.
  3. Fixed the `__main__` runner (`import uvicorn`).
"""

import io
from typing import Any, Dict, List

import openpyxl
from fastapi import FastAPI, File, Header, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from urllib.parse import quote

from src.tables.table_handler import TableSchemaManager
from src.services.excel_service import build_workbook_bytes, read_sheet, safe_filename
from src.services.email_service import send_report, EXCEL_MIME
from src.services import schedule_service
from src.services import offices_service


def _attachment_disposition(filename: str) -> str:
    """Content-Disposition that survives non-ASCII (e.g. Hebrew) filenames."""
    return f"attachment; filename*=UTF-8''{quote(filename)}"

app = FastAPI(title="Phone Mapping API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate Schema Manager
schema_manager = TableSchemaManager()


# --- Request models -----------------------------------------------------------


class EmailRequest(BaseModel):
    recipient: str
    data: List[Dict[str, Any]]
    subject: str | None = "Phone Mapping Report"
    message: str | None = ""
    # User-supplied sheet title → names the attachment (and the sheet tab).
    title: str | None = None


class DaySchedule(BaseModel):
    enabled: bool
    open: str
    close: str

    @field_validator("open", "close")
    @classmethod
    def _valid_time(cls, v: str) -> str:
        try:
            hours, minutes = v.split(":")
            assert 0 <= int(hours) <= 23 and 0 <= int(minutes) <= 59
        except Exception:
            raise ValueError("Time must be in HH:MM (24h) format.")
        return v


class ScheduleUpdate(BaseModel):
    timezone: str = "Asia/Jerusalem"
    closed_message: str
    days: Dict[str, DaySchedule]

    @field_validator("days")
    @classmethod
    def _seven_days(cls, days: Dict[str, "DaySchedule"]) -> Dict[str, "DaySchedule"]:
        missing = [str(i) for i in range(7) if str(i) not in days]
        if missing:
            raise ValueError(f"Schedule must define all days 0-6; missing {missing}.")
        return days


class OfficesUpdate(BaseModel):
    offices: List[str]


def require_admin(x_admin_token: str | None) -> None:
    """Enforce the admin token on write endpoints when one is configured."""
    if schedule_service.ADMIN_TOKEN and x_admin_token != schedule_service.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token.")


# --- Availability gate --------------------------------------------------------


def ensure_open() -> None:
    """Raise 403 with a (Hebrew) message when the site is currently closed."""
    status = schedule_service.evaluate()
    if not status["open"]:
        raise HTTPException(status_code=403, detail=status["message"])


# --- API Endpoints ------------------------------------------------------------


@app.get("/availability")
def get_availability():
    """Current open/closed status + the message to show when closed."""
    return schedule_service.evaluate()


@app.get("/admin/schedule")
def get_schedule():
    """Return the full weekly schedule (for the admin page)."""
    return schedule_service.load_schedule()


@app.put("/admin/schedule")
def update_schedule(schedule: ScheduleUpdate, x_admin_token: str | None = Header(default=None)):
    """
    Replace the weekly schedule. If an ADMIN_TOKEN is configured on the server,
    the matching `X-Admin-Token` header is required.
    """
    require_admin(x_admin_token)
    saved = schedule_service.save_schedule(schedule.model_dump())
    return saved


@app.get("/admin/offices")
def get_offices():
    """Return the admin-editable list of valid office names."""
    return {"offices": offices_service.load_offices()}


@app.put("/admin/offices")
def update_offices(payload: OfficesUpdate, x_admin_token: str | None = Header(default=None)):
    """Replace the offices dropdown list (admin)."""
    require_admin(x_admin_token)
    return {"offices": offices_service.save_offices(payload.offices)}


@app.get("/schema-meta")
def get_schema_meta():
    """Returns dropdown configurations to UI."""
    return schema_manager.get_dropdown_options()


@app.post("/validate-table")
def validate_table(table_data: List[Dict[str, Any]]):
    # Validation (and therefore export/email) is only available while the site
    # is open per the admin schedule.
    ensure_open()
    return schema_manager.validate_table(table_data)


@app.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Invalid file type.")

    try:
        contents = await file.read()
        headers, records = read_sheet(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parsing error: {str(e)}")

    def clean(key: str) -> str:
        return str(key).strip().lower().replace(" ", "_")

    # Clean header keys to match canonical column keys (same rule the
    # template/headers follow): lowercase, trimmed, spaces → underscores.
    # `columns` is returned so the UI can flag column-name mismatches even when
    # the sheet has no data rows.
    return {
        "columns": [clean(h) for h in headers],
        "data": [{clean(k): v for k, v in record.items()} for record in records],
    }


@app.get("/download-template")
async def download_template():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Phone Mappings"

    # Headers
    headers = [
        "Phone Number",
        "Office Name",
        "Geographic Location (WKT)",
        "Department Name",
        "Importance",
    ]
    ws.append(headers)

    # One example row
    example = ["123456", "New York HQ", "POINT (12.12 13.13)", "HR", 5]
    ws.append(example)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type=EXCEL_MIME,
        headers={
            "Content-Disposition": "attachment; filename=phone_mapping_template.xlsx"
        },
    )


@app.post("/download-excel")
def download_excel(table_data: List[Dict[str, Any]], title: str | None = None):
    """
    Export the rows as an .xlsx file. Re-validates server-side and refuses to
    export invalid data, mirroring the UI's "validate before export" rule.

    `title` (query param) sets the download filename for the whole .xlsx file.
    """
    ensure_open()
    result = schema_manager.validate_table(table_data)
    if not result["is_valid"]:
        raise HTTPException(
            status_code=422,
            detail="Data is invalid; fix all errors before downloading.",
        )

    content = build_workbook_bytes(table_data, schema_manager)
    return Response(
        content=content,
        media_type=EXCEL_MIME,
        headers={"Content-Disposition": _attachment_disposition(safe_filename(title))},
    )


@app.post("/send-email")
def send_email(req: EmailRequest):
    """
    Email the validated rows as an .xlsx report. Re-validates server-side first.
    """
    ensure_open()
    result = schema_manager.validate_table(req.data)
    if not result["is_valid"]:
        raise HTTPException(
            status_code=422,
            detail="Data is invalid; fix all errors before sending.",
        )

    attachment = build_workbook_bytes(req.data, schema_manager)
    subject = req.subject or (req.title.strip() if req.title and req.title.strip() else "Phone Mapping Report")
    outcome = send_report(
        recipient=req.recipient,
        subject=subject,
        body=req.message or "",
        attachment_bytes=attachment,
        attachment_name=safe_filename(req.title),
    )
    return outcome


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
