# Backend API Contract

## Canonical Roles

Canonical frontend and backend role values are:

- `OFFICE_USER`
- `SUPERVISOR`
- `ADMIN`

Legacy role names such as `OFFICE_SUPERVISOR` and `SYSTEM_ADMIN` are compatibility-only values and must not be produced by active frontend runtime data.

## Canonical Office Object

Canonical office values should normalize to:

```json
{
  "id": "office-legal",
  "name": "Legal Directorate",
  "code": "LEG",
  "status": "Active"
}
```

The frontend may receive office information from different backend shapes during migration, including:

- a full office object
- an office ID string
- an office name string
- snake_case office fields
- camelCase office fields

Frontend runtime state should normalize those shapes into the canonical office object above.

## Correspondence Identity

The backend uses:

- `id` for endpoint paths such as `GET /correspondence/{id}/`
- `reference_number` for the human-facing correspondence reference

The frontend must normalize correspondence runtime state so that:

```json
{
  "id": "5dbd08e7-79e0-4e2d-8de7-32e934e71856",
  "referenceNumber": "LEG-2026-0007"
}
```

Rules:

- `id` is the technical API identifier
- `referenceNumber` is the display identifier
- frontend routes may continue to use `referenceNumber`
- future API actions must use `id`
- the frontend must never submit `reference_number`, `status`, or `registered_by` in a create request

## Frontend API Transport Configuration

Frontend environment configuration:

- `VITE_DATA_SOURCE=mock`
- `VITE_API_RUNTIME_ENABLED=false`
- `VITE_API_BASE_URL=https://mrh-backend.onrender.com/api/`
- `VITE_API_TIMEOUT_MS=75000`

Rules:

- the default data source must remain `mock`
- API runtime must remain disabled by default
- supported data sources are `mock` and `api`
- invalid data-source values must fall back to `mock`
- API runtime activates only when both `VITE_DATA_SOURCE=api` and `VITE_API_RUNTIME_ENABLED=true`
- selecting `api` without the explicit runtime-enable flag must fail safely during service resolution
- the currently deployed frontend must continue using mock services
- API infrastructure may exist without being active yet
- no mixed data sources are permitted in one runtime
- no silent fallback from API services to mock services is permitted

## Domain Service Layer

Prepared frontend service domains:

- `auth`
- `offices`
- `users`
- `correspondence`
- `attachments`
- `notes`
- `dashboards`
- `reports`

Rules:

- each domain must expose a stable frontend service contract
- mock and API implementations may coexist, but only one full bundle may be active per runtime
- unsupported API methods must throw a controlled unsupported-operation error
- only documented endpoints may appear in API modules
- confidential administrator report comparison is not exposed through the frontend API capability registry

## JWT Session Foundation

Prepared frontend token strategy:

- access token: memory only
- refresh token: centralized `sessionStorage` storage
- no token storage in `localStorage`

Bearer header:

`Authorization: Bearer <access_token>`

Refresh behaviour:

- a `401` on an authenticated request may trigger one refresh attempt
- concurrent `401` responses must share one refresh request
- each original request may retry once at most
- login and refresh endpoints must not recursively trigger refresh
- definitive refresh failure must clear stored tokens

Temporary limitation:

- session persistence across browser restarts is not guaranteed
- secure long-lived persistence would require backend-managed HTTP-only cookies

## Manual Live Authentication Verification

Manual verification command:

```bash
npm run verify:live-auth
```

Required Node-only environment variables:

- `MRH_RUN_LIVE_API_TESTS=true`
- `MRH_LIVE_TEST_EMAIL`
- `MRH_LIVE_TEST_PASSWORD`
- `MRH_LIVE_API_BASE_URL=https://mrh-backend.onrender.com/api/`

Optional:

- `MRH_LIVE_API_TIMEOUT_MS=75000`
- `MRH_LIVE_TEST_REPORT_PATH=path-to-safe-report.json`

PowerShell example:

```powershell
$env:MRH_RUN_LIVE_API_TESTS="true"
$env:MRH_LIVE_TEST_EMAIL="test-user-email"
$env:MRH_LIVE_TEST_PASSWORD="test-user-password"
npm run verify:live-auth
```

Rules:

- use a dedicated non-production test user
- do not commit credentials
- do not print passwords or full tokens
- no report file is written unless `MRH_LIVE_TEST_REPORT_PATH` is set
- the normal application remains in mock mode
- frontend authentication is now resolved through the central service provider
- the Node script verifies reachability, auth contract, response shapes, token flow, and refresh flow
- the Node script does not prove browser CORS behaviour
- no destructive writes are performed
- no logout endpoint is assumed
- the live authentication contract was verified on July 27, 2026:
  - `POST auth/login/` returns `200` with `access`, `refresh`, and `user`
  - the verified role is `ADMIN`
  - the verified `ADMIN` office is `null`
  - `GET me/` returns `200`
  - `POST auth/refresh/` returns a replacement access token and replacement refresh token
  - browser CORS was verified for the local frontend origin on July 27, 2026
- the default runtime remains `VITE_DATA_SOURCE=mock` and `VITE_API_RUNTIME_ENABLED=false`
- API-authenticated sessions are intentionally blocked from mock-backed application pages until office and user-administration data integrations are completed
- the live administrator setup phase now exposes:
  - `listUsers`
  - `createOffice`
  - `createUser`
  - `regenerateUserPassword`
- complete office and user management remains incomplete
- no mock fallback is allowed in API mode
- generated passwords are one-time sensitive values and must not be persisted or redisplayed after dismissal

## Browser Authentication Verification Checklist

Browser verification completed on July 27, 2026. Verified browser expectations:

- the frontend origin is allowed by backend CORS policy
- `OPTIONS` preflight succeeds
- `POST auth/login/` with `application/json` succeeds from the browser
- the `Authorization` header is allowed
- credentials mode matches backend expectations
- error responses include the required CORS headers
- multipart upload CORS will be checked separately during attachment integration

## Live Administrator Setup Integration

The current API-only administrator setup route is `/api-admin-setup`.

Supported live administrator setup operations:

- list users
- create office
- create user
- regenerate user password

Current limitations:

- the default runtime remains `mock`
- API runtime remains disabled by default
- no documented office-update or office-delete endpoint exists
- no live mutation testing should be performed without separate approval
- `authenticatedApplicationReady` remains `false`

## GET `/api/users`

Required role: `ADMIN`

Documented frontend endpoint path:

`users/`

Accepted response envelopes:

1. A plain array of user records
2. A paginated object containing only:
   - `count`
   - `next`
   - `previous`
   - `results`

Safe user fields currently normalized by the frontend:

- `id`
- `first_name` or `firstName`
- `middle_name` or `middleName`
- `last_name` or `lastName`
- `display_name`, `displayName`, or `fullName`
- `email`
- `role`
- `office`, `office_id`, `officeId`, `office_name`, or `officeName`
- `account_status`, `accountStatus`, or `status`
- `last_login` or `lastLogin`
- `created_at` or `createdAt`

Frontend normalization rules:

- office identity must normalize into the canonical office object where directory data is available
- account status and last-login text must use backend values only
- unsupported top-level envelopes must fail with a controlled contract-mismatch error

## Read-Only Correspondence API Preparation

The supplied API guide documents these read endpoints:

- `GET /api/correspondence/`
- `GET /api/correspondence/{id}/`
- `GET /api/correspondence/{id}/movements/`
- `GET /api/correspondence/{id}/attachments/`
- `GET /api/correspondence/{id}/notes/`

Preparation status:

- read-only frontend preparation is complete for the five documented correspondence read endpoints
- live response-contract verification is still pending
- no live correspondence read was performed during this preparation task
- the default runtime remains `VITE_DATA_SOURCE=mock` and `VITE_API_RUNTIME_ENABLED=false`
- API correspondence pages remain blocked until the read contract and office scope are verified
- no correspondence mutation integration was added in this task
- notifications remain unavailable in correspondence API mode
- receipt acknowledgement remains undocumented for live correspondence API integration

Accepted provisional correspondence-list envelopes are intentionally limited to:

1. A plain array of correspondence records
2. A paginated object containing only the recognized top-level pagination fields:
   - `count`
   - `next`
   - `previous`
   - `results`

Unsupported envelopes must fail explicitly with a controlled contract-mismatch error.

These areas remain disabled until backend confirmation is received:

- correspondence list filters
- search parameters
- historical scope parameters such as current, received, forwarded, and handled
- unconfirmed pagination parameters beyond the accepted provisional envelope
- unconfirmed movement, attachment, and note field requirements

Prepared readiness state:

- correspondence list: prepared, not verified
- correspondence detail: prepared, not verified
- correspondence movements: prepared, not verified
- correspondence attachments list: prepared, not verified
- correspondence notes list: prepared, not verified
- authenticated application: still not ready

## POST `/api/correspondence`

Required role: office-based actor only. `ADMIN` must not submit office correspondence registration payloads.

Request body:

```json
{
  "type": "Contract",
  "subject": "Bridge assessment contract",
  "sender": "Central Registry",
  "priority": "High",
  "direction": "Incoming",
  "current_office": "office-legal",
  "current_stage": "Initial legal review",
  "deadline": "2026-07-30T00:00:00.000Z"
}
```

Backend-generated fields:

- `id`
- `reference_number`
- `status`
- `registered_by`
- `registered_at`
- `created_at`
- `updated_at`

Documented enum values:

- `type`: `Contract`, `Letter`, `Memo`, `Report`
- `priority`: `Normal`, `High`, `Urgent`
- `direction`: `Incoming`, `Internal`

## POST `/correspondence/{id}/attachments/`

Required upload format:

- `multipart/form-data`

Required multipart field:

- `file`

Approved frontend attachment policy:

- `PDF`
- `DOC`
- `DOCX`
- `JPG`
- `JPEG`
- `PNG`
- maximum file size: `10 MB`

Rules:

- the correspondence `id` belongs in the endpoint URL
- the multipart body must not append correspondence identity, office, status, or user metadata
- frontend validation is required for user experience
- backend validation is still required for security
- PDF and image files may be previewed in the frontend
- Word files should be downloaded or opened instead of embedded

## POST `/api/users`

Required role: `ADMIN`

Example URL:

`http://localhost:3000/api/users`

Request body:

```json
{
  "first_name": "Abena",
  "middle_name": "Akosua",
  "last_name": "Owusu",
  "role": "OFFICE_USER",
  "office": "office-legal",
  "phone_number": "0200000000"
}
```

The request must not include:

- `firstName`
- `middleName`
- `lastName`
- `officeId`
- `phoneNumber`
- `accountStatus`
- `temporaryPassword`
- `password`
- `email`
- `officeName`
- office email subdomain values
- generated usernames
- generated institutional email addresses

Rules:

- `first_name`, `last_name`, `role`, and `office` are the required backend request keys
- `middle_name` is optional and should be omitted when blank
- `phone_number` is optional and should be omitted when blank
- `accountStatus` must not be forwarded directly until the backend documents a supported write field for account activation state
- the frontend must not submit a password because the backend generates the credentials

Expected success response:

```json
{
  "user": {
    "id": "user-123",
    "firstName": "Abena",
    "middleName": "",
    "lastName": "Owusu",
    "displayName": "Abena Owusu",
    "email": "abena.owusu@legal.mrh.gov.gh",
    "role": "OFFICE_USER",
    "office": {
      "id": "office-legal",
      "name": "Legal Directorate",
      "code": "LEG",
      "status": "Active"
    },
    "accountStatus": "Active",
    "createdAt": "2026-07-19T17:00:00.000Z"
  }
}
```

Compatibility response still accepted during migration:

```json
{
  "user": {
    "id": "user-123",
    "firstName": "Abena",
    "middleName": "",
    "lastName": "Owusu",
    "displayName": "Abena Owusu",
    "email": "abena.owusu@legal.mrh.gov.gh",
    "role": "OFFICE_USER",
    "officeId": "office-legal",
    "officeName": "Legal Directorate",
    "accountStatus": "Active",
    "createdAt": "2026-07-19T17:00:00.000Z"
  },
  "auditEntry": {
    "id": "audit-user-created-001",
    "type": "Security",
    "title": "User Created",
    "description": "User account created for Abena Owusu in Legal Directorate.",
    "reference": "abena.owusu@legal.mrh.gov.gh",
    "user": "Esi Owusu",
    "office": "ICT Directorate",
    "role": "System Administrator",
    "time": "19 Jul 2026, 5:00 PM",
    "dateGroup": "Today"
  }
}
```

Common error responses:

- `400`: Invalid request payload or malformed field values
- `401`: Authentication required
- `403`: Administrator permission required
- `404`: Office or resource not found
- `409`: Email or account conflict
- `422`: Validation failure
- `500+`: Backend service failure

Backend responsibilities:

- authenticate the requester
- require `ADMIN`
- validate `office`
- ensure the office is active
- look up the stored office email subdomain
- normalise names into the institutional username
- generate the final institutional email
- enforce case-insensitive uniqueness with a database constraint
- hash the temporary password
- persist the user
- create the administrator audit event
- return the created user
- perform user creation and audit logging atomically

The frontend must not be trusted for these operations.

## Formal Reports Preparation

Frontend formal report preparation status:

- the Reports page exposes `Analytics` and `Formal Reports`
- Formal Reports remain confidential and `SUPERVISOR`-only
- formal report office scope must come from the authenticated supervisor office
- no office selector is permitted in the formal-report workspace
- supported frontend formal report types are:
  - Office Performance Report
  - Overdue Documents Report
  - Pending and Ageing Report
  - Staff Contribution Report
- formal report generation currently runs only against mock frontend records
- no live report API is activated
- no formal report history is persisted
- browser print is the current Save as PDF fallback
- `authenticatedApplicationReady` remains `false`

Important limitations:

- mock calculations for overdue, ageing, turnaround, completion rate, bottlenecks, and staff contribution are provisional only
- the backend reporting service must remain the final authority for formal report calculations and official report references
- the current preview reference is provisional and must not be treated as an official backend report ID
