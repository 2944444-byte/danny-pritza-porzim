"""
api/index.py
------------
Vercel Python Serverless Function entry point.

Vercel serves files under `/api` as serverless functions. This module exposes a
FastAPI ASGI `app` that Vercel runs automatically. We mount the *existing*
backend (in ../backend) under the `/api` prefix, so:

    browser  GET /api/schema-meta
      → vercel.json rewrite routes /api/* to this function
      → this app receives "/api/schema-meta"
      → mount("/api", backend_app) strips the prefix
      → backend serves "/schema-meta"

The backend source is bundled via `functions.includeFiles` in vercel.json, and
added to sys.path here so its `main` / `src.*` imports resolve at runtime.

No code is duplicated: the same backend that runs locally runs on Vercel.
"""

import os
import sys

# Make the sibling backend package importable (it lives at <root>/backend).
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi import FastAPI  # noqa: E402
from main import app as backend_app  # noqa: E402  (backend/main.py)

app = FastAPI()
# All API routes live under /api on the deployed origin.
app.mount("/api", backend_app)
