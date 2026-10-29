// All prices and booking amounts are in Indian rupees (the server charges INR).
const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

// 2500 -> "₹2,500", 2500.5 -> "₹2,500.5"; non-numbers render as "₹0".
export function formatPrice(amount) {
  return rupees.format(Number(amount) || 0);
}
