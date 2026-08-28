# AGENTS.md

## Permanent Project Rules

- Use React with JavaScript and Vite.
- Use functional components and hooks.
- Use `react-router-dom` for routing.
- Use plain CSS organised under `src/styles`.
- Keep components reusable and reasonably small.
- Use semantic HTML and accessible labels.
- Do not commit or push unless explicitly instructed.
- Run `npm run lint` and `npm run build` after meaningful changes.

## Backend and Integration Rules

- The backend has already been deployed separately.
- The backend source code is not present in this frontend repository.
- Do not create Django, Python, database, migration, serializer, model, or other backend files in this repository.
- Do not attempt to modify the deployed backend from this repository.
- Do not replace the current mock-data implementation until the API integration phase is explicitly started.
- Frontend preparation work may introduce reusable constants, normalizers, adapters, permission utilities, and service interfaces without making live API requests.
- Do not add live API requests unless the task explicitly starts backend integration.
- Do not hardcode the deployed API URL directly inside page components.
- When API integration begins, use a centralized configuration and service layer.
- Preserve current mock logins and mock workflows until their corresponding API integrations have been verified.

## API Transport Foundation

- `VITE_DATA_SOURCE` must default to `mock`.
- `VITE_API_RUNTIME_ENABLED` must default to `false`.
- Supported data sources are `mock` and `api`.
- Current runtime behaviour must remain mock until explicit integration work begins.
- API runtime may activate only when both `VITE_DATA_SOURCE=api` and `VITE_API_RUNTIME_ENABLED=true`.
- If API source is selected without the runtime-enable flag, service resolution must fail safely instead of partially activating.
- Reusable API infrastructure may exist in the codebase without being activated by the current UI.
- The configured backend base URL must come from centralized environment config, not page components.
- The default backend base URL is `https://mrh-backend.onrender.com/api/`.
- The default request timeout is `75000` milliseconds.
- The frontend may prepare bearer-token transport, but it must not automatically call the backend during normal mock use.
- The current application must continue using mock services even when API infrastructure exists.
- No silent fallback from API services to mock services is permitted.
- No mixed data-source runtime is permitted.
- The deployed authentication contract was verified on July 27, 2026:
  - `POST auth/login/` returns `200` with `access`, `refresh`, and `user`.
  - The verified live role is `ADMIN`.
  - The verified live `ADMIN` office is `null`.
  - `GET me/` returns `200`.
  - `POST auth/refresh/` rotates both the access token and the refresh token.
  - Browser CORS was verified for the local frontend origin on July 27, 2026.
- The current API-mode administrator setup phase exposes only:
  - `createOffice`
  - `createUser`
  - `regenerateUserPassword`
- Read-only correspondence API preparation exists for:
  - `GET /api/correspondence/`
  - `GET /api/correspondence/{id}/`
  - `GET /api/correspondence/{id}/movements/`
  - `GET /api/correspondence/{id}/attachments/`
  - `GET /api/correspondence/{id}/notes/`
- Correspondence read preparation does not mean live correspondence API integration is complete.
- Accepted provisional list envelopes are limited to:
  - a plain array of correspondence records;
  - a paginated object with `count`, `next`, `previous`, and `results`.
- Unsupported correspondence response envelopes must fail explicitly with a controlled contract error.
- Correspondence list filters, search parameters, and historical scope parameters remain disabled until the backend confirms them.
- Historical current/received/forwarded/handled API scopes remain unverified and must not be guessed.
- Correspondence API pages remain blocked in API mode until the read contract and office scope are verified.
- Notifications remain unavailable in correspondence API mode.
- Receipt acknowledgement remains undocumented for live correspondence API integration.
- Complete office and user management remains incomplete in API mode.
- API-authenticated sessions must not enter mock-backed application pages until office and user-administration domain integration is complete.

## JWT Session Strategy

- Access tokens must be stored in memory only.
- Refresh tokens may be stored temporarily in `sessionStorage` through one centralized token store.
- Do not store access tokens in `localStorage`.
- Do not store refresh tokens in `localStorage`.
- Do not store passwords anywhere after submission.
- Session refresh must use a single-flight coordinator so concurrent `401` responses trigger only one refresh request.
- Authenticated requests may retry once after a successful refresh.
- Do not retry authentication requests recursively.
- Clearing tokens on definitive authentication failure is required.
- `sessionStorage` is a temporary frontend compromise and is not equivalent to secure HTTP-only cookie storage.

## HTTP Request Rules

- Use one shared HTTP abstraction based on the native `fetch` API.
- Relative API paths must resolve safely against the configured API base URL.
- JSON requests must set `Content-Type: application/json` only when appropriate.
- `FormData` must be passed through without manually setting `Content-Type`.
- The future attachment upload field name remains exactly `file`.
- Authorization headers must use the bearer-token format: `Authorization: Bearer <access_token>`.
- Do not log tokens, passwords, or Authorization headers.
- Do not place tokens in URLs.

## Domain Service Layer

- Use explicit domain service contracts for `auth`, `offices`, `users`, `correspondence`, `attachments`, `notes`, `dashboards`, and `reports`.
- Mock implementations and dormant API implementations may coexist, but one runtime must use only one bundle at a time.
- API capabilities must be documented centrally and only documented endpoints may be prepared.
- If an API method has no approved backend endpoint, it must throw a controlled unsupported-operation error.
- Do not guess undocumented endpoints.
- Confidential administrator report comparison must not be exposed through the frontend API capability registry.

## Manual Live Authentication Verification

- The normal application runtime must remain in mock mode during live authentication verification work.
- `AuthContext` may resolve authentication through the centralized service provider, but the default application runtime must remain mock unless API mode is explicitly enabled.
- Manual live authentication checks must run only through `npm run verify:live-auth`.
- The command must refuse to run unless `MRH_RUN_LIVE_API_TESTS=true` and dedicated test credentials are supplied through Node-only environment variables.
- Do not use `VITE_`-prefixed variables for live test credentials.
- Do not hardcode or commit credentials.
- Do not print passwords, full access tokens, or full refresh tokens.
- Node-based verification does not prove browser CORS behaviour.
- Client-side token clearing is the only cleanup currently available because no logout endpoint is documented.

## Correspondence Ownership Model

- Do not assign correspondence ownership to individual employees.
- Correspondence is owned by offices.
- Correspondence is routed between offices, not between individual employees.
- Individual users perform actions on behalf of their assigned office.
- Individual users may be recorded in audit history as the person who performed an action.
- Recording the acting user does not mean the correspondence is assigned to that user.
- Do not introduce fields, labels, filters, reports, or workflows based on:
  - assigned employee;
  - individual correspondence owner;
  - personal open workload;
  - personal overdue workload.
- Office and correspondence identity comparisons should use stable IDs where available.
- Office names may be used only as a legacy display or fallback value, not as the preferred authorization key.

## Correspondence Identity Model

The canonical frontend correspondence shape must keep these identity fields separate:

```js
{
  id: string | null,
  referenceNumber: string,
  type: string,
  subject: string,
  sender: string,
  priority: string,
  direction: string,
  status: string,
  currentStage: string,
  currentOffice: {
    id: string | null,
    name: string,
    code: string | null,
    status: string | null,
  } | null,
  registeredBy: {
    id: string | null,
    fullName: string,
    role: string | null,
    office: object | null,
  } | null,
  registeredAt: string | null,
  deadline: string | null,
  createdAt: string | null,
  updatedAt: string | null
}
```

- `id` is the API identifier and must be used for future backend action endpoints.
- `referenceNumber` is the human-facing identifier and must be used for headings, tables, cards, notifications, and routes.
- `id` and `referenceNumber` must never be treated as interchangeable values.
- Frontend routes may continue to use `referenceNumber`, but any future API operation must use `id`.
- Backend-generated values such as `reference_number`, `status`, and `registered_by` must not be submitted in create payloads.
- Legacy fields such as `reference` and `reference_number` may appear only inside normalizers, adapters, compatibility shims, and tests.

## Attachment Policy

Approved frontend attachment types are:

- `PDF`
- `DOC`
- `DOCX`
- `JPG`
- `JPEG`
- `PNG`

Attachment rules:

- the maximum file size is `10 MB`
- frontend validation is required for user experience
- backend validation is still required for security
- PDF and image files may be previewed in the frontend
- Word files should be opened or downloaded instead of embedded
- future uploads must use `multipart/form-data`
- the multipart field name must be exactly `file`
- the correspondence `id` belongs in the future endpoint URL, not inside the multipart body

Do not scatter attachment MIME types, file-size limits, or extension rules across page components.

## Canonical Roles

The only canonical frontend and backend role values are:

- `OFFICE_USER`
- `SUPERVISOR`
- `ADMIN`

Do not introduce the legacy role values below into active application data or new runtime logic:

- `OFFICE_SUPERVISOR`
- `SYSTEM_ADMIN`

Legacy role names may appear only in:

- the temporary compatibility normalizer;
- migration tests;
- historical documentation that has not yet been updated.

User-facing labels must remain professional:

- `OFFICE_USER` -> **Office User**
- `SUPERVISOR` -> **Office Supervisor**
- `ADMIN` -> **System Administrator**

Technical role values must not be displayed directly in the interface.

## Role Permissions

### OFFICE_USER

`OFFICE_USER` may:

- access the normal office dashboard;
- view correspondence available to the assigned office;
- register correspondence for the assigned office;
- perform permitted correspondence workflow actions on behalf of the assigned office;
- view account and office information;
- update harmless personal preferences.

`OFFICE_USER` must not:

- access Office Reports;
- access the Administrator Dashboard;
- manage users or offices;
- access the System Audit Log;
- change their role, office assignment, account status, or generated institutional email.

### SUPERVISOR

`SUPERVISOR` may:

- access all permitted office correspondence functions;
- register correspondence for the assigned office;
- perform permitted correspondence workflow actions on behalf of the assigned office;
- access confidential reports for the assigned office only.

`SUPERVISOR` must not:

- view reports for another office;
- select another office on the reports page;
- access the Administrator Dashboard;
- manage users or offices unless that capability is explicitly implemented and approved later;
- access the System Audit Log.

### ADMIN

`ADMIN` may:

- access the Administrator Dashboard;
- manage users;
- manage offices;
- manage roles;
- manage office assignments;
- manage account status;
- reset or regenerate user passwords;
- access the System Audit Log;
- view permitted system-wide correspondence oversight information.

`ADMIN` must not:

- access confidential Office Reports;
- view confidential staff-contribution or office-performance report contents;
- register correspondence on behalf of an office;
- forward correspondence on behalf of an office;
- acknowledge correspondence on behalf of an office;
- update correspondence stages on behalf of an office;
- complete or file correspondence on behalf of an office;
- perform other office workflow actions.

Administrative access does not imply authority to act for an office.

## Permission Implementation

- Centralize role and permission rules.
- Prefer shared permission helpers over direct role comparisons inside page components.
- Components should use helpers such as:
  - `canAccessOfficeReports`
  - `canManageUsersAndOffices`
  - `canViewSystemAudit`
  - `canRegisterCorrespondence`
  - `canPerformOfficeWorkflow`
- Unknown, missing, or unsupported roles must be denied privileged access by default.
- Frontend route guards and hidden controls are user-interface safeguards.
- Backend authorization must remain the final security authority once integration begins.

## Office Reports

- Office Reports are confidential.
- Only `SUPERVISOR` may access Office Reports.
- A supervisor may access reports only for their assigned office.
- Report office scope must come from the authenticated supervisor's office.
- Do not add an office selector to the supervisor report page.
- Do not accept a selectable office parameter as the source of report authorization.
- `OFFICE_USER` must receive Access Denied when attempting to access reports.
- `ADMIN` must receive Access Denied when attempting to access confidential Office Reports.
- Staff Contribution reporting must measure actions performed on behalf of the office.
- Staff Contribution must not imply individual correspondence ownership or personal overdue responsibility.
- The Reports page exposes:
  - `Analytics`
  - `Formal Reports`
- Formal Reports frontend preparation is mock-only at this stage.
- Supported formal report types are:
  - Office Performance Report
  - Overdue Documents Report
  - Pending and Ageing Report
  - Staff Contribution Report
- Formal report office identity must always be derived from the authenticated supervisor.
- Formal report calculations remain provisional in mock mode and must not be treated as authoritative backend rules.
- The backend reporting service must become authoritative for overdue, ageing, turnaround, completion, bottleneck, and staff-contribution calculations.
- No formal report history is persisted in `localStorage` or `sessionStorage`.
- Browser print is the current Save as PDF fallback until a backend-backed report export contract is approved.
- Live formal report API integration remains incomplete even though the frontend workspace is prepared.

## Office Data Model

The canonical frontend office shape is:

```js
{
  id: string | null,
  name: string,
  code: string | null,
  status: string | null
}
```

- Normalize office values at service, adapter, and context boundaries before they enter runtime state.
- Runtime office identity must use canonical office objects instead of raw office strings.
- Use shared office helpers for lookup, display labels, and office identity comparison.
- Missing office IDs and codes must be represented as `null`, not empty strings.
- Legacy office shapes may remain only in focused normalizers, adapters, and tests.
