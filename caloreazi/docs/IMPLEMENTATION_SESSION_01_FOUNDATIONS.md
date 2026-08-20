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

## Final release verification

The Windows workspace has no Docker or PostgreSQL executables. The release
workflow therefore runs PostgreSQL 17 migrations, the production multi-user
test, normalized-table assertions, `pg_dump`/restore and a Home Assistant image
build on Linux before a release may be tagged. There is intentionally no legacy
JSON migration test because this is a clean-install product.

## Closed foundation boundaries

- `runtime_state` has been removed. API contracts are hydrated from normalized,
  owner-scoped PostgreSQL rows; writes use a revision gate to prevent lost
  updates across the web process and analysis worker.
- Nutrition first uses the versioned curated fallback and then USDA FoodData
  Central for authoritative matches. Every result records its source and ID;
  unmatched foods remain zero-valued until confirmation.
- Database and safety backups contain verified PostgreSQL custom dumps.
  Configuration is a separate type, and full backups additionally contain
  checksum-verified gallery media up to the documented 512 MB portable limit.

## Ten-step acceptance matrix

1. Embedded PostgreSQL 17, clean database creation and checksum migrations.
2. Normalized UUID-owned domain tables; no `runtime_state` table or code path.
3. Optimistic revision protection across server and worker writes.
4. Owner-scoped meals/media/trash, authenticated delivery and original-day restore.
5. Unit, production integration and PostgreSQL CI isolation tests.
6. Vision identifies only; nutrition is resolved independently with provenance.
7. Curated fallback plus authoritative USDA adapter; unknown values are never invented.
8. Persistent idempotent analysis jobs, retries, cancellation and confirmation.
9. Active sessions, revocation, throttling, lockout, audit, CSRF and trusted HA Ingress SSO.
10. Typed scheduled backups, verified database/full/configuration restore and safety backup.

Additional requested gate: coach, meal-recognition and image-generation models
are independently selectable and validated by role.
