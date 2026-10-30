const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (Number(degrees) * Math.PI) / 180;

// Straight-line ("as the crow flies") distance between two points, in km.
function distanceKm(a, b) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// "450 m" / "3.2 km"
function formatDistance(km) {
  return km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `${km.toFixed(1)} km`;
}

module.exports = { distanceKm, formatDistance };
