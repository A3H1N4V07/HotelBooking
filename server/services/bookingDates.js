const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_NIGHTS = 30;
const MAX_GUESTS = 20;

// Parses a "YYYY-MM-DD" string as a UTC midnight timestamp, or null if invalid
// (rejects impossible dates like 2026-02-31 that Date would roll over).
function parseDateOnly(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return null;
  }

  const time = Date.parse(`${value}T00:00:00Z`);

  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    return null;
  }

  return time;
}

// Validates a stay and returns { nights, guests } or { error }.
// `now` is injectable for tests.
function validateStay({ checkInDate, checkOutDate, guests }, now = Date.now()) {
  const checkIn = parseDateOnly(checkInDate);
  const checkOut = parseDateOnly(checkOutDate);

  if (checkIn === null || checkOut === null) {
    return { error: "Dates must be valid and in YYYY-MM-DD format" };
  }

  // Allow one day of slack so guests ahead of the server's UTC clock
  // can still book "today".
  const todayUtc = Math.floor(now / MS_PER_DAY) * MS_PER_DAY;

  if (checkIn < todayUtc - MS_PER_DAY) {
    return { error: "Check-in date cannot be in the past" };
  }

  const nights = Math.round((checkOut - checkIn) / MS_PER_DAY);

  if (nights < 1) {
    return { error: "Check-out date must be after check-in date" };
  }

  if (nights > MAX_NIGHTS) {
    return { error: `Stays are limited to ${MAX_NIGHTS} nights` };
  }

  const guestCount = Number(guests);

  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > MAX_GUESTS) {
    return { error: `Guests must be a whole number between 1 and ${MAX_GUESTS}` };
  }

  return { nights, guests: guestCount };
}

module.exports = { validateStay, parseDateOnly, MAX_NIGHTS, MAX_GUESTS };
