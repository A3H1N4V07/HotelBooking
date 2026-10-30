const groq = require("./ai/groq");
const gemini = require("./ai/gemini");

const PROVIDERS = { groq, gemini };
const MAX_USER_TEXT_LENGTH = 500;
// Voice needs a quick answer: past this, try the next provider (or give up).
const TIMEOUT_MS = 8000;

// Models sometimes write the text "null" (or "none", "") where they mean a
// real null. Normalise that once here so "null" never becomes a city name.
const NULLISH_TEXT = new Set(["null", "none", "n/a", "undefined", ""]);

function cleanNulls(value) {
  if (typeof value === "string") return NULLISH_TEXT.has(value.trim().toLowerCase()) ? null : value;
  if (Array.isArray(value)) return value.map(cleanNulls).filter((v) => v !== null);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanNulls(v)]));
  }
  return value;
}

// Provider order: AI_PROVIDERS="groq,gemini" (default). Unconfigured ones
// (no API key) are skipped.
function providerChain() {
  return (process.env.AI_PROVIDERS || "groq,gemini")
    .split(",")
    .map((n) => PROVIDERS[n.trim().toLowerCase()])
    .filter((p) => p && p.isConfigured());
}

// Asks the AI for JSON matching `responseSchema`, with fixed instructions and
// the user's text in a separate message so it's treated as data, not
// instructions. Falls back to the next provider when one is rate-limited,
// down or slow. Throws an error with `aiLimited: true` when no provider could
// answer (callers turn that into a clear "AI unavailable" response).
async function generateJson({ systemInstruction, userText, responseSchema }) {
  const chain = providerChain();

  if (chain.length === 0) {
    const error = new Error("No AI provider configured: set GROQ_API_KEY and/or GEMINI_API_KEY in server/.env");
    error.aiLimited = true;
    throw error;
  }

  const failures = [];

  for (const provider of chain) {
    try {
      const result = await provider.generate({
        systemInstruction,
        userText: String(userText).slice(0, MAX_USER_TEXT_LENGTH),
        responseSchema,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return cleanNulls(result);
    } catch (error) {
      const timedOut = error.name === "TimeoutError" || error.name === "AbortError";
      failures.push({ provider: provider.name, error, unavailable: error.aiLimited || error.retryable || timedOut });
      console.warn(`AI provider ${provider.name} failed${timedOut ? " (timeout)" : ""}: ${error.message.slice(0, 200)}`);
    }
  }

  const error = new Error(`All AI providers failed: ${failures.map((f) => f.provider).join(", ")}`);
  // Every provider was rate-limited/down/slow: the AI is unavailable for now.
  error.aiLimited = failures.every((f) => f.unavailable);
  throw error;
}

module.exports = { generateJson, providerChain, cleanNulls, MAX_USER_TEXT_LENGTH };
