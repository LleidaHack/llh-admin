# Verification — 2026-09-16

Environment: isolated PostgreSQL/backend on 127.0.0.1:8000, capture-only mail on 8001, Vite frontend on 5175. Browser checks used the gstack browser. All test data was local and explicitly named as test data.

## Automated checks

- `npm run test`: 11 passing tests across API/session and event validation.
- `npm run build`: TypeScript and Vite production build pass.
- `npm run lint`: no errors; six warnings (three standard shadcn variant exports and three async API-loading effects flagged by the React effect rule).
- Backend integration suite: 68 passing tests after the supporting sponsor/company fixes.

## Browser flows verified against the real local backend

- Organizer login; invalid password displays an error; reload preserves the per-tab session; logout returns to the login screen.
- Create an event and see the returned event in its management screen.
- Edit capacity from 150 to 180 and observe the updated value in the detail/list.
- Close registration, then reopen it; button and badge follow the backend state.
- Accept a seeded pending participant; withdraw acceptance; reject the pending team; accept the team again. The table changes between pending, rejected and accepted.
- Register the accepted participant's arrival using their code.
- Create and edit a company; link and unlink it as a sponsor; delete the unlinked company.
- Create, rename and delete a meal belonging to the event.
- Look up a seeded user by email; block then unblock their access.
- Create a second empty event and delete it through the confirmation dialog.
- Desktop at 1440 × 1000 and mobile at 390 × 844. Mobile document width equals viewport width (390), and wide tables scroll inside their container.

## Backend integration findings

Two existing backend defects blocked the management flows and were fixed separately on `refactor-backend`:

- `cff3ae7`: sponsor removal now uses the existing `sponsors` relationship and permits organizers.
- `4590199`: company deletion recognizes organizer accounts while retaining checks for company users.

The backend's team rejection endpoint skips already accepted members. The UI explains this and offers withdrawal of acceptance in the registrations table before rejection. This panel does not claim to cover every backend endpoint; scope and migration notes are in README.md.

The labeled demo event and test participant remain in the isolated database for exploration. Temporary company, meal and second event were removed through the UI. No real emails were delivered.

## Visual identity update — 2026-09-16

Applied the user-supplied style guide to login, navigation, events, forms, tables and shared shadcn components. Verified at 1440 × 1000 and 390 × 844; computed body font is Space Mono, mobile document width is 390px, and the create-event dialog scrolls within the viewport. Login against the local backend succeeds. Build and all 11 frontend tests pass. Backend request logic is unchanged.
