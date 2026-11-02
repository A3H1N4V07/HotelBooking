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
import PageHeader from "../components/PageHeader";
import { NAV_HEIGHT } from "../components/Header";
import { CheckIcon, MicIcon, SearchIcon, SparkleIcon, StopIcon } from "../components/Icons";

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
    highlightIds,
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
  // Small screens: filters open on demand.
  const [showFilters, setShowFilters] = useState(false);

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

  const label = "form-label small fw-semibold text-secondary mb-1";

  return (
    <div>
      <PageHeader
        eyebrow={firstName ? `Welcome back, ${firstName}` : "Find your stay"}
        title={location ? `Hotels in ${location}` : "Find your perfect stay"}
        subtitle={
          location
            ? `${displayedHotels.length} hotel${displayedHotels.length === 1 ? "" : "s"}${filtersActive ? " match your filters" : " to choose from"}`
            : "Search hotels across India, or just ask"
        }
        image={displayedHotels[0]?.image}
        overlap
      />

      <div className="container position-relative" style={{ marginTop: -56 }}>
        <div className="glass-card shadow-lg p-3 p-lg-4 mb-4">
          <form onSubmit={handleAiRecommend} className="d-flex flex-column flex-md-row gap-2">
            <div className="input-group input-group-lg flex-grow-1 shadow-sm rounded-3 overflow-hidden">
              <span className="input-group-text bg-white border-0 text-warning">
                <SparkleIcon size={20} />
              </span>
              <input
                type="text"
                className="form-control border-0 fs-6 shadow-none"
                placeholder='Ask AI: "Recommend a budget hotel in Goa with a pool"'
                aria-label="Ask AI for a recommendation"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
              />
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-accent btn-lg rounded-pill px-4 flex-grow-1 fs-6 text-nowrap" disabled={aiLoading}>
                {aiLoading ? "Thinking..." : "Ask AI"}
              </button>

              {browserSupportsSpeechRecognition && (
                <button
                  type="button"
                  className={`btn rounded-circle p-0 flex-shrink-0 d-inline-flex align-items-center justify-content-center ${listening ? "mic-button listening" : "btn-dark"}`}
                  style={{ width: 48, height: 48 }}
                  onClick={toggleListening}
                  title={listening ? "Stop voice search" : "Search by voice"}
                  aria-label={listening ? "Stop voice search" : "Search by voice"}
                >
                  {listening ? <StopIcon size={18} /> : <MicIcon size={20} />}
                </button>
              )}
            </div>
          </form>

          {aiError && <p className="text-danger small mt-2 mb-0">{aiError}</p>}

          {aiFilters && (
            <p className="text-secondary small mt-2 mb-0">
              Understood as: <span className="fw-semibold">{describeAiFilters(aiFilters, amenityLabels)}</span>
            </p>
          )}

          {listening && transcript && <p className="text-secondary small mt-2 mb-0">Heard: {transcript}</p>}
        </div>
      </div>

      <div className="container pb-5">
        <div className="row g-4">
          <aside className="col-lg-3">
            <button
              type="button"
              className="btn btn-outline-dark rounded-pill w-100 d-lg-none"
              onClick={() => setShowFilters((open) => !open)}
              aria-expanded={showFilters}
            >
              {showFilters ? "Hide filters" : `Filters${filtersActive ? " (on)" : ""}`}
            </button>

            <div className={`${showFilters ? "mt-3" : "d-none"} d-lg-block sticky-lg-top`} style={{ top: NAV_HEIGHT + 16, zIndex: 1 }}>
              <div className="card border-0 rounded-4 shadow-sm p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0">Filters</h6>
                  {filtersActive && (
                    <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={clearFilters}>
                      Clear all
                    </button>
                  )}
                </div>

                <form onSubmit={handleSearchSubmit} className="mb-3">
                  <label className={label} htmlFor="city-search">City</label>
                  <div className="input-group">
                    <input
                      id="city-search"
                      type="text"
                      className="form-control"
                      placeholder="Search city..."
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                    />
                    <button type="submit" className="btn btn-dark" aria-label="Search city">
                      <SearchIcon size={16} />
                    </button>
                  </div>
                </form>

                <div className="mb-3">
                  <label className={label} htmlFor="category">Category</label>
                  <select id="category" className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className={label} htmlFor="sort">Sort by</label>
                  <div className="d-flex flex-column gap-2">
                    <select id="sort" className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="">Recommended</option>
                      <option value="price">Price</option>
                      <option value="rating">Rating</option>
                      <option value="distance" disabled={!near}>Distance{near ? "" : " (pick a place)"}</option>
                    </select>
                    <select
                      className="form-select"
                      aria-label="Sort order"
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                      disabled={!sortBy}
                    >
                      <option value="asc">{sortBy === "distance" ? "Closest" : "Low to high"}</option>
                      <option value="desc">{sortBy === "distance" ? "Farthest" : "High to low"}</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className={label} htmlFor="near">Near</label>
                  <select id="near" className="form-select" value={near} onChange={(e) => handleNearChange(e.target.value)}>
                    <option value="">Anywhere</option>
                    {NEAR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-7">
                    <label className={label} htmlFor="max-price">Max ₹ / night</label>
                    <input
                      id="max-price"
                      type="number"
                      min="1"
                      className="form-control"
                      placeholder="Any"
                      value={maxPriceInput}
                      onChange={(e) => setMaxPriceInput(e.target.value)}
                      onBlur={commitMaxPrice}
                      onKeyDown={(e) => e.key === "Enter" && commitMaxPrice()}
                    />
                  </div>
                  <div className="col-5">
                    <label className={label} htmlFor="guests-filter">Guests</label>
                    <input
                      id="guests-filter"
                      type="number"
                      min="1"
                      max="20"
                      className="form-control"
                      placeholder="Any"
                      value={guestsFilter}
                      onChange={(e) => setGuestsFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <span className={`${label} d-block`}>Amenities</span>
                  <div className="d-flex flex-wrap gap-2">
                    {amenityOptions
                      .filter((a) => FILTER_AMENITIES.includes(a.code))
                      .map((a) => {
                        const active = amenityFilter.includes(a.code);
                        return (
                          <button
                            key={a.code}
                            type="button"
                            className={`btn btn-sm rounded-pill d-inline-flex align-items-center gap-1 ${active ? "btn-dark" : "btn-outline-secondary"}`}
                            onClick={() => toggleAmenity(a.code)}
                            aria-pressed={active}
                          >
                            {active && <CheckIcon size={14} />}
                            {a.label}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="col-lg-9">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <span className="text-secondary small">
                {loading ? "Updating…" : location ? `${displayedHotels.length} result${displayedHotels.length === 1 ? "" : "s"}` : ""}
              </span>
              {browserSupportsSpeechRecognition && (
                <span className="text-secondary small d-none d-md-inline">
                  Try saying "with a pool", "under 5000" or "book the first one"
                </span>
              )}
            </div>

            {searchError && <div className="alert alert-danger rounded-4">{searchError}</div>}

            {displayedHotels.length > 0 ? (
              <div className="row g-4">
                {displayedHotels.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    id={hotel.id}
                    name={hotel.name}
                    img={hotel.image}
                    category={hotel.category}
                    highlighted={highlightIds.includes(hotel.id)}
                    price={`from ${formatPrice(hotel.fromPrice ?? hotel.price)}`}
                    rating={hotel.rating}
                    city={hotel.city}
                    distance={hotel.nearest && `${formatDistance(hotel.nearest.km)} to ${hotel.nearest.name}`}
                    amenities={(hotel.amenities || [])
                      .filter((code) => !["wifi", "ac"].includes(code) || amenityFilter.includes(code))
                      // Amenities the user filtered for come first.
                      .sort((a, b) => amenityFilter.includes(b) - amenityFilter.includes(a))
                      .slice(0, 3)
                      .map((code) => amenityLabels[code] || code)}
                  />
                ))}
              </div>
            ) : (
              <div className="card border-0 rounded-4 shadow-sm text-center p-5">
                <div className="text-warning mb-3"><SearchIcon size={40} /></div>
                <h4 className="fw-bold">
                  {!location
                    ? "Tell me a city to start"
                    : filtersActive
                      ? `No hotels in ${location} match these filters`
                      : `No hotels found in ${location}`}
                </h4>
                <p className="text-secondary mb-0">
                  {filtersActive ? "Try removing a filter." : "Search a city in the filters, or ask the AI above."}
                </p>
                {filtersActive && (
                  <div className="mt-3">
                    <button type="button" className="btn btn-dark rounded-pill px-4" onClick={clearFilters}>Clear filters</button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Hotels;