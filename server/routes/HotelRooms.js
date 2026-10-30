const express = require("express");
const { Op } = require("sequelize");
const router = express.Router({ mergeParams: true });
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { Hotel, RoomType, HotelAmenity, Booking, sequelize } = require("../models");
const { AMENITY_CODES } = require("../config/amenities");

// Admin editing of a hotel's rooms and amenities, mounted at /hotels/:id.
// After any room change, Hotel.price is reset to the cheapest room so the
// listing always shows what a booking would actually charge.

function validateRoomInput(body, { partial = false } = {}) {
  const values = {};

  if (body.name !== undefined || !partial) {
    const name = String(body.name || "").trim();
    if (!name || name.length > 80) return { error: "Room name is required (max 80 characters)" };
    values.name = name;
  }

  const numbers = {
    capacity: { min: 1, max: 20, label: "Capacity" },
    pricePerNight: { min: 1, max: 1000000, label: "Price per night" },
    totalRooms: { min: 0, max: 1000, label: "Number of rooms" },
  };

  for (const [field, { min, max, label }] of Object.entries(numbers)) {
    if (body[field] === undefined && partial) continue;
    const value = Number(body[field]);
    if (!Number.isInteger(value) || value < min || value > max) {
      return { error: `${label} must be a whole number from ${min} to ${max}` };
    }
    values[field] = value;
  }

  return { values };
}

async function syncListedPrice(hotelId, transaction) {
  const cheapest = await RoomType.min("pricePerNight", { where: { hotelId }, transaction });
  if (cheapest) await Hotel.update({ price: cheapest }, { where: { id: hotelId }, transaction });
}

// Bookings that still need this room: not cancelled, not yet checked out,
// and either paid or holding it.
function activeBookingsOf(roomTypeId, transaction) {
  return Booking.count({
    where: {
      roomTypeId,
      bookingStatus: { [Op.ne]: "Cancelled" },
      checkOutDate: { [Op.gte]: new Date().toISOString().slice(0, 10) },
      [Op.or]: [{ paymentStatus: "Paid" }, { holdExpiresAt: { [Op.gt]: new Date() } }],
    },
    transaction,
  });
}

async function findHotel(req, res) {
  const hotel = await Hotel.findByPk(req.params.id);
  if (!hotel) res.status(404).json({ success: false, message: "Hotel not found" });
  return hotel;
}

const roomsOf = (hotelId) =>
  RoomType.findAll({ where: { hotelId }, order: [["pricePerNight", "ASC"], ["id", "ASC"]] });

// PUT /hotels/:id/amenities  { codes: ["pool", "wifi"] } — replaces the list.
router.put("/amenities", auth, isAdmin, async (req, res) => {
  try {
    const hotel = await findHotel(req, res);
    if (!hotel) return;

    const codes = [...new Set(Array.isArray(req.body.codes) ? req.body.codes : [])];
    const unknown = codes.filter((code) => !AMENITY_CODES.includes(code));

    if (unknown.length) {
      return res.status(400).json({ success: false, message: `Unknown amenities: ${unknown.join(", ")}` });
    }

    await sequelize.transaction(async (transaction) => {
      await HotelAmenity.destroy({ where: { hotelId: hotel.id }, transaction });
      await HotelAmenity.bulkCreate(codes.map((code) => ({ hotelId: hotel.id, code })), { transaction });
    });

    res.json({ success: true, amenities: codes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

// POST /hotels/:id/rooms  { name, capacity, pricePerNight, totalRooms }
router.post("/rooms", auth, isAdmin, async (req, res) => {
  try {
    const hotel = await findHotel(req, res);
    if (!hotel) return;

    const { values, error } = validateRoomInput(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    await sequelize.transaction(async (transaction) => {
      await RoomType.create({ ...values, hotelId: hotel.id }, { transaction });
      await syncListedPrice(hotel.id, transaction);
    });

    res.status(201).json({ success: true, rooms: await roomsOf(hotel.id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

// PUT /hotels/:id/rooms/:roomId  (any of name, capacity, pricePerNight, totalRooms)
router.put("/rooms/:roomId", auth, isAdmin, async (req, res) => {
  try {
    const room = await RoomType.findOne({ where: { id: req.params.roomId, hotelId: req.params.id } });
    if (!room) return res.status(404).json({ success: false, message: "Room type not found" });

    const { values, error } = validateRoomInput(req.body, { partial: true });
    if (error) return res.status(400).json({ success: false, message: error });

    await sequelize.transaction(async (transaction) => {
      await room.update(values, { transaction });
      await syncListedPrice(room.hotelId, transaction);
    });

    res.json({ success: true, rooms: await roomsOf(room.hotelId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

// DELETE /hotels/:id/rooms/:roomId — refused for the last room type and for
// rooms that upcoming bookings still need.
router.delete("/rooms/:roomId", auth, isAdmin, async (req, res) => {
  try {
    const room = await RoomType.findOne({ where: { id: req.params.roomId, hotelId: req.params.id } });
    if (!room) return res.status(404).json({ success: false, message: "Room type not found" });

    const result = await sequelize.transaction(async (transaction) => {
      const count = await RoomType.count({ where: { hotelId: room.hotelId }, transaction });
      if (count <= 1) return "A hotel needs at least one room type";

      const active = await activeBookingsOf(room.id, transaction);
      if (active > 0) return `${active} upcoming booking(s) use this room type; set its number of rooms to 0 instead`;

      await room.destroy({ transaction });
      await syncListedPrice(room.hotelId, transaction);
      return null;
    });

    if (result) return res.status(409).json({ success: false, message: result });

    res.json({ success: true, rooms: await roomsOf(room.hotelId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

module.exports = router;
