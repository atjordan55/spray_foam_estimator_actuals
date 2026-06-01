---
name: Dev/Vercel parity
description: Replit dev server and Vercel serverless handlers must behave identically.
---

This app runs two ways and both must match:
- Replit dev: `server.js` (single Express server, also bootstraps the DB schema)
- Vercel prod: `api/*` serverless functions + `migrations.sql` for schema

**Rule:** Any change to an endpoint's behavior or to the DB schema must be mirrored
across the matching pair (server.js endpoint <-> api/<same>.js; server.js schema
bootstrap <-> migrations.sql). The user deploys to Vercel via GitHub main and pushes
manually.

**Why:** Logic added only to server.js works in the Replit preview but breaks in
production (or vice versa). The two batch inventory handlers (server.js and
api/inventory/batch.js) are intentionally byte-for-byte equivalent in their
validation/surplus/cost logic — keep them that way.

**How to apply:** When editing one side, immediately check and update its
counterpart in the same task. Some features (like the Mixed ISO actuals work) need
NO server changes because they reuse existing endpoints — confirm that before
assuming a server edit is required.
