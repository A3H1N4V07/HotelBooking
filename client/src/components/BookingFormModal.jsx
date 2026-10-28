import React from "react";

function BookingFormModal({
  hotelName,
  checkInDate,
  setCheckInDate,
  checkOutDate,
  setCheckOutDate,
  guests,
  setGuests,
  guestName,
  setGuestName,
  guestPhone,
  setGuestPhone,
  error,
  onClose,
  onSubmit,
  submitting,
}) {
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(11,31,58,0.6)", zIndex: 1060 }}
      onClick={onClose}
    >
      <div
        className="card border-0 shadow-lg p-4"
        style={{ width: "420px", maxWidth: "90vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="fw-bold mb-1">Booking Details</h4>
        <p className="text-muted small mb-3">{hotelName}</p>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small">Check In</label>
              <input
                type="date"
                className="form-control"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                required
              />
            </div>
            <div className="col-6">
              <label className="form-label small">Check Out</label>
              <input
                type="date"
                className="form-control"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label small">Guests</label>
            <input
              type="number"
              min="1"
              className="form-control"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label small">Guest Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Full name for check-in"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label small">Phone Number</label>
            <input
              type="tel"
              className="form-control"
              placeholder="+91 98765 43210"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              required
            />
          </div>

          <div className="d-flex gap-2 mt-2">
            <button type="submit" className="btn btn-gold flex-grow-1" disabled={submitting}>
              {submitting ? "Booking..." : "Continue to Payment"}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>

        <p className="text-muted small mt-3 mb-0">
          🎤 Try: "My name is ...", "My phone number is ...", "Confirm booking"
        </p>
      </div>
    </div>
  );
}

export default BookingFormModal;