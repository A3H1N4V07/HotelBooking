import { speakDate, speakPrice } from "./parseSpoken";
import { nightsBetween, formatDistance } from "../utils/stay";

// Decides what the assistant says next, from the booking draft and a
// snapshot of what the current page shows (`view`, provided by the page via
// useVoicePageContext's `describe`). Pure: no side effects, easy to test.
//
// Returns { say, action? } or null when there's nothing useful to add
// (e.g. results still loading). `action: "search"` asks the caller to open
// the results page.

const NEAR_LABEL = {
  beach: "the beach",
  centre: "the city centre",
  airport: "the airport",
  station: "the railway station",
  attraction: "the sights",
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// "with a pool, under 5,000 rupees, near the beach"
export function describeFilters(draft, amenityLabels = {}) {
  const parts = [];

  if (draft.category) parts.push(`${draft.category.toLowerCase()}`);
  if (draft.amenities.length) {
    parts.push(`with ${draft.amenities.map((c) => (amenityLabels[c] || c).toLowerCase()).join(" and ")}`);
  }
  if (draft.maxPrice) parts.push(`under ${speakPrice(draft.maxPrice)} a night`);
  if (draft.near) parts.push(`near ${NEAR_LABEL[draft.near]}`);

  return parts.join(", ");
}

// The first missing trip detail, as a question ({ say, expects }); null
// when all are known. `expects` lets a bare answer ("3", "next Friday") be
// understood as the thing just asked for.
function askTripDetails(draft) {
  if (!draft.city) return { say: "Where would you like to stay?", expects: "city" };
  if (!draft.checkIn) return { say: `${draft.city}, great. Which date do you check in?`, expects: "checkIn" };
  if (!draft.checkOut || nightsBetween(draft.checkIn, draft.checkOut) === 0) {
    return {
      say: `Checking in ${speakDate(draft.checkIn)}. When do you check out? You can also say "for 3 nights".`,
      expects: "checkOut",
    };
  }
  if (!draft.guests) return { say: "How many guests?", expects: "guests" };
  return null;
}

function hotelsPrompt(draft, view, amenityLabels) {
  if (view.loading) return null;

  const filters = describeFilters(draft, amenityLabels);
  const where = `in ${draft.city}${filters ? `, ${filters}` : ""}`;

  if (!view.results.length) {
    return {
      say: `I couldn't find hotels ${where}. Try removing a filter, for example "any price" or "without pool".`,
    };
  }

  const [first, ...rest] = view.results;
  const distance = first.nearest ? `, ${formatDistance(first.nearest.km)} from ${first.nearest.name}` : "";
  const others = rest.slice(0, 2).map((h) => h.name);

  return {
    say:
      `I found ${plural(view.results.length, "hotel")} ${where}. ` +
      `The first is ${first.name}, from ${speakPrice(first.fromPrice ?? first.price)} a night${distance}.` +
      (others.length ? ` Also ${others.join(" and ")}.` : "") +
      ` Say "book the first one", a hotel name, or add a filter like "with a pool" or "under 5000".`,
  };
}

function hotelPrompt(draft, view) {
  const ask = askTripDetails({ ...draft, city: draft.city || view.hotelName });
  if (ask) return ask;

  if (view.roomsLoading) return null;

  const nights = nightsBetween(draft.checkIn, draft.checkOut);
  const room = view.selectedRoom;

  if (!room) {
    return {
      say: `Sorry, no room at ${view.hotelName} fits ${plural(Number(draft.guests), "guest")} for those dates. Try other dates or another hotel.`,
    };
  }

  if (!view.formOpen) {
    const left = room.roomsLeft !== undefined ? ` ${room.roomsLeft <= 3 ? `Only ${room.roomsLeft} left.` : ""}` : "";
    const others = view.rooms.filter((r) => r.id !== room.id && r.capacity >= Number(draft.guests) && r.roomsLeft !== 0);

    return {
      say:
        `At ${view.hotelName}, the ${room.name} is ${speakPrice(room.pricePerNight)} a night, ` +
        `${speakPrice(room.pricePerNight * nights)} for ${plural(nights, "night")}.${left}` +
        (others.length ? ` Other options: ${others.map((r) => r.name).join(", ")}.` : "") +
        ` Say "book it" to continue.`,
    };
  }

  if (!draft.guestName) return { say: "What name should the booking be under?", expects: "guestName" };
  if (!draft.guestPhone) return { say: "And a phone number the hotel can reach you on?", expects: "guestPhone" };

  // Kept short: the mic is paused while it's read out.
  return {
    say:
      `Book the ${room.name}, ${speakDate(draft.checkIn)} to ${speakDate(draft.checkOut)}, ` +
      `${plural(Number(draft.guests), "guest")}, for ${speakPrice(room.pricePerNight * nights)}? Say yes or no.`,
    action: "confirm",
    expects: "confirm",
  };
}

export function nextPrompt(draft, view = {}, amenityLabels = {}) {
  switch (view.page) {
    case "hotels":
      if (!draft.city) return { say: "Which city should I search?", expects: "city" };
      return hotelsPrompt(draft, view, amenityLabels);

    case "hotel":
      return hotelPrompt(draft, view);

    case "payment":
      if (view.paid) {
        return { say: "Payment done, your booking is confirmed. You can say \"show my bookings\" or \"download invoice\"." };
      }
      return {
        say:
          "Your room is held for 15 minutes. Tap Pay Now and enter your card to finish. " +
          "For your security I can't take card details by voice.",
      };

    case "login":
      return { say: "Please log in to continue. I'll bring you back to your booking afterwards." };

    default: {
      const ask = askTripDetails(draft);
      if (ask) return ask;

      const filters = describeFilters(draft, amenityLabels);
      return {
        say:
          `Searching ${draft.city} for ${plural(Number(draft.guests), "guest")}, ` +
          `${speakDate(draft.checkIn)} to ${speakDate(draft.checkOut)}${filters ? `, ${filters}` : ""}.`,
        action: "search",
      };
    }
  }
}
