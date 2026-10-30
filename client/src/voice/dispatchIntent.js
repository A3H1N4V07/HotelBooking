// Applies a result from the server's /voice/interpret (Gemini): first every
// detail the user mentioned (one sentence can carry many), then the intent.
const INTENT_HANDLERS = {
  SEARCH_HOTELS: (a) => a.searchHotels(),
  BOOK_HOTEL: (a, r) => a.bookHotel(r.hotelName),
  CHOOSE_ROOM: (a, r) => a.chooseRoom(r.roomName),
  OPEN_BOOKING_FORM: (a) => a.openBookingForm(),
  CONFIRM_BOOKING: (a) => a.confirmBooking(),
  YES: (a) => a.yes(),
  NO: (a) => a.no(),
  WHAT_NEXT: (a) => a.whatNext(),
  START_OVER: (a) => a.startOver(),
  OPEN_MY_BOOKINGS: (a) => a.openMyBookings(),
  DOWNLOAD_INVOICE: (a) => a.downloadInvoice(),
  GO_HOME: (a) => a.goHome(),
  SHOW_HOTELS: (a) => a.showHotels(),
  LOGOUT: (a) => a.logout(),
};

export function dispatchIntent(actions, result) {
  const changed = actions.applyDetails(result);
  const handler = INTENT_HANDLERS[result.intent];

  if (handler) {
    handler(actions, result);
  } else if (changed) {
    actions.whatNext(); // PROVIDE_DETAILS: ask for whatever is still missing
  } else {
    actions.unknown();
  }
}
