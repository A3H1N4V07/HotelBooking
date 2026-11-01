// What you can say on each page: shown in the voice panel and used in the
// "didn't get that" hint. `view` is the page's describe() snapshot, so the
// examples can use real hotel and room names from the screen.

export function pageFromPath(pathname = "/") {
  if (pathname === "/") return "home";
  if (pathname === "/hotels") return "hotels";
  if (/^\/hotels\/[^/]+/.test(pathname)) return "hotel";
  if (pathname.startsWith("/payment")) return "payment";
  if (pathname.startsWith("/my-bookings")) return "myBookings";
  if (pathname === "/login" || pathname === "/register") return "login";
  if (pathname.startsWith("/admin")) return "admin";
  return "other";
}

const STOP = "Stop";

export function examplesFor(page, view = {}) {
  switch (page) {
    case "home":
      return [
        "I want to go to Goa",
        "From 10th December for 3 nights",
        "We are 2 people",
        "Goa next weekend, 2 people, with a pool",
        "Show my bookings",
        "What's next?",
        STOP,
      ];

    case "hotels": {
      const first = view.results?.[0]?.name;
      return [
        "With a pool",
        "Under 5000",
        "Near the beach",
        "Show luxury hotels",
        first ? `Book ${first}` : "Book the first one",
        "Which one is cheapest?",
        "Compare the first two",
        "Book the first one",
        "Another city",
        "What's next?",
        STOP,
      ];
    }

    case "hotel": {
      if (view.formOpen) {
        return ["My name is Akshay", "My phone number is 98765 43210", "Yes", "No, change the dates", STOP];
      }
      const other = (view.rooms || []).find((r) => r.id !== view.selectedRoom?.id)?.name;
      return [
        other ? `I'll take the ${other}` : "I'll take the family room",
        "Does it have a pool?",
        "Any restaurants nearby?",
        "How far is it from the airport?",
        "For 3 guests",
        "Check out on the 14th",
        "How many rooms are left?",
        "Book it",
        "Show hotels",
        STOP,
      ];
    }

    case "payment":
      return view.paid
        ? ["Show my bookings", "Download invoice", "Start a new search", STOP]
        : ["Card details are typed, not spoken", "Cancel booking", "Show my bookings", STOP];

    case "myBookings":
      return ["Download invoice", "Start a new search", "Go home", STOP];

    case "login":
      return ["Email and password are typed, not spoken", "Go home", STOP];

    default:
      return ["I want to go to Goa", "Show hotels", "Show my bookings", "Go home", STOP];
  }
}

// Short "try saying…" suggestions for the not-understood hint.
export function hintExamples(page, view) {
  return examplesFor(page, view)
    .filter((e) => e !== STOP && !/typed, not spoken/.test(e))
    .slice(0, 3);
}
