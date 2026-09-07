# Product reliability improvements

Implemented after the September 2026 audit:

- Meal launcher preserves the existing visual language: photo, manual and favorites, with the remaining five tools behind Additional actions.
- Session listing and revocation require an active, non-revoked session.
- Analysis identifiers are validated before they reach database SQL.
- Offline requests carry an account guard that the server checks against the active session. IndexedDB records are filtered by account. Unknown legacy ownership is never inferred.
- Offline image analysis persists each result until the user saves or explicitly discards it. Pending analysis does not consume failed-request retries. IndexedDB writes wait for transaction completion.
- File-store updates are serialized. Water and activity recheck idempotency inside the update.
- New accounts without profiles can record water. Profile-dependent configuration and measurements return a controlled error.
- Meal edits update the logical date; portion scaling includes sugar and other nutritional totals.
- Normalized meal insertion persists all ingredients. Audit-only updates avoid replacing all users and nutrition records.
- Pinch zoom is enabled. Modal keyboard handling provides focus containment, Escape and focus restoration without focusing text inputs on entry.
- AI quality explanations distinguish identification, quantity and nutrition source. Benchmark readiness requires at least 100 examples.

## Verification

164 unit tests, TypeScript, the production build, two rendered-HTML tests and the expanded multi-user integration suite passed locally. Lint has zero errors and 24 existing warnings. Local integration used the file store.

The integration suite now checks normalized ingredient counts when CALOREAZI_TEST_DATABASE_URL is configured, as in the existing PostgreSQL CI job. PostgreSQL and Docker were unavailable locally.

## Remaining validation and incremental work

- Validate on actual iPhone/Android devices and screen readers.
- Run the existing nutrition benchmark with at least 100 measured real meals. The quality indicator is not a measured accuracy probability.
- Continue moving general state updates to scoped repositories and dividing the main screen by feature. The targeted audit-write optimization is not a replacement of the full persistence architecture.
- Legacy offline records without account ownership remain untouched in IndexedDB and are not automatically transmitted or exposed to another account. Recovery requires establishing their owner.

No deployment or production data migration was performed.
