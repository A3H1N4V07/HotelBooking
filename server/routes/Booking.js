const express = require("express");
const router = express.Router();

const { Booking, User, Hotel } = require("../models");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { validateStay } = require("../services/bookingDates");

// =====================
// Create Booking
// =====================
router.post("/create", auth, async (req, res) => {

    try {

        const { hotelId, checkInDate, checkOutDate, guests, guestName, guestPhone } = req.body;

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

        const hotel = await Hotel.findByPk(hotelId);

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        const booking = await Booking.create({

            hotelId: hotel.id,

            hotelName: hotel.name,

            hotelImage: hotel.image,

            location: hotel.address || hotel.city,

            userId: req.user.id,

            checkInDate,

            checkOutDate,

            guests: stay.guests,

            guestName,

            guestPhone,

            // Hotel.price is per night; never trust a client-sent amount.
            amount: Number(hotel.price) * stay.nights

        });

        res.status(201).json({

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

        const booking = await Booking.findByPk(req.params.id);

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