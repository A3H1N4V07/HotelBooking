const nodemailer = require("nodemailer");
const { formatMoney } = require("./money");

// Sends the "booking confirmed" email. Never throws: the payment is already
// recorded by the time this runs, so a mail problem is only logged.
async function sendBookingConfirmation(booking) {
  const to = booking.User?.EmailAddress;

  if (!process.env.GMAIL || !process.env.GMAIL_SECRET_KEY) {
    console.warn(`Email not configured; skipped confirmation for booking ${booking.id}`);
    return;
  }

  if (!to) {
    console.warn(`No email address for booking ${booking.id}; confirmation not sent`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL,
        pass: process.env.GMAIL_SECRET_KEY,
      },
    });

    await transporter.sendMail({
      from: process.env.GMAIL,
      to,
      subject: "Hotel Booking Confirmed",
      html: `
        <h2>Booking Confirmed</h2>
        <p>Booking ID: ${booking.id}</p>
        <p>Hotel: ${booking.hotelName}</p>
        <p>Check In: ${booking.checkInDate}</p>
        <p>Check Out: ${booking.checkOutDate}</p>
        <p>Guests: ${booking.guests}</p>
        <p>Amount: ${formatMoney(booking.amount)}</p>
        <p>Payment Status: Paid</p>
        <br/>
        <h3>Thank you for booking with EchoStay.</h3>
      `,
    });
  } catch (error) {
    console.error(`Booking confirmation email failed for booking ${booking.id}:`, error);
  }
}

module.exports = { sendBookingConfirmation };
