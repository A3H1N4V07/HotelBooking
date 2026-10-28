const fs = require("fs/promises");
const path = require("path");

const CATEGORIES = ["Budget", "Business", "Family", "Luxury"];
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
// Matches names produced by middleware/upload.js, so we never delete anything else.
const UPLOAD_NAME = /^\d+-\d+\.(jpe?g|png|webp)$/i;

const TEXT_LIMITS = {
  name: 120,
  city: 80,
  state: 80,
  address: 500,
  description: 5000,
  phone: 30,
};

// Validates admin hotel input (multipart form fields arrive as strings).
// With partial: true (updates), missing fields are left out instead of required.
// Returns { values } or { error }.
function validateHotelInput(body, { partial = false } = {}) {
  const values = {};

  for (const [field, max] of Object.entries(TEXT_LIMITS)) {
    if (body[field] === undefined) continue;

    const value = String(body[field]).trim();

    if (value.length > max) {
      return { error: `${field} must be at most ${max} characters` };
    }

    values[field] = value;
  }

  for (const field of ["name", "city"]) {
    if ((!partial || values[field] !== undefined) && !values[field]) {
      return { error: `${field} is required` };
    }
  }

  if (!partial || body.price !== undefined) {
    const price = Number(body.price);

    if (!Number.isInteger(price) || price <= 0) {
      return { error: "price must be a whole number greater than 0" };
    }

    values.price = price;
  }

  if (body.rating !== undefined || !partial) {
    // The admin form sends "" when rating is left blank.
    const rating = body.rating === undefined || body.rating === "" ? 0 : Number(body.rating);

    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return { error: "rating must be between 0 and 5" };
    }

    values.rating = rating;
  }

  if (body.category !== undefined && body.category !== "") {
    if (!CATEGORIES.includes(body.category)) {
      return { error: `category must be one of ${CATEGORIES.join(", ")}` };
    }

    values.category = body.category;
  } else if (!partial) {
    values.category = "Budget";
  }

  if (body.imageUrl) {
    let url;

    try {
      url = new URL(body.imageUrl);
    } catch {
      return { error: "imageUrl must be a valid URL" };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: "imageUrl must start with http:// or https://" };
    }

    values.image = url.toString();
  }

  return { values };
}

// Public URL for an uploaded file. SERVER_PUBLIC_URL avoids trusting the
// Host header and works behind a proxy; falls back to the request's host.
function uploadedImageUrl(req, filename) {
  const base = process.env.SERVER_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;

  return `${base.replace(/\/+$/, "")}/uploads/${filename}`;
}

// Deletes a file this server uploaded, given its stored URL (or a bare
// filename). Ignores external URLs and missing files.
async function deleteUploadedImage(imageUrlOrName) {
  if (!imageUrlOrName) return;

  const marker = "/uploads/";
  const index = imageUrlOrName.lastIndexOf(marker);
  const filename = index === -1 ? imageUrlOrName : imageUrlOrName.slice(index + marker.length);

  if (!UPLOAD_NAME.test(filename)) return;

  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to delete uploaded image:", error);
    }
  }
}

module.exports = {
  CATEGORIES,
  validateHotelInput,
  uploadedImageUrl,
  deleteUploadedImage,
};
