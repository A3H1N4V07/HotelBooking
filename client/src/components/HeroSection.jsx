import React from "react";
import { Link } from "react-router-dom";
import { NAV_HEIGHT } from "./Header";
import { ArrowRightIcon, MicIcon, SparkleIcon } from "./Icons";

// Full-screen photo with the glass header over its top and the search card
// (`children`) over its bottom.
function HeroSection({ heroImage, onStartVoice, listening, hotelCount, cityCount, children }) {
  return (
    <section
      className="position-relative d-flex align-items-end text-white"
      style={{
        marginTop: -NAV_HEIGHT,
        paddingTop: NAV_HEIGHT + 48,
        minHeight: "100vh",
        backgroundImage: heroImage
          ? `linear-gradient(180deg, rgba(11,46,44,0.55) 0%, rgba(11,46,44,0.35) 45%, rgba(11,46,44,0.9) 100%), url(${heroImage})`
          : "linear-gradient(135deg, #0b2e2c, #14504b)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="container pb-5">
        <div className="row align-items-center g-4 g-lg-5 mb-5">
          <div className="col-lg-7">
            <span className="badge-floating d-inline-flex align-items-center gap-2 mb-4">
              <SparkleIcon size={16} className="text-accent" /> Voice-first hotel booking
            </span>

            <h1 className="display-3 fw-bold mb-3 lh-1">
              Stay Beyond <span className="text-gradient">Expectations</span>
            </h1>

            <p className="lead mb-4 text-white text-opacity-75" style={{ maxWidth: 560 }}>
              Say where and when, and EchoStay finds, compares and books the room for you.
              Or search the usual way.
            </p>

            <div className="d-flex flex-wrap gap-3 mb-4">
              <Link to="/hotels" className="btn btn-accent btn-lg rounded-pill px-4 d-inline-flex align-items-center gap-2">
                Explore Hotels <ArrowRightIcon size={18} />
              </Link>

              <button
                className={`btn btn-outline-glass btn-lg rounded-pill px-4 d-inline-flex align-items-center gap-2 ${listening ? "pulse-outline" : ""}`}
                onClick={onStartVoice}
              >
                <MicIcon size={18} /> {listening ? "Listening..." : "Start Voice Booking"}
              </button>
            </div>

            {hotelCount > 0 && (
              <div className="d-flex flex-wrap gap-2">
                <span className="badge-floating">{hotelCount} hotels</span>
                <span className="badge-floating">{cityCount} cities</span>
                <span className="badge-floating">Secure Stripe checkout</span>
              </div>
            )}
          </div>

          {/* What a voice booking sounds like. */}
          <div className="col-lg-5 d-none d-lg-block">
            <div className="glass-dark shadow-lg p-4 ms-xl-4">
              <div className="d-flex align-items-center gap-2 mb-3 small text-white-50">
                <span className="rounded-circle bg-success d-inline-block" style={{ width: 8, height: 8 }} />
                Voice assistant
              </div>

              <div className="d-flex flex-column gap-2">
                <div className="align-self-end rounded-4 px-3 py-2 gradient-accent fw-semibold small" style={{ maxWidth: "85%" }}>
                  "Goa next weekend, 2 people, with a pool"
                </div>
                <div className="align-self-start rounded-4 px-3 py-2 small bg-white bg-opacity-10 border border-light border-opacity-10" style={{ maxWidth: "85%" }}>
                  Here are hotels in Goa with a pool for 2 guests. Say a hotel name, or "book the first one".
                </div>
                <div className="align-self-end rounded-4 px-3 py-2 gradient-accent fw-semibold small" style={{ maxWidth: "85%" }}>
                  "Which one is closest to the beach?"
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline-glass rounded-pill w-100 mt-4 d-inline-flex align-items-center justify-content-center gap-2"
                onClick={onStartVoice}
              >
                <MicIcon size={18} /> Try it now
              </button>
            </div>
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}

export default HeroSection;
