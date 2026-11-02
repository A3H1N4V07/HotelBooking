import React, { useState } from "react";
import api from "../api";
import { StarIcon } from "./Icons";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// "YYYY-MM-DD" for today, local time.
function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function Stars({ value, size = 16 }) {
  return (
    <span className="d-inline-flex gap-1 text-warning" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} filled={n <= value} />
      ))}
    </span>
  );
}

// Rating for a paid stay on My Bookings: shows the guest's review, or lets
// them write one once the stay has started (the server checks this too).
function ReviewForm({ booking, onSaved }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const paid = booking.paymentStatus === "Paid" && booking.bookingStatus !== "Cancelled";
  if (!paid) return null;

  if (booking.Review) {
    return (
      <div className="mt-3 p-3 rounded-3 bg-warning bg-opacity-10">
        <div className="d-flex align-items-center gap-2 small fw-semibold">
          Your rating <Stars value={booking.Review.rating} size={14} />
        </div>
        {booking.Review.comment && <p className="small text-secondary mb-0 mt-1">"{booking.Review.comment}"</p>}
      </div>
    );
  }

  if (!booking.checkInDate || booking.checkInDate > todayIso()) return null;

  if (!open) {
    return (
      <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3 mt-2 d-inline-flex align-items-center gap-2" onClick={() => setOpen(true)}>
        <StarIcon size={14} /> Rate your stay
      </button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError("Pick a star rating first.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await api.post("/reviews", { bookingId: booking.id, rating, comment });
      onSaved(res.data.review);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your review. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const shown = hover || rating;

  return (
    <form onSubmit={submit} className="mt-3 p-3 rounded-3 bg-light">
      <div className="d-flex align-items-center gap-2 mb-2">
        <div className="d-flex text-warning" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="btn btn-link p-0 me-1 text-warning"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
            >
              <StarIcon size={22} filled={n <= shown} />
            </button>
          ))}
        </div>
        <span className="small text-secondary">{LABELS[shown]}</span>
      </div>

      <textarea
        className="form-control form-control-sm rounded-3 mb-2"
        rows={2}
        maxLength={500}
        placeholder="What stood out? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {error && <p className="small text-danger mb-2">{error}</p>}

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-sm btn-accent rounded-pill px-3" disabled={saving}>
          {saving ? "Saving…" : "Submit review"}
        </button>
        <button type="button" className="btn btn-sm btn-link text-secondary text-decoration-none" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default ReviewForm;
