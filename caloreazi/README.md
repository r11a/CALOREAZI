# CALOREAZI 0.2.0

Private Home Assistant nutrition coach with persistent onboarding, daily tracking, and configurable AI.

## First run

Open the Home Assistant Ingress panel and complete the five onboarding steps. CALOREAZI calculates initial calorie, macro, and water targets and stores the owner profile under the add-on `/data` directory so it is included in Home Assistant backups.

## AI setup

Open **Settings → AI** in CALOREAZI:

1. Select OpenAI or Google Gemini.
2. Enter a model and API key.
3. Configure estimated input/output token prices and the monthly budget.
4. Select **Save and test connection**.

API keys are encrypted at rest with AES-256-GCM. The key and encryption secret remain in the backend and are never returned to the browser. Provider costs are estimates based on the configured token rates, not provider billing records.

## Current product scope

- Progressive owner onboarding and personalized starting targets.
- Persistent daily water and manual meal/macronutrient tracking.
- Context-aware AI Coach using the owner profile and current day.
- OpenAI and Gemini adapters, connection testing, token logging, estimated costs, soft warnings, and hard monthly limits.
- Responsive Hebrew light and granite-dark interfaces.

Camera meal analysis, full authentication for standalone LAN access, multiple accounts, history, and backup administration are not yet complete. Home Assistant Ingress is the recommended access path. Standalone LAN access is also enabled by default on port `8686` for testing.

## License

Private and proprietary. See the repository `LICENSE`.
