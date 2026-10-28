import React from "react";

const FEATURES = [
  {
    icon: "🎤",
    title: "Voice Booking",
    description: "Book hotels using natural speech.",
  },
  {
    icon: "🤖",
    title: "AI Recommendations",
    description: "Smart hotel suggestions powered by AI.",
  },
  {
    icon: "💳",
    title: "Secure Payments",
    description: "Safe checkout with Stripe integration.",
  },
  {
    icon: "⭐",
    title: "Verified Hotels",
    description: "A premium, curated hotel collection.",
  },
];

function WhyChooseSection() {
  return (
    <div id="why-us" className="py-5" style={{ background: "#f5f6f8" }}>
      <div className="container reveal">
        <h2 className="fw-bold mb-5 text-center">Why Choose EchoStay</h2>

        <div className="row g-4">
          {FEATURES.map((feature) => (
            <div className="col-md-3 col-sm-6" key={feature.title}>
              <div className="card border-0 shadow-sm hover-lift text-center p-4 h-100">
                <div className="fs-1 mb-3">{feature.icon}</div>
                <h5 className="fw-bold">{feature.title}</h5>
                <p className="text-muted small mb-0">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WhyChooseSection;