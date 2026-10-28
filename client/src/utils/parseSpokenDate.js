import * as chrono from "chrono-node";

export function parseSpokenDate(text) {
  const parsed = chrono.parseDate(text);

  if (!parsed) return "";

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}