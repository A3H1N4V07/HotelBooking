import React, { useEffect, useState } from "react";
import { formatPrice } from "../utils/formatPrice";
import api from "../api";
import { Link } from "react-router-dom";
import HoldNotice from "../components/HoldNotice";
import ReviewForm from "../components/ReviewForm";
import { useVoice } from "../context/VoiceContext";
import PageHeader from "../components/PageHeader";
import { BedIcon, CalendarIcon, DownloadIcon, MapPinIcon, UsersIcon } from "../components/Icons";

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
    if (status === "Confirmed" || status === "Paid") return "text-bg-success";
    if (status === "Cancelled" || status === "Failed") return "text-bg-danger";
    return "text-bg-secondary";
  };

  const detail = (icon, text) => (
    <div className="d-flex align-items-center gap-2 small text-secondary">
      {icon} {text}
    </div>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Your trips"
        title="My Bookings"
        subtitle={loading ? "Loading…" : `${bookings.length} booking${bookings.length === 1 ? "" : "s"}`}
        overlap
      >
        <Link to="/hotels" className="btn btn-accent rounded-pill px-4">Book another stay</Link>
      </PageHeader>

      <div className="container position-relative pb-5" style={{ marginTop: -56 }}>
        {loading ? (
          <div className="card border-0 rounded-4 shadow-sm p-5 text-center text-secondary">
            <div className="spinner-border text-warning mx-auto mb-3" role="status" />
            Loading your bookings…
          </div>
        ) : bookings.length === 0 ? (
          <div className="card border-0 rounded-4 shadow-sm p-5 text-center">
            <h4 className="fw-bold">No bookings yet</h4>
            <p className="text-secondary">Find a hotel, or just tell the assistant where you'd like to go.</p>
            <div>
              <Link to="/hotels" className="btn btn-dark rounded-pill px-4">Explore hotels</Link>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {bookings.map((booking) => (
              <div className="col-lg-6" key={booking.id}>
                <div className="card border-0 rounded-4 shadow-sm h-100 overflow-hidden hover-lift">
                  <div className="row g-0 h-100">
                    <div className="col-sm-4">
                      <img
                        src={booking.hotelImage}
                        alt={booking.hotelName}
                        className="w-100 h-100"
                        style={{ objectFit: "cover", minHeight: 180 }}
                      />
                    </div>

                    <div className="col-sm-8">
                      <div className="card-body p-4 d-flex flex-column h-100">
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                          <h5 className="card-title fw-bold mb-0">{booking.hotelName}</h5>
                          <span className="text-secondary small text-nowrap">#{booking.id}</span>
                        </div>
                        <div className="mb-3">{detail(<MapPinIcon size={14} />, booking.location)}</div>

                        <div className="d-flex flex-column gap-1 mb-3">
                          {booking.RoomType && detail(<BedIcon size={14} />, booking.RoomType.name)}
                          {detail(<CalendarIcon size={14} />, `${booking.checkInDate || "—"} → ${booking.checkOutDate || "—"}`)}
                          {detail(<UsersIcon size={14} />, `${booking.guests} guest${booking.guests > 1 ? "s" : ""}`)}
                        </div>

                        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                          <span className="fw-bold fs-5 me-auto">{formatPrice(booking.amount)}</span>
                          <span className={`badge rounded-pill ${statusBadgeClass(booking.bookingStatus)}`}>
                            {booking.bookingStatus}
                          </span>
                          <span className={`badge rounded-pill ${statusBadgeClass(booking.paymentStatus)}`}>
                            {booking.paymentStatus}
                          </span>
                        </div>

                        <div className="mt-auto pt-3 border-top">
                          {booking.paymentStatus === "Paid" ? (
                            <button
                              className="btn btn-sm btn-outline-dark rounded-pill px-3 d-inline-flex align-items-center gap-2"
                              onClick={() => handleDownloadInvoice(booking.id)}
                            >
                              <DownloadIcon size={16} /> Download Invoice
                            </button>
                          ) : booking.bookingStatus !== "Cancelled" ? (
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <Link to={`/payment/${booking.id}`} className="btn btn-sm btn-accent rounded-pill px-3">
                                {booking.paymentStatus === "Failed" ? "Retry payment" : "Pay now"}
                              </Link>
                              <button
                                className={`btn btn-sm rounded-pill px-3 ${confirmingId === booking.id ? "btn-danger" : "btn-outline-danger"}`}
                                onClick={() => (confirmingId === booking.id ? handleCancel(booking.id) : setConfirmingId(booking.id))}
                                onBlur={() => setConfirmingId((id) => (id === booking.id ? null : id))}
                              >
                                {confirmingId === booking.id ? "Confirm cancel" : "Cancel"}
                              </button>
                              <HoldNotice holdExpiresAt={booking.holdExpiresAt} compact />
                            </div>
                          ) : (
                            <Link to={`/hotels/${booking.hotelId}`} className="btn btn-sm btn-outline-dark rounded-pill px-3">
                              Book again
                            </Link>
                          )}

                          <ReviewForm
                            booking={booking}
                            onSaved={(review) =>
                              setBookings((list) => list.map((b) => (b.id === booking.id ? { ...b, Review: review } : b)))
                            }
                          />
                        </div>
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