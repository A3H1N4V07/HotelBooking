import * as chrono from "chrono-node";

const ORDINALS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9,
  tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16,
  seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};

const toIso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// "the 14th", "on the twenty first" -> day of month, or null.
function bareDay(text) {
  const t = text.toLowerCase().replace(/^(?:on\s+)?(?:the\s+)?/, "").trim();

  const numeric = t.match(/^(\d{1,2})(?:st|nd|rd|th)?$/);
  if (numeric) return Number(numeric[1]);

  const compound = t.match(/^(twenty|thirty)[\s-](first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)$/);
  if (compound) return (compound[1] === "twenty" ? 20 : 30) + ORDINALS[compound[2]];

  return ORDINALS[t] || null;
}

// Spoken date -> "YYYY-MM-DD" ("" if not understood). Always resolves to a
// date in the future: "5th January" in November means next January. A bare
// day ("the 14th") is the next 14th after `after` ("YYYY-MM-DD", e.g. the
// check-in date when parsing a check-out), or after today.
export function parseSpokenDate(text, after) {
  const base = after ? new Date(`${after}T00:00:00`) : new Date();
  base.setHours(0, 0, 0, 0);

  const day = bareDay(String(text || ""));

  if (day && day <= 31) {
    const candidate = new Date(base.getFullYear(), base.getMonth(), day);
    // On or after today for check-in; strictly after the check-in for check-out.
    if (candidate < base || (after && candidate <= base) || candidate.getDate() !== day) {
      candidate.setMonth(candidate.getMonth() + 1, day);
    }
    return candidate.getDate() === day ? toIso(candidate) : "";
  }

  const parsed = chrono.parseDate(String(text || ""), base, { forwardDate: true });

  return parsed ? toIso(parsed) : "";
}
