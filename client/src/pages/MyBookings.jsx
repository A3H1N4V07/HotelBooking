import React, { useEffect, useState } from "react";
import { formatPrice } from "../utils/formatPrice";
import api from "../api";
import { Link } from "react-router-dom";
import HoldNotice from "../components/HoldNotice";
import { useVoice } from "../context/VoiceContext";

function MyBookings() {
  const { notify } = useVoice();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.get("/bookings/my-bookings");
        setBookings(response.data.bookings);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleDownloadInvoice = async (bookingId) => {
    try {
      const response = await api.get(`/payment/invoice/${bookingId}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", `invoice_${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      notify("Sorry, the invoice download failed.", "error");
    }
  };

  // Two clicks: the first asks, the second cancels (unpaid bookings only).
  const [confirmingId, setConfirmingId] = useState(null);

  const handleCancel = async (bookingId) => {
    try {
      const response = await api.post(`/bookings/${bookingId}/cancel`);
      setBookings((list) => list.map((b) => (b.id === bookingId ? { ...b, ...response.data.booking } : b)));
      notify("Booking cancelled and the room released.");
    } catch (error) {
      console.error(error);
      notify(error.response?.data?.message || "Couldn't cancel the booking. Please try again.", "error");
    } finally {
      setConfirmingId(null);
    }
  };

  const statusBadgeClass = (status) => {
    if (status === "Confirmed" || status === "Paid") return "bg-success";
    if (status === "Cancelled" || status === "Failed") return "bg-danger";
    return "bg-secondary";
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <h2>Loading your bookings...</h2>
      </div>
    );
  }

  return (
    <div>
      <div className="gradient-navy text-white text-center py-4">
        <div className="container">
          <h1 className="fw-bold mb-0">My Bookings</h1>
        </div>
      </div>

      <div className="container py-4">
        {bookings.length === 0 ? (
          <p className="text-muted">No bookings found.</p>
        ) : (
          <div className="row g-4">
            {bookings.map((booking) => (
              <div className="col-md-6" key={booking.id}>
                <div className="card border-0 shadow-sm h-100 hover-lift">
                  <div className="row g-0 h-100">
                    <div className="col-4">
                      <img
                        src={booking.hotelImage}
                        alt={booking.hotelName}
                        className="img-fluid h-100"
                        style={{ objectFit: "cover", borderRadius: "8px 0 0 8px" }}
                      />
                    </div>

                    <div className="col-8">
                      <div className="card-body">
                        <h5 className="card-title">{booking.hotelName}</h5>
                        <p className="text-muted small mb-2">{booking.location}</p>

                        {booking.RoomType && (
                          <p className="mb-1 small">
                            <strong>Room:</strong> {booking.RoomType.name}
                          </p>
                        )}
                        <p className="mb-1 small">
                          <strong>Check In:</strong> {booking.checkInDate || "—"}
                        </p>
                        <p className="mb-1 small">
                          <strong>Check Out:</strong> {booking.checkOutDate || "—"}
                        </p>
                        <p className="mb-2 small">
                          <strong>Guests:</strong> {booking.guests}
                        </p>

                        <p className="fw-bold mb-2 text-gold">{formatPrice(booking.amount)}</p>

                        <div className="d-flex gap-2 mb-2">
                          <span className={`badge ${statusBadgeClass(booking.bookingStatus)}`}>
                            {booking.bookingStatus}
                          </span>
                          <span className={`badge ${statusBadgeClass(booking.paymentStatus)}`}>
                            {booking.paymentStatus}
                          </span>
                        </div>

                        {booking.paymentStatus === "Paid" ? (
                          <button
                            className="btn btn-sm btn-outline-dark"
                            onClick={() => handleDownloadInvoice(booking.id)}
                          >
                            Download Invoice
                          </button>
                        ) : booking.bookingStatus !== "Cancelled" && (
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <Link to={`/payment/${booking.id}`} className="btn btn-sm btn-gold">
                              {booking.paymentStatus === "Failed" ? "Retry payment" : "Pay now"}
                            </Link>
                            <button
                              className={`btn btn-sm ${confirmingId === booking.id ? "btn-danger" : "btn-outline-danger"}`}
                              onClick={() => (confirmingId === booking.id ? handleCancel(booking.id) : setConfirmingId(booking.id))}
                              onBlur={() => setConfirmingId((id) => (id === booking.id ? null : id))}
                            >
                              {confirmingId === booking.id ? "Confirm cancel" : "Cancel"}
                            </button>
                            <HoldNotice holdExpiresAt={booking.holdExpiresAt} compact />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyBookings;