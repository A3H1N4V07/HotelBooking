const { Op } = require("sequelize");
const { PlaceCache } = require("../models");
const { distanceKm } = require("./geo");

// Real-world places from OpenStreetMap's Nominatim search, for "how far is it
// from Fort Aguada?" and "any restaurants nearby?". It's a free public service
// with usage rules: identify the app (User-Agent), at most 1 request per
// second across the whole app, cache results, and show "© OpenStreetMap
// contributors" with the data. Everything is cached in PlaceCaches. For heavy
// or commercial use, point NOMINATIM_URL at your own or a paid instance.
// (OSM's Overpass API was tried for "nearby", but its public servers took 20+
// seconds, too slow for voice; Nominatim answers in 1-4 s.)

const NOMINATIM_URL = () => process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
const USER_AGENT = () =>
  `EchoStay/1.0 (hotel booking app${process.env.OSM_CONTACT_EMAIL ? `; ${process.env.OSM_CONTACT_EMAIL}` : ""})`;

const ATTRIBUTION = "© OpenStreetMap contributors";
const GEOCODE_TTL_DAYS = 30;
const NEARBY_TTL_DAYS = 7;
const NOMINATIM_GAP_MS = 1100;
const TIMEOUT_MS = 8000;
const NEARBY_RADIUS_KM = 1.2;

// Search words for each category (tried in order until something is found).
const CATEGORY_QUERIES = {
  restaurant: ["restaurant"],
  cafe: ["cafe"],
  bar: ["bar", "pub"],
  atm: ["atm"],
  pharmacy: ["pharmacy"],
  hospital: ["hospital", "clinic"],
  supermarket: ["supermarket"],
  attraction: ["attraction", "museum"],
  beach: ["beach"],
};
const CATEGORIES = Object.keys(CATEGORY_QUERIES);

// ----- cache -----
async function cached(key, ttlDays, load) {
  const hit = await PlaceCache.findOne({ where: { key, expiresAt: { [Op.gt]: new Date() } } });
  if (hit) return hit.data === null ? null : JSON.parse(hit.data);

  const value = await load();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await PlaceCache.upsert({ key, data: value === null ? null : JSON.stringify(value), expiresAt });
  return value;
}

// ----- Nominatim: at most one request per second, app-wide -----
let queue = Promise.resolve();
let lastRequestAt = 0;

function nominatim(path) {
  const run = queue.then(async () => {
    const wait = lastRequestAt + NOMINATIM_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();

    const response = await fetch(`${NOMINATIM_URL()}${path}`, {
      headers: { "User-Agent": USER_AGENT(), Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    return response.json();
  });

  queue = run.catch(() => {}); // a failure mustn't block the queue
  return run;
}

// "Fort Aguada" (+ "Goa") -> { name, lat, lng } or null if not found.
async function geocode(place, city) {
  const name = String(place || "").trim();
  if (!name) return null;

  const key = `geo:${name.toLowerCase()}|${String(city || "").toLowerCase()}`;

  return cached(key, GEOCODE_TTL_DAYS, async () => {
    const query = [name, city, "India"].filter(Boolean).join(", ");
    const results = await nominatim(`/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`);

    if (!results.length) return null;

    const top = results[0];
    return { name: top.name || top.display_name.split(",")[0], lat: Number(top.lat), lng: Number(top.lon) };
  });
}

// Named places of `category` within ~1 km of a point, nearest first.
async function nearby(lat, lng, category) {
  const queries = CATEGORY_QUERIES[category];
  if (!queries) throw new Error(`Unknown place category: ${category}`);

  const key = `near:${category}:${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;

  return cached(key, NEARBY_TTL_DAYS, async () => {
    // A box of about ±1.2 km around the point.
    const dLat = NEARBY_RADIUS_KM / 111;
    const dLng = NEARBY_RADIUS_KM / (111 * Math.cos((lat * Math.PI) / 180));
    const viewbox = [lng - dLng, lat + dLat, lng + dLng, lat - dLat].map((n) => n.toFixed(5)).join(",");

    for (const q of queries) {
      const results = await nominatim(
        `/search?format=jsonv2&limit=20&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(q)}`
      );

      const seen = new Set();
      const found = results
        .filter((r) => r.name && !seen.has(r.name) && seen.add(r.name))
        .map((r) => ({
          name: r.name,
          type: r.type,
          km: Math.round(distanceKm({ latitude: lat, longitude: lng }, { latitude: Number(r.lat), longitude: Number(r.lon) }) * 100) / 100,
        }))
        .filter((p) => p.km <= NEARBY_RADIUS_KM)
        .sort((a, b) => a.km - b.km)
        .slice(0, 8);

      if (found.length) return found;
    }

    return [];
  });
}

module.exports = { geocode, nearby, CATEGORIES, ATTRIBUTION };
