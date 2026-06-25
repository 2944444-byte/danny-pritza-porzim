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
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.tables.table_handler import TableSchemaManager
from src.services.excel_service import build_workbook_bytes
from src.services.email_service import send_report, EXCEL_MIME

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


# --- API Endpoints ------------------------------------------------------------


@app.get("/schema-meta")
def get_schema_meta():
    """Returns dropdown configurations to UI."""
    return schema_manager.get_dropdown_options()


@app.post("/validate-table")
def validate_table(table_data: List[Dict[str, Any]]):
    return schema_manager.validate_table(table_data)


@app.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Invalid file type.")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        # Clean columns to match keys
        df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]
        df = df.fillna("")

        return {"data": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parsing error: {str(e)}")


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
def download_excel(table_data: List[Dict[str, Any]]):
    """
    Export the rows as an .xlsx file. Re-validates server-side and refuses to
    export invalid data, mirroring the UI's "validate before export" rule.
    """
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
        headers={"Content-Disposition": "attachment; filename=phone_mappings.xlsx"},
    )


@app.post("/send-email")
def send_email(req: EmailRequest):
    """
    Email the validated rows as an .xlsx report. Re-validates server-side first.
    """
    result = schema_manager.validate_table(req.data)
    if not result["is_valid"]:
        raise HTTPException(
            status_code=422,
            detail="Data is invalid; fix all errors before sending.",
        )

    attachment = build_workbook_bytes(req.data, schema_manager)
    outcome = send_report(
        recipient=req.recipient,
        subject=req.subject or "Phone Mapping Report",
        body=req.message or "",
        attachment_bytes=attachment,
        attachment_name="phone_mappings.xlsx",
    )
    return outcome


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
