// Fills in location, amenities, room types and a factual description for the
// sample hotels created by seedHotels.js.
//
//   npm run backfill:hotels            only hotels that have no room types yet
//   npm run backfill:hotels -- --force regenerate generated data for all sample hotels
//
// The values are generated (the sample hotels are fictional) but they are
// deterministic per hotel id, internally consistent (e.g. "beach access" only
// when the hotel really is next to a beach landmark) and every sentence of
// the description comes from those stored values.
//
// Hotels an admin added by hand are never given invented facts: they only
// get a single "Standard Room" at their listed price so they stay bookable.

require("dotenv").config();
const { Hotel, RoomType, HotelAmenity, Landmark, Booking, sequelize } = require("../models");
const { AMENITY_LABELS } = require("../config/amenities");
const { CITY_GEO, COOL_CLIMATE_CITIES } = require("../config/cityGeo");
const { distanceKm, formatDistance } = require("../services/geo");

// Descriptions that identify generated sample hotels: the one seedHotels.js
// writes, and the one this script writes (see describe()).
const SAMPLE_DESCRIPTION = /^A (budget|business|family|luxury)-friendly hotel in the heart of /i;
const GENERATED_DESCRIPTION = / is a (budget|business|family|luxury) hotel in .+\. Rooms: /i;

const ROOM_PLANS = {
  Budget: [
    { name: "Standard Room", capacity: 2, priceFactor: 1, rooms: [6, 20] },
    { name: "Family Room", capacity: 4, priceFactor: 1.6, rooms: [2, 6] },
  ],
  Business: [
    { name: "Superior Room", capacity: 2, priceFactor: 1, rooms: [10, 30] },
    { name: "Executive Room", capacity: 2, priceFactor: 1.35, rooms: [4, 12] },
    { name: "Business Suite", capacity: 3, priceFactor: 1.9, rooms: [1, 4] },
  ],
  Family: [
    { name: "Deluxe Room", capacity: 2, priceFactor: 1, rooms: [6, 16] },
    { name: "Family Suite", capacity: 4, priceFactor: 1.5, rooms: [3, 8] },
    { name: "Connecting Rooms", capacity: 6, priceFactor: 2.2, rooms: [1, 4] },
  ],
  Luxury: [
    { name: "Deluxe Room", capacity: 2, priceFactor: 1, rooms: [8, 24] },
    { name: "Premier Room", capacity: 3, priceFactor: 1.4, rooms: [4, 10] },
    { name: "Luxury Suite", capacity: 4, priceFactor: 2.2, rooms: [1, 4] },
  ],
};

// Chance of each amenity by category: [Budget, Business, Family, Luxury].
const AMENITY_ODDS = {
  breakfast: [0.4, 0.8, 0.8, 1],
  restaurant: [0.5, 0.9, 0.9, 1],
  pool: [0.1, 0.4, 0.6, 0.9],
  parking: [0.6, 0.8, 0.9, 0.9],
  gym: [0.05, 0.8, 0.3, 0.95],
  spa: [0, 0.2, 0.2, 0.85],
  pet_friendly: [0.1, 0.05, 0.2, 0.15],
};
const CATEGORY_INDEX = { Budget: 0, Business: 1, Family: 2, Luxury: 3 };

// Small seeded PRNG so a hotel always gets the same generated data.
function randomFor(hotelId) {
  let seed = (hotelId * 2654435761) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (random, [min, max]) => min + Math.floor(random() * (max - min + 1));
const roundTo50 = (value) => Math.round(value / 50) * 50;

function placeHotel(random, zones) {
  const zone = zones[Math.floor(random() * zones.length)];
  const distance = Math.sqrt(random()) * zone.radiusKm; // uniform over the disc
  const angle = random() * 2 * Math.PI;

  const dLat = (distance * Math.sin(angle)) / 111;
  let dLng = (distance * Math.cos(angle)) / (111 * Math.cos((zone.lat * Math.PI) / 180));

  if (zone.inland === "east") dLng = Math.abs(dLng);
  if (zone.inland === "west") dLng = -Math.abs(dLng);

  return {
    latitude: Number((zone.lat + dLat).toFixed(6)),
    longitude: Number((zone.lng + dLng).toFixed(6)),
  };
}

function nearest(point, landmarks, type) {
  return landmarks
    .filter((l) => !type || l.type === type)
    .map((l) => ({ landmark: l, km: distanceKm(point, l) }))
    .sort((a, b) => a.km - b.km)[0];
}

function chooseAmenities(random, hotel, rooms, distances) {
  const i = CATEGORY_INDEX[hotel.category] ?? 0;
  const codes = ["wifi"];

  if (!COOL_CLIMATE_CITIES.has(hotel.city) && random() < 0.95) codes.push("ac");

  for (const [code, odds] of Object.entries(AMENITY_ODDS)) {
    const boost = code === "pool" && distances.beach ? 0.2 : 0;
    if (random() < odds[i] + boost) codes.push(code);
  }

  // Derived from other stored facts, so they can't contradict them.
  if (rooms.some((room) => room.capacity >= 4)) codes.push("family_rooms");
  if (distances.beach && distances.beach.km <= 0.6) codes.push("beach_access");
  if (
    (hotel.category === "Business" || hotel.category === "Luxury") &&
    distances.airport &&
    distances.airport.km <= 30 &&
    random() < 0.6
  ) {
    codes.push("airport_shuttle");
  }

  return codes;
}

function describe(hotel, rooms, amenityCodes, distances) {
  const sentences = [];
  const anchor = distances.beach && distances.beach.km <= 3 ? distances.beach : distances.landmark;

  sentences.push(
    `${hotel.name} is a ${hotel.category.toLowerCase()} hotel in ${hotel.city}, ` +
      `${formatDistance(anchor.km)} from ${anchor.landmark.name}.`
  );

  const highlights = amenityCodes
    .filter((code) => !["wifi", "ac"].includes(code))
    .slice(0, 4)
    .map((code) => AMENITY_LABELS[code].toLowerCase());

  if (highlights.length > 0) {
    sentences.push(`Highlights: ${highlights.join(", ")}.`);
  }

  sentences.push(
    `Rooms: ${rooms.map((room) => `${room.name} (sleeps ${room.capacity})`).join(", ")}.`
  );

  if (distances.airport) {
    sentences.push(`${formatDistance(distances.airport.km)} from ${distances.airport.landmark.name}.`);
  }

  return sentences.join(" ");
}

async function upsertLandmarks(transaction) {
  for (const [city, geo] of Object.entries(CITY_GEO)) {
    for (const l of geo.landmarks) {
      const [landmark] = await Landmark.findOrCreate({
        where: { city, name: l.name },
        defaults: { type: l.type, latitude: l.lat, longitude: l.lng },
        transaction,
      });
      await landmark.update({ type: l.type, latitude: l.lat, longitude: l.lng }, { transaction });
    }
  }
}

async function backfillHotels({ force = false, log = console.log } = {}) {
  const summary = { sample: 0, manual: 0, skipped: 0 };

  await sequelize.transaction(async (transaction) => {
    await upsertLandmarks(transaction);

    const hotels = await Hotel.findAll({ include: [RoomType], order: [["id", "ASC"]], transaction });

    for (const hotel of hotels) {
      // Sample hotels: a known city plus a seed or generated description.
      const description = hotel.description || "";
      const isSample = Boolean(
        CITY_GEO[hotel.city] &&
          (SAMPLE_DESCRIPTION.test(description) || GENERATED_DESCRIPTION.test(description))
      );

      if (hotel.RoomTypes.length > 0) {
        // --force only ever regenerates sample hotels, and never rooms that
        // bookings already point at.
        const booked = await Booking.count({
          where: { roomTypeId: hotel.RoomTypes.map((room) => room.id) },
          transaction,
        });

        if (!force || !isSample || booked > 0) {
          if (force && booked > 0) log(`Hotel ${hotel.id}: has bookings on its rooms, left unchanged`);
          summary.skipped++;
          continue;
        }
      }

      await RoomType.destroy({ where: { hotelId: hotel.id }, transaction });

      if (!isSample) {
        // Only reached when the hotel has no rooms at all.
        // Real (admin-entered) hotel: don't invent facts, just keep it bookable.
        await RoomType.create(
          { hotelId: hotel.id, name: "Standard Room", capacity: 2, pricePerNight: hotel.price, totalRooms: 10 },
          { transaction }
        );
        log(`Hotel ${hotel.id} "${hotel.name}" (${hotel.city}): not sample data, added a Standard Room only`);
        summary.manual++;
        continue;
      }

      const random = randomFor(hotel.id);
      const geo = CITY_GEO[hotel.city];
      const point = placeHotel(random, geo.zones);
      const cityLandmarks = geo.landmarks.map((l) => ({ ...l, latitude: l.lat, longitude: l.lng }));

      const distances = {
        beach: nearest(point, cityLandmarks, "beach"),
        airport: nearest(point, cityLandmarks, "airport"),
        landmark: nearest(point, cityLandmarks.filter((l) => l.type !== "airport" && l.type !== "station")),
      };

      // The first room keeps the hotel's existing price, so listings don't change.
      const rooms = ROOM_PLANS[hotel.category] || ROOM_PLANS.Budget;
      const roomRows = rooms.map((plan, index) => ({
        hotelId: hotel.id,
        name: plan.name,
        capacity: plan.capacity,
        pricePerNight: index === 0 ? hotel.price : roundTo50(hotel.price * plan.priceFactor),
        totalRooms: between(random, plan.rooms),
      }));

      const amenityCodes = chooseAmenities(random, hotel, roomRows, distances);

      await RoomType.bulkCreate(roomRows, { transaction });
      await HotelAmenity.destroy({ where: { hotelId: hotel.id }, transaction });
      await HotelAmenity.bulkCreate(
        amenityCodes.map((code) => ({ hotelId: hotel.id, code })),
        { transaction }
      );

      await hotel.update(
        {
          ...point,
          locationSource: "sample",
          price: Math.min(...roomRows.map((room) => room.pricePerNight)),
          description: describe(hotel, roomRows, amenityCodes, distances),
        },
        { transaction }
      );

      summary.sample++;
    }
  });

  log(
    `Backfill done: ${summary.sample} sample hotels filled in, ${summary.manual} other hotels given a ` +
      `Standard Room, ${summary.skipped} already had room types (use --force to regenerate).`
  );

  return summary;
}

module.exports = { backfillHotels };

if (require.main === module) {
  backfillHotels({ force: process.argv.includes("--force") })
    .then(() => sequelize.close())
    .catch(async (error) => {
      console.error("Backfill failed:", error);
      await sequelize.close();
      process.exit(1);
    });
}
