---
name: Estimator mobile/responsive
description: How the Spray Foam Estimator behaves on phones and how mobile UI was added
---

# Estimator mobile / responsive notes

- `src/Estimator.jsx` is already responsive: grids default to `grid-cols-1` and expand at `sm/md/lg`; the right-hand summary/financial sidebar is pinned only at `xl` (`xl:sticky`) and otherwise stacks at the bottom. So on phones the form is already single-column — the real on-site pain was that quote totals were buried at the very bottom.
- Fix shipped: a phone/tablet-only sticky bottom totals bar (`xl:hidden`, `fixed bottom-0`) showing Customer Charge + Profit with a tap-to-expand breakdown, reusing existing computed values. Keep any such mobile-only chrome scoped with `xl:hidden` AND `no-print` (the app's print CSS hides `.no-print`); spacers need `no-print` too or they leave blank space in Print/PDF.

**Why:** GM quotes on-site on a phone; totals visibility was the top complaint. xl-scoping keeps the already-good tablet/desktop layout untouched.

**How to apply:** App has NO icon library (no lucide) — use inline `<svg>`. App palette is blue (`blue-500/600`) primary with red/yellow/green margin colors via `marginColor`; graduate mockups to the app's blue palette, not the green used in the canvas mockup. For iOS, pad the fixed bar with `env(safe-area-inset-bottom)`.
