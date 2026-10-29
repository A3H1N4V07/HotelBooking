// One Stripe client for the whole server.
const stripe = require("stripe")(process.env.STRIPE_SECRET_TEST);

module.exports = stripe;
