# health-wearable-agent

A personal wearable-health AI agent that receives Health Connect data from an Android phone, turns the latest wearable metrics into a casual wellness check-in with OpenAI, and sends the result to Telegram.

This is not medical software. It is a personal wellness automation for wearable data.

## Architecture

```text
Galaxy Fit3
  -> Samsung Health
  -> Health Connect
  -> Life Dashboard Companion
  -> Google Apps Script Web App webhook
  -> OpenAI Responses API
  -> Telegram

Optional:
Google Apps Script
  -> Discord Bot REST API
  -> Discord channel
```

## Supported Data Fields

The Apps Script parser currently supports:

- Steps
- Heart rate
- Sleep, including Life Dashboard `duration_seconds`
- Blood oxygen / oxygen saturation
- Exercise sessions, if Life Dashboard sends them

Missing fields are handled safely as `null`. The agent can only summarize fields included in the Life Dashboard webhook payload.

## Telegram Output

Telegram is the primary output. The generated message is:

- One paragraph only
- No title, date, or formal header
- Casual and friendly
- Framed as a live check-in, not a final daily report
- Ended with the required medical safety note

## Optional Discord Bot Output

Discord webhooks are intentionally not used because they were unreliable in the original prototype. Optional Discord output uses the Discord Bot REST API:

```text
POST https://discord.com/api/v10/channels/{channelId}/messages
Authorization: Bot <token>
```

If `DISCORD_BOT_TOKEN` and `DISCORD_CHANNEL_ID` are not configured, Discord sending is skipped.

## Setup

See [SETUP.md](SETUP.md) for the full step-by-step setup.

## Security

Do not commit real API keys, bot tokens, chat IDs, webhook secrets, webhook URLs, or Drive folder IDs. All secrets must live in Apps Script Script Properties.

Required Script Properties:

- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `WEBHOOK_SECRET`

Optional Script Properties:

- `DISCORD_BOT_TOKEN`
- `DISCORD_CHANNEL_ID`

See [SECURITY.md](SECURITY.md) before deploying.
