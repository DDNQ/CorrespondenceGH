## Permanent Project Rules

- Use React with JavaScript and Vite.
- Use functional components and hooks.
- Use react-router-dom for routing.
- Use plain CSS organised under `src/styles`.
- Keep components reusable and reasonably small.
- Do not assign correspondence ownership to individual employees.
- Correspondence is owned by offices.
- Individual users perform actions on behalf of their assigned office.
- Supported roles are `OFFICE_USER`, `OFFICE_SUPERVISOR`, and `SYSTEM_ADMIN`.
- `OFFICE_USER` can access office correspondence functions but not reports or administration.
- `OFFICE_SUPERVISOR` can access correspondence functions and confidential reports for their own assigned office only.
- `SYSTEM_ADMIN` can manage users, offices, roles, account status, password resets, and security audit logs.
- `SYSTEM_ADMIN` must not be able to view confidential office reports.
- A supervisor must never be able to view reports belonging to another office.
- Report office scope must come from the authenticated supervisor's office, not from a selectable office parameter.
- Use semantic HTML and accessible labels.
- Run `npm run lint` and `npm run build` after meaningful changes.
- Do not commit or push unless explicitly instructed.
## Design reference

- The approved complete interface reference is located at:
  `design-reference/mrh-complete-prototype.html`
- The screen reference guide is located at:
  `design-reference/README.md`
- Matching screen images are located under:
  `design-reference/screenshots/`
- Before implementing or redesigning a screen, inspect the relevant prototype screen and matching screenshot.
- Treat the screenshot as the visual source of truth when one is available.
- Recreate the design in React; never embed or ship the reference HTML.
- Do not alter already approved screens unless the task explicitly requests it.