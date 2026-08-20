# CALOREAZI — Product Targets Derived from the Master Specification

Date reviewed: 2026-08-20

Canonical source: `docs/CALOREAZI_PRODUCT_MASTER_SPECIFICATION.txt`

## Authority and interpretation

The canonical specification contains all 66 numbered sections. Its final
sentence is incomplete after `לא להשתמש בקלישאות ברורות`; no additional logo
constraint should be inferred from that fragment.

The document mixes three different kinds of scope. They should not all be
treated as requirements for the same release:

1. Core product and production foundations: sections 1–25, 29–64 and 66,
   subject to the explicit future qualifications in individual sections.
2. Advanced product capabilities: Menu Scan (26) and Home Inventory (27).
3. Explicit future scope: Shopping Assistant (28), per-user AI limits where
   not enabled initially (57), and native HealthKit integration (65).

## Corrected priority conclusions

1. The first blocking gap is not another UI feature. The running product must
   move from the single JSON state file to the database architecture required
   by sections 29, 37, 38 and 64.
2. The nutrition pipeline required by sections 13 and 59 is not complete until
   vision identification and a reliable nutrition database are separate,
   traceable stages. AI-generated nutrition values are not sufficient.
3. Multi-user isolation must be proven with backend integration and E2E tests,
   not inferred from filtering data by `userId` in application code.
4. The Admin Center is only partially complete. Database management, active
   sessions, granular permissions, scheduled backups, backup types,
   configuration import/export, maintenance, log viewing and permanent trash
   deletion remain required by sections 35–47 and 60–61.
5. Storage is only partially complete. The specification requires mappings by
   media type, capacity reporting, safe network-storage failure handling and
   local pending synchronization (sections 39–40).
6. Privacy export exists only as a foundation. A complete Delete My Data flow
   must cover media, conversations, calibration, trash and backup policy as
   required by section 48.
7. AI configuration needs per-role model selection and optional fallback,
   rather than one global provider/model for all AI roles (sections 49–52).
   The required first roles are personal coach, meal recognition and image
   generation; each must be independently selectable in Admin.
8. Offline capability is architectural, even if full offline support is not a
   first-release requirement. Meal captures need stable client IDs and a
   `pending_analysis` lifecycle now (section 62).
9. Smart Camera guidance (10), confidence-driven interaction (11), proactive
   coaching (17), richer trends (20, 23–24), meal recommendations (25), Menu
   Scan (26) and Home Inventory (27) remain incomplete or partial product work.
10. Shopping Assistant (28), native clients and HealthKit (64–65), and enabled
    per-user AI quotas (57) must not block the core release because the source
    explicitly classifies them as future or non-core work.

## Release gates

### P0 — trustworthy multi-user core

- Database-backed domain model for clean installation. There is no legacy JSON
  migration requirement because no prior production installation exists.
- Backend ownership enforcement with cross-user tests.
- Vision → nutrition database → coach pipeline.
- Reliable media ownership and authenticated delivery.
- Session security, rate limiting, active-session revocation and audit.
- Real database/configuration backup and verified restore.
- Stable asynchronous/pending meal-analysis lifecycle.

### P1 — specification-complete production system

- Full Admin database, storage, backup, security, logs and maintenance areas.
- Scheduled and typed backups plus configuration export/import.
- Delete My Data and permanent trash operations.
- AI role/model routing, fallback and complete usage analytics.
- Calendar, graphs, weight trends, recommendations and confidence UX.
- PWA offline queue, accessibility and Home Assistant E2E coverage.

### P2 — advanced and future scope

- Menu Scan.
- Home Inventory.
- Shopping and supermarket assistant.
- Per-user AI quotas when enabled as a product feature.
- Native iOS/Android clients and HealthKit.

## Verification rule

A specification section is considered complete only when it has all three:

- implementation evidence;
- an automated or documented acceptance test;
- a traceability entry linking the section to both.
