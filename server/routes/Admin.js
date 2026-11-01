const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

const { Op, fn, col, literal } = require("sequelize");

const {
    User,
    Booking,
    Payment,
    VoiceEvent
} = require("../models");

router.get("/stats", auth, isAdmin, async (req, res) => {

    try {

        const totalUsers =
            await User.count();

        const totalBookings =
            await Booking.count();

        const totalPayments =
            await Payment.count();

        const revenueResult =
            await Payment.sum("amount");

        const recentBookings =
            await Booking.findAll({
                limit: 5,
                order: [
                    ["createdAt", "DESC"]
                ]
            });
        
            const recentPayments =
    await Payment.findAll({
        limit: 5,
        order: [["createdAt", "DESC"]]
    });

        res.json({

            success: true,

            totalUsers,

            totalBookings,

            totalPayments,

            totalRevenue:
                revenueResult || 0,

            recentBookings,

            recentPayments

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });

    }

});

// GET /admin/voice-stats?days=7
// How the voice assistant handled phrases: share understood locally vs by the
// AI, speed of each path, and the phrases the local rules most often miss.
router.get("/voice-stats", auth, isAdmin, async (req, res) => {
    try {
        const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
        const since = { createdAt: { [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } };

        const byPath = await VoiceEvent.findAll({
            where: since,
            attributes: [
                "handledBy",
                [fn("COUNT", col("id")), "count"],
                [fn("AVG", col("ms")), "avgMs"],
            ],
            group: ["handledBy"],
            raw: true,
        });

        const byPage = await VoiceEvent.findAll({
            where: since,
            attributes: ["page", "handledBy", [fn("COUNT", col("id")), "count"]],
            group: ["page", "handledBy"],
            raw: true,
        });

        // Phrases that needed the AI or weren't understood: what to teach the
        // local rules next.
        const topPhrases = await VoiceEvent.findAll({
            where: { ...since, phrase: { [Op.ne]: null } },
            attributes: ["phrase", "handledBy", [fn("COUNT", col("id")), "count"]],
            group: ["phrase", "handledBy"],
            order: [[literal("count"), "DESC"]],
            limit: 15,
            raw: true,
        });

        const total = byPath.reduce((sum, row) => sum + Number(row.count), 0);

        res.json({
            success: true,
            days,
            total,
            byPath: byPath.map((row) => ({
                handledBy: row.handledBy,
                count: Number(row.count),
                share: total ? Number(row.count) / total : 0,
                avgMs: row.avgMs === null ? null : Math.round(Number(row.avgMs)),
            })),
            byPage: byPage.map((row) => ({ page: row.page, handledBy: row.handledBy, count: Number(row.count) })),
            topPhrases: topPhrases.map((row) => ({ phrase: row.phrase, handledBy: row.handledBy, count: Number(row.count) })),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
});

module.exports = router;