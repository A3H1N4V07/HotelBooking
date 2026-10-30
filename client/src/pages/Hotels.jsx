import React, { useState, useEffect, useMemo } from "react";
import { formatPrice } from "../utils/formatPrice";
import api from "../api";
import { useNavigate } from "react-router-dom";
import useVoicePageContext from "../hooks/useVoicePageContext";
import { useVoice } from "../context/VoiceContext";

import Loader from "../components/Loader";
import HotelCard from "../components/HotelCard";
import ErrorComponent from "../components/ErrorComponent";
import useAmenities from "../hooks/useAmenities";
import { formatDistance, nightsBetween } from "../utils/stay";
import { matchByName } from "../voice/matchName";

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

  // City, filters and dates live in the shared booking draft: the voice
  // assistant, the home page search and these controls all edit the same values.
  const {
    listening,
    transcript,
    toggleListening,
    browserSupportsSpeechRecognition,
    draft,
    updateDraft,
    notify,
    promptIfActive,
  } = useVoice();

  const location = draft.city;
  const category = draft.category;
  const amenityFilter = draft.amenities;
  const maxPrice = draft.maxPrice;
  const guestsFilter = draft.guests;
  const near = draft.near;

  const setCategory = (value) => updateDraft({ category: value });
  const setGuestsFilter = (value) => updateDraft({ guests: value });

  // Only search availability for real future stays.
  const today = new Date().toISOString().slice(0, 10);
  const datesForSearch =
    nightsBetween(draft.checkIn, draft.checkOut) > 0 && draft.checkIn >= today
      ? { checkIn: draft.checkIn, checkOut: draft.checkOut }
      : null;

  const [loading, setLoading] = useState(Boolean(location));
  const [cityInput, setCityInput] = useState(location);
  const [sortBy, setSortBy] = useState(near ? "distance" : "");
  const [order, setOrder] = useState("asc");

  const [hotelsBigData, setHotelsBigData] = useState([]);
  const [searchError, setSearchError] = useState("");

  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);
  const { amenities: amenityOptions, labels: amenityLabels } = useAmenities();

  const [aiQuery, setAiQuery] = useState("");
  const [aiFilters, setAiFilters] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const firstName = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.firstName || "";
    } catch {
      return "";
    }
  }, []);

  // Voice can change these from outside the inputs.
  useEffect(() => setCityInput(location), [location]);
  useEffect(() => setMaxPriceInput(maxPrice), [maxPrice]);
  useEffect(() => {
    if (near && !sortBy) setSortBy("distance");
    if (!near && sortBy === "distance") setSortBy("");
  }, [near, sortBy]);

  const searchKey = JSON.stringify({ location, category, amenityFilter, maxPrice, guestsFilter, near, sortBy, order, datesForSearch });

  useEffect(() => {
    const fetchHotels = async () => {
      if (!location) {
        setHotelsBigData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const params = new URLSearchParams();
        params.set("city", location);

        if (category) params.set("category", category);
        if (amenityFilter.length) params.set("amenities", amenityFilter.join(","));
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (guestsFilter) params.set("guests", guestsFilter);
        if (near) params.set("near", near);
        if (datesForSearch) {
          params.set("checkIn", datesForSearch.checkIn);
          params.set("checkOut", datesForSearch.checkOut);
        }

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
    // searchKey captures every input of the search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  // Once results arrive, the voice assistant describes them (if it's on).
  useEffect(() => {
    if (!loading && location) promptIfActive();
  }, [loading, hotelsBigData, location, promptIfActive]);

  const toggleAmenity = (code) => {
    updateDraft({
      amenities: amenityFilter.includes(code)
        ? amenityFilter.filter((c) => c !== code)
        : [...amenityFilter, code],
    });
  };

  const commitMaxPrice = () => {
    const value = Number(maxPriceInput);
    updateDraft({ maxPrice: maxPriceInput && value > 0 ? String(value) : "" });
  };

  const handleNearChange = (value) => {
    updateDraft({ near: value });
  };

  const filtersActive = Boolean(category || amenityFilter.length || maxPrice || guestsFilter || near);

  const clearFilters = () => {
    updateDraft({ category: "", amenities: [], maxPrice: "", guests: "", near: "" });
    setAiFilters(null);
    setAiQuery("");
    setAiError("");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateDraft({ city: cityInput.trim() });
  };

  // "Ask AI" turns a sentence into filters; they're applied to the same
  // draft, so the controls below show (and can adjust) what it understood.
  const handleAiRecommend = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    try {
      setAiLoading(true);
      setAiError("");

      const response = await api.post("/hotels/recommend", { query: aiQuery });
      const f = response.data.filters;

      updateDraft({
        ...(f.city && { city: f.city }),
        category: f.category || "",
        amenities: f.amenities || [],
        maxPrice: f.maxPrice ? String(f.maxPrice) : "",
        guests: f.guests ? String(f.guests) : draft.guests,
        near: f.near || "",
      });
      if (f.sortBy) setSortBy(f.sortBy);
      setAiFilters(f);
    } catch (error) {
      console.error(error);
      setAiError(error.response?.data?.message || "Recommendation failed");
    } finally {
      setAiLoading(false);
    }
  };

  const displayedHotels = hotelsBigData;

  useVoicePageContext({
    describe: () => ({ page: "hotels", loading, results: displayedHotels }),
    bookByName: (target) => {
      if (displayedHotels.length === 0) {
        notify("There are no hotels to book yet. Tell me a city first.");
        return;
      }

      if (!target) {
        navigate(`/hotels/${displayedHotels[0].id}`);
        return;
      }

      const match = matchByName(displayedHotels, target);

      if (match) {
        navigate(`/hotels/${match.id}`);
      } else {
        notify(`I couldn't find "${target}" in these results. Try "book the first one".`);
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
            {filtersActive && (
              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={clearFilters}
              >
                Clear filters
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
                Try: "With a pool", "Under 5000", "Near the beach", "Book the first one", "What's next?"
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
              {!location
                ? "Tell me a city to start"
                : filtersActive
                  ? `No hotels in ${location} match these filters`
                  : `No hotels found in ${location}`}
            </h2>
          )}
        </div>
      </div>
    </div>
  );
}

export default Hotels;