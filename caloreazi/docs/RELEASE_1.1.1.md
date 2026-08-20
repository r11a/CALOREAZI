# CALOREAZI 1.1.1

Hotfix for the PostgreSQL startup failure in version 1.1.0.

## Fixed

- Create `/run/postgresql` with the required ownership before PostgreSQL starts.
- Prevent the resulting database connection failures and HTTP 502 response.
- Boot the built Home Assistant add-on image in CI and require a successful `/health` response before release.

Version 1.1.1 contains the complete 1.1.0 foundation release plus this runtime startup fix.
