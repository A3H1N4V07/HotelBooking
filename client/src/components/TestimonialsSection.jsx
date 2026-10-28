import React from "react";

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
    <div className="container py-5 reveal">
      <h2 className="fw-bold mb-5 text-center">What Our Guests Say</h2>

      <div className="row g-4">
        {TESTIMONIALS.map((t) => (
          <div className="col-md-4" key={t.name}>
            <div className="card border-0 shadow-sm hover-lift p-4 h-100">
              <div className="d-flex align-items-center gap-3 mb-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="rounded-circle"
                  style={{ width: "56px", height: "56px", objectFit: "cover" }}
                />
                <div>
                  <h6 className="mb-0 fw-bold">{t.name}</h6>
                  <small className="text-muted">{t.role}</small>
                </div>
              </div>

              <span className="text-gold mb-2 d-block">
                {"★".repeat(t.rating)}
                <span className="text-muted">{"★".repeat(5 - t.rating)}</span>
              </span>

              <p className="text-secondary mb-0">"{t.review}"</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestimonialsSection;