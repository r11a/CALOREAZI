# Changelog

## 0.2.1

- Fixed client API requests so they retain the Home Assistant Ingress base path.
- Added safe handling for malformed or non-JSON server responses.
- Re-enabled standalone LAN access on port `8686` by default.

## 0.2.0

- Added a five-step progressive onboarding flow and first-value personalized targets.
- Added persistent owner profile, daily water, meals, calories, and macros under Home Assistant `/data`.
- Added manual meal creation and deletion with live daily totals.
- Added encrypted OpenAI and Gemini provider settings, model selection, connection testing, and provider abstraction.
- Added a context-aware AI Coach with token usage, estimated cost, monthly budget, soft warning, and hard limit foundations.
- Added a focused Admin AI settings experience and usage summary.
- Added a granite dark theme logo treatment that preserves the orange/amber mark and `CAL` / `OR` / `EAZI` hierarchy.
- Added provider adapter tests and production API routes for onboarding, state, water, meals, AI settings, and chat.

## 0.1.3

- Replaced the nested SVG logo with the approved self-contained transparent PNG.
- Verified the logo inside the full production interface before release.

## 0.1.2

- Fixed the approved logo asset resolving outside the Home Assistant Ingress path.

## 0.1.1

- Fixed Home Assistant Ingress entry URL generation that produced a double slash.
- Aligned the Ingress listener with Home Assistant's Supervisor-only access guidance.
- Removed a duplicate Nginx MIME directive warning and enabled streaming support.

## 0.1.0

- First installable Home Assistant add-on preview.
- Responsive Hebrew nutrition dashboard with light and granite-dark themes.
- Approved CALOREAZI identity with graduated `CAL` / `OR` / `EAZI` typography.
- Initial AI token usage, cost estimation, and budget-control foundation.
- Home Assistant Ingress, standalone Web UI, watchdog, and health endpoint.
