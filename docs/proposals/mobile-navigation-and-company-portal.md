# Mobile navigation and company judging portal

Status: proposal, not a production account or invitation implementation.

## Decisions

The company portal lives in Live, separate from the organizer panel. The user chose one shared account per company, usable concurrently on multiple devices, and project comparison (not purchases). All representatives see the same company notes. Existing organizer access is unchanged.

## Organizer navigation

The current event page already has five groups, but renders both group buttons and sub-tabs above the content. On a small screen they wrap and push the actual task down. Keep the existing section URLs and permission checks while changing the presentation.

- Sticky compact header: event selector, current section and global search.
- Mobile bottom navigation: Summary, People, Event day, Projects, More. Show only one selected subsection under the header; open its siblings in a sheet rather than wrapping tabs.
- People: registrations, teams, attendance, mentors. Search first; participant details open as a full-screen mobile sheet with a clear return action.
- Event day: meals, catering forecast, activities, coins and prizes.
- Projects: challenges and CSV import, Devpost projects, presentation rooms, company invitations and judging status.
- More: communications, Live configuration, sponsors, statistics, permissions and audit.
- Desktop: persistent grouped sidebar with the same destinations. No second navigation taxonomy.
- Keep unsaved-change protection. Put the save action above the mobile bottom bar, including safe-area padding. Separate imports and bulk communications from routine row actions.

Accept when the principal mobile tasks take at most two taps from the event overview, no page-level horizontal scrolling occurs at 360px, tap targets are at least 44px, Back restores filters/scroll, and keyboard focus stays inside open sheets. Tables become summary rows with detail sheets; only comparison tables have deliberate horizontal scrolling.

## Shared company access

Organizer selects event, company, contact email and permitted challenge/room IDs. An invitation email contains a single-use, expiring setup link. The recipient chooses the password. Never send passwords. Reissuing an invitation revokes earlier unused links; accepting one is atomic. Resetting the shared password can revoke existing sessions. Invitation delivery needs a persisted outbox/status so a proxy timeout cannot trigger duplicate mail.

One account can participate in multiple events through explicit memberships. A display company name on a challenge is not an authorization identifier: use company IDs and challenge/room grants. Company users cannot administer the event or inspect another company's notes. Audit attribution is to the shared company account, not an identifiable individual representative; this is an accepted consequence of the chosen model.

## Portal screens

1. **Now**: assigned room, current team and project title, description, members' display names, selected challenge, repository, demo and Devpost links where available. No participant contact details, CVs or dietary information. Missing information is explicitly marked, never fabricated.
2. **Five-minute countdown**: derive the deadline from the official presentation `started_at + 300 seconds`, corrected by server time. Refreshing or opening another device does not restart it. Before the start show “Waiting”; at zero show “Time finished” with overtime. The organizer/scanner controls the start. Do not follow the next project while an unsaved note is being edited without warning.
3. **Shared notes**: one company/event/project record with plain-text notes, optional score and shortlist state. Save explicitly, display saved/saving/conflict states, preserve local drafts on network failure. Use version checks; a stale write returns a conflict and offers the server version alongside the local draft. No silent last-writer-wins.
4. **Projects**: searchable list of authorized projects, evaluated/not evaluated filter and shortlist.
5. **Compare**: select up to four projects. On mobile use stacked cards with the same fields; on desktop use columns. Show notes and score without automatically declaring a winner. A proposed winner requires an explicit confirmation, remains private to the company, and is separate from publishing official results.

The companion HTML is an interactive demonstration with synthetic data. Its timer, notes and comparison illustrate the flow only. It performs no authentication, server persistence or email delivery.

## Existing integration points and required work

- `CompanyUser` and existing authentication can supply identity; inspect legacy access checks before reusing them for this portal.
- `Presentation.started_at`, state and room are already available; subscribe/poll an authenticated company-scoped endpoint.
- `DevpostProject` currently stores imported project title/URL and linkage; inspect the stored payload and extend the import schema for description, repository and demo fields when absent. “All project information” cannot be promised from the current title-and-link import alone.
- Add event-company grants, invitation tokens, versioned notes and delivery tracking with migrations and authorization tests.
- Implement company portal routes under `/companies`, setup/reset flows, organizer invitation controls and rate limits.
- Test invitation expiry/replay, cross-company/event isolation, inactive accounts, simultaneous note edits, multiple-device countdowns and revoked sessions before release.
- Release requires a verified independent database backup and migration/rollback review; no production changes are part of this proposal.
