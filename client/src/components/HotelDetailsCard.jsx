import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import BookingFormModal from "./BookingFormModal";
import RoomPicker from "./RoomPicker";
import useVoicePageContext from "../hooks/useVoicePageContext";
import { useVoice } from "../context/VoiceContext";
import { getSession } from "../auth";
import { formatPrice } from "../utils/formatPrice";
import { nightsBetween, formatDistance } from "../utils/stay";
import { matchByName } from "../voice/matchName";
import { NAV_HEIGHT } from "./Header";
import { CheckIcon, MapPinIcon, PhoneIcon, StarIcon } from "./Icons";

const LANDMARK_LABELS = { beach: "Beach", centre: "City centre", airport: "Airport", station: "Station", attraction: "Sight" };

// A room is bookable for the current search if it fits the party and
// (when availability is known) has a room left.
const isBookable = (room, guests) =>
  room.capacity >= (Number(guests) || 1) && room.roomsLeft !== 0;

function HotelDetailsCard({ hotel }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Dates, guests, the chosen room and the guest's name/phone are part of
  // the shared booking draft, so voice and the form stay in step.
  const { draft, updateDraft, clearTrip, notify, promptIfActive } = useVoice();

  const [booking, setBooking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");

  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "null"),
    []
  );

  const checkInDate = draft.checkIn;
  const checkOutDate = draft.checkOut;
  const guests = draft.guests || 1;
  const guestName = draft.guestName;
  const guestPhone = draft.guestPhone;

  const setCheckInDate = (checkIn) => updateDraft({ checkIn });
  const setCheckOutDate = (checkOut) => updateDraft({ checkOut });
  const setGuests = (value) => updateDraft({ guests: String(value) });
  const setGuestName = (value) => updateDraft({ guestName: value });
  const setGuestPhone = (value) => updateDraft({ guestPhone: value });

  // This hotel becomes the draft's hotel; prefill the guest name once.
  useEffect(() => {
    updateDraft({
      hotelId: hotel.id,
      hotelName: hotel.name,
      ...(!draft.city && { city: hotel.city }),
      ...(!draft.guestName && user?.firstName && { guestName: user.firstName }),
    });
    // Only when the hotel changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.id]);

  const [rooms, setRooms] = useState(hotel.roomTypes || []);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const requestRef = useRef(0);

  const nights = nightsBetween(checkInDate, checkOutDate);
  const selectedRoomId = draft.hotelId === hotel.id ? draft.roomTypeId : null;
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || null;

  const selectRoom = useCallback((roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    updateDraft({ roomTypeId: room ? room.id : null, roomName: room ? room.name : "" });
  }, [rooms, updateDraft]);

  // Room availability for the chosen dates and party size.
  const loadRooms = useCallback(async () => {
    const guestCount = Number(guests) || 1;

    if (nights === 0) {
      setRooms(hotel.roomTypes || []);
      return;
    }

    const requestId = ++requestRef.current;
    setRoomsLoading(true);

    try {
      const response = await api.get(`/hotels/${hotel.id}`, {
        params: { checkIn: checkInDate, checkOut: checkOutDate, guests: guestCount },
      });

      if (requestId === requestRef.current) setRooms(response.data.roomTypes);
    } catch (error) {
      // Invalid dates (e.g. in the past): show rooms without availability.
      if (requestId === requestRef.current) setRooms(hotel.roomTypes || []);
    } finally {
      if (requestId === requestRef.current) setRoomsLoading(false);
    }
  }, [hotel, checkInDate, checkOutDate, guests, nights]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Keep a valid room selected: the current one if still bookable, else the
  // cheapest that is (rooms arrive sorted by price).
  useEffect(() => {
    if (roomsLoading || draft.hotelId !== hotel.id) return;

    const current = rooms.find((room) => room.id === selectedRoomId && isBookable(room, guests));
    if (current) return;

    selectRoom(rooms.find((room) => isBookable(room, guests))?.id ?? null);
  }, [rooms, guests, roomsLoading, selectedRoomId, selectRoom, draft.hotelId, hotel.id]);

  // When rooms settle (or the form opens), let the voice assistant describe
  // the next step, if a voice conversation is on.
  useEffect(() => {
    if (!roomsLoading && draft.hotelId === hotel.id) promptIfActive();
  }, [roomsLoading, selectedRoomId, showForm, draft.hotelId, hotel.id, promptIfActive]);

  const openBookingForm = () => {
    if (!getSession()) {
      notify("Please log in to book. I'll bring you back to this hotel afterwards.");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    setShowForm(true);
  };

  const closeBookingForm = () => {
    setShowForm(false);
    setFormError("");
  };

  const submitBooking = async () => {
    setFormError("");

    if (!checkInDate || !checkOutDate) {
      setFormError("Please select both check-in and check-out dates.");
      setShowForm(true);
      return;
    }

    if (nights === 0) {
      setFormError("Check-out date must be after check-in date.");
      setShowForm(true);
      return;
    }

    if (!String(guestName).trim() || !String(guestPhone).trim()) {
      setFormError("Please enter guest name and phone number.");
      setShowForm(true);
      return;
    }

    try {
      setBooking(true);

      const response = await api.post("/bookings/create", {
        hotelId: hotel.id,
        // Without a selection the server books the cheapest room that fits.
        roomTypeId: selectedRoom ? selectedRoom.id : undefined,
        checkInDate,
        checkOutDate,
        guests,
        guestName: String(guestName).trim(),
        guestPhone: String(guestPhone).trim(),
      });

      const bookingId = response.data.booking.id;
      navigate(`/payment/${bookingId}`);
      // The booking now lives on the server; the next search starts fresh
      // (name and phone are kept). Same render as the navigation, so this
      // page unmounts without writing its room back into the draft.
      clearTrip();
    } catch (error) {
      console.error(error);
      const message = error.response?.data?.message || "Booking creation failed. Please try again.";
      setFormError(message);
      setShowForm(true);
      notify(message, "error");

      // Someone else took the room meanwhile: show fresh availability.
      if (error.response?.status === 409) loadRooms();
    } finally {
      setBooking(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    submitBooking();
  };

  useVoicePageContext({
    describe: () => ({
      page: "hotel",
      hotelId: hotel.id,
      hotelName: hotel.name,
      // For answering "does it have a pool?" / "how far is the beach?" locally.
      openHotel: {
        id: hotel.id,
        name: hotel.name,
        amenities: (hotel.amenities || []).map((a) => a.code),
        nearby: hotel.nearby || [],
        locationSource: hotel.locationSource,
      },
      rooms,
      selectedRoom,
      roomsLoading,
      formOpen: showForm,
    }),
    // "the family suite" -> that room, if it fits and is free. Returns success.
    selectRoomByName: (name) => {
      const room = matchByName(rooms, name);

      if (!room) return false;

      if (!isBookable(room, guests)) {
        notify(
          room.capacity < (Number(guests) || 1)
            ? `The ${room.name} sleeps ${room.capacity}, not ${guests}.`
            : `The ${room.name} is sold out for those dates.`
        );
        return true;
      }

      selectRoom(room.id);
      return true;
    },
    openBookingForm,
    submitBooking,
  });

  const listedPrice = selectedRoom ? selectedRoom.pricePerNight : hotel.price;
  const noRoomFits = rooms.length > 0 && !rooms.some((room) => isBookable(room, guests));

  return (
    <div>
      <div
        className="text-white position-relative"
        style={{
          marginTop: -NAV_HEIGHT,
          paddingTop: NAV_HEIGHT + 96,
          paddingBottom: 96,
          backgroundImage: `linear-gradient(180deg, rgba(30,27,75,0.45), rgba(30,27,75,0.92)), url(${hotel.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container">
          <Link to="/hotels" className="text-white-50 text-decoration-none small d-inline-block mb-3">
            ← All hotels
          </Link>

          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            {hotel.category && <span className="badge rounded-pill bg-warning text-dark px-3 py-2">{hotel.category}</span>}
            <span className="badge-floating d-inline-flex align-items-center gap-1 py-1">
              <StarIcon size={14} className="text-warning" /> {hotel.rating}
            </span>
          </div>

          <h1 className="display-5 fw-bold mb-2">{hotel.name}</h1>

          <div className="d-flex flex-wrap gap-3 text-white text-opacity-75">
            <span className="d-inline-flex align-items-center gap-1">
              <MapPinIcon size={16} /> {hotel.address || hotel.city}
            </span>
            {hotel.phone && (
              <span className="d-inline-flex align-items-center gap-1">
                <PhoneIcon size={16} /> {hotel.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container position-relative pb-5" style={{ marginTop: -56 }}>
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card border-0 rounded-4 shadow-sm p-4 mb-4">
              <h5 className="fw-bold mb-3">About this hotel</h5>
              <p className="text-secondary mb-0">{hotel.description}</p>
            </div>

            {hotel.amenities?.length > 0 && (
              <div className="card border-0 rounded-4 shadow-sm p-4 mb-4">
                <h5 className="fw-bold mb-3">Amenities</h5>
                <div className="row g-2">
                  {hotel.amenities.map((amenity) => (
                    <div key={amenity.code} className="col-6 col-md-4 d-flex align-items-center gap-2 small">
                      <span
                        className="rounded-circle bg-success bg-opacity-10 text-success d-inline-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 26, height: 26 }}
                      >
                        <CheckIcon size={14} />
                      </span>
                      {amenity.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hotel.nearby?.length > 0 && (
              <div className="card border-0 rounded-4 shadow-sm p-4">
                <h5 className="fw-bold mb-3">What's nearby</h5>
                <ul className="list-unstyled mb-0">
                  {hotel.nearby.slice(0, 4).map((place, index) => (
                    <li
                      key={place.name}
                      className={`d-flex justify-content-between align-items-center gap-3 py-2 ${index > 0 ? "border-top" : ""}`}
                    >
                      <span className="d-inline-flex align-items-center gap-2">
                        <MapPinIcon size={16} className="text-warning" />
                        {place.name}
                        {LANDMARK_LABELS[place.type] && (
                          <span className="badge rounded-pill text-bg-light border fw-normal text-secondary">
                            {LANDMARK_LABELS[place.type]}
                          </span>
                        )}
                      </span>
                      <span className="text-secondary small text-nowrap">{formatDistance(place.km)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="col-lg-5">
            <div className="card border-0 rounded-4 shadow-lg p-4 sticky-lg-top" style={{ top: NAV_HEIGHT + 16, zIndex: 1 }}>
              <div className="d-flex justify-content-between align-items-baseline mb-3">
                <h4 className="fw-bold mb-0">Choose your room</h4>
                <span className="text-secondary small">
                  from <span className="fw-bold text-dark fs-5">{formatPrice(listedPrice)}</span> / night
                </span>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary mb-1" htmlFor="check-in">Check in</label>
                  <input id="check-in" type="date" className="form-control" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary mb-1" htmlFor="check-out">Check out</label>
                  <input id="check-out" type="date" className="form-control" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary mb-1" htmlFor="guests">Guests</label>
                  <input id="guests" type="number" min="1" className="form-control" value={guests} onChange={(e) => setGuests(e.target.value)} />
                </div>
              </div>

              {nights === 0 && (
                <p className="small text-secondary">Pick your dates to see prices for your stay and how many rooms are left.</p>
              )}

              {rooms.length > 0 ? (
                <RoomPicker
                  rooms={rooms}
                  nights={nights}
                  guests={guests}
                  selectedId={selectedRoomId}
                  onSelect={selectRoom}
                  loading={roomsLoading}
                />
              ) : (
                <p className="text-secondary">This hotel has no rooms set up yet.</p>
              )}

              {noRoomFits && (
                <div className="alert alert-warning rounded-3 mt-3 mb-0 py-2 small">
                  No room fits {Number(guests) || 1} guests{nights > 0 ? " for these dates" : ""}. Try other dates or fewer guests.
                </div>
              )}

              <div className="border-top mt-4 pt-3 d-flex justify-content-between align-items-center gap-3">
                <div>
                  {selectedRoom && nights > 0 ? (
                    <>
                      <div className="fw-bold fs-4">{formatPrice(selectedRoom.pricePerNight * nights)}</div>
                      <small className="text-secondary">
                        {selectedRoom.name} · {nights} night{nights > 1 ? "s" : ""}
                      </small>
                    </>
                  ) : (
                    <>
                      <div className="fw-bold fs-4">{formatPrice(listedPrice)}</div>
                      <small className="text-secondary">per night</small>
                    </>
                  )}
                </div>

                <button
                  className="btn btn-accent btn-lg rounded-pill px-4"
                  onClick={openBookingForm}
                  disabled={booking || noRoomFits || rooms.length === 0}
                >
                  {booking ? "Booking..." : "Book Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <BookingFormModal
          hotelName={hotel.name}
          roomSummary={
            selectedRoom
              ? `${selectedRoom.name}${nights > 0 ? ` · ${formatPrice(selectedRoom.pricePerNight * nights)} for ${nights} night${nights > 1 ? "s" : ""}` : ""}`
              : "Cheapest available room for your party"
          }
          checkInDate={checkInDate}
          setCheckInDate={setCheckInDate}
          checkOutDate={checkOutDate}
          setCheckOutDate={setCheckOutDate}
          guests={guests}
          setGuests={setGuests}
          guestName={guestName}
          setGuestName={setGuestName}
          guestPhone={guestPhone}
          setGuestPhone={setGuestPhone}
          error={formError}
          onClose={closeBookingForm}
          onSubmit={handleFormSubmit}
          submitting={booking}
        />
      )}
    </div>
  );
}

export default HotelDetailsCard;
