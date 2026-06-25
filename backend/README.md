# Phone Mapping API (backend)

FastAPI service that validates phone-mapping data and serves the front-end.

This is the backend you provided, completed so it runs end to end: the missing
`TableSchemaManager` (`src/tables/table_handler.py`) and `GEO_TYPES`
(`src/consts/consts.py`) are reconstructed, the `/download-excel` and
`/send-email` endpoints are implemented, and the proprietary `pritza_cube_infra`
import was removed.

## Run it

```bash
cd backend
python -m venv .venv && source .venv/bin/activate    # optional
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs (Swagger UI): http://localhost:8000/docs

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET  | `/schema-meta` | Dropdown options (e.g. office names). |
| POST | `/validate-table` | Validate rows → `{ is_valid, errors:[{row,column,message}] }`. |
| POST | `/upload-excel` | Parse an uploaded `.xlsx` into rows. |
| GET  | `/download-template` | Blank template `.xlsx`. |
| POST | `/download-excel` | Export validated rows as `.xlsx` (re-validates first). |
| POST | `/send-email` | Email the report (re-validates first). |
| GET  | `/availability` | Current open/closed status + closed message. |
| GET  | `/admin/schedule` | The weekly availability schedule. |
| PUT  | `/admin/schedule` | Update the schedule (admin). |

## Availability schedule

A weekly schedule (`src/services/schedule_service.py`) decides when the site is
open. While closed, `/validate-table`, `/download-excel` and `/send-email`
return **403** with a (Hebrew) message. Days are keyed `"0"`..`"6"` (0 = Sunday
… 6 = Saturday); Saturday is closed by default. Time is evaluated in the
schedule's `timezone` (default `Asia/Jerusalem`). The schedule persists to
`backend/data/schedule.json` (override with `SCHEDULE_PATH`).

Set `ADMIN_TOKEN` to require the `X-Admin-Token` header on `PUT /admin/schedule`.

## Schema

Columns are declared in [`src/tables/table_handler.py`](src/tables/table_handler.py).
Their keys match the front-end (`../src/config/columns.js`):

| Key | Type | Rule |
| --- | --- | --- |
| `phone_number` | phone | digits only, ≥ 5 digits |
| `office_name` | dropdown | one of `OFFICE_NAMES` (see `src/consts/consts.py`) |
| `geographic_location` | WKT | starts with `POINT`/`MULTIPOLYGON`, valid WKT |
| `department_name` | text | non-empty |
| `importance` | integer | whole number |

## Email

`/send-email` runs in **simulated** mode by default (it logs and returns success)
so the UI flow works without mail credentials. To send real email, set:

```
SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_USE_TLS
```
