const rateLimit = require("express-rate-limit");

function limiter(windowMs, limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message },
  });
}

// Whole API: generous ceiling against scraping/flooding.
const apiLimiter = limiter(15 * 60 * 1000, 300, "Too many requests, please slow down.");

// Login/register: slows down password guessing and sign-up spam.
const authLimiter = limiter(15 * 60 * 1000, 10, "Too many attempts. Please try again in 15 minutes.");

// Endpoints that call Gemini, which costs money per request.
const aiLimiter = limiter(60 * 1000, 20, "Too many AI requests. Please wait a minute.");

module.exports = { apiLimiter, authLimiter, aiLimiter };
