const express = require("express");
const router = express.Router();
const { interpretVoiceCommand } = require("../services/voiceIntent");
const { aiLimiter } = require("../middleware/rateLimit");

router.post("/interpret", aiLimiter, async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ success: false, message: "transcript is required" });
    }

    const result = await interpretVoiceCommand(transcript);

    res.json({ success: true, ...result });
  } catch (error) {
    if (error.aiLimited) {
      // Not a bug: the AI quota is used up. The client falls back to its
      // built-in phrases and stops calling for a while.
      console.warn("Voice AI quota exhausted (Gemini 429)");
      return res.status(503).json({ success: false, code: "AI_LIMIT", message: "Voice AI is unavailable right now" });
    }

    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

module.exports = router;