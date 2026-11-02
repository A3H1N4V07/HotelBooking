import React, { useEffect, useRef, useState } from "react";

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

function StatsSection({ hotelCount, cityCount }) {
  const stats = [
    { value: hotelCount, suffix: "+", label: "Hotels" },
    { value: cityCount, suffix: "+", label: "Cities" },
    { value: 500, suffix: "+", label: "Bookings" },
    { value: 98, suffix: "%", label: "Happy Customers" },
  ];

  return (
    <section className="container pb-5 reveal">
      <div className="bg-white rounded-4 shadow-sm p-4 p-lg-5">
        <div className="row text-center g-4">
          {stats.map((stat) => (
            <div className="col-md-3 col-6" key={stat.label}>
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