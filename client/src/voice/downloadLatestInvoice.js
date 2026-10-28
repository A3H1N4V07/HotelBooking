import api from "../api";

// Downloads the PDF invoice for the user's most recent paid booking.
export async function downloadLatestInvoice() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first.");
    return;
  }

  try {
    const bookingsResponse = await api.get("/bookings/my-bookings");
    const paidBookings = bookingsResponse.data.bookings.filter(
      (b) => b.paymentStatus === "Paid"
    );

    if (paidBookings.length === 0) {
      alert("No paid bookings found to download an invoice for.");
      return;
    }

    const latest = paidBookings[0];

    const response = await api.get(`/payment/invoice/${latest.id}`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", `invoice_${latest.id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert("Failed to download invoice.");
  }
}
