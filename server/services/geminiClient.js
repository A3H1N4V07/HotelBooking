const GEMINI_MODEL = "gemini-2.5-flash-lite";
const MAX_USER_TEXT_LENGTH = 500;

// Calls Gemini with fixed instructions and the user's text kept in a separate
// message, so user input is treated as data rather than as instructions.
// Returns the parsed JSON matching `responseSchema`.
async function generateJson({ systemInstruction, userText, responseSchema }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in server/.env");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header instead of ?key= so the key never lands in URL/proxy logs.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userText.slice(0, MAX_USER_TEXT_LENGTH) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned no content");
  }

  return JSON.parse(text);
}

module.exports = { generateJson, MAX_USER_TEXT_LENGTH };
