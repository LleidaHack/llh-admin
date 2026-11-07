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

The Projectes i jurat → Devpost tab imports the organizer's UTF-8 Projects data CSV. Map project URL/title, HackEPS team code, challenge, optional MLH, and submission status; explicitly confirm a completed-only export if it has no status column. Preview errors block the entire import. Existing presentation adjustments are preserved, and challenge/MLH differences require manual review in Presentacions. Newly linked teams receive unscheduled challenge/MLH turns; use the existing schedule generator afterward. Import operations appear as `devpost.import` in Traçabilitat.

Backend migration `20261106_devpost` is required. Configure custom Devpost questions for team code, challenge and MLH, and validate the column/status mapping against the actual organizer export before event use. No Devpost API credentials or scraping are used.


## Event navigation

Event tools are grouped into five areas: Participants (registrations, teams, check-in), Jornada (agenda, meals and rounds, coins, prizes, logistics), Projectes i jurat (challenges, Devpost, rooms/timing, queues), Comunicació (Live content, alerts, email), and Administració (event details, sponsors, statistics, registration history, operational audit). Each area remembers its last selected section while the event page is mounted. Global user permissions remain under Usuaris.

The old all-in-one operations menu is removed. Each operation section loads independently; editing Live no longer exposes agenda, challenge, prize and room forms in one long page. Meal round controls are beside the existing meal tools. Operational audit loads when entering Administració → Traçabilitat.

## Preliminary challenge choices

In Projectes i jurat → Reptes, save challenge content, mark the intended challenges as published, then use Publicar reptes and Obrir elecció de repte. Hiding challenges also closes choices. The summary refreshes every ten seconds and shows counts and each team's choice. These preliminary choices do not create submissions or presentation turns; Devpost remains the final submission source.

## Manual YouTube broadcast

Comunicació → Live accepts a YouTube video URL and a **Mostrar retransmissió** switch. Save to publish or hide the embedded player. The switch defaults to false and requires a valid YouTube video link when enabled. Organizers must disable it after the stream ends; no automatic live-status detection or Google API key is involved. Live starts playback muted, subject to browser policy. Deploy the backend configuration update before the clients; the JSON configuration requires no database migration.
