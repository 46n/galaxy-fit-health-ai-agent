# Codex Task

## Completed Scope

- Created a clean repository structure for `health-wearable-agent`.
- Refactored the Google Apps Script around the Life Dashboard Companion webhook.
- Removed hard-coded secrets from code.
- Moved all secret reads to Apps Script Script Properties.
- Added Telegram as the primary output.
- Replaced optional direct Discord Bot REST API output with optional external Discord bridge output.
- Added OpenAI Responses API integration with fallback behavior.
- Added documentation, setup instructions, security notes, examples, and changelog.

## Design Decisions

- Life Dashboard Companion webhook is the main ingestion path.
- The old Health Sync Google Drive CSV path is not included in the main code because it created confusion and is no longer the intended pipeline.
- Discord webhooks are not used because they were unreliable in the prototype.
- Direct Apps Script -> Discord API calls are treated as blocked/unreliable after HTTP 403 code 40333 from Google Apps Script.
- Discord support should go through an optional external bridge/backend.
- The AI output is constrained to wellness check-ins, not medical advice.

## Future TODOs

- Add `clasp` support with `.clasp.json.example` for easier Apps Script deployment.
- Add a small local test harness for parser functions.
- Add parser support for distance, active calories, resting heart rate, HRV, respiratory rate, hydration, and nutrition if Life Dashboard sends those fields.
- Add a weekly summary mode once historical storage is introduced.
- Add persistence with Google Sheets, Firestore, or another storage layer if trend analysis is needed.
- Add Discord slash commands only if a real hosted bot is added later.
