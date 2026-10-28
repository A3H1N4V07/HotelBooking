import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import HeroSection from "../components/HeroSection";
import SearchCard from "../components/SearchCard";
import PopularDestinations from "../components/PopularDestinations";
import TopHotelsSection from "../components/TopHotelsSection";
import WhyChooseSection from "../components/WhyChooseSection";
import StatsSection from "../components/StatsSection";
import TestimonialsSection from "../components/TestimonialsSection";
import Footer from "../components/Footer";
import useReveal from "../hooks/useReveal";
import useVoicePageContext from "../hooks/useVoicePageContext";
import { useVoice } from "../context/VoiceContext";

function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const [destination, setDestination] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guests, setGuests] = useState("");

  const [allHotels, setAllHotels] = useState([]);
  const [heroImage, setHeroImage] = useState("");

  const {
    listening,
    transcript,
    toggleListening,
    browserSupportsSpeechRecognition,
  } = useVoice();

  useEffect(() => {
    const loadHotels = async () => {
      try {
        const response = await api.get("/hotels/search");
        const hotels = response.data;
        const shuffled = [...hotels].sort(() => Math.random() - 0.5);

        setAllHotels(hotels);
        setHeroImage(shuffled[0]?.image || "");
      } catch (error) {
        console.error(error);
      }
    };

    loadHotels();
  }, []);

  useReveal([allHotels]);

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  }, [location]);

  const goToHotels = (destinationOverride) => {
    const finalDestination = (destinationOverride || destination || "").trim();

    if (!finalDestination) {
      alert("Please tell me a destination first — try 'My destination is Goa'.");
      return;
    }

    localStorage.setItem(
      "travelData",
      JSON.stringify({
        Destination: finalDestination,
        checkInDate,
        checkOutDate,
        NoOfGuests: guests || "1",
      })
    );

    navigate("/hotels");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    goToHotels(destination);
  };

  useVoicePageContext({
    setDestination,
    setCheckInDate,
    setCheckOutDate,
    setGuests,
    goToHotels,
    bookByName: (target) => {
      if (allHotels.length === 0) {
        alert("No hotels loaded yet.");
        return;
      }

      if (!target) {
        navigate(`/hotels/${allHotels[0].id}`);
        return;
      }

      const match = allHotels.find((h) =>
        h.name.toLowerCase().includes(target)
      );

      if (match) {
        navigate(`/hotels/${match.id}`);
      } else {
        alert(`Couldn't find a hotel matching "${target}". Try "Book first hotel".`);
      }
    },
  });

  const hotelCount = allHotels.length;
  const cityCount = new Set(allHotels.map((h) => h.city)).size;
  const topHotels = [...allHotels].sort((a, b) => b.rating - a.rating).slice(0, 6);

  return (
    <div>
      <HeroSection
        heroImage={heroImage}
        onStartVoice={toggleListening}
        listening={listening}
      />

      <SearchCard
        destination={destination}
        setDestination={setDestination}
        checkInDate={checkInDate}
        setCheckInDate={setCheckInDate}
        checkOutDate={checkOutDate}
        setCheckOutDate={setCheckOutDate}
        guests={guests}
        setGuests={setGuests}
        onSubmit={handleSubmit}
        onMicClick={toggleListening}
        listening={listening}
        browserSupportsSpeechRecognition={browserSupportsSpeechRecognition}
      />

      {listening && (
        <div className="container mt-2">
          <p className="text-muted text-center small">Heard: {transcript}</p>
        </div>
      )}

      {allHotels.length > 0 && (
        <>
          <PopularDestinations hotels={allHotels} onSelectCity={(city) => goToHotels(city)} />
          <TopHotelsSection hotels={topHotels} />
          <WhyChooseSection />
          <StatsSection hotelCount={hotelCount} cityCount={cityCount} />
          <TestimonialsSection />
        </>
      )}

      <Footer />
    </div>
  );
}

export default Home;