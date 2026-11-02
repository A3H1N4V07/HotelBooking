import React from "react";
import { StarIcon } from "./Icons";

const TESTIMONIALS = [
  {
    name: "Ananya Sharma",
    role: "Frequent Traveler",
    avatar: "https://i.pravatar.cc/150?img=32",
    rating: 5,
    review:
      "Booking a hotel by just talking to the app felt like magic. EchoStay found me a great place in Goa in under a minute.",
  },
  {
    name: "Rohit Verma",
    role: "Business Traveler",
    avatar: "https://i.pravatar.cc/150?img=15",
    rating: 5,
    review:
      "The AI recommendation understood exactly what I meant by 'budget hotel near the city center'. Genuinely useful, not a gimmick.",
  },
  {
    name: "Priya Nair",
    role: "Family Vacationer",
    avatar: "https://i.pravatar.cc/150?img=47",
    rating: 4,
    review:
      "Clean interface, fast checkout, and the invoice download saved me a headache during expense reporting.",
  },
];

function TestimonialsSection() {
  return (
    <section className="container py-5 reveal">
      <div className="text-center mb-5">
        <p className="text-uppercase small fw-bold text-warning mb-1">Reviews</p>
        <h2 className="fw-bold mb-0">What our guests say</h2>
      </div>

      <div className="row g-4">
        {TESTIMONIALS.map((t) => (
          <div className="col-md-4" key={t.name}>
            <div className="card border-0 rounded-4 shadow-sm hover-lift p-4 h-100">
              <div className="d-flex gap-1 text-warning mb-3" aria-label={`${t.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} size={16} filled={n <= t.rating} />
                ))}
              </div>

              <p className="text-secondary flex-grow-1">"{t.review}"</p>

              <div className="d-flex align-items-center gap-3 pt-3 border-top">
                <img
                  src={t.avatar}
                  alt=""
                  className="rounded-circle"
                  style={{ width: 44, height: 44, objectFit: "cover" }}
                />
                <div>
                  <h6 className="mb-0 fw-bold">{t.name}</h6>
                  <small className="text-muted">{t.role}</small>
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