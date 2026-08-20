# CALOREAZI 1.1.0

Production-foundation release for clean installations.

- Embedded PostgreSQL 17 with checksum migrations and normalized domain rows.
- Multi-user ownership enforcement, active-session revocation, lockout, audit,
  same-origin protection and trusted Home Assistant Ingress identity.
- Persistent asynchronous meal-photo analysis with idempotency, retries,
  cancellation and confirmation states.
- Separate selectable models for coach, meal recognition and image generation.
- Vision/nutrition separation with traceable curated and USDA FoodData Central
  sources; unknown foods are never assigned invented nutrition values.
- Database, configuration, full-media and safety backup types with checksums,
  scheduled retention, `pg_dump` and verified restore.
- Storage health/capacity reporting, authenticated media, trash/restore,
  complete personal export and permanent Delete My Data flow.

Release gates: 22 unit tests, production multi-user integration on PostgreSQL
17, normalized-table assertions, lint/build and Home Assistant image build.
