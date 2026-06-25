"""
email_service.py
----------------
Sends the phone-mapping report by email, with the validated data attached as an
Excel file.

Two modes:
  - REAL: if SMTP settings are provided via environment variables, the report is
    sent over SMTP.
  - SIMULATED (default): if SMTP is not configured, the message is logged and a
    success result is returned. This lets the whole UI flow be demonstrated end
    to end without needing mail credentials.

Configure real sending with these env vars:
    SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASSWORD,
    SMTP_FROM (defaults to SMTP_USER), SMTP_USE_TLS (default "true")
"""

import os
import smtplib
import logging
from email.message import EmailMessage
from typing import Optional

logger = logging.getLogger("email_service")

EXCEL_MIME = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)


def _smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER"))


def send_report(
    *,
    recipient: str,
    subject: str,
    body: str,
    attachment_bytes: bytes,
    attachment_name: str = "phone_mappings.xlsx",
) -> dict:
    """
    Send (or simulate sending) the report.
    Returns { "sent": bool, "simulated": bool, "detail": str }.
    """
    if not _smtp_configured():
        # Simulated mode — no SMTP credentials present.
        logger.info(
            "SIMULATED email to %s | subject=%r | attachment=%s (%d bytes)",
            recipient,
            subject,
            attachment_name,
            len(attachment_bytes),
        )
        return {
            "sent": True,
            "simulated": True,
            "detail": (
                f"Email to {recipient} was simulated (no SMTP configured). "
                "Set SMTP_* env vars to send real emails."
            ),
        }

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER"))
    msg["To"] = recipient
    msg.set_content(body or "Please find the phone mapping report attached.")
    msg.add_attachment(
        attachment_bytes,
        maintype="application",
        subtype=EXCEL_MIME.split("/", 1)[1],
        filename=attachment_name,
    )

    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD", "")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() != "false"

    with smtplib.SMTP(host, port) as server:
        if use_tls:
            server.starttls()
        server.login(user, password)
        server.send_message(msg)

    return {"sent": True, "simulated": False, "detail": f"Email sent to {recipient}."}
