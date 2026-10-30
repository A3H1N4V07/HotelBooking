const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Nights between two "YYYY-MM-DD" dates, or 0 if either is missing/invalid
// or check-out isn't after check-in.
export function nightsBetween(checkIn, checkOut) {
  if (!DATE_PATTERN.test(checkIn || "") || !DATE_PATTERN.test(checkOut || "")) return 0;

  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / MS_PER_DAY);

  return nights > 0 ? nights : 0;
}

// 0.45 -> "450 m", 3.24 -> "3.2 km"
export function formatDistance(km) {
  const value = Number(km);

  if (value < 1) return `${Math.max(50, Math.round((value * 1000) / 50) * 50)} m`;

  return `${value.toFixed(1)} km`;
}

// Seconds -> "12:05"
export function formatCountdown(seconds) {
  const s = Math.max(0, Math.floor(seconds));

  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
