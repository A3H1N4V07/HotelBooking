import React from "react";
import { CloseIcon, MicIcon } from "./Icons";

function BookingFormModal({
  hotelName,
  roomSummary,
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
      style={{ background: "rgba(30,27,75,0.55)", backdropFilter: "blur(6px)", zIndex: 1060 }}
      onClick={onClose}
    >
      <div
        className="card border-0 rounded-4 shadow-lg p-4"
        style={{ width: 440, maxWidth: "92vw", maxHeight: "92vh", overflowY: "auto" }}
        role="dialog"
        aria-modal="true"
        aria-label="Booking details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h4 className="fw-bold mb-1">Booking details</h4>
            <p className="text-muted small mb-0">{hotelName}</p>
          </div>
          <button type="button" className="btn btn-light rounded-circle p-0 d-inline-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }} onClick={onClose} aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        {roomSummary && <div className="rounded-3 bg-warning bg-opacity-10 border border-warning small fw-semibold px-3 py-2 mb-3">{roomSummary}</div>}

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small fw-semibold text-secondary mb-1">Check In</label>
              <input
                type="date"
                className="form-control"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                required
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold text-secondary mb-1">Check Out</label>
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
            <label className="form-label small fw-semibold text-secondary mb-1">Guests</label>
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
            <label className="form-label small fw-semibold text-secondary mb-1">Guest Name</label>
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
            <label className="form-label small fw-semibold text-secondary mb-1">Phone Number</label>
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
            <button type="submit" className="btn btn-accent btn-lg rounded-pill flex-grow-1 fs-6" disabled={submitting}>
              {submitting ? "Booking..." : "Continue to Payment"}
            </button>
            <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>

        <p className="text-muted small mt-3 mb-0 d-flex align-items-center gap-2">
          <MicIcon size={14} /> Try: "My name is ...", "My phone number is ...", "Confirm booking"
        </p>
      </div>
    </div>
  );
}

export default BookingFormModal;