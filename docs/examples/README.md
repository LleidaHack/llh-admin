# Event CSV imports

Use UTF-8 CSV with a header row. Comma and semicolon separators, quoted commas, escaped quotes, multiline descriptions and a UTF-8 BOM are supported. Files are limited to 1 MB and 200 records; challenge lists are limited to 30 entries including existing records.

Challenge columns: `id,company,title,description,published`. The first three are required, IDs must be unique, description is optional, and `published` is `true` or `false` (defaults to false). Import appends to the configuration draft without replacing existing challenges. Save configuration to persist it. Add resource links using the existing editor. The sample file contains five fictional challenges, not official company proposals.

Mentor columns: `name,user_id`. Name is required; leave user_id empty to create a badge-only mentor record. If provided, user_id must match an available existing mentor account. The importer rejects duplicate names and account IDs before starting. Confirming the preview creates mentors sequentially; on failure the UI stops and shows the completed count. Check the roster before starting another import because a timed-out request may have completed. Import does not send invitations or create user-chosen login credentials.

Release the backend PR before the admin and Live changes: statistics need the new confirmation field and challenge companies must survive schema validation and public serialization. No database migration is required for these implemented changes. The company portal and navigation redesign in `../proposals` are proposals only.
