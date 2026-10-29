const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const stripe = require("../services/stripe");
const PDFDocument = require("pdfkit");
const { Booking, Payment, User, sequelize } = require("../models");
const { CURRENCY, toMinorUnits, formatMoneyPdf } = require("../services/money");
const { recordSucceededPayment } = require("../services/paymentRecording");
const { sendBookingConfirmation } = require("../services/bookingEmail");

// Pay for Booking
router.post("/", auth, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { bookingId, id } = req.body;

    if (!id) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Payment method id is required",
      });
    }

    // Row lock: a second concurrent request for the same booking waits here
    // and then sees paymentStatus === "Paid" instead of charging again.
    const booking = await Booking.findByPk(bookingId, {
      include: User,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.userId !== req.user.id) {
      await transaction.rollback();

      return res.status(403).json({
        success: false,
        message: "Unauthorized access to booking",
      });
    }

    // Prevent duplicate payment

    if (booking.paymentStatus === "Paid") {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Booking already paid",
      });
    }

    const stripePayment = await stripe.paymentIntents.create({
      amount: toMinorUnits(booking.amount),

      currency: CURRENCY,

      description: booking.hotelName,

      payment_method: id,

      confirm: true,

      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },

      metadata: { bookingId: String(booking.id) },
    }, {
      // Same booking + same card => Stripe returns the original PaymentIntent
      // instead of charging twice. A different card gets a fresh attempt.
      idempotencyKey: `booking-${booking.id}-${id}`,
    });

    // confirm: true does not throw for e.g. 3-D Secure ("requires_action"),
    // so only a "succeeded" intent may mark the booking as paid.
    if (stripePayment.status !== "succeeded") {
      await transaction.rollback();

      return res.status(402).json({
        success: false,
        message: `Payment not completed (status: ${stripePayment.status})`,
      });
    }

    // Same code path as the Stripe webhook; whichever records the payment
    // first sends the email, the other sees "duplicate".
    const result = await recordSucceededPayment(stripePayment, { transaction });

    if (result.status !== "recorded" && result.status !== "duplicate") {
      throw new Error(`Could not record payment ${stripePayment.id}: ${result.status}`);
    }

    await transaction.commit();

    if (result.status === "recorded") {
      await sendBookingConfirmation(result.booking);
    }

    return res.json({
      success: true,

      paymentId: stripePayment.id,

      booking: result.booking,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error(error);

    // Card errors (declined, expired, ...) carry messages written for users.
    if (error.type === "StripeCardError") {
      return res.status(402).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,

      message: "Something went wrong",
    });
  }
});

// Payment Status Route
router.get("/", async (req, res) => {
  res.json({
    success: true,
    message: "Payment API Running",
  });
});


// ======================================
// DOWNLOAD INVOICE
// ======================================

router.get("/invoice/:bookingId", auth, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.bookingId, {
      include: [User, Payment],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const payment = booking.Payments[0];

    const doc = new PDFDocument({ margin: 0, size: "A4" });

    const filename = `invoice_${booking.id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    doc.pipe(res);

    const NAVY = "#0B1F3A";
    const GOLD = "#F6B73C";
    const GRAY = "#6c757d";
    const LIGHT_GRAY = "#f5f6f8";

    const pageWidth = doc.page.width;
    const margin = 50;

    doc.rect(0, 0, pageWidth, 110).fill(NAVY);

    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(26).text("EchoStay", margin, 35);

    doc.fillColor("#ffffff").font("Helvetica").fontSize(11).text("Hotel Booking Invoice", margin, 68);

    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(`#${booking.id}`, 0, 45, { align: "right", width: pageWidth - margin });

    let y = 140;

    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(10).text("BILLED TO", margin, y);
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(10).text("INVOICE DETAILS", pageWidth / 2, y);

    y += 16;

    const guestDisplayName =
      booking.guestName || (booking.User ? `${booking.User.firstName} ${booking.User.lastName}` : "N/A");

    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(12).text(guestDisplayName, margin, y);

    doc
      .fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`Payment ID: ${payment ? payment.stripePaymentId : "N/A"}`, pageWidth / 2, y);

    y += 16;

    doc.fillColor(GRAY).font("Helvetica").fontSize(10).text(booking.User ? booking.User.EmailAddress : "N/A", margin, y);

    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(10)
      .text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, y);

    if (booking.guestPhone) {
      y += 14;
      doc.fillColor(GRAY).font("Helvetica").fontSize(10).text(booking.guestPhone, margin, y);
    }

    y += 40;
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor("#e0e0e0").lineWidth(1).stroke();

    y += 24;
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(10).text("STAY DETAILS", margin, y);

    y += 18;
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(15).text(booking.hotelName, margin, y);

    y += 20;
    doc.fillColor(GRAY).font("Helvetica").fontSize(10).text(`Location: ${booking.location}`, margin, y);

    y += 26;

    const col1 = margin;
    const col2 = margin + 160;
    const col3 = margin + 320;

    doc.fillColor(GRAY).font("Helvetica").fontSize(9).text("CHECK-IN", col1, y);
    doc.fillColor(GRAY).font("Helvetica").fontSize(9).text("CHECK-OUT", col2, y);
    doc.fillColor(GRAY).font("Helvetica").fontSize(9).text("GUESTS", col3, y);

    y += 14;

    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text(booking.checkInDate || "N/A", col1, y);
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text(booking.checkOutDate || "N/A", col2, y);
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text(String(booking.guests), col3, y);

    y += 40;
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor("#e0e0e0").lineWidth(1).stroke();

    y += 24;

    const boxHeight = 90;
    doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 8).fill(LIGHT_GRAY);

    doc.fillColor(GRAY).font("Helvetica").fontSize(11).text("Room Charges", margin + 20, y + 20);

    doc
      .fillColor(NAVY)
      .font("Helvetica")
      .fontSize(11)
      .text(formatMoneyPdf(booking.amount), 0, y + 20, {
        align: "right",
        width: pageWidth - margin - 20,
      });

    doc
      .moveTo(margin + 20, y + 44)
      .lineTo(pageWidth - margin - 20, y + 44)
      .strokeColor("#dcdcdc")
      .stroke();

    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(14).text("Total Paid", margin + 20, y + 56);

    doc
      .fillColor(GOLD)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text(formatMoneyPdf(booking.amount), 0, y + 54, {
        align: "right",
        width: pageWidth - margin - 20,
      });

    y += boxHeight + 24;

    const isPaid = booking.paymentStatus === "Paid";
    const pillColor = isPaid ? "#1e7e34" : "#a71d2a";
    const pillLabel = isPaid ? "PAID" : booking.paymentStatus.toUpperCase();

    doc.roundedRect(margin, y, 90, 24, 12).fill(pillColor);
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(pillLabel, margin, y + 7, { width: 90, align: "center" });

    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(10)
      .text(`Booking Status: ${booking.bookingStatus}`, margin + 110, y + 6);

    const footerY = doc.page.height - 90;

    doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).strokeColor("#e0e0e0").stroke();

    doc
      .fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Thank you for choosing EchoStay", 0, footerY + 16, {
        align: "center",
        width: pageWidth,
      });

    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(8)
      .text("This is a computer-generated invoice and does not require a signature.", 0, footerY + 34, {
        align: "center",
        width: pageWidth,
      });

    doc.end();
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

module.exports = router;
