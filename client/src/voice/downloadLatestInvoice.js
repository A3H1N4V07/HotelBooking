import api from "../api";

// Downloads the PDF invoice for the user's most recent paid booking.
// `notify` shows (and, with voice on, speaks) a non-blocking message.
export async function downloadLatestInvoice(notify) {
  const token = localStorage.getItem("token");

  if (!token) {
    notify("Please log in to download an invoice.");
    return;
  }

  try {
    const bookingsResponse = await api.get("/bookings/my-bookings");
    const paidBookings = bookingsResponse.data.bookings.filter(
      (b) => b.paymentStatus === "Paid"
    );

    if (paidBookings.length === 0) {
      notify("You don't have a paid booking to download an invoice for yet.");
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

    notify(`Downloading the invoice for your ${latest.hotelName} booking.`, "success");
  } catch (error) {
    console.error(error);
    notify("Sorry, the invoice download failed.", "error");
  }
}
