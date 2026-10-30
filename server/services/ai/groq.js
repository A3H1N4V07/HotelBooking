const { toJsonSchema } = require("./jsonSchema");

// Groq (groq.com): OpenAI-compatible chat API with a generous free tier and
// very low latency, which suits voice. Configure with GROQ_API_KEY; optional
// GROQ_MODEL and GROQ_BASE_URL.
const DEFAULT_MODEL = "openai/gpt-oss-20b";
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

// Models without json_schema support reject it with a 400; remember that and
// use plain JSON mode for them from then on.
const jsonSchemaUnsupported = new Set();

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
    if (/response.?format|json_schema/i.test(body)) {
      jsonSchemaUnsupported.add(model);
      mode = "json_object";
      response = await request({ model, systemInstruction, userText, responseSchema, mode, signal });
    } else {
      const error = new Error(`Groq request failed: 400 ${body}`);
      throw error;
    }
  }

  if (!response.ok) {
    const error = new Error(`Groq request failed: ${response.status} ${await response.text()}`);
    // 429 = rate limit / daily quota on the free tier.
    error.aiLimited = response.status === 429;
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error("Groq returned no content");

  return JSON.parse(text);
}

module.exports = { name, isConfigured, generate };
