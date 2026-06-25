# Company Phone Mapping

A modular **React + TypeScript** (Vite) interface for mapping every phone in your
company and validating the data against your backend API before exporting or
emailing it.

For each phone number you record:

| Field | Type | Notes |
| --- | --- | --- |
| **Phone Number** | digits | At least 5 digits (backend rule). |
| **Office Name** | dropdown | Options come from the backend `/schema-meta`. |
| **Geographic Location (WKT)** | WKT | e.g. `POINT (12.12 13.13)` or a `MULTIPOLYGON`. |
| **Department Name** | text | Free text. |
| **Importance** | integer | Whole number. |

## Features

- **Upload Excel** – parse an `.xlsx`/`.xls` file into the grid (`/upload-excel`).
- **Add row / Delete row** – edit the table manually.
- **Download template** – get a correctly-formatted starter sheet (`/download-template`).
- **Validate data** – the backend checks every cell (`/validate-table`).
- **Red cells + hover tooltips** – invalid cells turn red after validation, and
  hovering shows the **exact error message returned by the API** to help fix them.
- **Download Excel / Send Email report** – both are **locked until validation
  passes**. Any edit re-locks them until you validate again.

## The core rule: validate before export

The data must pass validation before it can be downloaded or emailed. This is
enforced centrally in [`src/hooks/usePhoneTable.ts`](src/hooks/usePhoneTable.ts):

- Validation status is one of `unvalidated → validating → valid | invalid`.
- **Any** change (edit a cell, add/delete a row, upload a file) resets the status
  to `unvalidated`, disabling export until the user re-validates.
- Export actions also re-check the status defensively before calling the API.

## Run the full stack (frontend + backend)

The backend lives in [`backend/`](backend) (FastAPI). The quickest way to run
both together:

```bash
./run-dev.sh          # backend on :8000, frontend on :5173
```

…or run them in two terminals (see [`backend/README.md`](backend/README.md) for
backend details). The frontend defaults to `http://localhost:8000`, so no extra
config is needed locally.

## Getting started (frontend only)

```bash
# 1. Install dependencies
npm install

# 2. Point the app at your backend
cp .env.example .env
#   then edit VITE_API_BASE_URL (default: http://localhost:8000)

# 3. Run the dev server
npm run dev        # http://localhost:5173

# Production build
npm run build
npm run preview
```

The FastAPI backend already enables permissive CORS (`allow_origins=["*"]`), so
the dev server can talk to it directly.

## Project structure

```
src/
├── types.ts                  # shared, app-wide TypeScript types
├── api/
│   ├── client.ts            # fetch wrapper: base URL, JSON/blob, ApiError
│   └── phoneMappingApi.ts   # one function per backend endpoint
├── config/
│   ├── appConfig.ts         # API base URL + endpoint paths (env-driven)
│   └── columns.ts           # ★ single source of truth for the columns
├── hooks/
│   ├── useSchemaMeta.ts      # loads dropdown options from /schema-meta
│   ├── useToasts.ts          # transient-notification state
│   └── usePhoneTable.ts      # ★ table state + validation state machine
├── utils/
│   ├── validationAdapter.ts  # normalizes /validate-table responses → cell errors
│   ├── uploadNormalizer.ts   # maps uploaded headers onto canonical column keys
│   ├── rowFactory.ts         # create/shape rows; strip UI-only fields for payloads
│   └── download.ts           # browser "Save As" for blobs
├── components/
│   ├── Toolbar.tsx           # all actions; export buttons gated by canExport
│   ├── DataGrid.tsx          # the editable table
│   ├── EditableCell.tsx      # per-type editor + red state + tooltip
│   ├── StatusBanner.tsx      # plain-language validation status
│   ├── EmailDialog.tsx       # recipient/subject/message modal
│   └── Toast.tsx             # presentational toast stack
├── styles/global.css         # design tokens + all styling
├── vite-env.d.ts             # typings for import.meta.env
├── App.tsx                   # composition root (wires hooks ↔ components)
└── main.tsx                  # React entry point
```

★ = the two files you will most often edit. Shared data types live in
`src/types.ts`.

### Type-checking

```bash
npm run typecheck   # tsc --noEmit (also runs as part of `npm run build`)
```

## Adapting to your backend

This project was built against the provided backend. Two backend modules
(`table_handler.py` / `consts.py`) were not included, so the app is deliberately
tolerant about exact response shapes. Adjust these spots if needed:

1. **Column keys** — [`src/config/columns.ts`](src/config/columns.ts). Each
   column's `key` must equal the backend JSON key (`BaseColumn.name`). If your
   backend uses, say, `geographic_location_(wkt)`, change the `key` there and the
   whole app follows. `aliases` already maps common uploaded-header variants.

2. **Endpoint paths** — [`src/config/appConfig.ts`](src/config/appConfig.ts).
   `downloadExcel` (`POST /download-excel`) and `sendEmail` (`POST /send-email`)
   correspond to the backend's download/email functions; rename here if yours
   differ.

3. **Validation response shape** —
   [`src/utils/validationAdapter.ts`](src/utils/validationAdapter.ts) already
   handles the common shapes (list of `{row, column, message}` errors, per-row
   maps, index-keyed objects, or a simple validity flag). If your
   `/validate-table` returns something else, extend `normalizeValidation` there —
   it's the single place that interprets the response.

### Expected request/response contracts

| Endpoint | Request | Response (consumed as) |
| --- | --- | --- |
| `GET /schema-meta` | – | `{ "office_name": ["HQ", …], … }` |
| `POST /validate-table` | `[{ phone_number, office_name, … }]` | per-cell errors (see adapter) |
| `POST /upload-excel` | multipart `file` | `{ "data": [ {row}, … ] }` |
| `GET /download-template` | – | `.xlsx` blob |
| `POST /download-excel` | `[{row}, …]` | `.xlsx` blob |
| `POST /send-email` | `{ recipient, data:[…], subject, message }` | any 2xx = success |

## Design notes

- **No grid library.** A small custom table keeps the red-cell + tooltip behavior
  and the validation gating fully under our control, with zero heavy deps
  (React + Vite only).
- **Separation of concerns.** Transport (`api/`), business rules (`hooks/`),
  pure helpers (`utils/`) and presentation (`components/`) are isolated, so each
  is easy to change or test independently.
- **Stable row identity.** Rows carry an internal `_id` (stripped before any API
  call) so deleting/reordering can never paint the wrong cell red.
```
