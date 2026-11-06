# Event operations

Start the sibling LleidaHackBackend using `bash scripts/local-operations.sh`, then:

```sh
API_TARGET=http://127.0.0.1:8000 NEXT_PUBLIC_API_ORIGIN=http://localhost:8000 NEXT_PUBLIC_ENVIRONMENT_LABEL='Local demo' npm run dev -- --port 5175
```

Use `organizer@example.test` / `LocalDemo2026!` for the local superadmin account. Open Users, select a user, then Role and permissions. Choose superadmin, admin, lleidahacker or hacker and enter the reason. The server authorizes and audits the change. Only superadmins see the editor; assigning a role preserves registrations and teams. Revocation takes effect for existing sessions. `admin@example.test` and `lleidahacker@example.test` are separate local role demonstrations.

The event's Live operations tab manages Live content, challenges/resources, meal rounds, coins, prizes, presentation queues, audit history and alerts. Alerts offer Live/screens over WebSocket, Web Push and Discord independently, with general/activity/meal categories and an expiry duration. Discord delivery status refreshes every five seconds. Pending means queued for the future bot, not sent; the bot has a scoped claim/ack contract documented in the backend's `docs/DISCORD_BOT_INTEGRATION.md`.

The demo uses event ID 1 and disposable local data. No production deployment is included. Production needs the coordinated backend migrations before this UI. Existing organizers migrate to admin; a trusted operator must explicitly bootstrap the first superadmin.

The new operations workspace and role editor use the existing Gestió brand tokens, Space Mono typography, orange accents and shared buttons/cards. Their styles are scoped to these features; the management shell remains consistent with the rest of the panel.

The Live content form also manages the public stream URL, Wi-Fi network name, public connection instructions and optional guide URL. These feed the restored Live home-page information blocks. Live alerts display temporarily and can play sound after the participant enables it; background push sound remains subject to device settings.

## Devpost submissions

The Devpost tab imports the organizer's UTF-8 Projects data CSV. Map project URL/title, HackEPS team code, challenge, optional MLH, and submission status; explicitly confirm a completed-only export if it has no status column. Preview errors block the entire import. Existing presentation adjustments are preserved, and challenge/MLH differences require manual review in Presentacions. Newly linked teams receive unscheduled challenge/MLH turns; use the existing schedule generator afterward. Import operations appear as `devpost.import` in Traçabilitat.

Backend migration `20261106_devpost` is required. Configure custom Devpost questions for team code, challenge and MLH, and validate the column/status mapping against the actual organizer export before event use. No Devpost API credentials or scraping are used.
