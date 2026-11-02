const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const { Hotel, Booking, Review } = require("../models");

// GET /stats — public numbers for the home page, all counted from the
// database. happyPercent is the share of reviews with 4 or 5 stars, and is
// null until there are reviews.
router.get("/", async (req, res) => {
  try {
    const [hotels, cities, bookings, reviews, happy] = await Promise.all([
      Hotel.count(),
      Hotel.count({ distinct: true, col: "city" }),
      Booking.count({ where: { paymentStatus: "Paid" } }),
      Review.count(),
      Review.count({ where: { rating: { [Op.gte]: 4 } } }),
    ]);

    res.json({
      hotels,
      cities,
      bookings,
      reviews,
      happyPercent: reviews > 0 ? Math.round((happy / reviews) * 100) : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

module.exports = router;
