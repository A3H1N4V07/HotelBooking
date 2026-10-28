import { cleanSpeech } from "../utils/cleanSpeech";

const GENERIC_BOOK_TARGETS = ["this hotel", "now", "it", "first hotel", "the first hotel"];

// Phrases matched instantly in the browser (free, no Gemini call), in the
// format react-speech-recognition expects. Anything that doesn't match
// falls through to the AI path in VoiceContext.
export function buildLocalCommands(actions, pageRef) {
  const withClean = (action) => (spoken) => action(cleanSpeech(spoken));

  return [
    { command: "Open my bookings", callback: actions.openMyBookings },
    {
      command: "Show hotels",
      isFuzzyMatch: true,
      fuzzyMatchingThreshold: 0.85,
      callback: actions.showHotels,
    },
    { command: "Go home", callback: actions.goHome },
    {
      command: "Download invoice",
      isFuzzyMatch: true,
      fuzzyMatchingThreshold: 0.8,
      callback: actions.downloadInvoice,
    },
    { command: "Logout", callback: actions.logout },
    {
      command: "clear",
      callback: ({ resetTranscript }) => resetTranscript(),
    },
    { command: "My destination is *", callback: withClean(actions.setDestination) },
    { command: "Show hotels in *", callback: withClean(actions.searchHotels) },
    {
      command: ["Search now", "Continue", "Show my results"],
      isFuzzyMatch: true,
      fuzzyMatchingThreshold: 0.8,
      // Only meaningful on the home page's search form.
      callback: () => {
        if (pageRef.current.goToHotels) actions.searchHotels();
      },
    },
    {
      command: [
        "I want to book hotel from *",
        "Check in on *",
        "Check in date is *",
        "My check in is *",
        "Set check in to *",
      ],
      callback: withClean(actions.setCheckIn),
    },
    {
      command: [
        "Till *",
        "Check out on *",
        "Check out date is *",
        "My check out is *",
        "Set check out to *",
      ],
      callback: withClean(actions.setCheckOut),
    },
    {
      command: ["we are * people", "* guests", "* people"],
      callback: withClean(actions.setGuests),
    },
    { command: "Show * hotels", callback: withClean(actions.showCategory) },
    {
      command: "Book *",
      callback: (spoken) => {
        const target = cleanSpeech(spoken).toLowerCase();
        actions.bookHotel(GENERIC_BOOK_TARGETS.includes(target) ? null : target);
      },
    },
    {
      command: ["My name is *", "Guest name is *", "Name is *"],
      callback: withClean(actions.setGuestName),
    },
    {
      command: ["My phone number is *", "Phone number is *", "My contact number is *"],
      callback: withClean(actions.setGuestPhone),
    },
    {
      command: ["Confirm booking", "Confirm my booking"],
      isFuzzyMatch: true,
      fuzzyMatchingThreshold: 0.75,
      callback: actions.confirmBooking,
    },
  ];
}
