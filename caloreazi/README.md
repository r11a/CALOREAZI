# CALOREAZI 1.18.30

Private Home Assistant nutrition coach with persistent onboarding, daily tracking, global Admin-managed AI, and AI meal-photo analysis.

## First run

Open the Home Assistant Ingress panel and complete the five onboarding steps. CALOREAZI calculates initial calorie, macro, and water targets and stores the owner profile under the add-on `/data` directory so it is included in Home Assistant backups.

## AI setup

Open **Settings → AI** in CALOREAZI:

1. Select OpenAI or Google Gemini.
2. Choose a curated model and enter its API key. The recommended price/performance option appears first with its estimated token rates.
3. Configure the monthly budget. Provider prices are estimates and image cost varies with resolution/tokenization.
4. Select **Save and test connection**.

API keys are encrypted at rest with AES-256-GCM. The key and encryption secret remain in the backend and are never returned to the browser. Provider costs are estimates based on the configured token rates, not provider billing records.

## Current product scope

- Progressive owner onboarding and personalized starting targets.
- Password-based user accounts, signed sessions, isolated nutrition data, and a protected Admin Center.
- Closed registration: administrators create additional user accounts and temporary passwords.
- Persistent daily water and manual meal/macronutrient tracking.
- Editable photo, upload, and voice meal analysis; voice audio is not retained after transcription.
- Private/shared food library with reuse of existing artwork before optional AI image generation.
- Consent-based partner tracking with separate daily, meal-detail, and weight permissions.
- Persistent personal AI Coach using goals, current measurements, meals, activity, trends, preferences, learned corrections and recent conversation.
- OpenAI and Gemini adapters, connection testing, token logging, estimated costs, soft warnings, and hard monthly limits.
- Day/week/month history, scores, activity and weight trends, recycle bin and personal data export.
- Admin health, users, encrypted AI configuration, audit log, verified backups, download and safety restore.
- Responsive Hebrew light and granite-dark interfaces, Ingress-safe PWA and official Home Assistant icon/logo assets.

Home Assistant Ingress is the recommended access path. Standalone LAN access is also enabled by default on port `8686`.

## License

Private and proprietary. See the repository `LICENSE`.
