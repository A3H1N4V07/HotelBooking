import api from "../api";

// Records how each phrase was handled (locally, by the AI, or not at all)
// and sends the records to the server in small batches, for the admin's
// voice usage numbers. Best effort: a lost batch only skews the stats.

const FLUSH_EVERY_MS = 15000;
const FLUSH_AT = 10;

let queue = [];
let timer = null;

function flush() {
  clearTimeout(timer);
  timer = null;
  if (!queue.length) return;

  const events = queue;
  queue = [];
  api.post("/voice/events", { events }).catch(() => {});
}

// handledBy: local | ai | missed | offline. `phrase` is only sent for phrases
// the local rules missed (the server masks digits too).
export function logVoiceEvent({ handledBy, page, action, ms, phrase }) {
  queue.push({
    handledBy,
    page: page || undefined,
    action: action || undefined,
    ms: Number.isFinite(ms) ? Math.round(ms) : undefined,
    phrase: handledBy === "local" ? undefined : phrase,
  });

  if (queue.length >= FLUSH_AT) flush();
  else if (!timer) timer = setTimeout(flush, FLUSH_EVERY_MS);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
