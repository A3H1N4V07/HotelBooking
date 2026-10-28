import React from "react";
import { Link } from "react-router-dom";

function HeroSection({ heroImage, onStartVoice, listening }) {
  return (
    <div
      className="position-relative d-flex align-items-center reveal"
      style={{
        minHeight: "620px",
        backgroundImage: heroImage
          ? `linear-gradient(rgba(11,31,58,0.65), rgba(11,31,58,0.75)), url(${heroImage})`
          : "linear-gradient(135deg, #0B1F3A, #1E3A8A)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="container text-white py-5">
        <h1 className="display-3 fw-bold mb-3">
          Stay Beyond <span className="text-gold">Expectations</span>
        </h1>

        <p className="lead mb-4" style={{ maxWidth: "560px" }}>
          Discover premium hotels using AI-powered voice booking. Search, compare
          and book effortlessly.
        </p>

        <div className="d-flex flex-wrap gap-3 mb-4">
          <Link to="/hotels">
            <button className="btn btn-gold btn-lg px-4">Explore Hotels</button>
          </Link>

          <button
            className={`btn btn-outline-glass btn-lg px-4 ${listening ? "pulse-outline" : ""}`}
            onClick={onStartVoice}
          >
            🎤 {listening ? "Listening..." : "Start Voice Booking"}
          </button>
        </div>

        <div className="d-flex flex-wrap gap-3">
          <span className="badge-floating">★★★★★ Rated</span>
          <span className="badge-floating">100+ Hotels</span>
          <span className="badge-floating">500+ Happy Customers</span>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;