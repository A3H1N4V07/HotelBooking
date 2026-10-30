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
import { matchByName } from "../voice/matchName";

function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const [allHotels, setAllHotels] = useState([]);
  const [heroImage, setHeroImage] = useState("");

  // The search form edits the shared booking draft, so what's typed here
  // and what's said to the voice assistant are the same thing.
  const {
    listening,
    transcript,
    toggleListening,
    browserSupportsSpeechRecognition,
    draft,
    updateDraft,
    clearTrip,
    notify,
  } = useVoice();

  const hasTrip = Boolean(draft.city || draft.checkIn || draft.checkOut || draft.guests || draft.hotelId);

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
    const finalDestination = (destinationOverride || draft.city || "").trim();

    if (!finalDestination) {
      notify("Tell me where you'd like to stay first, for example \"I want to go to Goa\".");
      return;
    }

    updateDraft({ city: finalDestination });
    navigate("/hotels");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    goToHotels();
  };

  useVoicePageContext({
    describe: () => ({ page: "home", results: allHotels }),
    bookByName: (target) => {
      if (allHotels.length === 0) {
        notify("Hotels are still loading, try again in a moment.");
        return;
      }

      if (!target) {
        navigate(`/hotels/${allHotels[0].id}`);
        return;
      }

      const match = matchByName(allHotels, target);

      if (match) {
        navigate(`/hotels/${match.id}`);
      } else {
        notify(`I couldn't find a hotel called "${target}". Try "book the first one".`);
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
        destination={draft.city}
        setDestination={(city) => updateDraft({ city })}
        checkInDate={draft.checkIn}
        setCheckInDate={(checkIn) => updateDraft({ checkIn })}
        checkOutDate={draft.checkOut}
        setCheckOutDate={(checkOut) => updateDraft({ checkOut })}
        guests={draft.guests}
        setGuests={(guests) => updateDraft({ guests })}
        onSubmit={handleSubmit}
        onClear={hasTrip ? clearTrip : undefined}
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