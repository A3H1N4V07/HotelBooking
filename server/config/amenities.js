// The only amenities a hotel can have. HotelAmenities stores these codes;
// anything else is rejected, so search filters and AI explanations can rely
// on a fixed vocabulary.
const AMENITIES = [
  { code: "wifi", label: "Free Wi-Fi" },
  { code: "ac", label: "Air conditioning" },
  { code: "breakfast", label: "Breakfast included" },
  { code: "restaurant", label: "Restaurant" },
  { code: "pool", label: "Swimming pool" },
  { code: "parking", label: "Free parking" },
  { code: "gym", label: "Gym" },
  { code: "spa", label: "Spa" },
  { code: "airport_shuttle", label: "Airport shuttle" },
  { code: "family_rooms", label: "Family rooms" },
  { code: "pet_friendly", label: "Pet friendly" },
  { code: "beach_access", label: "Beach access" },
];

const AMENITY_CODES = AMENITIES.map((a) => a.code);
const AMENITY_LABELS = Object.fromEntries(AMENITIES.map((a) => [a.code, a.label]));

module.exports = { AMENITIES, AMENITY_CODES, AMENITY_LABELS };
