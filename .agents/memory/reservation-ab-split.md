---
name: Reservation A/B split convention
description: How foam reservations and inventory split gallons across A (ISO) and B (Resin).
---

Foam is a two-part product: A-side = ISO, B-side = Resin. When a quantity of foam
gallons is split into the two sides 50/50, use this exact convention so the two
halves always sum back to the original total:

- `a = ROUND(gallons / 2, 2)`
- `b = gallons - a`   (no second rounding — the remainder absorbs the odd cent)

**Why:** Double-rounding `b` can make `a + b != gallons` for odd-hundredth inputs.
The DB column scale handles storage precision. This matches the original
`material_inventory` backfill in `migrations.sql`.

**How to apply:** Only foam (`material_category === 'foam'`) gets the split.
Coating / non-foam is single-component → both sides 0. The reservation insert lives
in BOTH `server.js` (`POST /api/estimates/:id/reservations`) and
`api/estimates/[id]/reservations/index.js` — keep them identical. Reservation rows
with status `reserved` are deleted and rebuilt on every estimate save, so they pick
up the split automatically; `committed`/`reconciled` rows are locked and skipped.
