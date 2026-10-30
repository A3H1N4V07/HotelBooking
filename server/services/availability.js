const { Op } = require("sequelize");
const { Booking, RoomType } = require("../models");

// An unpaid booking reserves its room for this long, then the room is free
// again for others. Paying after that re-checks availability first.
const HOLD_MINUTES = 15;

function newHoldExpiry(now = new Date()) {
  return new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);
}

// Bookings that occupy a room: paid ones, plus unpaid ones whose hold
// hasn't expired. Cancelled bookings and expired holds don't count.
function occupyingBookingsWhere(now) {
  return {
    bookingStatus: { [Op.ne]: "Cancelled" },
    [Op.or]: [
      { paymentStatus: "Paid" },
      { holdExpiresAt: { [Op.gt]: now } },
    ],
  };
}

// Stays overlap when each starts before the other ends; checking out on the
// day someone else checks in is fine.
function overlapsWhere(checkInDate, checkOutDate) {
  return {
    checkInDate: { [Op.lt]: checkOutDate },
    checkOutDate: { [Op.gt]: checkInDate },
  };
}

// Map of roomTypeId -> rooms already taken for these dates.
async function takenRooms(roomTypeIds, checkInDate, checkOutDate, { transaction, excludeBookingId, now = new Date() } = {}) {
  if (roomTypeIds.length === 0) return new Map();

  const rows = await Booking.findAll({
    attributes: ["roomTypeId", [Booking.sequelize.fn("COUNT", Booking.sequelize.col("id")), "taken"]],
    where: {
      roomTypeId: roomTypeIds,
      ...overlapsWhere(checkInDate, checkOutDate),
      ...occupyingBookingsWhere(now),
      ...(excludeBookingId && { id: { [Op.ne]: excludeBookingId } }),
    },
    group: ["roomTypeId"],
    raw: true,
    transaction,
  });

  return new Map(rows.map((row) => [row.roomTypeId, Number(row.taken)]));
}

// Rooms of each type still free for these dates (never negative).
async function roomsLeft(roomTypes, checkInDate, checkOutDate, options = {}) {
  const taken = await takenRooms(roomTypes.map((r) => r.id), checkInDate, checkOutDate, options);

  return new Map(roomTypes.map((room) => [room.id, Math.max(0, room.totalRooms - (taken.get(room.id) || 0))]));
}

// Locks the room type row so two requests can't both take its last room:
// the second waits here, then counts the first one's booking.
async function lockRoomType(roomTypeId, transaction) {
  return RoomType.findByPk(roomTypeId, { transaction, lock: transaction.LOCK.UPDATE });
}

// Before charging an unpaid booking: if its hold expired, take the room
// again (if it's still free) and start a new hold. Bookings made before
// room types existed have no inventory to check.
async function renewHoldIfExpired(booking, transaction, now = new Date()) {
  if (!booking.roomTypeId || !booking.checkInDate) return { ok: true };
  if (booking.holdExpiresAt && booking.holdExpiresAt > now) return { ok: true };

  const roomType = await lockRoomType(booking.roomTypeId, transaction);

  if (!roomType) return { ok: false, message: "This room type no longer exists" };

  const left = await roomsLeft([roomType], booking.checkInDate, booking.checkOutDate, {
    transaction,
    excludeBookingId: booking.id,
    now,
  });

  if (left.get(roomType.id) < 1) {
    return {
      ok: false,
      message: "Your 15-minute hold expired and this room is no longer available for those dates. Please book again.",
    };
  }

  await booking.update({ holdExpiresAt: newHoldExpiry(now) }, { transaction });
  return { ok: true };
}

module.exports = {
  HOLD_MINUTES,
  newHoldExpiry,
  roomsLeft,
  lockRoomType,
  renewHoldIfExpired,
};
