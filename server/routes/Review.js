const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const auth = require("../middleware/auth");

const { Review, Booking, User, Hotel } = require("../models");

const MAX_COMMENT = 500;

// "YYYY-MM-DD" for today on the server's clock.
function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// GET /reviews/recent?limit=3 — newest reviews that have a comment, for the
// home page. Only the reviewer's first name and last initial are shown.
router.get("/recent", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 3, 1), 12);

    const reviews = await Review.findAll({
      where: { comment: { [Op.ne]: null } },
      include: [
        { model: User, attributes: ["firstName", "lastName"] },
        { model: Hotel, attributes: ["id", "name", "city"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
    });

    res.json(
      reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        name: r.User ? `${r.User.firstName} ${r.User.lastName?.[0] ? `${r.User.lastName[0]}.` : ""}`.trim() : "Guest",
        hotel: r.Hotel ? { id: r.Hotel.id, name: r.Hotel.name, city: r.Hotel.city } : null,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

// POST /reviews { bookingId, rating, comment? } — one review per paid booking,
// by the guest who made it, once the stay has started.
router.post("/", auth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be 1 to 5 stars" });
    }

    if (comment.length > MAX_COMMENT) {
      return res.status(400).json({ success: false, message: `Keep the review under ${MAX_COMMENT} characters` });
    }

    const booking = await Booking.findByPk(bookingId);

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    if (booking.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (booking.paymentStatus !== "Paid" || booking.bookingStatus === "Cancelled") {
      return res.status(409).json({ success: false, message: "Only paid stays can be reviewed" });
    }

    if (!booking.checkInDate || booking.checkInDate > todayIso()) {
      return res.status(409).json({ success: false, message: "You can review this stay once it has started" });
    }

    const existing = await Review.findOne({ where: { bookingId: booking.id } });

    if (existing) {
      return res.status(409).json({ success: false, message: "You've already reviewed this stay" });
    }

    const review = await Review.create({
      bookingId: booking.id,
      userId: req.user.id,
      hotelId: Number(booking.hotelId),
      rating,
      comment: comment || null,
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

module.exports = router;
