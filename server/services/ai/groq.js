const { toJsonSchema } = require("./jsonSchema");

// Groq (groq.com): OpenAI-compatible chat API with a generous free tier and
// very low latency, which suits voice. Configure with GROQ_API_KEY; optional
// GROQ_MODEL and GROQ_BASE_URL.
// Chosen by a 12-question evaluation: 120b answered 9/12 correctly vs 7/12
// for gpt-oss-20b, used fewer tokens per call, at ~1-3 s per answer.
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

// Models without json_schema support reject it with a 400; remember that and
// use plain JSON mode for them from then on.
const jsonSchemaUnsupported = new Set();

// The free tier allows 8,000 tokens a minute, so a few quick questions in a
// row hit a 429 that clears within seconds. Waits up to this long and retries
// once; longer waits (e.g. the daily quota) are reported to the caller.
const MAX_WAIT_MS = 4000;

// Groq's Retry-After header, in ms (null when missing).
function retryAfterMs(response) {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });

const name = "groq";

function isConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

async function request({ model, systemInstruction, userText, responseSchema, mode, signal }) {
  const responseFormat =
    mode === "json_schema"
      ? { type: "json_schema", json_schema: { name: "result", schema: toJsonSchema(responseSchema) } }
      : { type: "json_object" };

  // JSON mode only guarantees *some* JSON, so the schema goes in the prompt
  // too (and it must mention "JSON"). Callers validate the result anyway.
  const system =
    mode === "json_schema"
      ? systemInstruction
      : `${systemInstruction}\n\nReply with only a JSON object matching this JSON Schema:\n${JSON.stringify(toJsonSchema(responseSchema))}`;

  return fetch(`${process.env.GROQ_BASE_URL || DEFAULT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userText },
      ],
      response_format: responseFormat,
      // The free tier allows ~8,000 tokens a minute (~1,150 per voice call).
      // Caps a runaway reply. (Lowering gpt-oss reasoning effort saved only
      // ~5% and dropped details like "next month", so it's left at default.)
      max_completion_tokens: 600,
    }),
    signal,
  });
}

async function generate({ systemInstruction, userText, responseSchema, signal }) {
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  let mode = jsonSchemaUnsupported.has(model) ? "json_object" : "json_schema";

  let response = await request({ model, systemInstruction, userText, responseSchema, mode, signal });

  if (response.status === 400 && mode === "json_schema") {
    const body = await response.text();
    if (/json_validate_failed/i.test(body)) {
      // The model occasionally writes JSON that fails the strict schema check.
      // Retry once in plain JSON mode; callers validate the result anyway.
      mode = "json_object";
      response = await request({ model, systemInstruction, userText, responseSchema, mode, signal });
    } else if (/response.?format|json_schema/i.test(body)) {
      jsonSchemaUnsupported.add(model);
      mode = "json_object";
      response = await request({ model, systemInstruction, userText, responseSchema, mode, signal });
    } else {
      const error = new Error(`Groq request failed: 400 ${body}`);
      throw error;
    }
  }

  if (response.status === 429) {
    const waitMs = retryAfterMs(response);
    if (waitMs !== null && waitMs <= MAX_WAIT_MS) {
      await sleep(waitMs, signal);
      response = await request({ model, systemInstruction, userText, responseSchema, mode, signal });
    }
  }

  if (!response.ok) {
    const error = new Error(`Groq request failed: ${response.status} ${await response.text()}`);
    // 429 = rate limit (tokens per minute) or daily quota on the free tier.
    error.aiLimited = response.status === 429;
    error.retryAfterMs = response.status === 429 ? retryAfterMs(response) : null;
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error("Groq returned no content");

  return JSON.parse(text);
}

module.exports = { name, isConfigured, generate };
