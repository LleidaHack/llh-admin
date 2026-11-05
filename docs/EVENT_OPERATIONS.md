# Event operations

Start the sibling LleidaHackBackend using `bash scripts/local-operations.sh`, then:

```sh
API_TARGET=http://127.0.0.1:8000 NEXT_PUBLIC_API_ORIGIN=http://localhost:8000 NEXT_PUBLIC_ENVIRONMENT_LABEL='Local demo' npm run dev -- --port 5175
```

Use `organizer@example.test` / `LocalDemo2026!` for the local superadmin account. Open Users, select a user, then Role and permissions. Choose superadmin, admin, lleidahacker or hacker and enter the reason. The server authorizes and audits the change. Only superadmins see the editor; assigning a role preserves registrations and teams. Revocation takes effect for existing sessions. `admin@example.test` and `lleidahacker@example.test` are separate local role demonstrations.

The event's Live operations tab manages Live content, challenges/resources, meal rounds, coins, prizes, presentation queues, audit history and alerts. Alerts offer Live/screens over WebSocket, Web Push and Discord independently, with general/activity/meal categories and an expiry duration. Discord delivery status refreshes every five seconds. Pending means queued for the future bot, not sent; the bot has a scoped claim/ack contract documented in the backend's `docs/DISCORD_BOT_INTEGRATION.md`.

The demo uses event ID 1 and disposable local data. No production deployment is included. Production needs the coordinated backend migrations before this UI. Existing organizers migrate to admin; a trusted operator must explicitly bootstrap the first superadmin.
