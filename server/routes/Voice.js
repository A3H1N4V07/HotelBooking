const express = require("express");
const router = express.Router();
const { assist } = require("../services/assistant");
const { aiLimiter } = require("../middleware/rateLimit");

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : undefined);

// POST /voice/interpret
//   { transcript, page?, hotelId?, resultIds?, draft? }
// What's on screen (ids only) lets the assistant answer questions about those
// hotels; their facts are loaded from the database, never taken from the client.
router.post("/interpret", aiLimiter, async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ success: false, message: "transcript is required" });
    }

    const draft = req.body.draft && typeof req.body.draft === "object" ? req.body.draft : {};

    const result = await assist({
      transcript,
      page: str(req.body.page, 20),
      hotelId: Number(req.body.hotelId) || null,
      resultIds: Array.isArray(req.body.resultIds) ? req.body.resultIds.slice(0, 20).map(Number) : [],
      draft: {
        city: str(draft.city, 80),
        checkIn: str(draft.checkIn, 10),
        checkOut: str(draft.checkOut, 10),
        guests: str(String(draft.guests ?? ""), 3),
      },
    });

    res.json({ success: true, ...result });
  } catch (error) {
    if (error.aiLimited) {
      // Not a bug: no AI provider could answer (quota used up, down or slow).
      // The client falls back to its built-in phrases for a while.
      // retryAfter (seconds) lets the client pause only as long as needed.
      const retryAfter = error.retryAfterMs ? Math.ceil(error.retryAfterMs / 1000) : null;
      console.warn(`Voice AI unavailable: every AI provider is rate-limited, down or slow${retryAfter ? ` (retry in ${retryAfter}s)` : ""}`);
      return res
        .status(503)
        .json({ success: false, code: "AI_LIMIT", retryAfter, message: "Voice AI is unavailable right now" });
    }

    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

module.exports = router;
