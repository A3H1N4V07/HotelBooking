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
const { resolveCity } = require("../services/cityMatch");
const { Op } = require("sequelize");

const { Hotel, Booking } = require("../models");

// Corrects spellings/alternate names ("Bengaluru", "Bengalore") to a city
// that actually exists in the Hotels table.
async function resolveSearchCity(city) {
  if (!city) return city;

  const rows = await Hotel.findAll({
    attributes: [[Hotel.sequelize.fn("DISTINCT", Hotel.sequelize.col("city")), "city"]],
    raw: true,
  });

  return resolveCity(city, rows.map((row) => row.city));
}

// Search hotels by city
function buildHotelWhereAndOrder({ city, category, sortBy, order }) {
  const where = {};

  if (city) {
    where.city = { [Op.like]: `%${city}%` };
  }

  if (category) {
    where.category = category;
  }

  const orderClause = [];

  if (sortBy === "price" || sortBy === "rating") {
    orderClause.push([sortBy, order === "desc" ? "DESC" : "ASC"]);
  }

  return { where, order: orderClause };
}

router.get("/search", async (req, res) => {
  try {
    const { city, category, sortBy, order } = req.query;

    const { where, order: orderClause } = buildHotelWhereAndOrder({
      city: await resolveSearchCity(city),
      category,
      sortBy,
      order,
    });

    const hotels = await Hotel.findAll({ where, order: orderClause });

    res.json(hotels);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch hotels",
    });
  }
});

// Get single hotel
router.get("/:id", async (req, res) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id);

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

    const hotel = await Hotel.create(values);

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

    await hotel.update(updates);

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

    const filters = await extractHotelFilters(query);

    const { where, order: orderClause } = buildHotelWhereAndOrder({
      city: await resolveSearchCity(filters.city),
      category: filters.category,
      sortBy: filters.sortBy,
      order: "asc",
    });

    if (filters.maxPrice) {
      where.price = { [Op.lte]: Number(filters.maxPrice) };
    }

    const hotels = await Hotel.findAll({ where, order: orderClause });

    res.json({ success: true, filters, hotels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

module.exports = router;