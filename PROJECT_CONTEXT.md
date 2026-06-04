# Project Context

This project started with a question: whether Samsung Health or Galaxy Fit3 provides a simple API key for retrieving personal health data inside an AI agent. The answer was no. Samsung Health and Galaxy Fit3 do not provide a simple backend API key that can be pasted into a server to read the user's health data.

The working data path depends on Android-side permissions:

```text
Galaxy Fit3
  -> Samsung Health
  -> Health Connect
  -> connector app/exporter
  -> backend or Apps Script
  -> Telegram / optional external Discord bridge / AI agent
```

The first prototype used Health Sync to export Samsung Health data into Google Drive CSV files. Google Apps Script read those CSV files, calculated steps, average heart rate, and sleep, then sent messages to Discord or Telegram. Discord webhooks later hit rate-limit behavior, so Telegram became the more reliable output.

The main architecture then moved away from Google Drive CSV files because the sync behavior was not smooth enough for a live agent. The selected connector became Life Dashboard Companion, an Android app that reads Health Connect and sends JSON to a webhook.

Current main pipeline:

```text
Galaxy Fit3
  -> Samsung Health
  -> Health Connect
  -> Life Dashboard Companion
  -> Google Apps Script Web App webhook
  -> OpenAI Responses API
  -> Telegram
```

The Apps Script webhook receives Life Dashboard JSON, validates a shared secret, parses metrics, sends those metrics to OpenAI, and posts the resulting wellness check-in to Telegram. If OpenAI fails, the script sends a rule-based fallback message.

Supported parsed metrics include:

- Steps
- Heart rate
- Sleep using `duration_seconds`
- Blood oxygen / oxygen saturation
- Exercise, if present

The desired AI message style is a live check-in, not a daily report. It should be one paragraph, casual, friendly, and compact. It should not include a title, date, time, header, bullet points, or separated lines. It must end exactly with:

```text
Wellness check only — not medical advice.
```

The agent must stay within wellness guidance. It must not diagnose, prescribe medication, provide treatment plans, or claim wearable data is perfectly accurate. If blood oxygen is low, it should calmly suggest rechecking with a proper pulse oximeter. If symptoms are serious, unusual, or urgent, it should suggest getting medical help.

Optional Discord output is handled through an external bridge/backend. Direct Apps Script -> Discord API calls should be treated as blocked/unreliable because testing showed HTTP 403 code 40333 from Google Apps Script even when the same Discord bot token and channel ID work from a PC.

Important security history: early prototype values included exposed tokens and secrets in screenshots/chat. Those values should be treated as compromised and rotated. This repository stores only property names and never real secrets.
