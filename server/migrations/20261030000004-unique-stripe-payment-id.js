"use strict";

// A Stripe PaymentIntent can be reported twice (the payment request and the
// webhook, or a webhook retry). The unique index makes recording it a second
// time impossible, not just unlikely.

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("Payments", ["stripePaymentId"], {
      unique: true,
      name: "payments_stripe_payment_id_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Payments", "payments_stripe_payment_id_unique");
  },
};
