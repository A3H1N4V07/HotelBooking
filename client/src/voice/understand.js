import { parseSpokenNumber, parseSpokenPhone, parseAmenities, parseNear, titleCase } from "./parseSpoken";
import { parseSpokenDate } from "../utils/parseSpokenDate";
import { matchByName } from "./matchName";

// Local understanding of what the user said: free, instant, and doesn't
// depend on the AI quota. Returns a list of steps for VoiceContext to run,
// or [] when it can't tell (then the AI fallback is tried).
//
// `ctx` describes the conversation:
//   pending    a booking confirmation is waiting for yes/no
//   expects    what the assistant just asked for: city | checkIn | checkOut
//              | guests | guestName | guestPhone | confirm
//   page       home | hotels | hotel | payment | login
//   cities     known city names
//   hotelNames hotels currently listed (hotels/home page)
//   roomNames  room types of the hotel being viewed
//   hotelName  the hotel being viewed

const FILLERS = /^(?:ok(?:ay)?|please|so|and|then|um+|uh+|hmm+|hey|well|alright|all right|actually|now|oh|hello|hi)\s+/;

// "Okay, yes please." -> "yes"
export function normalize(text) {
  let t = String(text || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/[^a-z0-9'₹\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let previous;
  do {
    previous = t;
    t = t.replace(FILLERS, "");
  } while (t !== previous);

  return t.replace(/\s+(?:please|thanks|thank you)$/, "").trim();
}

const YES = /^(?:yes|yeah|yep|yup|ya|yah|yess+|sure|ok|okay|confirm(?:ed)?|go ahead|do it|book it|correct|that'?s right|absolutely|of course|please do|proceed|done)\b/;
const YES_ANYWHERE = /\b(?:yes|yeah|yep|confirm|go ahead)\b/;
const NO = /^(?:no|nope|nah|not yet|cancel|wait|stop|don'?t|do not|hold on)\b/;

const CITY_ALIASES = {
  bengaluru: "Bangalore", bangaluru: "Bangalore", bengalore: "Bangalore", banglore: "Bangalore",
  bombay: "Mumbai", madras: "Chennai", cochin: "Kochi", mysuru: "Mysore",
  "new delhi": "Delhi", simla: "Shimla", panaji: "Goa", panjim: "Goa",
};

function findCity(t, cities) {
  const names = [...cities.map((c) => [c.toLowerCase(), c]), ...Object.entries(CITY_ALIASES)]
    .sort((a, b) => b[0].length - a[0].length);
  const hit = names.find(([spoken]) => new RegExp(`\\b${spoken}\\b`).test(t));
  return hit ? hit[1] : null;
}

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";
const DAY = "\\d{1,2}(?:st|nd|rd|th)?";
const DATE_WORDS = new RegExp(
  `\\b(?:${DAY}(?: of)? ${MONTH}(?: \\d{4})?|${MONTH} ${DAY}(?: \\d{4})?|today|tomorrow|day after tomorrow|(?:this|next|coming) (?:weekend|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\\b`,
  "g"
);

const weekend = (phrase) => phrase.replace(/weekend/, "saturday").replace(/coming/, "next");

// Trip details and filters found anywhere in a sentence.
export function extractDetails(t, ctx) {
  const f = {};

  const city = findCity(t, ctx.cities || []);
  if (city) f.city = city;

  // Dates: "from X", "check in X", "till Y", or bare date words in order.
  const checkIn = t.match(/\b(?:from|starting(?: on| from)?|check(?:ing)? in(?: on| date is)?|arriv(?:e|ing)(?: on)?)\s+(.+?)(?=\s+(?:for|till|until|to|and|with|under|near|check(?:ing)? out)\b|$)/);
  const checkOut = t.match(/\b(?:till|until|check(?:ing)? out(?: on| date is)?|leav(?:e|ing)(?: on)?)\s+(.+?)(?=\s+(?:for|with|under|near|and)\b|$)/);
  const dateWords = t.match(DATE_WORDS) || [];

  const inPhrase = checkIn && parseSpokenDate(weekend(checkIn[1])) ? weekend(checkIn[1]) : dateWords[0] && weekend(dateWords[0]);
  if (inPhrase && parseSpokenDate(inPhrase)) f.checkIn = inPhrase;

  const outPhrase = checkOut && parseSpokenDate(checkOut[1]) ? checkOut[1] : dateWords[1];
  if (outPhrase && parseSpokenDate(outPhrase)) f.checkOut = outPhrase;

  // Nights: "for three nights", "a week"
  const nights = t.match(/\b(\w+(?: \w+)?) nights?\b/);
  if (/\b(?:a|one) night\b/.test(t)) f.nights = 1;
  else if (/\b(?:a|one) week\b/.test(t)) f.nights = 7;
  else if (nights && parseSpokenNumber(nights[1])) f.nights = parseSpokenNumber(nights[1]);

  // Guests
  const people = t.match(/\b(\w+) (?:people|persons?|guests?|adults|pax|of us)\b/) || t.match(/\bfamily of (\w+)\b/) || t.match(/\bwe are (\w+)\b/);
  if (people && parseSpokenNumber(people[1])) f.guests = parseSpokenNumber(people[1]);
  else if (/\bme and my (?:wife|husband|partner|friend|girlfriend|boyfriend|spouse|colleague|mom|mother|dad|father|brother|sister)\b|\b(?:a couple|two of us|the two of us)\b/.test(t)) f.guests = 2;
  else if (/\b(?:just me|alone|by myself|solo|only me|myself)\b/.test(t)) f.guests = 1;

  // Budget
  const price = t.match(/\b(?:under|below|less than|within|max(?:imum)?(?: of)?|budget(?: is| of)?|up ?to|not more than|cheaper than)\s+(?:rs |rupees |₹)?(\d[\d.]*\s*(?:k|thousand|lakh|lac)?|[a-z]+(?: [a-z]+){0,3})/);
  if (price && parseSpokenNumber(price[1]) >= 100) f.maxPrice = parseSpokenNumber(price[1]);

  // Location
  const near = t.match(/\b(?:near|close to|next to|walking distance (?:from|to)|beside|by)\s+(?:the\s+)?([a-z ]+)/);
  if (near && parseNear(near[1])) f.near = parseNear(near[1]);
  else if (/\b(?:beachfront|beach ?side|sea ?view|sea facing|on the beach)\b/.test(t)) f.near = "beach";

  // Amenities to add / remove
  const without = t.match(/\b(?:without|no|remove|don'?t need|do not need)\s+(.+)/);
  const removed = without ? parseAmenities(without[1]) : [];
  const added = parseAmenities(without ? t.slice(0, without.index) : t).filter((c) => !removed.includes(c));
  if (added.length) f.amenities = added;
  if (removed.length) f.removeAmenities = removed;

  // Category
  if (/\b(?:cheap|budget|affordable|inexpensive|low cost)\b/.test(t) && !f.maxPrice) f.category = "Budget";
  else if (/\b(?:luxury|luxurious|5 star|five star|premium|fancy)\b/.test(t)) f.category = "Luxury";
  else if (/\b(?:business hotel|for work|work trip|business trip)\b/.test(t)) f.category = "Business";
  else if (/\b(?:family hotel|family friendly|family resort|kid friendly|kids friendly)\b/.test(t)) f.category = "Family";

  return f;
}

const GENERIC_TARGET = /^(?:it|this|that|now|this one|that one|one|first|the first|first one|the first one|first hotel|the first hotel|top one|the top one|hotel|this hotel|that hotel|the hotel|a room|room|me|for me)$/;

// Hotel/room name after "book"/"open"/"I'll take", without filler.
function cleanTarget(text) {
  return text
    .replace(/^(?:me |for me |a |an |the |this |that )+/, "")
    .replace(/\s+(?:for me|now|hotel|please|right now)$/, "")
    .trim();
}

export function understand(text, ctx = {}) {
  const t = normalize(text);
  if (!t) return [];

  const cities = ctx.cities || [];
  const fullCtx = { ...ctx, cities };

  // 1. A pending booking confirmation: yes / no first.
  if (ctx.pending) {
    if (NO.test(t)) return [{ type: "no" }];
    if (YES.test(t) || YES_ANYWHERE.test(t)) return [{ type: "yes" }];
  }

  // "stop" ends the conversation (while a booking awaits yes/no it's a "no", above).
  if (/^(?:stop(?: listening| it| now)?|turn (?:it |the mic )?off|mute|bye|good ?bye|that'?s all|that is all|nothing else|quit|exit|close|pause|be quiet|shut up|thank you|thanks|i'?m done|done for now)$/.test(t)) {
    return [{ type: "stopListening" }];
  }

  // 2. Commands that mean the same thing on every page.
  // (Before "my trips": "clear my trip" means start over.)
  if (/\b(?:start (?:over|again)|reset|new search|clear (?:everything|all|my trip|the trip|it all))\b/.test(t)) return [{ type: "startOver" }];
  if (/\bmy (?:bookings?|reservations?|trips?)\b/.test(t)) return [{ type: "openMyBookings" }];
  if (/\binvoice\b/.test(t)) return [{ type: "downloadInvoice" }];
  if (/\b(?:log|sign) ?out\b/.test(t)) return [{ type: "logout" }];

  // "book for another city", "somewhere else", "change the dates": clear that
  // part and ask again (unless the new value is in the same sentence).
  if (/\b(?:another|different|other|new) (?:city|place|destination|location)\b|\bsomewhere else\b|\bchange (?:the |my )?(?:city|destination|place|location)\b/.test(t)) {
    const city = findCity(t, ctx.cities || []);
    return city ? [{ type: "details", fields: { city }, search: true }] : [{ type: "changeCity" }];
  }
  if (/\b(?:change|different|other|new) (?:the |my )?dates?\b/.test(t)) {
    const dates = extractDetails(t, { ...ctx, cities: [] });
    return dates.checkIn ? [{ type: "details", fields: dates }] : [{ type: "changeDates" }];
  }
  if (/^(?:go |take me )?(?:to )?(?:the )?home(?: page)?$/.test(t)) return [{ type: "goHome" }];

  const sentenceDetails = extractDetails(t, fullCtx);
  const hasDetails = Object.keys(sentenceDetails).length > 0;

  // "help me find a hotel in Goa" is a search, not a request for help.
  if (!hasDetails && /\b(?:what'?s next|what next|what now|help|what can i (?:say|do)|repeat|say (?:that|it) again|what are (?:my|the) options|how many (?:rooms )?(?:are )?left|is it available|where (?:are|were) we)\b/.test(t)) {
    return [{ type: "whatNext" }];
  }
  // A short yes/no with nothing pending ("no pool" is a filter, not a "no";
  // "book it" opens the booking form, handled below).
  if (!ctx.pending && !hasDetails && !/\b(?:book|reserve)\b/.test(t) && (YES.test(t) || NO.test(t)) && t.split(" ").length <= 3) {
    return [{ type: YES.test(t) ? "yes" : "no" }];
  }

  // 3. Name / phone said explicitly.
  const name = t.match(/\b(?:my name is|name is|the name'?s|under the name(?: of)?|book it under|it'?s under)\s+([a-z][a-z .'-]{0,40})$/);
  if (name && !/\d|people|guests?|nights?/.test(name[1])) return [{ type: "setGuestName", value: titleCase(name[1]) }];

  const digits = parseSpokenPhone(t);
  if (/\b(?:phone|mobile|number|contact|call me)\b/.test(t) && digits.length >= 6) {
    return [{ type: "setGuestPhone", value: t }];
  }

  // 4. Booking / opening / choosing by name.
  const book = t.match(/\b(?:book|reserve)\b\s*(.*)$/);
  if (book) {
    const target = cleanTarget(book[1]);
    const details = extractDetails(target, fullCtx);

    // "book a hotel in Goa for 2 people" is a search, not a hotel name.
    if (Object.keys(details).length && !matchByName([...(ctx.hotelNames || []), ...(ctx.roomNames || [])], target)) {
      return [{ type: "details", fields: details, search: true }];
    }

    return [{ type: "book", name: !target || GENERIC_TARGET.test(target) ? null : target }];
  }

  const choose = t.match(/\b(?:i'?ll take|i will take|take|choose|select|give me|go with|i'?d like|let'?s do|lets do|pick|open|show me|view|tell me about|check out)\s+(.+)$/);
  if (choose) {
    const target = cleanTarget(choose[1]);
    const room = ctx.page === "hotel" && matchByName(ctx.roomNames || [], target);
    if (room) return [{ type: "chooseRoom", value: room }];

    const hotel = matchByName(ctx.hotelNames || [], target);
    if (hotel) return [{ type: "book", name: hotel }];

    if (GENERIC_TARGET.test(target) && ctx.page === "hotels") return [{ type: "book", name: null }];
  }

  // A bare room or hotel name.
  if (ctx.page === "hotel") {
    const room = matchByName(ctx.roomNames || [], t, 0.75);
    if (room) return [{ type: "chooseRoom", value: room }];
  }
  if (ctx.page === "hotels" || ctx.page === "home") {
    const hotel = matchByName(ctx.hotelNames || [], t, 0.75);
    if (hotel) return [{ type: "book", name: hotel }];
  }

  if (/^(?:search|find|go|continue|let'?s go|lets go|show (?:me )?(?:the )?(?:results|hotels)|show me|find (?:me )?(?:a )?hotels?)$/.test(t)) {
    return [{ type: "search" }];
  }

  // 5. A short answer to the question just asked.
  const details = sentenceDetails;

  switch (ctx.expects) {
    case "city":
      if (!details.city && t.split(" ").length <= 3 && !/\d/.test(t)) return [{ type: "details", fields: { city: titleCase(t) } }];
      break;
    case "checkIn":
      if (!details.checkIn && parseSpokenDate(t)) return [{ type: "details", fields: { ...details, checkIn: t } }];
      break;
    case "checkOut":
      if (!details.checkOut && !details.nights && parseSpokenDate(t)) return [{ type: "details", fields: { ...details, checkOut: t } }];
      break;
    case "guests":
      if (!details.guests && parseSpokenNumber(t) && t.split(" ").length <= 3) return [{ type: "details", fields: { guests: parseSpokenNumber(t) } }];
      break;
    case "guestName":
      if (!/\d/.test(t) && t.split(" ").length <= 5 && !Object.keys(details).length) return [{ type: "setGuestName", value: titleCase(t) }];
      break;
    case "guestPhone":
      if (digits.length >= 6) return [{ type: "setGuestPhone", value: t }];
      break;
    default:
  }

  // 6. Any trip details / filters in the sentence.
  if (Object.keys(details).length) {
    const wantsResults = /\b(?:show|find|search|look(?:ing)? for|get me|any)\b/.test(t);
    return [{ type: "details", fields: details, search: wantsResults }];
  }

  return [];
}
