const stripe = require("../services/stripe");
const { recordSucceededPayment, recordFailedPayment } = require("../services/paymentRecording");
const { sendBookingConfirmation } = require("../services/bookingEmail");

// POST /payment/webhook — Stripe's own report of what happened to a payment.
// This is the source of truth: it also arrives when the browser request was
// lost or the server crashed after charging. Must receive the raw body
// (mounted with express.raw in index.js) so the signature can be checked.
async function stripeWebhook(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set; rejecting Stripe webhook");
    return res.status(500).json({ received: false });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret);
  } catch (error) {
    // Not from Stripe (or tampered with): never act on it.
    console.warn(`Rejected Stripe webhook: ${error.message}`);
    return res.status(400).json({ received: false });
  }

  try {
    const paymentIntent = event.data.object;

    if (event.type === "payment_intent.succeeded") {
      const result = await recordSucceededPayment(paymentIntent);

      if (result.status === "recorded") {
        await sendBookingConfirmation(result.booking);
      }

      console.log(`Stripe ${event.type} ${paymentIntent.id}: ${result.status}`);
    } else if (event.type === "payment_intent.payment_failed") {
      const result = await recordFailedPayment(paymentIntent);
      console.log(`Stripe ${event.type} ${paymentIntent.id}: ${result.status}`);
    }

    // Other event types are acknowledged and ignored.
    res.json({ received: true });
  } catch (error) {
    // A 5xx makes Stripe retry later, which is what we want for DB hiccups.
    console.error(`Failed to process Stripe event ${event.id}:`, error);
    res.status(500).json({ received: false });
  }
}

module.exports = stripeWebhook;
