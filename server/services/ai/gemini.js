// Google Gemini. Configure with GEMINI_API_KEY; optional GEMINI_MODEL.
// The free tier's daily quota can be very small, so it's the backup provider.
const DEFAULT_MODEL = "gemini-2.5-flash-lite";

const name = "gemini";

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function generate({ systemInstruction, userText, responseSchema, signal }) {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const response = await fetch(
    `${process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta"}/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header instead of ?key= so the key never lands in URL/proxy logs.
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
      signal,
    }
  );

  if (!response.ok) {
    const error = new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
    // 429 = quota/rate limit (the free tier allows few requests per day).
    error.aiLimited = response.status === 429;
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned no content");
  }

  return JSON.parse(text);
}

module.exports = { name, isConfigured, generate };
