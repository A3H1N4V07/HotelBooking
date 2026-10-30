import { clearSession } from "../auth";
import { parseSpokenDate } from "../utils/parseSpokenDate";
import { nightsBetween } from "../utils/stay";
import { downloadLatestInvoice } from "./downloadLatestInvoice";
import { matchByName } from "./matchName";
import {
  parseSpokenNumber,
  parseSpokenPhone,
  parseAmenities,
  parseNear,
  addDays,
  speakDate,
  titleCase,
} from "./parseSpoken";

const CATEGORIES = ["Budget", "Business", "Family", "Luxury"];
const RESPOND_DELAY_MS = 600;

// Every voice action, shared by the local command matcher and the AI
// fallback so both paths behave the same. Trip details live in the shared
// booking draft (pages read it); page-specific things (open the booking
// form, pick a room, submit) go through the handlers the current page
// registered via useVoicePageContext (`pageRef.current`).
//
// After a change, `respond()` lets the conversation ask for the next missing
// detail. Pages also prompt when their data finishes loading; repeated
// identical prompts are dropped in VoiceContext.
export function createVoiceActions({
  pageRef,
  navigate,
  logCommand,
  updateDraft,
  resetDraft,
  clearTrip,
  getDraft,
  say,
  ask,
  notify,
  promptNext,
  answerConfirm,
  hasPendingConfirm,
}) {
  const page = () => pageRef.current;
  const pageName = () => page().describe?.().page;
  const respond = () => setTimeout(promptNext, RESPOND_DELAY_MS);

  const go = (label, path) => {
    logCommand(label);
    navigate(path);
  };

  return {
    // Every detail from one AI-interpreted sentence, applied in one update.
    // Returns true if anything changed. Values are re-checked here: the
    // model's output is a suggestion, not trusted input.
    applyDetails(fields) {
      const draft = getDraft();
      const patch = {};
      const said = [];

      if (fields.city) {
        patch.city = titleCase(fields.city);
        said.push(fields.city);
      }

      const checkIn = fields.checkIn ? parseSpokenDate(fields.checkIn) : "";
      if (checkIn) {
        patch.checkIn = checkIn;
        said.push(`from ${speakDate(checkIn)}`);
      }

      const start = patch.checkIn || draft.checkIn;
      const checkOut = fields.checkOut ? parseSpokenDate(fields.checkOut, start || undefined) : "";

      if (checkOut && (!start || nightsBetween(start, checkOut) > 0)) {
        patch.checkOut = checkOut;
        said.push(`to ${speakDate(checkOut)}`);
      } else if (Number.isInteger(fields.nights) && fields.nights >= 1 && fields.nights <= 30 && start) {
        patch.checkOut = addDays(start, fields.nights);
        said.push(`${fields.nights} nights`);
      }

      if (Number.isInteger(fields.guests) && fields.guests >= 1 && fields.guests <= 20) {
        patch.guests = String(fields.guests);
        said.push(`${fields.guests} guests`);
      }

      if (Number(fields.maxPrice) >= 100) {
        patch.maxPrice = String(Math.round(fields.maxPrice));
        said.push(`under ₹${patch.maxPrice}`);
      }

      if (CATEGORIES.includes(fields.category)) {
        patch.category = fields.category;
        said.push(fields.category);
      }

      if (Array.isArray(fields.amenities) && fields.amenities.length) {
        patch.amenities = [...new Set([...draft.amenities, ...fields.amenities])];
        said.push(`with ${fields.amenities.join(", ")}`);
      }

      if (Array.isArray(fields.removeAmenities) && fields.removeAmenities.length) {
        patch.amenities = (patch.amenities || draft.amenities).filter((c) => !fields.removeAmenities.includes(c));
        said.push(`without ${fields.removeAmenities.join(", ")}`);
      }

      if (["beach", "centre", "airport", "station", "attraction"].includes(fields.near)) {
        patch.near = fields.near;
        said.push(`near ${fields.near}`);
      }

      if (fields.guestName) {
        patch.guestName = fields.guestName;
        said.push(`name ${fields.guestName}`);
      }

      const phone = fields.guestPhone ? parseSpokenPhone(fields.guestPhone) : "";
      if (phone.replace(/^\+?91/, "").length >= 10) {
        patch.guestPhone = phone;
        said.push(`phone ${phone}`);
      }

      if (said.length === 0) return false;

      logCommand(said.join(", "));
      updateDraft(patch);
      return true;
    },

    setDestination(city) {
      if (!city) return;
      logCommand(`Destination: ${titleCase(city)}`);
      updateDraft({ city: titleCase(city) });
      respond();
    },

    // "Show hotels in Goa" / "search now"
    searchHotels(city) {
      if (city) updateDraft({ city: titleCase(city) });

      if (!getDraft().city) {
        say("Which city should I search?");
        return;
      }

      logCommand(`Show hotels in ${getDraft().city}`);
      if (pageName() !== "hotels") navigate("/hotels");
      else respond();
    },

    setCheckIn(spokenDate) {
      const parsed = spokenDate ? parseSpokenDate(spokenDate) : "";

      if (!parsed) {
        say(`Sorry, I didn't get the date from "${spokenDate}". Try "the 10th of December" or "next Friday".`);
        return;
      }

      logCommand(`Check-in: ${speakDate(parsed)}`);
      const { checkOut } = getDraft();
      updateDraft({ checkIn: parsed, ...(checkOut && checkOut <= parsed && { checkOut: "" }) });
      respond();
    },

    setCheckOut(spokenDate) {
      const { checkIn } = getDraft();
      // A bare "the 14th" means the next 14th after check-in.
      const parsed = spokenDate ? parseSpokenDate(spokenDate, checkIn || undefined) : "";

      if (!parsed) {
        say(`Sorry, I didn't get the date from "${spokenDate}".`);
        return;
      }

      if (checkIn && nightsBetween(checkIn, parsed) === 0) {
        say(`Check-out has to be after check-in on ${speakDate(checkIn)}.`);
        return;
      }

      logCommand(`Check-out: ${speakDate(parsed)}`);
      updateDraft({ checkOut: parsed });
      respond();
    },

    // "for 3 nights"
    setNights(spoken) {
      const nights = parseSpokenNumber(spoken);
      const { checkIn } = getDraft();

      if (!nights || nights < 1 || nights > 30) {
        say("How many nights? Up to 30.");
        return;
      }

      if (!checkIn) {
        say(`Got it, ${nights} nights. Which date do you check in?`);
        return;
      }

      logCommand(`${nights} night${nights > 1 ? "s" : ""}`);
      updateDraft({ checkOut: addDays(checkIn, nights) });
      respond();
    },

    setGuests(spoken) {
      const guests = typeof spoken === "number" ? spoken : parseSpokenNumber(spoken);

      if (!guests || guests < 1 || guests > 20) {
        say("How many guests? Between 1 and 20.");
        return;
      }

      logCommand(`Guests: ${guests}`);
      updateDraft({ guests: String(guests) });
      respond();
    },

    setMaxPrice(spoken) {
      const maxPrice = typeof spoken === "number" ? spoken : parseSpokenNumber(spoken);

      if (!maxPrice || maxPrice < 100) {
        say("What's your budget per night? For example, under 5000.");
        return;
      }

      logCommand(`Under ₹${maxPrice.toLocaleString("en-IN")}`);
      updateDraft({ maxPrice: String(maxPrice) });
      respond();
    },

    clearMaxPrice() {
      logCommand("Any price");
      updateDraft({ maxPrice: "" });
      respond();
    },

    // "with a pool and breakfast" — text, or codes from the AI path
    addAmenities(textOrCodes) {
      const codes = Array.isArray(textOrCodes) ? textOrCodes : parseAmenities(textOrCodes);

      if (!codes.length) {
        say(`I don't know that amenity. Try pool, breakfast, wifi, parking, gym or spa.`);
        return;
      }

      logCommand(`With ${codes.join(", ")}`);
      updateDraft({ amenities: [...new Set([...getDraft().amenities, ...codes])] });
      respond();
    },

    removeAmenities(text) {
      const codes = parseAmenities(text);
      logCommand(`Without ${codes.join(", ") || text}`);
      updateDraft({ amenities: getDraft().amenities.filter((c) => !codes.includes(c)) });
      respond();
    },

    // "near the beach" — text, or a type from the AI path
    setNear(textOrType) {
      const near = ["beach", "centre", "airport", "station", "attraction"].includes(textOrType)
        ? textOrType
        : parseNear(textOrType);

      if (!near) {
        say("Near what? The beach, city centre, airport, station or sights?");
        return;
      }

      logCommand(`Near ${near}`);
      updateDraft({ near });
      respond();
    },

    clearNear() {
      logCommand("Anywhere");
      updateDraft({ near: "" });
      respond();
    },

    // `category` is a spoken word or an AI category; empty or "all" clears it.
    showCategory(category) {
      const word = (category || "").toLowerCase();
      const match = CATEGORIES.find((c) => c.toLowerCase() === word);

      if (word && word !== "all" && !match) return;

      logCommand(match ? `Show ${match} hotels` : "Show all hotels");
      updateDraft({ category: match || "" });
      respond();
    },

    // "book the first one" / "book Blue Orchid" / on a hotel page "book the family suite"
    bookHotel(name) {
      if (page().bookByName) {
        logCommand(name ? `Book ${name}` : "Book first hotel");
        page().bookByName(name ? name.toLowerCase() : null);
        return;
      }

      if (page().openBookingForm) {
        const view = page().describe?.() || {};
        // "book The Grand Retreat" while viewing The Grand Retreat = "book it".
        const isThisHotel = name && matchByName([view.hotelName], name);

        if (name && !isThisHotel && page().selectRoomByName && !page().selectRoomByName(name)) {
          say(`This hotel doesn't have a "${name}". Its rooms are: ${(view.rooms || []).map((r) => r.name).join(", ")}.`);
          return;
        }

        logCommand(name ? `Book ${name}` : "Book this hotel");
        page().openBookingForm();
        respond();
        return;
      }

      say("Let's find a hotel first. Which city?");
    },

    chooseRoom(name) {
      if (!page().selectRoomByName) {
        say("Open a hotel first, then choose a room.");
        return;
      }

      if (!page().selectRoomByName(name)) {
        const rooms = page().describe?.().rooms || [];
        say(`I couldn't find "${name}". Rooms here: ${rooms.map((r) => r.name).join(", ")}.`);
        return;
      }

      logCommand(`Room: ${name}`);
      respond();
    },

    openBookingForm() {
      if (!page().openBookingForm) {
        say("Open a hotel first, then say book it.");
        return;
      }

      logCommand("Book this hotel");
      page().openBookingForm();
      respond();
    },

    setGuestName(name) {
      if (!name) return;
      logCommand(`Guest name: ${name}`);
      updateDraft({ guestName: name });
      respond();
    },

    setGuestPhone(spoken) {
      const digits = parseSpokenPhone(spoken);

      if (digits.replace(/^\+?91/, "").length < 10) {
        say(`I heard ${digits.split("").join(" ") || "no number"}. Please say the full 10-digit number.`);
        return;
      }

      logCommand(`Phone: ${digits}`);
      updateDraft({ guestPhone: digits });
      respond();
    },

    // "confirm booking": answers a pending confirmation, otherwise builds one.
    // Nothing is ever booked without the confirmation step.
    confirmBooking() {
      logCommand("Confirm booking");
      if (!answerConfirm(true)) promptNext();
    },

    yes() {
      if (!hasPendingConfirm()) {
        promptNext();
        return;
      }
      logCommand("Yes");
      answerConfirm(true);
    },

    no() {
      if (!hasPendingConfirm()) return;
      logCommand("No");
      answerConfirm(false);
    },

    // Clears the trip (keeps the guest's name and phone) and starts again.
    startOver() {
      logCommand("Start over");
      clearTrip();
      navigate("/");
      ask("Okay, starting over. Where would you like to stay?", "city");
    },

    // "another city" / "somewhere else"
    changeCity() {
      logCommand("Change city");
      updateDraft({ city: "" });
      if (pageName() === "hotel") navigate("/");
      ask("Sure. Which city would you like instead?", "city");
    },

    // "change the dates"
    changeDates() {
      logCommand("Change dates");
      updateDraft({ checkIn: "", checkOut: "" });
      ask("Okay. Which date do you check in?", "checkIn");
    },

    // "what's next" / "help" / "how many rooms are left"
    whatNext() {
      promptNext();
    },

    openMyBookings: () => go("Open my bookings", "/my-bookings"),
    goHome: () => go("Go home", "/"),
    showHotels: () => go("Show hotels", "/hotels"),

    downloadInvoice() {
      logCommand("Download invoice");
      downloadLatestInvoice(notify);
    },

    logout() {
      clearSession();
      resetDraft();
      go("Logout", "/");
      say("You're logged out.");
    },

    unknown() {
      logCommand("Didn't understand — try rephrasing");
      say(`Sorry, I didn't understand. You can say things like "hotels in Goa", "with a pool", or "what's next".`);
    },
  };
}
