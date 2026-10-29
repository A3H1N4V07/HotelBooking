import React, { useEffect, useState } from "react";
import { formatPrice } from "../utils/formatPrice";
import api from "../api";

function MyBookings() {
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
      alert("Failed to download invoice");
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

                        <p className="mb-1 small">
                          <strong>Check In:</strong> {booking.checkInDate}
                        </p>
                        <p className="mb-1 small">
                          <strong>Check Out:</strong> {booking.checkOutDate}
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

                        {booking.paymentStatus === "Paid" && (
                          <button
                            className="btn btn-sm btn-outline-dark"
                            onClick={() => handleDownloadInvoice(booking.id)}
                          >
                            Download Invoice
                          </button>
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