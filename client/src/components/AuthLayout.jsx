import React from "react";
import { NAV_HEIGHT } from "./Header";
import { CardIcon, MicIcon, SparkleIcon } from "./Icons";

const PERKS = [
  { icon: <MicIcon size={18} />, text: "Book by voice, in your own words" },
  { icon: <SparkleIcon size={18} />, text: "Answers from real hotel data" },
  { icon: <CardIcon size={18} />, text: "Secure Stripe checkout" },
];

// Navy page with soft colour glows behind a glass form card.
function AuthLayout({ title, subtitle, children }) {
  return (
    <div
      className="gradient-dark position-relative overflow-hidden d-flex align-items-center"
      style={{ marginTop: -NAV_HEIGHT, paddingTop: NAV_HEIGHT + 32, paddingBottom: 64, minHeight: "100vh" }}
    >
      <div
        className="position-absolute rounded-circle bg-warning"
        style={{ width: 380, height: 380, top: "12%", left: "-80px", opacity: 0.35, filter: "blur(90px)" }}
        aria-hidden="true"
      />
      <div
        className="position-absolute rounded-circle bg-info"
        style={{ width: 420, height: 420, bottom: "-120px", right: "-60px", opacity: 0.3, filter: "blur(100px)" }}
        aria-hidden="true"
      />

      <div className="container position-relative">
        <div className="row align-items-center justify-content-center g-5">
          <div className="col-lg-5 d-none d-lg-block text-white">
            <h2 className="display-6 fw-bold mb-3">
              Echo<span className="text-accent">Stay</span>
            </h2>
            <p className="lead text-white text-opacity-75 mb-4">Hotel booking you can talk to.</p>
            <div className="d-flex flex-column gap-3">
              {PERKS.map((perk) => (
                <div key={perk.text} className="glass-dark d-flex align-items-center gap-3 px-3 py-2">
                  <span className="text-accent">{perk.icon}</span>
                  <span className="small">{perk.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-md-8 col-lg-5">
            <div className="glass-card shadow-lg p-4 p-md-5">
              <h2 className="fw-bold mb-1">{title}</h2>
              {subtitle && <p className="text-secondary mb-4">{subtitle}</p>}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
