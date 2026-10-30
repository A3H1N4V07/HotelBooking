const express = require("express");
const router = express.Router();

const { Booking, User, Hotel, RoomType, sequelize } = require("../models");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { validateStay } = require("../services/bookingDates");
const { roomsLeft, lockRoomType, newHoldExpiry } = require("../services/availability");

// Room name/capacity to show alongside a booking (null for old bookings).
const ROOM_SUMMARY = [{ model: RoomType, attributes: ["id", "name", "capacity", "pricePerNight"] }];

// Which room types a booking may use. A requested roomTypeId must belong to
// the hotel and fit the guests; without one, every room that fits is a
// candidate, cheapest first. Returns { candidates, explicit } or { error }.
function pickRoomCandidates(roomTypes, roomTypeId, guests) {
    if (roomTypeId !== undefined && roomTypeId !== null && roomTypeId !== "") {
        const room = roomTypes.find((r) => r.id === Number(roomTypeId));

        if (!room) return { error: "That room type doesn't belong to this hotel" };

        if (room.capacity < guests) {
            return { error: `${room.name} sleeps up to ${room.capacity} guests` };
        }

        return { candidates: [room], explicit: true };
    }

    const candidates = roomTypes
        .filter((r) => r.capacity >= guests)
        .sort((a, b) => a.pricePerNight - b.pricePerNight || a.id - b.id);

    if (candidates.length === 0) {
        const largest = Math.max(...roomTypes.map((r) => r.capacity));
        return { error: `No room at this hotel sleeps ${guests} guests (largest sleeps ${largest})` };
    }

    return { candidates, explicit: false };
}

// =====================
// Create Booking
// =====================
router.post("/create", auth, async (req, res) => {

    try {

        const { hotelId, roomTypeId, checkInDate, checkOutDate, guests, guestName, guestPhone } = req.body;

        if (!checkInDate || !checkOutDate || !guests) {
            return res.status(400).json({
                success: false,
                message: "checkInDate, checkOutDate, and guests are required"
            });
        }

        const stay = validateStay({ checkInDate, checkOutDate, guests });

        if (stay.error) {
            return res.status(400).json({
                success: false,
                message: stay.error
            });
        }

        const hotel = await Hotel.findByPk(hotelId, { include: [RoomType] });

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        if (hotel.RoomTypes.length === 0) {
            return res.status(409).json({
                success: false,
                message: "This hotel has no rooms set up yet"
            });
        }

        const picked = pickRoomCandidates(hotel.RoomTypes, roomTypeId, stay.guests);

        if (picked.error) {
            return res.status(400).json({
                success: false,
                message: picked.error
            });
        }

        // One transaction per booking: lock each candidate room type (always
        // in the same order, so two requests can't deadlock), count what's
        // taken, and book the first one with a room left.
        const booking = await sequelize.transaction(async (transaction) => {

            for (const room of picked.candidates) {

                await lockRoomType(room.id, transaction);

                const left = await roomsLeft([room], checkInDate, checkOutDate, { transaction });

                if (left.get(room.id) < 1) continue;

                return Booking.create({

                    hotelId: hotel.id,

                    hotelName: hotel.name,

                    hotelImage: hotel.image,

                    location: hotel.address || hotel.city,

                    userId: req.user.id,

                    roomTypeId: room.id,

                    checkInDate,

                    checkOutDate,

                    guests: stay.guests,

                    guestName,

                    guestPhone,

                    // Priced from the room, per night; never trust a client-sent amount.
                    amount: room.pricePerNight * stay.nights,

                    holdExpiresAt: newHoldExpiry()

                }, { transaction });

            }

            return null;

        });

        if (!booking) {
            return res.status(409).json({
                success: false,
                message: picked.explicit
                    ? `No ${picked.candidates[0].name} left for those dates`
                    : "No rooms left at this hotel for those dates"
            });
        }

        const room = picked.candidates.find((r) => r.id === booking.roomTypeId);

        res.status(201).json({

            success: true,

            booking,

            roomType: {
                id: room.id,
                name: room.name,
                capacity: room.capacity,
                pricePerNight: room.pricePerNight
            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Something went wrong"

        });

    }

});

// =====================
// Get All Bookings
// =====================
router.get("/", auth, isAdmin, async (req, res) => {
    try {

        const bookings = await Booking.findAll({
            order: [["createdAt", "DESC"]]
        });

        res.json(bookings);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Something went wrong"
        });
    }
});

// =====================
// Get Booking Details
// =====================
router.get("/details/:id", auth, async (req, res) => {
    try {

        const booking = await Booking.findByPk(req.params.id, { include: ROOM_SUMMARY });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({
        success: false,
        message: "Unauthorized"
    });
}

        res.json({
            success: true,
            booking
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
});

// =====================
// Get Bookings By User
// IMPORTANT:
// Must come BEFORE /:id
// =====================
router.get("/user/:userId", auth, async (req, res) => {

    try {

        if (Number(req.params.userId) !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({
        success: false,
        message: "Unauthorized"
    });
}

        const bookings = await Booking.findAll({

            where: {
                userId: req.params.userId
            },

            order: [
                ["createdAt", "DESC"]
            ]
        });

        res.json({
            success: true,
            bookings
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
});

router.get(
    "/my-bookings",
    auth,
    async (req, res) => {

        try {

            const bookings =
                await Booking.findAll({

                    where: {
                        userId: req.user.id
                    },

                    include: ROOM_SUMMARY,

                    order: [
                        ["createdAt", "DESC"]
                    ]

                });

            res.json({
                success: true,
                bookings
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message: "Something went wrong"
            });

        }

    }
);

// =====================
// Get Single Booking
// Keep this LAST
// =====================
router.get("/:id", auth, async (req, res) => {

    try {

        const booking = await Booking.findByPk(req.params.id);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        if (booking.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({
        message: "Unauthorized"
    });
}

        res.json(booking);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Something went wrong"
        });
    }
});

module.exports = router;