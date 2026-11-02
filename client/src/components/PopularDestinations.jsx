import React from "react";
import { ArrowRightIcon } from "./Icons";

function PopularDestinations({ hotels, onSelectCity }) {
  const cityMap = {};

  hotels.forEach((hotel) => {
    if (!cityMap[hotel.city]) {
      cityMap[hotel.city] = { count: 0, image: hotel.image };
    }
    cityMap[hotel.city].count += 1;
  });

  const destinations = Object.entries(cityMap).map(([city, data]) => ({
    city,
    count: data.count,
    image: data.image,
  }));

  return (
    <section id="destinations" className="container py-5 reveal">
      <div className="text-center mb-4">
        <p className="text-uppercase small fw-bold text-warning mb-1">Where to next?</p>
        <h2 className="fw-bold mb-0">Popular destinations</h2>
      </div>

      <div className="row g-4">
        {destinations.map((dest) => (
          <div className="col-lg-3 col-sm-6" key={dest.city}>
            <button
              type="button"
              className="btn p-0 border-0 w-100 rounded-4 overflow-hidden shadow-sm hover-lift position-relative text-start"
              onClick={() => onSelectCity(dest.city)}
              aria-label={`Hotels in ${dest.city}`}
            >
              <img
                src={dest.image}
                alt=""
                className="w-100"
                style={{ height: 280, objectFit: "cover" }}
              />
              <div className="position-absolute bottom-0 start-0 end-0 p-3">
                <div className="glass-dark px-3 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold">{dest.city}</div>
                    <small className="text-white-50">{dest.count} hotel{dest.count === 1 ? "" : "s"}</small>
                  </div>
                  <ArrowRightIcon size={18} className="text-accent" />
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PopularDestinations;
