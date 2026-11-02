import React from "react";
import { CardIcon, MicIcon, ShieldIcon, SparkleIcon } from "./Icons";

const STEPS = [
  { title: "Say it", description: "\"Goa next weekend, 2 people, with a pool\": one sentence or a few, in your own words." },
  { title: "Compare", description: "Ask what matters: \"which one is cheapest?\", \"how far is the beach?\"" },
  { title: "Book", description: "Pick a room, say \"yes\", and pay securely. The room is held while you pay." },
];

const FEATURES = [
  { icon: <MicIcon size={22} />, title: "Voice Booking", description: "Book hotels using natural speech." },
  { icon: <SparkleIcon size={22} />, title: "AI Answers", description: "Questions answered from real hotel data." },
  { icon: <CardIcon size={22} />, title: "Secure Payments", description: "Safe checkout with Stripe." },
  { icon: <ShieldIcon size={22} />, title: "Clear Pricing", description: "Per-night prices and totals before you book." },
];

function WhyChooseSection() {
  return (
    <section id="why-us" className="gradient-dark text-white py-5 my-5 position-relative overflow-hidden">
      <div className="container py-4 reveal">
        <div className="text-center mb-5">
          <p className="text-uppercase small fw-bold text-accent mb-1">How it works</p>
          <h2 className="fw-bold mb-0">Booking a hotel, as easy as asking</h2>
        </div>

        <div className="row g-4 mb-5">
          {STEPS.map((step, index) => (
            <div className="col-md-4" key={step.title}>
              <div className="glass-dark p-4 h-100">
                <div
                  className="gradient-accent rounded-circle d-inline-flex align-items-center justify-content-center fw-bold mb-3"
                  style={{ width: 40, height: 40 }}
                >
                  {index + 1}
                </div>
                <h5 className="fw-bold">{step.title}</h5>
                <p className="text-white-50 small mb-0">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-4">
          {FEATURES.map((feature) => (
            <div className="col-md-3 col-sm-6" key={feature.title}>
              <div className="d-flex gap-3 align-items-start">
                <div
                  className="rounded-3 bg-white bg-opacity-10 text-accent d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 46, height: 46 }}
                >
                  {feature.icon}
                </div>
                <div>
                  <h6 className="fw-bold mb-1">{feature.title}</h6>
                  <p className="text-white-50 small mb-0">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhyChooseSection;
