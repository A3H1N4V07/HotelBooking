const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

const {
    User,
    Booking,
    Payment
} = require("../models");

router.get("/stats", auth, isAdmin, async (req, res) => {

    try {

        const totalUsers =
            await User.count();

        const totalBookings =
            await Booking.count();

        const totalPayments =
            await Payment.count();

        const revenueResult =
            await Payment.sum("amount");

        const recentBookings =
            await Booking.findAll({
                limit: 5,
                order: [
                    ["createdAt", "DESC"]
                ]
            });
        
            const recentPayments =
    await Payment.findAll({
        limit: 5,
        order: [["createdAt", "DESC"]]
    });

        res.json({

            success: true,

            totalUsers,

            totalBookings,

            totalPayments,

            totalRevenue:
                revenueResult || 0,

            recentBookings,

            recentPayments

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });

    }

});

module.exports = router;