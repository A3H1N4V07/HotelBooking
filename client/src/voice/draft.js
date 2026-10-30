// The booking the user is putting together, shared by every page and by the
// voice assistant. Typing in a form and speaking both update this one
// object, so nothing has to be said or entered twice.
//
// Kept in sessionStorage: it survives navigation and refreshes in this tab,
// and is cleared on logout.

const STORAGE_KEY = "bookingDraft";

export const EMPTY_DRAFT = {
  city: "",
  checkIn: "",       // "YYYY-MM-DD"
  checkOut: "",      // "YYYY-MM-DD"
  guests: "",        // number as string, "" = not given
  maxPrice: "",      // rupees per night, "" = any
  category: "",      // Budget | Business | Family | Luxury, "" = any
  near: "",          // beach | centre | airport | station | attraction
  amenities: [],     // amenity codes, e.g. ["pool"]
  hotelId: null,
  hotelName: "",
  roomTypeId: null,
  roomName: "",
  guestName: "",
  guestPhone: "",
};

export function loadDraft() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return saved ? { ...EMPTY_DRAFT, ...saved } : { ...EMPTY_DRAFT };
  } catch {
    return { ...EMPTY_DRAFT };
  }
}

export function saveDraft(draft) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable (private mode etc.): the draft still lives in memory.
  }
}

export function clearSavedDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Changing where or when invalidates a chosen hotel/room.
// (Fields set in the same patch are kept.)
export function applyDraftPatch(draft, patch) {
  const changed = (key) => key in patch && patch[key] !== draft[key];
  const cleared = {};

  if (changed("city")) {
    Object.assign(cleared, { hotelId: null, hotelName: "", roomTypeId: null, roomName: "" });
  }

  if (changed("hotelId") || changed("checkIn") || changed("checkOut") || changed("guests")) {
    // The room may no longer fit or be free; the hotel page re-picks one.
    Object.assign(cleared, { roomTypeId: null, roomName: "" });
  }

  return { ...draft, ...cleared, ...patch };
}
