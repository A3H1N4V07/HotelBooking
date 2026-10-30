// Spoken replies via the browser's built-in text-to-speech (free, offline in
// most browsers). Prefers an Indian English voice when one is installed.

export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();

  return (
    voices.find((v) => v.lang === "en-IN") ||
    voices.find((v) => v.lang?.startsWith("en-GB")) ||
    voices.find((v) => v.lang?.startsWith("en")) ||
    null
  );
}

// Speaks `text`, replacing anything still being said. Resolves when done
// (or immediately when speech isn't available).
export function speak(text) {
  if (!canSpeak || !text) return Promise.resolve();

  return new Promise((resolve) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();

    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "en-IN";
    utterance.rate = 1.05;

    utterance.onend = resolve;
    utterance.onerror = resolve;

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
}
