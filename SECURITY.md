# Security

This repository must not contain real secrets.

## Never Commit

- OpenAI API keys
- Telegram bot tokens
- Telegram chat IDs
- Discord bridge secrets
- Discord bot tokens or webhook URLs in any external bridge/backend
- Apps Script webhook secrets
- Google Drive folder IDs
- `.clasp.json` files tied to a real Apps Script project

## Use Script Properties

Store secrets in Apps Script:

```text
Project Settings -> Script Properties
```

Required:

```text
OPENAI_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
WEBHOOK_SECRET
```

Optional:

```text
DISCORD_BRIDGE_URL
DISCORD_BRIDGE_SECRET
```

## Rotate Exposed Secrets

If a token, key, chat ID, webhook URL, or webhook secret was pasted into chat, screenshots, logs, or a repository, treat it as exposed.

Rotate:

- Telegram bot token through BotFather
- OpenAI API key through the OpenAI platform
- Discord bridge secret in Apps Script and the external bridge/backend
- Discord bot token through the Discord Developer Portal if the external bridge/backend uses one
- Discord webhook URL by deleting and recreating the webhook if an external bridge/backend uses one
- Apps Script `WEBHOOK_SECRET`

## Webhook Secret

The Apps Script Web App is usually deployed with access set to `Anyone` so Life Dashboard Companion can call it from the phone. The `WEBHOOK_SECRET` query parameter is the lightweight gate for this personal webhook.

Keep the full deployment URL private:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?secret=YOUR_WEBHOOK_SECRET
```

## Repository Visibility

Use a private GitHub repository if you are actively developing with personal automation details. Even without secrets, payload examples, setup notes, and commit history may reveal personal architecture details.
