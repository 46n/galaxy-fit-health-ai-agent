/**
 * health-wearable-agent
 *
 * Main pipeline:
 * Life Dashboard Companion -> Apps Script Web App -> OpenAI -> Telegram
 * Optional output:
 * Apps Script -> Discord Bot REST API
 */

const OPENAI_MODEL = "gpt-5.4-mini";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const TELEGRAM_MESSAGE_LIMIT = 3900;
const DISCORD_MESSAGE_LIMIT = 1900;

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function getScriptProperty(name, required) {
  const value = PropertiesService.getScriptProperties().getProperty(name);

  if (required && !value) {
    throw new Error("Missing " + name + " in Script Properties.");
  }

  return value || "";
}

function getOpenAiApiKey() {
  return getScriptProperty("OPENAI_API_KEY", true);
}

function getTelegramConfig() {
  return {
    token: getScriptProperty("TELEGRAM_BOT_TOKEN", true),
    chatId: getScriptProperty("TELEGRAM_CHAT_ID", true)
  };
}

function getWebhookSecret() {
  return getScriptProperty("WEBHOOK_SECRET", true);
}

function getDiscordBotConfig() {
  return {
    token: getScriptProperty("DISCORD_BOT_TOKEN", false),
    channelId: getScriptProperty("DISCORD_CHANNEL_ID", false)
  };
}

function isDiscordBotConfigured() {
  const config = getDiscordBotConfig();
  return Boolean(config.token && config.channelId);
}

// ---------------------------------------------------------------------------
// Web app handlers
// ---------------------------------------------------------------------------

function doGet(e) {
  return jsonResponse({
    status: "ok",
    message: "health-wearable-agent webhook is alive"
  });
}

function doPost(e) {
  try {
    validateWebhookSecret(e);

    const data = parseRequestJson(e);
    Logger.log("Received Life Dashboard payload:");
    Logger.log(JSON.stringify(data, null, 2));

    const metrics = extractLifeDashboardMetrics(data);
    let message;

    try {
      message = generateAiHealthAgentMessage(metrics);
    } catch (error) {
      Logger.log("AI summary failed: " + error);
      message = buildLifeDashboardSummaryMessage(data);
    }

    sendTelegramMessage(message);

    if (isDiscordBotConfigured()) {
      sendDiscordBotMessage(message);
    }

    return jsonResponse({
      status: "ok",
      message: "Health payload received"
    });
  } catch (error) {
    Logger.log("Webhook error: " + error);

    try {
      sendTelegramMessage("Webhook error: " + String(error));
    } catch (notifyError) {
      Logger.log("Telegram error notification failed: " + notifyError);
    }

    return jsonResponse({
      status: "error",
      message: String(error)
    });
  }
}

function validateWebhookSecret(e) {
  const expectedSecret = getWebhookSecret();
  const incomingSecret = e && e.parameter ? e.parameter.secret : "";

  if (incomingSecret !== expectedSecret) {
    throw new Error("Unauthorized webhook request.");
  }
}

function parseRequestJson(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing request body.");
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("Invalid JSON body: " + error);
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Life Dashboard metric parsers
// ---------------------------------------------------------------------------

function extractLifeDashboardMetrics(data) {
  const bloodOxygen = getBloodOxygenFromPayload(data);

  return {
    raw_timestamp: data.timestamp || new Date().toISOString(),
    source: data.source || "health_connect",
    steps: getTotalStepsFromPayload(data),
    avg_heart_rate: getAverageHeartRateFromPayload(data),
    sleep_hours: getSleepHoursFromPayload(data),
    exercise_minutes: getExerciseMinutesFromPayload(data),
    blood_oxygen_avg: bloodOxygen ? roundToOneDecimal(bloodOxygen.avg) : null,
    blood_oxygen_min: bloodOxygen ? roundToOneDecimal(bloodOxygen.min) : null,
    blood_oxygen_max: bloodOxygen ? roundToOneDecimal(bloodOxygen.max) : null
  };
}

function getTotalStepsFromPayload(data) {
  const stepsData = firstArray(data.steps, data.step_count, data.stepCount);

  if (!stepsData) {
    return null;
  }

  let total = 0;

  stepsData.forEach(function(item) {
    const value = firstNumber(item.count, item.steps, item.value);
    if (value !== null) {
      total += value;
    }
  });

  return total > 0 ? total : null;
}

function getAverageHeartRateFromPayload(data) {
  const heartData = firstArray(
    data.heart_rate,
    data.heartRate,
    data.heart_rates,
    data.heartRates
  );

  if (!heartData) {
    return null;
  }

  const values = [];

  heartData.forEach(function(record) {
    addHeartRateValue(values, record.beats_per_minute);
    addHeartRateValue(values, record.beatsPerMinute);
    addHeartRateValue(values, record.bpm);
    addHeartRateValue(values, record.value);

    if (Array.isArray(record.samples)) {
      record.samples.forEach(function(sample) {
        addHeartRateValue(values, sample.beats_per_minute);
        addHeartRateValue(values, sample.beatsPerMinute);
        addHeartRateValue(values, sample.bpm);
        addHeartRateValue(values, sample.value);
      });
    }
  });

  return average(values);
}

function addHeartRateValue(values, rawValue) {
  if (typeof rawValue === "number" && rawValue > 30 && rawValue < 220) {
    values.push(rawValue);
  }
}

function getSleepHoursFromPayload(data) {
  const sleepData = firstArray(
    data.sleep,
    data.sleep_sessions,
    data.sleepSessions
  );

  if (!sleepData) {
    return null;
  }

  let totalSeconds = 0;

  sleepData.forEach(function(session) {
    const durationSeconds = firstNumber(
      session.duration_seconds,
      session.durationSeconds
    );

    if (durationSeconds !== null) {
      totalSeconds += durationSeconds;
      return;
    }

    const durationMinutes = firstNumber(
      session.duration_minutes,
      session.durationMinutes
    );

    if (durationMinutes !== null) {
      totalSeconds += durationMinutes * 60;
      return;
    }

    const start = firstString(
      session.start_time,
      session.startTime,
      session.session_start_time,
      session.sessionStartTime
    );

    const end = firstString(
      session.end_time,
      session.endTime,
      session.session_end_time,
      session.sessionEndTime
    );

    if (start && end) {
      const seconds = (new Date(end) - new Date(start)) / 1000;

      if (seconds > 0 && seconds < 24 * 60 * 60) {
        totalSeconds += seconds;
        return;
      }
    }

    if (Array.isArray(session.stages)) {
      session.stages.forEach(function(stage) {
        const stageSeconds = firstNumber(
          stage.duration_seconds,
          stage.durationSeconds
        );

        if (stageSeconds !== null) {
          totalSeconds += stageSeconds;
        }
      });
    }
  });

  return totalSeconds > 0 ? totalSeconds / 3600 : null;
}

function getExerciseMinutesFromPayload(data) {
  const exerciseData = firstArray(
    data.exercise,
    data.exercises,
    data.exercise_sessions,
    data.exerciseSessions
  );

  if (!exerciseData) {
    return null;
  }

  let totalMinutes = 0;

  exerciseData.forEach(function(item) {
    const durationMinutes = firstNumber(
      item.duration_minutes,
      item.durationMinutes
    );

    if (durationMinutes !== null) {
      totalMinutes += durationMinutes;
      return;
    }

    const durationSeconds = firstNumber(
      item.duration_seconds,
      item.durationSeconds
    );

    if (durationSeconds !== null) {
      totalMinutes += durationSeconds / 60;
      return;
    }

    const start = firstString(item.start_time, item.startTime);
    const end = firstString(item.end_time, item.endTime);

    if (start && end) {
      const minutes = (new Date(end) - new Date(start)) / 1000 / 60;

      if (minutes > 0 && minutes < 24 * 60) {
        totalMinutes += minutes;
      }
    }
  });

  return totalMinutes > 0 ? totalMinutes : null;
}

function getBloodOxygenFromPayload(data) {
  const oxygenData = firstArray(
    data.oxygen_saturation,
    data.oxygenSaturation,
    data.blood_oxygen,
    data.bloodOxygen,
    data.spo2
  );

  if (!oxygenData) {
    return null;
  }

  const values = [];

  oxygenData.forEach(function(record) {
    addOxygenValue(values, record.percentage);
    addOxygenValue(values, record.value);
    addOxygenValue(values, record.spo2);
    addOxygenValue(values, record.oxygen_saturation);
    addOxygenValue(values, record.oxygenSaturation);

    if (Array.isArray(record.samples)) {
      record.samples.forEach(function(sample) {
        addOxygenValue(values, sample.percentage);
        addOxygenValue(values, sample.value);
        addOxygenValue(values, sample.spo2);
        addOxygenValue(values, sample.oxygen_saturation);
        addOxygenValue(values, sample.oxygenSaturation);
      });
    }
  });

  if (values.length === 0) {
    return null;
  }

  return {
    avg: average(values),
    min: Math.min.apply(null, values),
    max: Math.max.apply(null, values)
  };
}

function addOxygenValue(values, rawValue) {
  if (typeof rawValue !== "number") {
    return;
  }

  let value = rawValue;

  if (value > 0 && value <= 1) {
    value = value * 100;
  }

  if (value >= 70 && value <= 100) {
    values.push(value);
  }
}

// ---------------------------------------------------------------------------
// OpenAI health message
// ---------------------------------------------------------------------------

function generateAiHealthAgentMessage(metrics) {
  const payload = {
    model: OPENAI_MODEL,
    instructions: buildHealthAgentInstructions(),
    input: buildHealthAgentInput(metrics),
    max_output_tokens: 650
  };

  const response = UrlFetchApp.fetch(OPENAI_RESPONSES_URL, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + getOpenAiApiKey()
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const text = response.getContentText();

  Logger.log("OpenAI HTTP Status: " + status);

  if (status < 200 || status >= 300) {
    throw new Error("OpenAI API failed with HTTP " + status + ": " + text);
  }

  const body = JSON.parse(text);
  const outputText = extractOpenAIText(body);

  if (!outputText) {
    throw new Error("OpenAI response did not contain readable text.");
  }

  return normalizeAiMessage(outputText);
}

function buildHealthAgentInstructions() {
  return [
    "You are a casual wearable-health check-in assistant.",
    "Turn the user's latest wearable data into one friendly Telegram message.",
    "This is a live sync/check-in, not a final daily summary.",
    "Do not include a title, date, time, header, bullet points, or separated lines.",
    "Use one natural paragraph only.",
    "Sound casual, friendly, and Gen Z-ish, but not cringe.",
    "Sound like a smart friend checking in, not a doctor and not a formal report.",
    "You may use words like lowkey, rn, kinda, solid, and ngl, but do not overdo it.",
    "Use emojis beside metric numbers/readings, not at the start of every sentence.",
    "Good examples: 8.7h, 1,155 steps, 70 bpm heart, 93% oxygen.",
    "Mention sleep, steps/activity, heart rate, blood oxygen, and exercise if available.",
    "Give one simple next move based on the data.",
    "Do not diagnose, recommend medication, or give clinical treatment plans.",
    "Do not claim wearable data is perfectly accurate.",
    "If blood oxygen is low, calmly suggest rechecking with a proper pulse oximeter.",
    "If symptoms are serious, unusual, or urgent, suggest getting medical help.",
    "Stay strictly focused on wearable health data and general wellness.",
    "End exactly with: Wellness check only — not medical advice."
  ].join("\n");
}

function buildHealthAgentInput(metrics) {
  return [
    "Create a casual Telegram wearable-health check-in from this data:",
    JSON.stringify(metrics, null, 2),
    "",
    "Output requirements:",
    "One paragraph only. No title. No date. No time. No formal header.",
    "No bullet points and no separated lines.",
    "Put emojis beside the numbers/readings, not at the start of the sentence.",
    "Make it conversational and useful, but compact.",
    "End the same paragraph with exactly: Wellness check only — not medical advice."
  ].join("\n");
}

function extractOpenAIText(body) {
  if (body && typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text;
  }

  if (!body || !Array.isArray(body.output)) {
    return null;
  }

  const parts = [];

  body.output.forEach(function(item) {
    if (item.type === "message" && Array.isArray(item.content)) {
      item.content.forEach(function(contentItem) {
        if (typeof contentItem.text === "string") {
          parts.push(contentItem.text);
        }

        if (typeof contentItem.output_text === "string") {
          parts.push(contentItem.output_text);
        }
      });
    }
  });

  return parts.length > 0 ? parts.join("\n") : null;
}

function normalizeAiMessage(message) {
  const requiredEnding = "Wellness check only — not medical advice.";
  let text = String(message || "").replace(/\s+/g, " ").trim();

  if (!text.endsWith(requiredEnding)) {
    text = text.replace(/Wellness check only.*$/i, "").trim();
    text = text + " " + requiredEnding;
  }

  return text;
}

// ---------------------------------------------------------------------------
// Telegram sender
// ---------------------------------------------------------------------------

function sendTelegramMessage(message) {
  const config = getTelegramConfig();
  const url = "https://api.telegram.org/bot" + config.token + "/sendMessage";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: config.chatId,
      text: truncateMessage(message, TELEGRAM_MESSAGE_LIMIT)
    }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  Logger.log("Telegram HTTP Status: " + status);

  if (status < 200 || status >= 300) {
    throw new Error("Telegram API failed with HTTP " + status + ": " + response.getContentText());
  }
}

// ---------------------------------------------------------------------------
// Optional Discord bot sender
// ---------------------------------------------------------------------------

function sendDiscordBotMessage(message) {
  const config = getDiscordBotConfig();

  if (!config.token || !config.channelId) {
    Logger.log("Discord bot output skipped because it is not configured.");
    return;
  }

  const url = DISCORD_API_BASE_URL + "/channels/" + config.channelId + "/messages";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bot " + config.token
    },
    payload: JSON.stringify({
      content: truncateMessage(message, DISCORD_MESSAGE_LIMIT)
    }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  Logger.log("Discord bot HTTP Status: " + status);

  if (status < 200 || status >= 300) {
    throw new Error("Discord Bot API failed with HTTP " + status + ": " + response.getContentText());
  }
}

// ---------------------------------------------------------------------------
// Fallback message and test helpers
// ---------------------------------------------------------------------------

function buildLifeDashboardSummaryMessage(data) {
  const metrics = extractLifeDashboardMetrics(data);
  const parts = [];

  if (metrics.sleep_hours !== null) {
    parts.push("Sleep is at " + metrics.sleep_hours.toFixed(1) + "h.");
  }

  if (metrics.steps !== null) {
    parts.push("Steps are at " + Math.round(metrics.steps) + ".");
  }

  if (metrics.avg_heart_rate !== null) {
    parts.push("Heart rate is averaging " + metrics.avg_heart_rate.toFixed(1) + " bpm.");
  }

  if (metrics.blood_oxygen_avg !== null) {
    parts.push(
      "Blood oxygen is averaging " +
      metrics.blood_oxygen_avg.toFixed(1) +
      "%, with a low of " +
      metrics.blood_oxygen_min.toFixed(1) +
      "%."
    );
  }

  if (metrics.exercise_minutes !== null) {
    parts.push("Exercise logged is " + Math.round(metrics.exercise_minutes) + " minutes.");
  }

  if (parts.length === 0) {
    parts.push("No readable wearable metrics came through in this sync.");
  }

  if (metrics.blood_oxygen_min !== null && metrics.blood_oxygen_min < 90) {
    parts.push("Blood oxygen appears low; recheck with a proper pulse oximeter and get medical help if symptoms feel serious, unusual, or urgent.");
  } else if (metrics.blood_oxygen_avg !== null && metrics.blood_oxygen_avg < 95) {
    parts.push("Blood oxygen is a bit below the usual range, so recheck with a proper pulse oximeter if this keeps showing up.");
  }

  parts.push("Wellness check only — not medical advice.");

  return parts.join(" ");
}

function testTelegram() {
  sendTelegramMessage("health-wearable-agent Telegram test message");
}

function testDiscordBot() {
  sendDiscordBotMessage("health-wearable-agent Discord bot test message");
}

function testOpenAI() {
  const message = generateAiHealthAgentMessage({
    raw_timestamp: new Date().toISOString(),
    source: "health_connect",
    steps: 1155,
    avg_heart_rate: 70,
    sleep_hours: 8.7,
    exercise_minutes: null,
    blood_oxygen_avg: 93,
    blood_oxygen_min: 93,
    blood_oxygen_max: 93
  });

  sendTelegramMessage(message);
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function firstArray() {
  for (let i = 0; i < arguments.length; i++) {
    if (Array.isArray(arguments[i])) {
      return arguments[i];
    }
  }

  return null;
}

function firstNumber() {
  for (let i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] === "number" && !isNaN(arguments[i])) {
      return arguments[i];
    }
  }

  return null;
}

function firstString() {
  for (let i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] === "string" && arguments[i]) {
      return arguments[i];
    }
  }

  return "";
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return values.reduce(function(total, value) {
    return total + value;
  }, 0) / values.length;
}

function roundToOneDecimal(value) {
  return Number(value.toFixed(1));
}

function truncateMessage(message, limit) {
  const text = String(message || "No message provided").trim();

  if (text.length <= limit) {
    return text;
  }

  return text.substring(0, limit - 3).trim() + "...";
}
