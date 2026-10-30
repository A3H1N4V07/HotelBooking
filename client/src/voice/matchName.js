// Loose name matching for spoken hotel and room names: "grand retreat
// hotel" finds "The Grand Retreat", "the family suite" finds "Family Suite".

const FILLER_WORDS = new Set(["the", "a", "an", "hotel", "room", "please", "one", "for", "me"]);

const words = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER_WORDS.has(w));

// Share of the spoken words found in the name (0..1), allowing small
// recognition slips ("retreet" ~ "retreat").
function score(spoken, name) {
  const said = words(spoken);
  const target = words(name);

  if (said.length === 0 || target.length === 0) return 0;

  const close = (a, b) => a === b || (a.length > 3 && b.length > 3 && (a.startsWith(b) || b.startsWith(a) || editDistance(a, b) <= 1));
  const hits = said.filter((w) => target.some((t) => close(w, t))).length;

  // Penalise names with many words the user didn't say ("Grand" vs "Grand Retreat Palace").
  return (hits / said.length) * Math.min(1, (hits + 1) / target.length);
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

// Best match among `items` (strings, or objects with `name`), or null when
// nothing is a reasonable match.
export function matchByName(items, spoken, minScore = 0.6) {
  let best = null;
  let bestScore = 0;

  for (const item of items || []) {
    const name = typeof item === "string" ? item : item.name;
    const s = score(spoken, name);
    if (s > bestScore) {
      best = item;
      bestScore = s;
    }
  }

  return bestScore >= minScore ? best : null;
}
