const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { extractHotelFilters } = require("../services/gemini");
const upload = require("../middleware/upload");
const { aiLimiter } = require("../middleware/rateLimit");
const {
  validateHotelInput,
  uploadedImageUrl,
  deleteUploadedImage,
} = require("../services/hotelInput");
const { parseSearchFilters, searchHotels, hotelDetails, LANDMARK_TYPES } = require("../services/hotelSearch");
const { AMENITIES, AMENITY_CODES } = require("../config/amenities");

const { Hotel, Booking, RoomType, sequelize } = require("../models");

// Keeps only well-formed values from the model's output (it can still
// return something odd); anything dropped simply isn't filtered on.
function cleanAiFilters(f = {}) {
  const near = LANDMARK_TYPES.includes(f.near) ? f.near : undefined;
  const sortBy = ["price", "rating"].includes(f.sortBy) || (f.sortBy === "distance" && near) ? f.sortBy : undefined;

  return {
    city: f.city || undefined,
    category: ["Budget", "Business", "Family", "Luxury"].includes(f.category) ? f.category : undefined,
    // "Near the beach" with no other preference: closest first.
    sortBy: sortBy || (near ? "distance" : undefined),
    maxPrice: Number(f.maxPrice) > 0 ? Number(f.maxPrice) : undefined,
    guests: Number.isInteger(f.guests) && f.guests >= 1 && f.guests <= 20 ? f.guests : undefined,
    amenities: Array.isArray(f.amenities) ? f.amenities.filter((c) => AMENITY_CODES.includes(c)) : undefined,
    near,
  };
}

// GET /hotels/search
//   city, category, sortBy=price|rating|distance, order=asc|desc,
//   amenities=pool,breakfast (all required), maxPrice (per night),
//   guests, checkIn & checkOut (YYYY-MM-DD, only hotels with a free room),
//   near=beach|centre|airport|station|attraction, maxDistanceKm
// Responds with an array of hotels (see searchHotels for the extra fields).
router.get("/search", async (req, res) => {
  try {
    const { filters, error } = parseSearchFilters(req.query);

    if (error) {
      return res.status(400).json({ message: error });
    }

    res.json(await searchHotels(filters));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch hotels",
    });
  }
});

// GET /hotels/cities — distinct city names, so the voice assistant can
// recognise "Goa" in a sentence without calling the AI.
router.get("/cities", async (req, res) => {
  try {
    const rows = await Hotel.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("city")), "city"]],
      order: [["city", "ASC"]],
      raw: true,
    });
    res.json(rows.map((row) => row.city));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch cities" });
  }
});

// GET /hotels/amenities — the fixed amenity list (codes + labels) for
// filters and the admin page. Declared before /:id so it isn't read as an id.
router.get("/amenities", (req, res) => {
  res.json(AMENITIES);
});

// Admin editing of rooms and amenities: /hotels/:id/rooms, /hotels/:id/amenities
router.use("/:id", require("./HotelRooms"));

// GET /hotels/:id[?checkIn=&checkOut=&guests=] — rooms (with availability
// when dates are given), amenities and nearby landmarks.
router.get("/:id", async (req, res) => {
  try {
    const { checkIn, checkOut, guests } = req.query;
    let options = {};

    if (checkIn || checkOut || guests) {
      const { filters, error } = parseSearchFilters({ checkIn, checkOut, guests });

      if (error) {
        return res.status(400).json({ message: error });
      }

      options = filters;
    }

    const hotel = await hotelDetails(req.params.id, options);

    if (!hotel) {
      return res.status(404).json({
        message: "Hotel not found",
      });
    }

    res.json(hotel);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch hotel",
    });
  }
});

// Removes an uploaded image once nothing points at it any more. Bookings keep
// a copy of the hotel image URL, so past bookings still need the file.
async function releaseImage(image) {
  if (!image) return;

  const [hotels, bookings] = await Promise.all([
    Hotel.count({ where: { image } }),
    Booking.count({ where: { hotelImage: image } }),
  ]);

  if (hotels === 0 && bookings === 0) {
    await deleteUploadedImage(image);
  }
}

router.post("/", auth, isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { values, error } = validateHotelInput(req.body);

    if (error) {
      if (req.file) await deleteUploadedImage(req.file.filename);
      return res.status(400).json({ success: false, message: error });
    }

    if (req.file) {
      values.image = uploadedImageUrl(req, req.file.filename);
    }

    if (!values.image) {
      return res.status(400).json({
        success: false,
        message: "Hotel image is required (upload a file or provide an imageUrl).",
      });
    }

    // Every hotel needs at least one room type to be bookable. Until the
    // admin page can edit rooms, start with a Standard Room at the listed price.
    const hotel = await sequelize.transaction(async (transaction) => {
      const created = await Hotel.create(values, { transaction });
      await RoomType.create(
        { hotelId: created.id, name: "Standard Room", capacity: 2, pricePerNight: created.price, totalRooms: 10 },
        { transaction }
      );
      return created;
    });

    res.status(201).json({ success: true, hotel });
  } catch (error) {
    console.error(error);
    if (req.file) await deleteUploadedImage(req.file.filename);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

router.put("/:id", auth, isAdmin, upload.single("image"), async (req, res) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id);

    if (!hotel) {
      if (req.file) await deleteUploadedImage(req.file.filename);
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    const { values: updates, error } = validateHotelInput(req.body, { partial: true });

    if (error) {
      if (req.file) await deleteUploadedImage(req.file.filename);
      return res.status(400).json({ success: false, message: error });
    }

    if (req.file) {
      updates.image = uploadedImageUrl(req, req.file.filename);
    }

    const oldImage = hotel.image;

    await sequelize.transaction(async (transaction) => {
      // The listed price is the cheapest room's price: editing it reprices
      // that room, and the listing keeps matching what bookings charge.
      if (updates.price !== undefined) {
        const cheapest = await RoomType.findOne({
          where: { hotelId: hotel.id },
          order: [["pricePerNight", "ASC"], ["id", "ASC"]],
          transaction,
        });

        if (cheapest) {
          await cheapest.update({ pricePerNight: updates.price }, { transaction });
          updates.price = await RoomType.min("pricePerNight", { where: { hotelId: hotel.id }, transaction });
        }
      }

      await hotel.update(updates, { transaction });
    });

    if (updates.image && updates.image !== oldImage) {
      await releaseImage(oldImage);
    }

    res.json({ success: true, hotel });
  } catch (error) {
    console.error(error);
    if (req.file) await deleteUploadedImage(req.file.filename);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

router.delete("/:id", auth, isAdmin, async (req, res) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id);

    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    await hotel.destroy();
    await releaseImage(hotel.image);

    res.json({ success: true, message: "Hotel deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

router.post("/recommend", aiLimiter, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: "query is required" });
    }

    // The model only proposes filters; they go through the same validation
    // as a typed search, and the database decides what matches.
    const extracted = await extractHotelFilters(query);
    const { filters, error } = parseSearchFilters(cleanAiFilters(extracted));

    if (error) {
      return res.status(400).json({ success: false, message: `Couldn't use that request: ${error}` });
    }

    const hotels = await searchHotels(filters);

    res.json({ success: true, filters, hotels });
  } catch (error) {
    if (error.aiLimited) {
      console.warn("AI search quota exhausted (Gemini 429)");
      return res.status(503).json({
        success: false,
        code: "AI_LIMIT",
        message: "AI search is unavailable right now. Please use the filters below.",
      });
    }

    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

module.exports = router;