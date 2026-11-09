# Company access and mobile event navigation

Open an event, select **Projectes → Portal d’empreses**. Select an existing company, its shared account email and authorized presentation rooms. Sending an invitation queues delivery; refreshing shows queue/delivery status. The recipient creates a password through the link and can share the account across devices.

The invitation action also resets access: older unused links become invalid, and completing password setup signs out earlier company sessions. The company email cannot be reassigned silently to an existing account. Revoking access affects this event only and preserves evaluations. No notes or passwords are displayed in Management. Winner proposals are private, not official results.

On mobile, five persistent bottom sections replace the horizontal menu: People, Event day, Projects, Communication and More. The compact section selector exposes the current group's pages, including a direct Mentors page. Desktop keeps the existing grouped navigation. Existing configuration dirty-state protection remains in place when changing groups; the save bar sits below the mobile section selector.

Devpost CSV mapping also supports optional description, repository and demo/video columns for company project detail. Omitted columns preserve existing values on reimport.

## Release dependency

Deploy the backend company-portal migration and API before publishing this frontend. Configure the invitation template and background mail worker using the backend `docs/company-portal.md` runbook before sending invitations. This frontend does not send email directly or generate account passwords.

## Validation

Production build and the existing 77 tests pass. Browser checks at 390px verified section navigation, the invitation form and no document-level horizontal overflow against the local API. No real email was sent during development.
