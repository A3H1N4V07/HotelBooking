const { Booking, Payment, User, sequelize } = require("../models");
const { CURRENCY, toMinorUnits } = require("./money");

// The single place that turns a Stripe PaymentIntent into booking state.
// Both the payment request (POST /payment) and the Stripe webhook call it,
// in either order and any number of times; the booking row lock plus the
// unique index on Payments.stripePaymentId make repeats harmless.

function bookingIdOf(paymentIntent) {
  const id = Number(paymentIntent.metadata?.bookingId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Runs `work` in the caller's transaction, or in a new one.
function inTransaction(transaction, work) {
  return transaction ? work(transaction) : sequelize.transaction(work);
}

async function lockBooking(bookingId, transaction) {
  return Booking.findByPk(bookingId, {
    include: User,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

// Returns { status, booking }, where status is:
//   "recorded"  - first time we've seen this payment; booking is now Paid
//   "duplicate" - already recorded earlier (webhook retry, or route + webhook)
//   "mismatch"  - amount/currency differs from the booking; NOT marked paid
//   "ignored"   - not one of our bookings (no/unknown bookingId)
async function recordSucceededPayment(paymentIntent, { transaction } = {}) {
  const bookingId = bookingIdOf(paymentIntent);

  if (!bookingId) return { status: "ignored" };

  return inTransaction(transaction, async (t) => {
    const booking = await lockBooking(bookingId, t);

    if (!booking) return { status: "ignored" };

    const existing = await Payment.findOne({
      where: { stripePaymentId: paymentIntent.id },
      transaction: t,
    });

    if (existing) return { status: "duplicate", booking };

    if (
      paymentIntent.amount !== toMinorUnits(booking.amount) ||
      paymentIntent.currency !== CURRENCY
    ) {
      console.error(
        `Payment ${paymentIntent.id} (${paymentIntent.amount} ${paymentIntent.currency}) ` +
          `does not match booking ${booking.id} (${booking.amount} ${CURRENCY}); not marking it paid`
      );
      return { status: "mismatch", booking };
    }

    if (booking.paymentStatus === "Paid") {
      // Money was taken twice for one booking: keep the record, flag it.
      console.warn(`Booking ${booking.id} was already paid; recording extra payment ${paymentIntent.id}`);
    }

    await Payment.create(
      {
        bookingId: booking.id,
        stripePaymentId: paymentIntent.id,
        amount: booking.amount,
        currency: paymentIntent.currency,
        status: "Succeeded",
        paymentMethod: paymentIntent.payment_method,
      },
      { transaction: t }
    );

    await booking.update(
      { paymentStatus: "Paid", bookingStatus: "Confirmed" },
      { transaction: t }
    );

    return { status: "recorded", booking };
  });
}

// Marks the booking's payment as Failed, unless it has been paid meanwhile.
async function recordFailedPayment(paymentIntent) {
  const bookingId = bookingIdOf(paymentIntent);

  if (!bookingId) return { status: "ignored" };

  return sequelize.transaction(async (t) => {
    const booking = await lockBooking(bookingId, t);

    if (!booking) return { status: "ignored" };
    if (booking.paymentStatus === "Paid") return { status: "already-paid", booking };

    await booking.update({ paymentStatus: "Failed" }, { transaction: t });
    return { status: "failed", booking };
  });
}

module.exports = { recordSucceededPayment, recordFailedPayment };
