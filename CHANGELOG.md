# Changelog

## Unreleased

- Replaced direct Apps Script -> Discord Bot REST API output with optional external Discord bridge/backend output.
- Documented Google Apps Script Discord HTTP 403 code 40333 behavior and kept Telegram as the primary Apps Script output.

## 0.1.1 - 2026-06-01

- Added README badges, table of contents, Mermaid architecture diagram, and example output.
- Added a static GitHub Pages-ready project page at `docs/index.html`.
- Added a setup TL;DR for faster onboarding.

## 0.1.0 - 2026-06-01

- Initial cleaned repository for `health-wearable-agent`.
- Added Life Dashboard Companion webhook receiver.
- Added Health Connect metric parsers for steps, heart rate, sleep, blood oxygen, and exercise.
- Added OpenAI Responses API message generation.
- Added Telegram sender.
- Added optional Discord Bot REST API sender.
- Removed hard-coded secrets from committed code.
- Added setup, security, context, and task documentation.
