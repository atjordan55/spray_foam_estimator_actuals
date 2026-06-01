---
name: Inventory source enum
description: material_inventory.source is constrained; writing a new source value fails unless allowed.
---

The `material_inventory.source` column has a CHECK constraint limiting it to a fixed
set of values (e.g. manual_addition, initial_seed, purchase_delivery, job_surplus,
surplus_material, inventory_commitment, commitment_reversal,
reservation_reconciliation, adjustment).

**Rule:** Any inventory INSERT (including via /api/inventory/batch) must use a source
already in the constraint, OR you must extend the constraint. The constraint is
defined/upgraded in TWO places that must stay in sync:
- `migrations.sql` (Vercel/prod path)
- `server.js` schema bootstrap (Replit dev path)

**Why:** A new source value (e.g. a custom 'mixed_iso_substitution') passes JS-side
validation but the INSERT throws a CHECK violation at the DB, so the write silently
fails in production. For one-off deductions/adjustments, prefer the existing
`adjustment` source instead of inventing a new one — it stays non-surplus and
preserves the passed cost (batch handlers only force is_surplus/cost=0 for
surplus_material/job_surplus).

**How to apply:** Before adding a new `source` string, grep both files for the
CHECK list. If an existing value fits the semantics, reuse it.
