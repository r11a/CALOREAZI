# CALOREAZI — PROJECTS Foundation Audit

Date: 2026-08-20  
Reference: `r11a/PROJECTS`, commit `cc4bbeb123965c086afede9fd63e74f3ee262908`

## Specification authority

The canonical product source is the 66-section `CALOREAZI Product Master
Specification` supplied on 2026-08-20 in attachment
`d76db8cb-b65a-4687-8ccc-59f9cd907291/pasted-text.txt`. It supersedes the
earlier 31-section attachment wherever wording or scope differs.

Implementation decisions must be traced to this full specification first,
then to this foundation audit, and only then to patterns found in PROJECTS.
PROJECTS is a reference implementation, not a requirements source.

## Decision

CALOREAZI will reuse the proven operational foundation of PROJECTS, but it will
not fork the PROJECTS product code or inherit its project-management domain.
Infrastructure will be adapted deliberately; nutrition, coaching, onboarding,
scoring, history, and camera flows will be CALOREAZI-native.

## Reuse matrix

| Area | PROJECTS evidence | CALOREAZI decision |
|---|---|---|
| Home Assistant packaging | `config.yaml`, `build.yaml`, multi-stage `Dockerfile`, s6 services, Nginx Ingress and standalone ports | Adapt names, ports, paths, health URL, icons and architecture metadata. Preserve relative Vite assets and cold-backup behavior. |
| Runtime | Node 22, Express 5, React 19, Vite 8, PostgreSQL 17 | Reuse the stack initially. It reduces operational risk and keeps the code familiar. |
| Database lifecycle | Ordered SQL migrations tracked in `schema_migrations`; embedded PostgreSQL | Reuse the migration runner pattern. Create a new nutrition-specific schema from migration 001; do not copy PROJECTS tables. |
| Authentication | bcrypt cost 12, HTTP-only strict cookie, 12-hour JWT, HA Ingress identity, password policy, lockout, audit events | Adapt and modularize. Keep standalone and Ingress login paths. Add explicit session revocation/versioning and CSRF review before internet exposure. |
| Authorization | Roles plus per-feature permissions | Use a smaller initial model: `admin` and `member`. Enforce ownership in every domain query; an application role alone is not sufficient multi-user isolation. |
| Security middleware | Helmet/CSP, request-size limit, disabled framework banner, upload policies | Reuse as a baseline with CALOREAZI image/AI endpoints added explicitly to CSP and per-route limits. |
| Health and logging | Database-backed `/api/health`, watchdog route, audit log | Reuse the pattern. Add structured request/job logs and dependency states for nutrition and AI providers. |
| Backup/restore | Full PostgreSQL plus files package, validation, retention, scheduler, import, `/share` destination | Adapt names and manifests. Include meal images, calibration data and provider settings; never include transient analysis jobs. |
| Storage | Internal `/data`, safe `/share` and `/media` roots, write probes, upload filters | Reuse path containment and probes. Add private per-user object keys and authenticated image delivery. |
| UI primitives | Modal system, notifications, forms, responsive CSS, theme selection, RTL-aware layout | Extract concepts and small primitives only. Re-theme and rebuild navigation/screens for CALOREAZI. Avoid copying the large product-specific `App.jsx`. |
| Light/dark appearance | Stored per-user appearance and dedicated dark stylesheet | Reuse persistence behavior, but implement CALOREAZI tokens rather than PROJECTS colors. |
| Live updates | PostgreSQL `LISTEN/NOTIFY` plus SSE | Reuse where it improves meal-analysis/job status. Do not use it for static daily summaries unnecessarily. |
| AI provider controls | Provider settings, usage tracking, budget enforcement and permission-aware context | Adapt provider abstraction, usage ledger and budgets. Build nutrition-safe prompts and structured outputs separately. |
| Testing/release | Node tests, Playwright critical paths, release metadata checks, GitHub validation workflow | Reuse the testing layers and metadata synchronization checks with CALOREAZI scenarios. |

## Do not copy

- PROJECTS business tables, routes, roles, demo data, project workflows or
  management UI.
- The monolithic `server/index.js` architecture. CALOREAZI should start with
  route/service/repository boundaries by domain.
- PROJECTS visual branding or its dense desktop navigation.
- Any AI behavior that lets a language model invent nutritional values.
- The assumption that responsive web styling is equivalent to a PWA.

## CALOREAZI-specific requirements

1. A real installable, mobile-first PWA: web manifest, icons, service worker
   strategy, update behavior, offline shell and camera/install testing.
2. Nutrition provenance: vision output and nutrition-database calculations
   must remain separate, traceable stages.
3. User-owned data isolation across profiles, meals, images, measurements,
   water, activity, conversations and personal calibration.
4. Asynchronous image-analysis jobs with idempotency, retries, cancellation,
   provider timeouts and clear confidence states.
5. Health-sensitive copy, uncertainty and guardrails. Targets are guidance,
   not diagnosis or guaranteed outcomes.
6. Privacy controls for food images and personal health-adjacent history,
   including export and deletion.
7. Offline-ready capture: meal images and actions need stable client IDs and a
   `pending_analysis` lifecycle so a future sync queue does not require an API
   or schema rewrite.
8. Provider-independent AI configuration, model selection, fallback, soft and
   hard budgets, estimated cost, per-user attribution and usage analytics.
9. An administrator experience that summarizes database, storage, backup, AI,
   connectivity and application health without exposing raw logs by default.
10. Trash and restore semantics for recoverable user content, separate from
    permanent deletion and privacy-driven erasure.

## Recommended source structure

```text
caloreazi/
  migrations/
  server/
    app.js
    config/
    middleware/
    infrastructure/
      auth/
      database/
      storage/
      backup/
      ai/
    domains/
      users/
      onboarding/
      nutrition/
      meals/
      measurements/
      hydration/
      activity/
      coaching/
      insights/
  src/
    app/
    components/
    features/
    styles/
  test/
  e2e/
  rootfs/
```

This preserves PROJECTS conventions where they are operationally valuable,
while preventing the main maintainability weakness—the accumulation of product
logic in a single server and application file—from carrying into CALOREAZI.

## First implementation slice

The first vertical slice should be intentionally narrow but production-shaped:

1. HA Add-on and standalone runtime boot successfully.
2. Database migrations create users, sessions/audit, profiles and daily targets.
3. Standalone login and HA Ingress authentication both work.
4. A new user completes the short onboarding flow.
5. The personalized daily target screen is persisted and restored per user.
6. Health, backup and restore cover this data.
7. Unit and Playwright tests prove cross-user isolation and the critical path.

Camera analysis should follow this slice, not precede identity, ownership and
target persistence.

## Remaining specification ambiguity

The new attachment contains 1,065 lines and all numbered sections 1–66, so it
replaces the previously truncated copy for implementation purposes. Its final
section still ends with the incomplete phrase `לא להשתמש בקלישאות ברורות`.
This does not block foundation or product work, but no unstated logo constraints
will be inferred from the missing continuation.
