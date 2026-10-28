export function cleanSpeech(text) {
  return text.replace(/[.,!?]+$/, "").trim();
}