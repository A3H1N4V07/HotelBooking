const { Op } = require("sequelize");
const { Hotel, RoomType, HotelAmenity, Landmark } = require("../models");
const { AMENITY_CODES, AMENITY_LABELS } = require("../config/amenities");
const { resolveCity } = require("./cityMatch");
const { validateStay } = require("./bookingDates");
const { roomsLeft } = require("./availability");
const { distanceKm } = require("./geo");

const LANDMARK_TYPES = ["beach", "centre", "airport", "station", "attraction"];
const SORTS = ["price", "rating", "distance"];

const list = (value) =>
  (Array.isArray(value) ? value : String(value).split(","))
    .map((v) => String(v).trim())
    .filter(Boolean);

// Turns query-string style input into validated search filters.
// Returns { filters } or { error } (a message safe to show the user).
function parseSearchFilters(input = {}) {
  const filters = {
    city: input.city ? String(input.city).trim() : undefined,
    category: input.category || undefined,
    order: input.order === "desc" ? "desc" : "asc",
  };

  if (input.sortBy) {
    if (!SORTS.includes(input.sortBy)) return { error: `sortBy must be one of ${SORTS.join(", ")}` };
    filters.sortBy = input.sortBy;
  }

  if (input.amenities) {
    const codes = list(input.amenities);
    const unknown = codes.filter((code) => !AMENITY_CODES.includes(code));
    if (unknown.length) return { error: `Unknown amenities: ${unknown.join(", ")}` };
    filters.amenities = codes;
  }

  if (input.maxPrice !== undefined && input.maxPrice !== "") {
    const maxPrice = Number(input.maxPrice);
    if (!Number.isFinite(maxPrice) || maxPrice <= 0) return { error: "maxPrice must be a positive number" };
    filters.maxPrice = maxPrice;
  }

  if (input.guests !== undefined && input.guests !== "") {
    const guests = Number(input.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
      return { error: "guests must be a whole number between 1 and 20" };
    }
    filters.guests = guests;
  }

  if (input.checkIn || input.checkOut) {
    const stay = validateStay({
      checkInDate: input.checkIn,
      checkOutDate: input.checkOut,
      guests: filters.guests || 1,
    });
    if (stay.error) return { error: stay.error };
    filters.checkIn = input.checkIn;
    filters.checkOut = input.checkOut;
  }

  if (input.near) {
    if (!LANDMARK_TYPES.includes(input.near)) return { error: `near must be one of ${LANDMARK_TYPES.join(", ")}` };
    filters.near = input.near;
  }

  if (input.maxDistanceKm !== undefined && input.maxDistanceKm !== "") {
    const km = Number(input.maxDistanceKm);
    if (!filters.near) return { error: "maxDistanceKm needs near (e.g. near=beach)" };
    if (!Number.isFinite(km) || km <= 0) return { error: "maxDistanceKm must be a positive number" };
    filters.maxDistanceKm = km;
  }

  if (filters.sortBy === "distance" && !filters.near) {
    return { error: "sortBy=distance needs near (e.g. near=beach)" };
  }

  return { filters };
}

async function resolveSearchCity(city) {
  if (!city) return city;

  const rows = await Hotel.findAll({
    attributes: [[Hotel.sequelize.fn("DISTINCT", Hotel.sequelize.col("city")), "city"]],
    raw: true,
  });

  return resolveCity(city, rows.map((row) => row.city));
}

const round2 = (km) => Math.round(km * 100) / 100;

// Every hotel matching all filters, each with:
//   amenities  amenity codes
//   fromPrice  cheapest nightly price among rooms that fit the filters
//   nearest    { type, name, km } when `near` is given
//   roomsLeft  rooms still free across matching room types (when dates given)
// All facts come from the database; nothing is estimated.
async function searchHotels(filters) {
  const where = {};
  const city = await resolveSearchCity(filters.city);

  if (city) where.city = { [Op.like]: `%${city}%` };
  if (filters.category) where.category = filters.category;

  const hotels = await Hotel.findAll({
    where,
    include: [RoomType, HotelAmenity],
    order: [["id", "ASC"]],
  });

  // Rooms that fit the guest count and budget, before availability.
  const roomFilter = (room) =>
    room.capacity >= (filters.guests || 1) &&
    (filters.maxPrice === undefined || room.pricePerNight <= filters.maxPrice);

  const candidateRooms = hotels.flatMap((hotel) => hotel.RoomTypes.filter(roomFilter));

  const left = filters.checkIn
    ? await roomsLeft(candidateRooms, filters.checkIn, filters.checkOut)
    : null;

  const landmarks = filters.near
    ? await Landmark.findAll({ where: { type: filters.near, city: [...new Set(hotels.map((h) => h.city))] } })
    : [];

  const roomFiltersGiven = Boolean(filters.guests || filters.maxPrice || filters.checkIn);
  const results = [];

  for (const hotel of hotels) {
    const amenities = hotel.HotelAmenities.map((a) => a.code);

    if (filters.amenities && !filters.amenities.every((code) => amenities.includes(code))) continue;

    let rooms = hotel.RoomTypes.filter(roomFilter);
    if (left) rooms = rooms.filter((room) => left.get(room.id) > 0);
    if (roomFiltersGiven && rooms.length === 0) continue;

    let nearest;

    if (filters.near) {
      if (hotel.latitude === null) continue; // location unknown: can't claim it's near anything

      const closest = landmarks
        .filter((l) => l.city === hotel.city)
        .map((l) => ({ type: l.type, name: l.name, km: round2(distanceKm(hotel, l)) }))
        .sort((a, b) => a.km - b.km)[0];

      if (!closest) continue; // e.g. "near a beach" in Delhi
      if (filters.maxDistanceKm !== undefined && closest.km > filters.maxDistanceKm) continue;
      nearest = closest;
    }

    const { RoomTypes, HotelAmenities, ...plain } = hotel.toJSON();

    results.push({
      ...plain,
      amenities,
      fromPrice: rooms.length ? Math.min(...rooms.map((r) => r.pricePerNight)) : hotel.price,
      ...(nearest && { nearest }),
      ...(left && { roomsLeft: rooms.reduce((sum, r) => sum + left.get(r.id), 0) }),
    });
  }

  if (filters.sortBy) {
    const key = {
      price: (h) => h.fromPrice,
      rating: (h) => h.rating,
      distance: (h) => h.nearest.km,
    }[filters.sortBy];
    const direction = filters.order === "desc" ? -1 : 1;
    results.sort((a, b) => direction * (key(a) - key(b)) || a.id - b.id);
  }

  return results;
}

// One hotel with its rooms, amenity labels and nearby landmarks. With dates
// (and optionally guests), each room also says how many are left and
// whether it fits the party.
async function hotelDetails(hotelId, { checkIn, checkOut, guests } = {}) {
  const hotel = await Hotel.findByPk(hotelId, { include: [RoomType, HotelAmenity] });

  if (!hotel) return null;

  const left = checkIn ? await roomsLeft(hotel.RoomTypes, checkIn, checkOut) : null;

  const nearby =
    hotel.latitude === null
      ? []
      : (await Landmark.findAll({ where: { city: hotel.city } }))
          .map((l) => ({ type: l.type, name: l.name, km: round2(distanceKm(hotel, l)) }))
          .sort((a, b) => a.km - b.km);

  const { RoomTypes, HotelAmenities, ...plain } = hotel.toJSON();

  return {
    ...plain,
    amenities: HotelAmenities.map((a) => ({ code: a.code, label: AMENITY_LABELS[a.code] })),
    nearby,
    roomTypes: RoomTypes
      .sort((a, b) => a.pricePerNight - b.pricePerNight || a.id - b.id)
      .map((room) => ({
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        pricePerNight: room.pricePerNight,
        totalRooms: room.totalRooms,
        ...(left && { roomsLeft: left.get(room.id) }),
        ...(guests && { fitsGuests: room.capacity >= guests }),
      })),
  };
}

module.exports = { parseSearchFilters, searchHotels, hotelDetails, LANDMARK_TYPES };
