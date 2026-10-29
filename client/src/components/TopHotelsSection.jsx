import React, { useState } from "react";
import { formatPrice } from "../utils/formatPrice";
import { useNavigate } from "react-router-dom";

function StarRating({ rating }) {
  const rounded = Math.round(rating);
  return (
    <span className="text-gold">
      {"★".repeat(rounded)}
      <span className="text-muted">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}

function TopHotelsSection({ hotels }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(new Set());

  const toggleLike = (id) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div id="top-hotels" className="container py-5 reveal">
      <h2 className="fw-bold mb-4 text-center">Top Hotels</h2>

      <div className="row g-4">
        {hotels.map((hotel) => (
          <div className="col-md-4 col-sm-6" key={hotel.id}>
            <div className="card border-0 shadow-sm hover-lift h-100 position-relative">
              <img
                src={hotel.image}
                alt={hotel.name}
                className="card-img-top"
                style={{ height: "200px", objectFit: "cover" }}
              />

              <button
                className="btn btn-light rounded-circle position-absolute"
                style={{ top: "12px", right: "12px", width: "38px", height: "38px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike(hotel.id);
                }}
                title="Wishlist"
              >
                {liked.has(hotel.id) ? "❤️" : "🤍"}
              </button>

              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <h5 className="card-title mb-0">{hotel.name}</h5>
                  <StarRating rating={hotel.rating} />
                </div>

                <p className="text-muted small mb-2">{hotel.city}</p>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-light text-dark border">🏊 Pool</span>
                  <span className="badge bg-light text-dark border">📶 Free WiFi</span>
                  <span className="badge bg-light text-dark border">🍳 Breakfast</span>
                </div>

                <div className="mt-auto d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0">{formatPrice(hotel.price)}</h5>

                  <button
                    className="btn btn-dark btn-sm"
                    onClick={() => navigate(`/hotels/${hotel.id}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopHotelsSection;