import React, { useEffect, useRef, useState } from "react";
import api from "../api";

function CountUp({ end, suffix = "", duration = 1500 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;

            const startTime = performance.now();

            const step = (now) => {
              const progress = Math.min((now - startTime) / duration, 1);
              setValue(Math.floor(progress * end));

              if (progress < 1) {
                requestAnimationFrame(step);
              } else {
                setValue(end);
              }
            };

            requestAnimationFrame(step);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <h2 className="fw-bold display-6 text-warning mb-0" ref={ref}>
      {value}
      {suffix}
    </h2>
  );
}

// Every number here is counted from the database (GET /stats). "Happy guests"
// is the share of 4-5 star reviews, so it only appears once there are reviews.
function StatsSection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/stats").then((res) => setData(res.data)).catch(() => setData(null));
  }, []);

  if (!data) return null;

  const stats = [
    { value: data.hotels, label: "Hotels" },
    { value: data.cities, label: "Cities" },
    { value: data.bookings, label: "Paid bookings" },
    data.happyPercent !== null && {
      value: data.happyPercent,
      suffix: "%",
      label: `Happy guests · ${data.reviews} review${data.reviews === 1 ? "" : "s"}`,
    },
  ].filter(Boolean);

  return (
    <section className="container pb-5">
      <div className="bg-white rounded-4 shadow-sm p-4 p-lg-5">
        <div className="row text-center g-4 justify-content-center">
          {stats.map((stat) => (
            <div className={`col-6 col-md-${12 / stats.length}`} key={stat.label}>
              <CountUp end={stat.value} suffix={stat.suffix} />
              <p className="mb-0 mt-1 text-secondary small text-uppercase fw-semibold">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default StatsSection;
