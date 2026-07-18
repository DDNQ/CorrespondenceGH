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
- The current React authentication and role-based routing remain the source of truth.
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
- OFFICE_USER cannot access reports or administration.
- OFFICE_SUPERVISOR can access reports for their own office only.
- SYSTEM_ADMIN cannot access confidential office reports.
- Reports must never expose one office’s confidential information to another office.
