# Company Phone Mapping

A modular **React + TypeScript** (Vite) interface for mapping every phone in your
company and validating the data against your backend API before exporting or
emailing it.

**Frontend stack:** React Router (routing) · TanStack Query (server state +
centralized error→toast) · Zustand (client state: notifications, preferences) ·
Mantine (UI components, forms, modals, notifications, dates).

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
  If the file's **columns don't match** the schema, the upload is rejected with a
  clear message listing the expected columns. If the columns match but **values**
  are bad, the rows load and simply fail validation (red cells).
- **Add row / Delete row** – edit the table manually.
- **Download template** – get a correctly-formatted starter sheet (`/download-template`).
- **Validate data** – the backend checks every cell (`/validate-table`).
- **Red cells + hover tooltips** – invalid cells turn red after validation, and
  hovering shows the **exact error message returned by the API** to help fix them.
- **Download Excel / Send Email report** – both are **locked until validation
  passes**. Any edit re-locks them until you validate again.
- **Excel file title** – a title field on the main page names the downloaded
  `.xlsx` file and is sent with the email report (used as the default subject and
  the attachment filename). Non-ASCII titles (e.g. Hebrew) are supported.
- **Admin availability schedule** – an admin page (`#/admin`) controls which
  **days** and **hours** the site is reachable. Outside those times users get a
  closed page and validation is disabled (enforced server-side too).

## Admin: site availability schedule

Open `#/admin` (or click **⚙ Admin** in the header). For each weekday you set
*open?* + an open/close window; you can also set the timezone and the (Hebrew,
RTL) message users see while closed. Saturday is closed by default with the
message `אנחנו סגורים בשבת, נסו מאוחר יותר`.

- The schedule is owned by the backend and enforced there: `/validate-table`
  (and `/download-excel`, `/send-email`) return **403** with the closed message
  when the site is closed — so the rule holds even outside the UI.
- The frontend polls `GET /availability` and shows the closed page when shut.
  The admin page stays reachable while closed, so you can always re-open.
- **Office dropdown options:** the admin page also edits the list of offices
  (add/remove/rename). Saving updates the `Office Name` dropdown *and* what counts
  as a valid office during validation.
- **Locking the admin page:** set `ADMIN_TOKEN` on the backend; saving the
  schedule or offices then requires that token (entered once on the admin page).
  Without it, saving is open (handy for local/dev).

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
├── router.tsx                # centralized React Router (hash) route config
├── theme.ts                  # Mantine theme
├── api/
│   ├── client.ts            # fetch wrapper: base URL, JSON/blob, ApiError
│   └── phoneMappingApi.ts   # one function per backend endpoint
├── config/
│   ├── appConfig.ts         # API base URL + endpoint paths (env-driven)
│   └── columns.ts           # ★ single source of truth for the columns
├── layouts/
│   └── AvailabilityLayout.tsx # schedule gate (Outlet) for the home route
├── pages/
│   ├── HomePage.tsx          # main phone-mapping page
│   └── AdminPage.tsx         # availability schedule + offices editor
├── hooks/
│   ├── queries.ts            # TanStack Query hooks (schema/availability/…)
│   └── usePhoneTable.ts      # ★ table state + validation state machine
├── lib/
│   ├── queryClient.ts        # QueryClient + centralized error→toast + query keys
│   └── notify.ts             # Mantine-notifications adapter
├── stores/
│   ├── notificationStore.ts  # (Zustand) — retired in the Mantine step
│   └── preferencesStore.ts   # (Zustand) persisted prefs: admin token
├── utils/
│   ├── validationAdapter.ts  # normalizes /validate-table responses → cell errors
│   ├── uploadNormalizer.ts   # header→column mapping + column-mismatch check
│   ├── rowFactory.ts         # create/shape rows; strip UI-only fields for payloads
│   ├── filename.ts           # sheet title → safe .xlsx filename
│   └── download.ts           # browser "Save As" for blobs
├── components/
│   ├── Toolbar.tsx           # Mantine buttons; export gated by canExport
│   ├── DataGrid.tsx          # Mantine Table
│   ├── EditableCell.tsx      # Select/TextInput + red error + hover Tooltip
│   ├── StatusBanner.tsx      # Mantine Alert
│   └── EmailDialog.tsx       # Mantine Modal + useForm
├── vite-env.d.ts             # typings for import.meta.env
└── main.tsx                  # entry: Query · Mantine · Modals · Notifications · Router
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

- **Layered stack.** Routing (React Router) · server state + centralized
  error→toast (TanStack Query) · client state (Zustand: preferences) · UI
  (Mantine components/forms/modals/notifications/dates). Transport (`api/`),
  business rules (`hooks/`), pure helpers (`utils/`) and presentation
  (`components/`) stay isolated.
- **Validate-before-export** is enforced in one place (`usePhoneTable.canExport`)
  and again on the backend.
- **Red cells + tooltips.** Invalid cells get a Mantine `error` border and a
  hover `Tooltip` carrying the backend's exact message. Integer cells use a text
  input so bad values (e.g. `abc`) persist and fail validation instead of being
  silently coerced.
- **Stable row identity.** Rows carry an internal `_id` (stripped before any API
  call) so deleting/reordering can never paint the wrong cell red.
```
