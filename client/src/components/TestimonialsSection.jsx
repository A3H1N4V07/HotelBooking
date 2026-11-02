import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { StarIcon } from "./Icons";

// Latest guest reviews (GET /reviews/recent). Guests write them from
// My Bookings after their stay starts; with none yet, the section stays hidden.
function TestimonialsSection() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    api.get("/reviews/recent", { params: { limit: 3 } })
      .then((res) => setReviews(res.data))
      .catch(() => setReviews([]));
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section className="container py-5">
      <div className="text-center mb-5">
        <p className="text-uppercase small fw-bold text-warning mb-1">Reviews</p>
        <h2 className="fw-bold mb-0">What our guests say</h2>
      </div>

      <div className="row g-4 justify-content-center">
        {reviews.map((r) => (
          <div className="col-md-4" key={r.id}>
            <div className="card border-0 rounded-4 shadow-sm hover-lift p-4 h-100">
              <div className="d-flex gap-1 text-warning mb-3" aria-label={`${r.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} size={16} filled={n <= r.rating} />
                ))}
              </div>

              <p className="text-secondary flex-grow-1">"{r.comment}"</p>

              <div className="d-flex align-items-center gap-3 pt-3 border-top">
                <div
                  className="gradient-accent rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{ width: 44, height: 44 }}
                >
                  {r.name[0]?.toUpperCase() || "G"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h6 className="mb-0 fw-bold">{r.name}</h6>
                  {r.hotel && (
                    <Link to={`/hotels/${r.hotel.id}`} className="small text-muted text-decoration-none d-block text-truncate">
                      Stayed at {r.hotel.name}, {r.hotel.city}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TestimonialsSection;
