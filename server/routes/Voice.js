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
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

module.exports = router;