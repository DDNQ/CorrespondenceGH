# MRH Frontend Design Reference

The canonical approved complete prototype path is `design-reference/mrh-complete-prototype.html`.

The file `design-reference/mrh-complete-prototype.html` contains the approved interface prototype for the Ministry of Roads and Highways Correspondence Management & Tracking System.

The prototype is a visual and workflow reference only.

## Implementation rules

- Implement all production screens in React with JavaScript.
- Do not embed, import, iframe, or directly reuse the prototype HTML.
- Do not copy the prototype JavaScript state-management approach.
- Recreate the relevant screen using reusable React components.
- Preserve the approved labels, information hierarchy, workflow, spacing, and visual style.
- The current React authentication, canonical roles (`OFFICE_USER`, `SUPERVISOR`, and `ADMIN`), centralized permissions, and role-based routing remain the source of truth.
- Screenshots under `screenshots/` are the visual source of truth when available.
- The complete HTML prototype is the workflow and content reference when a screenshot is unavailable.
- The prototype must be recreated in React and must never be embedded, imported, or loaded through an iframe.

## Screen reference map

| React screen | Prototype reference |
|---|---|
| `/login` | Login |
| `/dashboard` | Office Dashboard |
| `/correspondence` | All Correspondence |
| `/correspondence/new` | Register New Correspondence |
| `/correspondence/:reference` | Correspondence Detail |
| `/notifications` | Notifications |
| `/settings` | Account & Preferences |
| `/reports` | Office Reports |
| `/admin/dashboard` | Administrator Dashboard |
| `/admin/users-offices` | Users & Offices |
| `/admin/audit-log` | System Audit Log |
| `/access-denied` | Access Denied |
| `*` | Not Found |

## Design coverage notes

- Office Reports does not yet have a dedicated approved prototype screen.
- Not Found does not yet have a dedicated approved design.
- Office Reports will be designed from the approved office-reporting requirements.

## Confidentiality rules

- Correspondence is owned by offices.
- Users perform actions on behalf of their assigned offices.
- `OFFICE_USER` can access office correspondence functions but cannot access Office Reports or administration.
- `SUPERVISOR` can access correspondence functions and confidential reports for their own assigned office only.
- `ADMIN` can manage users, offices, roles, account status, password resets, and the System Audit Log.
- `ADMIN` cannot access confidential Office Reports.
- A supervisor must never be able to view reports belonging to another office.
- Report office scope must come from the authenticated supervisor’s assigned office, not from a selectable office parameter.
- Reports must never expose one office’s confidential information to another office.
- Administrative access does not grant authority to perform correspondence workflow actions on behalf of an office.