// The mic stays on while the assistant speaks, so it also hears the reply
// coming out of the speakers. These tell that echo apart from the user
// talking over the reply.

const words = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

// Share of the heard words that are also in the reply (0..1).
export function echoShare(heard, reply) {
  const said = words(heard);
  if (!said.length) return 0;

  const replyWords = new Set(words(reply));
  return said.filter((w) => replyWords.has(w)).length / said.length;
}

// Mostly the reply's own words: the mic hearing the speakers.
export const isEcho = (heard, reply) => words(heard).length > 0 && echoShare(heard, reply) >= 0.6;

const INTERRUPT_WORDS = /^(?:stop|wait|cancel|quiet|enough|hold|pause)$/;

// While the assistant speaks: is this the user talking over it? Judged on
// the last few words heard, since the recogniser mixes echo and speech.
// Words that are also in the reply can't be told from echo, so "yes" while
// "Say yes or no" is being read waits for the reply to finish.
export function isBargeIn(heard, reply) {
  const recent = words(heard).slice(-4);
  if (recent.length >= 2) return echoShare(recent.join(" "), reply) < 0.5;
  return recent.length === 1 && INTERRUPT_WORDS.test(recent[0]) && echoShare(recent[0], reply) === 0;
}
