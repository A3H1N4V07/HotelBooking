import React, { useState, useEffect } from "react";
import { formatPrice } from "../utils/formatPrice";
import api from "../api";
import { useNavigate } from "react-router-dom";
import useVoicePageContext from "../hooks/useVoicePageContext";
import { useVoice } from "../context/VoiceContext";

import Loader from "../components/Loader";
import HotelCard from "../components/HotelCard";
import ErrorComponent from "../components/ErrorComponent";

const CATEGORIES = ["Budget", "Business", "Family", "Luxury"];

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

        if (sortBy) {
          params.set("sortBy", sortBy);
          params.set("order", order);
        }

        const response = await api.get(`/hotels/search?${params.toString()}`);
        setHotelsBigData(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [location, category, sortBy, order]);

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

  if (loading) {
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
              Understood as: city={aiFilters.city || "any"}, category=
              {aiFilters.category || "any"}, max price={aiFilters.maxPrice || "any"}
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
          </select>

          <select
            className="form-select w-auto"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            disabled={!sortBy}
          >
            <option value="asc">Low to High</option>
            <option value="desc">High to Low</option>
          </select>
        </div>

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
                price={formatPrice(hotel.price)}
                rating={hotel.rating}
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