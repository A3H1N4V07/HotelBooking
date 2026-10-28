// Maps an intent returned by the server's /voice/interpret (Gemini) onto
// the shared voice actions.
const INTENT_HANDLERS = {
  SET_DESTINATION: (a, r) => a.setDestination(r.city),
  SEARCH_HOTELS: (a, r) => a.searchHotels(r.city),
  SET_CHECK_IN: (a, r) => a.setCheckIn(r.date),
  SET_CHECK_OUT: (a, r) => a.setCheckOut(r.date),
  SET_GUESTS: (a, r) => a.setGuests(r.guests),
  SHOW_CATEGORY: (a, r) => a.showCategory(r.category),
  BOOK_HOTEL: (a, r) => a.bookHotel(r.hotelName),
  OPEN_BOOKING_FORM: (a) => a.openBookingForm(),
  SET_GUEST_NAME: (a, r) => a.setGuestName(r.guestName),
  SET_GUEST_PHONE: (a, r) => a.setGuestPhone(r.guestPhone),
  CONFIRM_BOOKING: (a) => a.confirmBooking(),
  OPEN_MY_BOOKINGS: (a) => a.openMyBookings(),
  DOWNLOAD_INVOICE: (a) => a.downloadInvoice(),
  GO_HOME: (a) => a.goHome(),
  SHOW_HOTELS: (a) => a.showHotels(),
  LOGOUT: (a) => a.logout(),
};

export function dispatchIntent(actions, result) {
  const handler = INTENT_HANDLERS[result.intent];

  if (handler) {
    handler(actions, result);
  } else {
    actions.unknown();
  }
}
