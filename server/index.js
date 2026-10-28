const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const path = require("path");
const helmet = require("helmet");
const multer = require("multer");
const { apiLimiter } = require("./middleware/rateLimit");

const PORT = process.env.PORT || 3001;

// Comma-separated list, e.g. "http://localhost:3000,https://echostay.example"
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.TRUST_PROXY) {
  // Needed behind a reverse proxy so rate limiting sees real client IPs.
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
}

app.use(
  helmet({
    // The React client runs on another origin and loads /uploads images.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors({ origin: allowedOrigins }));
app.use(apiLimiter);
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(express.json({ limit: "100kb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const db = require('./models');

const adminRouter =require("./routes/Admin");
app.use("/admin", adminRouter);

// =========================
// User Routes
// =========================
const userRouter = require('./routes/User');
app.use('/users', userRouter);

// =========================
// Payment Routes
// =========================
const paymentRouter = require('./routes/Payment');
app.use('/payment', paymentRouter);

// =========================
// Booking Routes (NEW)
// =========================
const bookingRouter = require('./routes/Booking');
app.use('/bookings', bookingRouter);

const voiceRouter = require("./routes/Voice");
app.use("/voice", voiceRouter);

const hotelRouter = require("./routes/Hotel");
app.use("/hotels", hotelRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Client mistakes (bad upload, malformed JSON) are safe to explain.
  if (err instanceof multer.MulterError || err.isUploadError) {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(err.status || 400).json({ success: false, message: "Invalid request body" });
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Something went wrong" });
});

// =========================
// Database Sync & Server
// =========================
// alter: true rewrites tables to match the models, which can drop or mangle
// columns on real data. Only do it in development; use migrations for prod.
const isProduction = process.env.NODE_ENV === "production";

db.sequelize.sync(isProduction ? {} : { alter: true }).then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch((err) => {
    console.error('Database connection failed:', err);
});