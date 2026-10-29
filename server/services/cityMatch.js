// Maps what people type or say to the city names stored in the Hotels table,
// e.g. "Bengaluru" / "Bengalore" -> "Bangalore". Deterministic: an alias table
// first, then the closest known city by edit distance.

// Official/old names that are too different for edit distance to catch.
const ALIASES = {
  bengaluru: "Bangalore",
  bombay: "Mumbai",
  madras: "Chennai",
  cochin: "Kochi",
  mysuru: "Mysore",
  "new delhi": "Delhi",
  panaji: "Goa",
};

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

// Returns the stored city name to search for, or the input unchanged when
// it already matches (as a substring) or nothing is close enough.
function resolveCity(input, knownCities) {
  const query = String(input || "").trim().toLowerCase();

  if (!query) return input;

  if (ALIASES[query]) return ALIASES[query];

  if (knownCities.some((city) => city.toLowerCase().includes(query))) {
    return input;
  }

  // Allow roughly one typo per four letters ("bengalore" -> "bangalore" is 1).
  const maxDistance = Math.max(1, Math.floor(query.length / 4));
  let best = null;
  let bestDistance = Infinity;

  for (const city of knownCities) {
    const distance = editDistance(query, city.toLowerCase());

    if (distance < bestDistance) {
      best = city;
      bestDistance = distance;
    }
  }

  return bestDistance <= maxDistance ? best : input;
}

module.exports = { resolveCity, editDistance };
