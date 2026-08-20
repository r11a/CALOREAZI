# Implementation Session 01 — Ten Foundation Priorities

Date: 2026-08-20

Source: `CALOREAZI_PRODUCT_MASTER_SPECIFICATION.txt`

## Delivered

1. PostgreSQL 17 is part of the Home Assistant image and runs as a private
   loopback-only service. The app refuses database mode without an explicit
   connection URL, runs ordered SQL migrations, and creates a fresh revisioned
   database state on first boot. There is intentionally no legacy-data import.
2. Migration 002 defines UUID-owned tables for sessions, daily records, media,
   meals/items, nutrition sources, measurements, activities, analysis jobs,
   calibration, coach messages, partnerships, trash and backups. Drizzle is
   configured for PostgreSQL rather than the previous unused D1 placeholder.
3. State writes in database mode use optimistic compare-and-swap revisions,
   preventing silent lost updates. Meal ownership logic was extracted into a
   domain repository; further domains can follow the same boundary.
4. Meal and media lookup, deletion and restore are owner-scoped on the server.
   Historic meals are handled correctly and restored to their original local
   day rather than always to today.
5. A production-server integration test creates an admin and member, proves a
   cross-user meal deletion is ineffective, verifies active-session revocation,
   and exercises verified backup plus safety restore.
6. Vision output is limited to identification and quantity. A separate,
   versioned nutrition adapter supplies values and provenance. Unknown foods
   receive zero invented values and `needs_confirmation`.
7. The bootstrap nutrition catalog contains traceable source IDs and a stable
   adapter contract. It is intentionally small; importing a licensed national
   or USDA dataset can replace it without changing vision and meal flows.
8. Meal-photo analysis is a persistent asynchronous job with stable client ID,
   idempotency, pending/processing/confirmation/completed/failed/cancelled
   states, a dedicated worker, bounded retries, cancellation, polling and
   removal of the pending image after processing.
9. Authentication now includes active session records, individual/all-device
   revocation APIs, login throttling, temporary lockout, constant-time cookie
   signature validation, Origin checks on sensitive mutations, password-change
   session rotation and success/failure audit events.
10. Backups use a versioned envelope, payload and file SHA-256 verification,
    explicit database/configuration types, configuration import, retention,
    scheduled daily creation and a verified safety backup before restore.
11. AI model routing is configured separately for the personal coach, meal
    vision and food-image generation. The Admin UI validates each model against
    its role-specific catalog, and usage records the model that actually ran.

## Verification performed

- `npm test`: 20/20 passing.
- `npm run build`: passing.
- `node tests/multi-user.integration.mjs`: passing.
- `npm run lint`: zero errors; 14 pre-existing image-optimization warnings.
- `git diff --check`: passing.

## Deployment verification still required

Docker and PostgreSQL executables are not installed in the current Windows
workspace, so the Home Assistant container boot, Alpine package resolution,
PostgreSQL migration execution and upgrade from a real `/data/caloreazi.json`
must be verified in the add-on build environment before release. The code does
not silently claim that local unit tests prove this external runtime path.

## Deliberate follow-up boundaries

- The normalized schema is present, while `runtime_state` remains the active
  transactional aggregate. Moving every
  route to normalized SQL repositories is the next database cutover, not an
  invisible behavior change in this session.
- The bundled nutrition catalog proves separation and provenance but is not a
  complete national food database. Production coverage requires a licensed or
  authoritative import and matching QA.
- A `full` archive currently protects the complete application aggregate but
  large external media files still follow the configured storage/HA backup
  policy; a portable media archive needs a separate streamed format.
