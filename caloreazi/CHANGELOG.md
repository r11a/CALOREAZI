# Changelog

## 0.3.1

- Fixed the unauthenticated startup screen crashing before Login or Admin setup could render.
- Made dashboard-derived calculations safe while the session state is still incomplete.

## 0.3.0

- Added password-based login and signed sessions for every CALOREAZI account.
- Added a protected Admin Center with global AI/token configuration and user creation.
- Added isolated profile, onboarding, meal, water, and AI usage data per user.
- Added automatic migration of the existing owner and nutrition data into the Admin account.
- Added transparent Mifflin–St Jeor calorie targets with BMI, maintenance calories, goal adjustment, expected pace, and safety floors.
- Updated the default Gemini model for new configurations to `gemini-3.6-flash`.
- Allowed non-admin Home Assistant users to open CALOREAZI and authenticate with their own account.

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
