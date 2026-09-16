# LleidaHack Admin (provisional)

An independent organizer frontend built with React, TypeScript, Vite, Tailwind CSS and official shadcn/ui components (Radix Nova). It uses the existing LleidaHack backend API. No HackEPS frontend files are required or modified.

## Run locally

Requires Node.js 22.12+ (tested on Node 25), npm and the backend running on port 8000.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5175. The Vite server binds to loopback and proxies `/api` to `http://127.0.0.1:8000`. To use another backend, copy `.env.example` to `.env.local` and set `API_TARGET`, then restart Vite.

For the isolated backend environment:

```sh
cd ../LleidaHackBackend
uv run python install/local.py
```

Docker must be running. Sign in with `organizer@example.test`; read `organizer_password` from the backend's ignored `.local-backend.json`. Credentials are not bundled with this frontend. Local backend emails are captured at http://127.0.0.1:8001/messages and never delivered externally.

## Available workflows

- Organizer login, per-tab session, logout, and handling of expired sessions.
- Event list/search, creation, editing, deletion with confirmation, opening/closing registration.
- Event registrations: search, accept, reject and withdraw acceptance.
- Event teams: view members, accept/reject an entire team.
- Companies: create/edit/delete and link/unlink event sponsors.
- Meals: create/edit/delete for an event.
- Check-in by participant code.
- User directory, lookup by nickname/email and block/unblock participant access.

All lists come from the API, including empty states. Destructive actions require a confirmation. Backend validation and permission errors are displayed. Participant registration itself remains in the participant application/API; this panel manages submitted applications.

## Architecture and migration

- `src/lib/api.ts`: HTTP client, session, error translation, shared response types.
- `src/lib/events.ts`: event form validation and serialization.
- `src/features/`: independent feature screens (events, event detail, companies, users).
- `src/components/ui/`: shadcn source components, installed with the CLI.
- `src/components/shared.tsx`: reusable forms, confirmation, loading and error states.
- `src/index.css`: theme tokens and responsive shell.

To migrate, move the feature components and API client, preserve the `@/` alias or update imports, then integrate the host's session and routing. `VITE_API_BASE` configures a browser-visible API URL at build time; it must never contain secrets. For deployment behind the same origin, configure a reverse proxy for `/api` (the Vite dev proxy is not included in static build output).

Access tokens live in sessionStorage, scoped to the browser tab. Passwords are only sent during login. An expired token returns to login; refresh tokens are intentionally not persisted. The backend remains responsible for authorization. Use HTTPS outside loopback development.

Event dates currently use the backend's timezone-naive datetime contract; the panel preserves the entered date/time. The backend defines price as an integer without currency/unit metadata, so the panel labels it as an API value. Archived events are not returned by `/event/all`; this panel does not add an unsupported archive workflow. Emailing actions invoked by acceptance follow the configured backend mail service.

## Validation

```sh
npm run test
npm run lint
npm run build
```

Unit tests cover login/session expiration, access restrictions, API validation messages and event payload validation. Manual browser verification against the isolated backend is recorded in `QA.md`.

## HackEPS visual identity

The provisional panel follows the style-guide screenshot supplied on 2026-09-16: orange (`#ff7430`), charcoal (`#222222`), off-white (`#f7f7f7`), self-hosted Space Mono 400/700 and outline icons. Color values are approximations from the screenshot and existing project styles, not exported Figma variables. Text sizes are adapted to administration screens rather than copying the guide's 98px desktop display heading.

`public/brand/lleidahack.svg` and `pattern-light.png` are unchanged copies of the existing LleidaHack frontend assets (`src/assets/img/logo_text_llh.svg` and `src/imgs/patron_imagen.png`). This standalone repository does not require that frontend at runtime. The white pattern separates card sections; data, errors and forms remain on neutral surfaces. Font files and their license are supplied by `@fontsource/space-mono`. Theme tokens live in `src/index.css`.
