const { Hotel, sequelize } = require("../models");
const { backfillHotels } = require("./backfillHotelData");

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

const CITIES = [
  { city: "Goa", state: "Goa" },
  { city: "Delhi", state: "Delhi" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Kochi", state: "Kerala" },
  { city: "Mysore", state: "Karnataka" },
  { city: "Shimla", state: "Himachal Pradesh" },
  { city: "Manali", state: "Himachal Pradesh" },
];

const HOTELS_PER_CITY = 10;

const CATEGORIES = [
  { name: "Budget", minPrice: 800, maxPrice: 2500, query: "budget hotel room" },
  { name: "Business", minPrice: 2500, maxPrice: 6000, query: "business hotel" },
  { name: "Family", minPrice: 2000, maxPrice: 5000, query: "family resort" },
  { name: "Luxury", minPrice: 6000, maxPrice: 15000, query: "luxury hotel" },
];

const NAME_PREFIXES = [
  "The Grand", "Royal", "Blue Orchid", "Golden", "Sunrise", "Silver Sands",
  "Palm Grove", "Heritage", "Urban", "Emerald", "Coral Bay", "Mountain View",
  "Lakeside", "Spice", "Amber", "Crimson", "Ivory", "Copper", "Whistling Pines",
  "Riverside",
];

const NAME_SUFFIXES = [
  "Palace", "Residency", "Retreat", "Inn", "Suites", "Resort", "Grand Hotel",
  "Plaza", "Heights", "Villas", "Court", "Manor", "Lodge", "Towers", "Gardens",
];

const AREA_NAMES = [
  "MG Road", "Main Market Road", "Beach Road", "Airport Road", "Station Road",
  "Lake View Road", "Hill Road", "City Center", "Mall Road", "Church Street",
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function buildHotelName(usedNames) {
  let name;
  let attempts = 0;

  do {
    name = `${pick(NAME_PREFIXES)} ${pick(NAME_SUFFIXES)}`;
    attempts++;
  } while (usedNames.has(name) && attempts < 20);

  usedNames.add(name);
  return name;
}

async function fetchCategoryImages(query) {
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=40`,
    {
      headers: { Authorization: PEXELS_API_KEY },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Pexels request failed for "${query}": ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.photos || data.photos.length === 0) {
    throw new Error(`Pexels returned no photos for "${query}"`);
  }

  return data.photos.map((photo) => photo.src.large);
}

async function buildHotels() {
  const imagesByCategory = {};

  for (const category of CATEGORIES) {
    imagesByCategory[category.name] = await fetchCategoryImages(category.query);
  }

  const imageIndexByCategory = {};
  const hotels = [];

  CITIES.forEach(({ city, state }) => {
    const usedNames = new Set();

    for (let i = 0; i < HOTELS_PER_CITY; i++) {
      const category = CATEGORIES[i % CATEGORIES.length];
      const price = randomInt(category.minPrice, category.maxPrice);
      const rating = Number((Math.random() * 1.7 + 3.2).toFixed(1));

      const images = imagesByCategory[category.name];
      const nextIndex = (imageIndexByCategory[category.name] || 0) % images.length;
      imageIndexByCategory[category.name] = nextIndex + 1;

      hotels.push({
        name: buildHotelName(usedNames),
        city,
        state,
        address: `${randomInt(1, 200)}, ${pick(AREA_NAMES)}, ${city}`,
        description: `A ${category.name.toLowerCase()}-friendly hotel in the heart of ${city}, offering a comfortable stay with easy access to major attractions.`,
        price,
        rating,
        image: images[nextIndex],
        phone: `+91-9${randomInt(100000000, 999999999)}`,
        category: category.name,
      });
    }
  });

  return hotels;
}

async function seed() {
  try {
    if (!PEXELS_API_KEY) {
      console.error("Missing PEXELS_API_KEY in server/.env. Get a free key at https://www.pexels.com/api/");
      process.exit(1);
    }

    // Tables come from migrations (`npm run db:migrate`), not sync().
    await sequelize.authenticate();

    const existing = await Hotel.count();

    if (existing > 0) {
      console.log(`Hotels table already has ${existing} rows. Skipping seed.`);
      process.exit(0);
    }

    const hotels = await buildHotels();
    await Hotel.bulkCreate(hotels);

    console.log(`Seeded ${hotels.length} hotels across ${CITIES.length} cities.`);

    // Location, amenities, room types and descriptions for the new hotels.
    await backfillHotels();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();