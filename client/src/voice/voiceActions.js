import { clearSession } from "../auth";
import { parseSpokenDate } from "../utils/parseSpokenDate";
import { downloadLatestInvoice } from "./downloadLatestInvoice";

// Every voice action, shared by the local command matcher and the AI
// fallback so both paths drive the exact same page behaviour.
// `pageRef.current` holds whatever handlers the current page registered
// via useVoicePageContext; an action is a no-op when its handler is missing.
export function createVoiceActions({ pageRef, navigate, logCommand }) {
  const page = () => pageRef.current;

  const go = (label, path) => {
    logCommand(label);
    navigate(path);
  };

  return {
    setDestination(city) {
      if (!city) return;

      if (page().setDestination) {
        logCommand(`Destination: ${city}`);
        page().setDestination(city);
      } else if (page().setCity) {
        logCommand(`Show hotels in ${city}`);
        page().setCity(city);
      }
    },

    searchHotels(city) {
      if (page().goToHotels) {
        logCommand(city ? `Show hotels in ${city}` : "Search now");
        page().goToHotels(city);
      } else if (city && page().setCity) {
        logCommand(`Show hotels in ${city}`);
        page().setCity(city);
      } else {
        if (city) {
          localStorage.setItem(
            "travelData",
            JSON.stringify({
              Destination: city,
              checkInDate: "",
              checkOutDate: "",
              NoOfGuests: "1",
            })
          );
        }
        go(city ? `Show hotels in ${city}` : "Show hotels", "/hotels");
      }
    },

    setCheckIn(spokenDate) {
      const parsed = spokenDate ? parseSpokenDate(spokenDate) : "";
      if (parsed && page().setCheckInDate) {
        logCommand(`Check-in: ${spokenDate}`);
        page().setCheckInDate(parsed);
      }
    },

    setCheckOut(spokenDate) {
      const parsed = spokenDate ? parseSpokenDate(spokenDate) : "";
      if (parsed && page().setCheckOutDate) {
        logCommand(`Check-out: ${spokenDate}`);
        page().setCheckOutDate(parsed);
      }
    },

    setGuests(guests) {
      if (guests && page().setGuests) {
        logCommand(`Guests: ${guests}`);
        page().setGuests(guests);
      }
    },

    // `category` is a spoken word or an AI category; empty or "all" clears it.
    showCategory(category) {
      if (!page().setCategory) return;

      const word = (category || "").toLowerCase();

      if (!word || word === "all") {
        logCommand("Show all hotels");
        page().setCategory("");
        return;
      }

      const match = page().categories?.find((c) => c.toLowerCase() === word);

      if (match) {
        logCommand(`Show ${match} hotels`);
        page().setCategory(match);
      }
    },

    // `hotelName` null means "this one" / "the first one".
    bookHotel(hotelName) {
      if (page().bookByName) {
        logCommand(hotelName ? `Book ${hotelName}` : "Book first hotel");
        page().bookByName(hotelName ? hotelName.toLowerCase() : null);
      } else if (page().openBookingForm) {
        logCommand("Book this hotel");
        page().openBookingForm();
      }
    },

    openBookingForm() {
      if (page().openBookingForm) {
        logCommand("Book this hotel");
        page().openBookingForm();
      }
    },

    setGuestName(name) {
      if (name && page().setGuestName) {
        logCommand(`Guest name: ${name}`);
        page().setGuestName(name);
      }
    },

    setGuestPhone(phone) {
      const digits = String(phone || "").replace(/\s+/g, "");
      if (digits && page().setGuestPhone) {
        logCommand(`Phone: ${digits}`);
        page().setGuestPhone(digits);
      }
    },

    confirmBooking() {
      if (page().submitBooking) {
        logCommand("Confirm booking");
        page().submitBooking();
      }
    },

    openMyBookings: () => go("Open my bookings", "/my-bookings"),
    goHome: () => go("Go home", "/"),
    showHotels: () => go("Show hotels", "/hotels"),

    downloadInvoice() {
      logCommand("Download invoice");
      downloadLatestInvoice();
    },

    logout() {
      clearSession();
      go("Logout", "/");
    },

    unknown() {
      logCommand("Didn't understand — try rephrasing");
    },
  };
}
