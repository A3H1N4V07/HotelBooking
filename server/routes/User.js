const express = require('express');
const router = express.Router();


const { User } = require('../models');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { authLimiter } = require("../middleware/rateLimit");

// Get All Users
router.get("/", auth, isAdmin, async (req, res) => {

    try {

        const users = await User.findAll({ attributes: { exclude: ["password"] } });

        res.json(users);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
});

// Get Single User
router.get("/:id", auth, async (req, res) => {

    if (req.user.id !== Number(req.params.id) && req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {

        const user = await User.findByPk(req.params.id, { attributes: { exclude: ["password"] } });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
});

const MIN_PASSWORD_LENGTH = 8;

const REGISTER_FIELDS = [
    "firstName",
    "lastName",
    "age",
    "Origin",
    "Destination",
    "travelDate",
    "checkInDate",
    "checkOutDate",
    "NoOfGuests",
    "PhoneNo",
    "EmailAddress",
];

// Create User
router.post("/register", authLimiter, async (req, res) => {

    try {

        const { EmailAddress, password } = req.body;

        if (typeof EmailAddress !== "string" || !/^\S+@\S+\.\S+$/.test(EmailAddress)) {
            return res.status(400).json({
                success: false,
                message: "A valid email address is required"
            });
        }

        if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
            });
        }

        const existingUser =
            await User.findOne({
                where: {
                    EmailAddress:
                        req.body.EmailAddress
                }
            });

        if (existingUser) {

            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });

        }

        const hashedPassword =
            await bcrypt.hash(
                req.body.password,
                10
            );

        // Only copy known profile fields; never let the client set role/id.
        const profile = {};

        for (const field of REGISTER_FIELDS) {
            if (req.body[field] !== undefined) {
                profile[field] = req.body[field];
            }
        }

        const user =
            await User.create({

                ...profile,

                password:
                    hashedPassword

            });

        res.status(201).json({

            success: true,

            id: user.id,

            message:
                "User registered successfully"

        });

    } catch (error) {

        console.error(error);

        // Model validation messages (e.g. bad phone number) are safe to show.
        if (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError") {
            return res.status(400).json({
                success: false,
                message: error.errors.map((e) => e.message).join(", ")
            });
        }

        res.status(500).json({

            success: false,

            message: "Something went wrong"

        });

    }

});

router.post("/login", authLimiter, async (req, res) => {

    try {

        const {
            EmailAddress,
            password
        } = req.body;

        const user =
            await User.findOne({
                where: {
                    EmailAddress
                }
            });

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });

        }

        const validPassword =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!validPassword) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });

        }

        const token =
            jwt.sign(

                {
                    id: user.id,
                    role: user.role
                },

                process.env.JWT_SECRET,

                {
                    expiresIn: "7d"
                }

            );

        res.json({

            success: true,

            token,

            user: {
                id: user.id,
                firstName:
                    user.firstName,
                role:
                    user.role
            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Something went wrong"

        });

    }

});

module.exports = router;