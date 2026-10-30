import React, { useState, useEffect } from "react";
import { formatPrice } from "../utils/formatPrice";
import api from "../api";
import { useNavigate } from "react-router-dom";
import useVoicePageContext from "../hooks/useVoicePageContext";
import { useVoice } from "../context/VoiceContext";

import Loader from "../components/Loader";
import HotelCard from "../components/HotelCard";
import ErrorComponent from "../components/ErrorComponent";
import useAmenities from "../hooks/useAmenities";
import { formatDistance } from "../utils/stay";

const CATEGORIES = ["Budget", "Business", "Family", "Luxury"];

const NEAR_OPTIONS = [
  { value: "beach", label: "Beach" },
  { value: "centre", label: "City centre" },
  { value: "airport", label: "Airport" },
  { value: "station", label: "Railway station" },
  { value: "attraction", label: "Sights" },
];

// Shown as filter chips; the rest are rarely searched for.
const FILTER_AMENITIES = ["pool", "breakfast", "wifi", "parking", "gym", "spa", "beach_access", "family_rooms", "pet_friendly"];

// "Understood as: Goa · pool · ≤ ₹5,000 · 2 guests · near beach"
function describeAiFilters(filters, labels) {
  const parts = [
    filters.city,
    filters.category,
    ...(filters.amenities || []).map((code) => labels[code] || code),
    filters.maxPrice && `up to ${formatPrice(filters.maxPrice)}/night`,
    filters.guests && `${filters.guests} guest${filters.guests > 1 ? "s" : ""}`,
    filters.near && `near ${NEAR_OPTIONS.find((o) => o.value === filters.near)?.label.toLowerCase() || filters.near}`,
    filters.sortBy && `sorted by ${filters.sortBy}`,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "no specific filters";
}

function Hotels() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [location, setLocation] = useState("");
  const [cityInput, setCityInput] = useState("");

  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [order, setOrder] = useState("asc");

  const [hotelsBigData, setHotelsBigData] = useState([]);
  const [searchError, setSearchError] = useState("");

  const [amenityFilter, setAmenityFilter] = useState([]);
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [guestsFilter, setGuestsFilter] = useState("");
  const [near, setNear] = useState("");
  const { amenities: amenityOptions, labels: amenityLabels } = useAmenities();

  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState(null);
  const [aiFilters, setAiFilters] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const {
    listening,
    transcript,
    toggleListening,
    browserSupportsSpeechRecognition,
  } = useVoice();

  useEffect(() => {
    const loadUserData = () => {
      try {
        const travelData = JSON.parse(localStorage.getItem("travelData"));
        const user = JSON.parse(localStorage.getItem("user"));

        if (!travelData || !user) {
          setLoading(false);
          return;
        }

        setFirstName(user.firstName);
        setLocation(travelData.Destination);
        setCityInput(travelData.Destination);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        if (!location) return;

        setLoading(true);

        const params = new URLSearchParams();
        params.set("city", location);

        if (category) params.set("category", category);
        if (amenityFilter.length) params.set("amenities", amenityFilter.join(","));
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (guestsFilter) params.set("guests", guestsFilter);
        if (near) params.set("near", near);

        if (sortBy && (sortBy !== "distance" || near)) {
          params.set("sortBy", sortBy);
          params.set("order", order);
        }

        const response = await api.get(`/hotels/search?${params.toString()}`);
        setHotelsBigData(response.data);
        setSearchError("");
      } catch (error) {
        console.error(error);
        setSearchError(error.response?.data?.message || "Search failed");
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [location, category, sortBy, order, amenityFilter, maxPrice, guestsFilter, near]);

  const toggleAmenity = (code) => {
    setAmenityFilter((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    );
  };

  const commitMaxPrice = () => {
    const value = Number(maxPriceInput);
    setMaxPrice(maxPriceInput && value > 0 ? String(value) : "");
  };

  const handleNearChange = (value) => {
    setNear(value);
    // Closest first is the useful default once a place is chosen.
    if (value && !sortBy) setSortBy("distance");
    if (!value && sortBy === "distance") setSortBy("");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setLocation(cityInput.trim());
  };

  const handleAiRecommend = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    try {
      setAiLoading(true);
      setAiError("");

      const response = await api.post("/hotels/recommend", { query: aiQuery });

      setAiResults(response.data.hotels);
      setAiFilters(response.data.filters);
    } catch (error) {
      console.error(error);
      setAiError(error.response?.data?.message || "Recommendation failed");
    } finally {
      setAiLoading(false);
    }
  };

  const clearAiResults = () => {
    setAiResults(null);
    setAiFilters(null);
    setAiQuery("");
    setAiError("");
  };

  const displayedHotels = aiResults ?? hotelsBigData;

  useVoicePageContext({
    setCity: (city) => {
      setCityInput(city);
      setLocation(city);
    },
    setCategory,
    categories: CATEGORIES,
    bookByName: (target) => {
      if (displayedHotels.length === 0) {
        alert("No hotels to book yet — try searching first.");
        return;
      }

      if (!target) {
        navigate(`/hotels/${displayedHotels[0].id}`);
        return;
      }

      const match = displayedHotels.find((h) =>
        h.name.toLowerCase().includes(target)
      );

      if (match) {
        navigate(`/hotels/${match.id}`);
      } else {
        alert(`Couldn't find a hotel matching "${target}". Try "Book first hotel".`);
      }
    },
  });

  // Full-page loader only for the first load; filter changes keep the page.
  if (loading && hotelsBigData.length === 0 && !searchError) {
    return <Loader />;
  }

  if (!hotelsBigData) {
    return <ErrorComponent />;
  }

  return (
    <div>
      <div className="gradient-navy text-white text-center py-5">
        <div className="container">
          <h1 className="fw-bold mb-1">
            {firstName ? `Welcome ${firstName}` : "Find Your Perfect Stay"}
          </h1>
          <p className="mb-0 text-white-50">
            {location ? `Hotels in ${location}` : "Search hotels across India"}
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: "-32px", position: "relative", zIndex: 5 }}>
        <div className="glass-card shadow-lg p-3 mb-4">
          <form
            onSubmit={handleAiRecommend}
            className="d-flex flex-wrap gap-2 justify-content-center align-items-center"
          >
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: "360px" }}
              placeholder='Try: "Recommend a budget hotel in Goa"'
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-gold" disabled={aiLoading}>
              {aiLoading ? "Thinking..." : "Ask AI"}
            </button>
            {aiResults && (
              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={clearAiResults}
              >
                Clear AI Results
              </button>
            )}
          </form>

          {aiError && <p className="text-danger text-center mt-2 mb-0">{aiError}</p>}

          {aiFilters && (
            <p className="text-center text-muted mt-2 mb-0">
              Understood as: {describeAiFilters(aiFilters, amenityLabels)}
            </p>
          )}
        </div>
      </div>

      <div className="container">
        <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center mb-3">
          <form onSubmit={handleSearchSubmit} className="d-flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Search city..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
            />
            <button type="submit" className="btn btn-dark">
              Search
            </button>
          </form>

          <select
            className="form-select w-auto"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="form-select w-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="">Sort By</option>
            <option value="price">Price</option>
            <option value="rating">Rating</option>
            <option value="distance" disabled={!near}>Distance{near ? "" : " (pick a place)"}</option>
          </select>

          <select
            className="form-select w-auto"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            disabled={!sortBy}
          >
            <option value="asc">{sortBy === "distance" ? "Closest first" : "Low to High"}</option>
            <option value="desc">{sortBy === "distance" ? "Farthest first" : "High to Low"}</option>
          </select>
        </div>

        <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center mb-2">
          <select className="form-select w-auto" value={near} onChange={(e) => handleNearChange(e.target.value)}>
            <option value="">Near: anywhere</option>
            {NEAR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>Near: {o.label}</option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            className="form-control w-auto"
            style={{ maxWidth: 170 }}
            placeholder="Max ₹ per night"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            onBlur={commitMaxPrice}
            onKeyDown={(e) => e.key === "Enter" && commitMaxPrice()}
          />

          <input
            type="number"
            min="1"
            max="20"
            className="form-control w-auto"
            style={{ maxWidth: 110 }}
            placeholder="Guests"
            value={guestsFilter}
            onChange={(e) => setGuestsFilter(e.target.value)}
          />
        </div>

        <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
          {amenityOptions
            .filter((a) => FILTER_AMENITIES.includes(a.code))
            .map((a) => {
              const active = amenityFilter.includes(a.code);
              return (
                <button
                  key={a.code}
                  type="button"
                  className={`btn btn-sm rounded-pill ${active ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => toggleAmenity(a.code)}
                  aria-pressed={active}
                >
                  {active ? "✓ " : ""}{a.label}
                </button>
              );
            })}
        </div>

        {searchError && <p className="text-danger text-center">{searchError}</p>}
        {loading && <p className="text-muted text-center small">Updating…</p>}

        <div className="d-flex flex-column align-items-center gap-1 mb-4">
          {browserSupportsSpeechRecognition ? (
            <>
              <button
                type="button"
                className={`btn btn-sm ${listening ? "mic-button listening text-white" : "btn-outline-dark"}`}
                onClick={toggleListening}
              >
                {listening ? "🛑 Stop Voice Search" : "🎤 Start Voice Search"}
              </button>

              <small className="text-muted text-center" style={{ maxWidth: 360 }}>
                Try: "Show hotels in Goa", "Show budget hotels", "Book first hotel", "Book [hotel name]"
              </small>

              {listening && <small>Heard: {transcript}</small>}
            </>
          ) : (
            <small className="text-muted">Voice search isn't supported in this browser.</small>
          )}
        </div>

        <div className="row pb-5">
          {displayedHotels.length > 0 ? (
            displayedHotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                id={hotel.id}
                name={hotel.name}
                img={hotel.image}
                reviews={Math.floor(hotel.rating * 100)}
                price={`from ${formatPrice(hotel.fromPrice ?? hotel.price)}`}
                rating={hotel.rating}
                distance={hotel.nearest && `${formatDistance(hotel.nearest.km)} to ${hotel.nearest.name}`}
                amenities={(hotel.amenities || [])
                  .filter((code) => !["wifi", "ac"].includes(code) || amenityFilter.includes(code))
                  // Amenities the user filtered for come first.
                  .sort((a, b) => amenityFilter.includes(b) - amenityFilter.includes(a))
                  .slice(0, 3)
                  .map((code) => amenityLabels[code] || code)}
              />
            ))
          ) : (
            <h2 className="text-center mt-5">
              {aiResults ? "No hotels matched that request" : `No hotels found in ${location}`}
            </h2>
          )}
        </div>
      </div>
    </div>
  );
}

export default Hotels;