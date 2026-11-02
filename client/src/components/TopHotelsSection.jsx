import React from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../utils/formatPrice";
import useAmenities from "../hooks/useAmenities";
import HotelCard from "./HotelCard";
import { ArrowRightIcon } from "./Icons";

function TopHotelsSection({ hotels }) {
  const { labels } = useAmenities();

  return (
    <section id="top-hotels" className="container py-5 reveal">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <p className="text-uppercase small fw-bold text-warning mb-1">Guest favourites</p>
          <h2 className="fw-bold mb-0">Top rated hotels</h2>
        </div>
        <Link to="/hotels" className="btn btn-outline-dark rounded-pill px-4 d-inline-flex align-items-center gap-2">
          View all <ArrowRightIcon size={16} />
        </Link>
      </div>

      <div className="row g-4">
        {hotels.map((hotel) => (
          <HotelCard
            key={hotel.id}
            className="col-md-6 col-lg-4"
            id={hotel.id}
            name={hotel.name}
            img={hotel.image}
            city={hotel.city}
            category={hotel.category}
            rating={hotel.rating}
            price={`from ${formatPrice(hotel.fromPrice ?? hotel.price)}`}
            amenities={(hotel.amenities || [])
              .filter((code) => !["wifi", "ac"].includes(code))
              .slice(0, 3)
              .map((code) => labels[code] || code)}
          />
        ))}
      </div>
    </section>
  );
}

export default TopHotelsSection;
