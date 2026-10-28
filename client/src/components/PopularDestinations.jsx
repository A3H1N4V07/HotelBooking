import React from "react";

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
    <div id="destinations" className="container py-5 reveal">
      <h2 className="fw-bold mb-4 text-center">Popular Destinations</h2>

      <div className="row g-4">
        {destinations.map((dest) => (
          <div className="col-md-3 col-sm-6" key={dest.city}>
            <div
              className="card border-0 shadow-sm hover-lift position-relative"
              style={{ cursor: "pointer", overflow: "hidden" }}
              onClick={() => onSelectCity(dest.city)}
            >
              <img
                src={dest.image}
                alt={dest.city}
                className="card-img-top"
                style={{ height: "180px", objectFit: "cover" }}
              />
              <div
                className="position-absolute bottom-0 start-0 w-100 p-3"
                style={{
                  background: "linear-gradient(transparent, rgba(11,31,58,0.85))",
                  color: "#fff",
                }}
              >
                <h5 className="mb-0">{dest.city}</h5>
                <small>{dest.count} hotels</small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PopularDestinations;