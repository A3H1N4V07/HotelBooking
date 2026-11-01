// Turning spoken phrases into booking values. Speech recognition returns
// numbers sometimes as digits ("2") and sometimes as words ("two").

const SMALL = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALES = { hundred: 100, thousand: 1000, k: 1000, lakh: 100000, lac: 100000 };

// "5000", "5,000", "5k", "five thousand", "two" -> number; null if none.
export function parseSpokenNumber(text) {
  const clean = String(text || "").toLowerCase().replace(/,/g, "").replace(/₹|rs\.?|rupees?/g, " ");

  const numeric = clean.match(/(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac)?\b/);
  if (numeric) return Math.round(Number(numeric[1]) * (SCALES[numeric[2]] || 1));

  let total = 0;
  let current = 0;
  let found = false;

  for (const word of clean.split(/[\s-]+/)) {
    if (word in SMALL) {
      current += SMALL[word];
      found = true;
    } else if (word in SCALES) {
      current = (current || 1) * SCALES[word];
      if (SCALES[word] >= 1000) {
        total += current;
        current = 0;
      }
      found = true;
    }
  }

  return found ? total + current : null;
}

const DIGIT_WORDS = { zero: "0", oh: "0", o: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };

// "nine eight seven 65 double four..." -> "9876544..."
export function parseSpokenPhone(text) {
  const words = String(text || "").toLowerCase().replace(/[^a-z0-9+\s]/g, " ").split(/\s+/);
  let digits = "";
  let repeat = 1;

  for (const word of words) {
    if (word === "double") { repeat = 2; continue; }
    if (word === "triple") { repeat = 3; continue; }

    const value = /^\+?\d+$/.test(word) ? word : DIGIT_WORDS[word];
    if (value === undefined) continue;

    digits += value.length === 1 ? value.repeat(repeat) : value;
    repeat = 1;
  }

  return digits;
}

// Words people use for each amenity code.
const AMENITY_WORDS = [
  ["pool", /\bpool|swimming/],
  ["breakfast", /breakfast/],
  ["wifi", /wi[- ]?fi|internet/],
  ["parking", /parking/],
  ["gym", /\bgym|fitness/],
  ["spa", /\bspa\b|massage/],
  ["restaurant", /restaurant|dining/],
  ["ac", /\bac\b|air ?con/],
  ["airport_shuttle", /shuttle|airport (pick ?up|transfer)/],
  ["family_rooms", /family room/],
  ["pet_friendly", /\bpets?\b|dog/],
  ["beach_access", /beach access|on the beach|beachfront/],
];

export function parseAmenities(text) {
  const lower = String(text || "").toLowerCase();
  return AMENITY_WORDS.filter(([, pattern]) => pattern.test(lower)).map(([code]) => code);
}

const NEAR_WORDS = [
  ["beach", /beach|sea|coast/],
  ["airport", /airport/],
  ["station", /station|railway/],
  ["centre", /cent(er|re)|downtown|city/],
  ["attraction", /sights?|attraction|landmark|tourist/],
];

export function parseNear(text) {
  const lower = String(text || "").toLowerCase();
  return NEAR_WORDS.find(([, pattern]) => pattern.test(lower))?.[0] || "";
}

// "YYYY-MM-DD" + n days
export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// "2026-12-10" -> "10 December"
export function speakDate(isoDate) {
  if (!isoDate) return "";
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "UTC" });
}

// ₹4853 -> "4,853 rupees" (reads better aloud than the ₹ sign)
export function speakPrice(amount) {
  return `${Number(amount).toLocaleString("en-IN")} rupees`;
}

// "new delhi" -> "New Delhi"
export function titleCase(text) {
  return String(text || "").trim().replace(/\s+/g, " ").replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
