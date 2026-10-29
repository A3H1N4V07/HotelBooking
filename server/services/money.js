// Hotel prices and booking amounts are stored in Indian rupees.
// Keep every charge and every displayed amount going through here so the
// currency can't drift between what we show and what Stripe charges.
const CURRENCY = "inr";

// Stripe takes amounts in the smallest unit (paise for INR).
function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

const rupeeFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

// "₹2,500.00" — for HTML/email.
function formatMoney(amount) {
  return rupeeFormat.format(Number(amount));
}

// "Rs. 2,500.00" — PDFKit's built-in Helvetica has no ₹ glyph.
function formatMoneyPdf(amount) {
  const value = Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `Rs. ${value}`;
}

module.exports = { CURRENCY, toMinorUnits, formatMoney, formatMoneyPdf };
