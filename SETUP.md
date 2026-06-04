# Setup

TL;DR: deploy `Code.gs` as an Apps Script Web App, set the required Script Properties, then paste the Web App URL with `?secret=...` into Life Dashboard Companion.

## 1. Samsung Health to Health Connect

1. Install Samsung Health and Health Connect on the Android phone.
2. Connect Galaxy Fit3 to Samsung Health.
3. In Samsung Health, allow data sharing to Health Connect.
4. In Health Connect, confirm Samsung Health has permission to write the metrics you want.

## 2. Life Dashboard Companion

1. Install Life Dashboard Companion on the phone.
2. Grant Health Connect permissions for steps, sleep, heart rate, oxygen saturation, and exercise if available.
3. Configure its webhook URL after deploying the Apps Script Web App.

Webhook URL format:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?secret=YOUR_WEBHOOK_SECRET
```

## 3. Apps Script Project

1. Create a new Google Apps Script project.
2. Paste the contents of `Code.gs` into the Apps Script editor.
3. Save the project.

## 4. Script Properties

Open:

```text
Project Settings -> Script Properties
```

Add these required properties:

```text
OPENAI_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
WEBHOOK_SECRET
```

Add these only if optional Discord bridge output is wanted:

```text
DISCORD_BRIDGE_URL
DISCORD_BRIDGE_SECRET
```

Use `examples/script-properties.example.json` as a reference for names only. Do not paste real values into this repository.

## 5. Web App Deployment

1. Click `Deploy`.
2. Choose `New deployment`.
3. Select `Web app`.
4. Set `Execute as` to `Me`.
5. Set `Who has access` to `Anyone`.
6. Deploy and copy the Web App URL.
7. Append `?secret=YOUR_WEBHOOK_SECRET` to the URL.

## 6. Telegram Bot

1. Create a bot with BotFather.
2. Store the token as `TELEGRAM_BOT_TOKEN`.
3. Send `/start` to the bot from your Telegram account.
4. Use Telegram `getUpdates` to find your chat ID.
5. Store the chat ID as `TELEGRAM_CHAT_ID`.
6. Run `testTelegram()` in Apps Script.

## 7. OpenAI API Key

1. Create an API key in the OpenAI platform.
2. Store it as `OPENAI_API_KEY` in Apps Script Script Properties.
3. Run `testOpenAI()` in Apps Script.

## 8. Optional Discord Bridge

Direct Apps Script -> Discord Bot REST API calls should be treated as blocked/unreliable. Testing showed HTTP 403 code 40333 from Google Apps Script even when the same bot token and channel ID work from a PC.

Use an external backend as the Discord bridge instead:

1. Host a small backend endpoint that accepts JSON from Apps Script.
2. Store the Discord bot token and channel ID in that backend, not in Apps Script.
3. Configure the backend to send messages to Discord using the Discord Bot REST API.
4. Store the backend endpoint URL as `DISCORD_BRIDGE_URL`.
5. Optionally store a shared bridge secret as `DISCORD_BRIDGE_SECRET`.
6. Run `testDiscordBridge()` in Apps Script.

Apps Script sends the bridge secret in the `X-Discord-Bridge-Secret` header when it is configured.

## 9. Test Life Dashboard

1. Paste the Apps Script Web App URL with the `secret` query parameter into Life Dashboard Companion.
2. Tap its sync/test option.
3. Check Apps Script execution logs.
4. Confirm Telegram receives the AI health check-in.

## 10. Troubleshooting

- `Unauthorized webhook request`: The `secret` query parameter does not match `WEBHOOK_SECRET`.
- `Missing OPENAI_API_KEY`: Add the key in Script Properties, not in code.
- `Telegram API failed`: Check bot token, chat ID, and whether you sent `/start` to the bot.
- No sleep data: Confirm Life Dashboard has Health Connect sleep permission and is sending `sleep`.
- No oxygen data: Confirm Life Dashboard has oxygen saturation permission and is sending `oxygen_saturation`.
- Discord skipped: `DISCORD_BRIDGE_URL` is optional and must be present for bridge output.
- Discord bridge failed: Check the external bridge logs, `DISCORD_BRIDGE_URL`, and `DISCORD_BRIDGE_SECRET`.
- OpenAI failed but Telegram still sent: The fallback rule-based summary is working as intended.
