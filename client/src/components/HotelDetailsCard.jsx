import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import BookingFormModal from "./BookingFormModal";
import RoomPicker from "./RoomPicker";
import useVoicePageContext from "../hooks/useVoicePageContext";
import { formatPrice } from "../utils/formatPrice";
import { nightsBetween, formatDistance } from "../utils/stay";

const LANDMARK_ICONS = { beach: "🏖️", centre: "🏙️", airport: "✈️", station: "🚉", attraction: "📍" };

// A room is bookable for the current search if it fits the party and
// (when availability is known) has a room left.
const isBookable = (room, guests) =>
  room.capacity >= (Number(guests) || 1) && room.roomsLeft !== 0;

function HotelDetailsCard({ hotel }) {
  const navigate = useNavigate();

  const [booking, setBooking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");

  const travelData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("travelData")) || {};
    } catch {
      return {};
    }
  }, []);

  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "null"),
    []
  );

  const [checkInDate, setCheckInDate] = useState(travelData.checkInDate || "");
  const [checkOutDate, setCheckOutDate] = useState(travelData.checkOutDate || "");
  const [guests, setGuests] = useState(travelData.NoOfGuests || 1);
  const [guestName, setGuestName] = useState(user?.firstName || "");
  const [guestPhone, setGuestPhone] = useState("");

  const [rooms, setRooms] = useState(hotel.roomTypes || []);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const requestRef = useRef(0);

  const nights = nightsBetween(checkInDate, checkOutDate);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || null;

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
    setSelectedRoomId((current) => {
      const stillOk = rooms.find((room) => room.id === current && isBookable(room, guests));
      if (stillOk) return current;
      return rooms.find((room) => isBookable(room, guests))?.id ?? null;
    });
  }, [rooms, guests]);

  const openBookingForm = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
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
    } catch (error) {
      console.error(error);
      setFormError(
        error.response?.data?.message || "Booking creation failed. Please try again."
      );
      setShowForm(true);

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
    setCheckInDate,
    setCheckOutDate,
    setGuests,
    setGuestName,
    setGuestPhone,
    openBookingForm,
    submitBooking,
  });

  const listedPrice = selectedRoom ? selectedRoom.pricePerNight : hotel.price;
  const noRoomFits = rooms.length > 0 && !rooms.some((room) => isBookable(room, guests));

  return (
    <div className="container py-4">
      <div className="card border-0 shadow-lg">
        <div className="row g-0">
          <div className="col-md-5">
            <img
              src={hotel.image}
              alt={hotel.name}
              className="img-fluid h-100"
              style={{
                objectFit: "cover",
                borderRadius: "8px 0 0 8px",
                minHeight: "320px",
                width: "100%",
              }}
            />
          </div>

          <div className="col-md-7">
            <div className="card-body d-flex flex-column h-100">
              <div className="d-flex justify-content-between align-items-start">
                <h2 className="fw-bold mb-1">{hotel.name}</h2>
                <span
                  className="badge"
                  style={{
                    background: "linear-gradient(135deg, #F6B73C, #d99a1f)",
                    color: "#0B1F3A",
                  }}
                >
                  {hotel.category}
                </span>
              </div>

              <p className="text-muted mb-2">{hotel.address}</p>

              <p className="mb-2">
                ⭐ {hotel.rating} &nbsp;|&nbsp; 📍 {hotel.city}
                {hotel.phone && <> &nbsp;|&nbsp; 📞 {hotel.phone}</>}
              </p>

              <p className="text-secondary">{hotel.description}</p>

              {hotel.amenities?.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {hotel.amenities.map((amenity) => (
                    <span key={amenity.code} className="badge rounded-pill text-bg-light border">
                      {amenity.label}
                    </span>
                  ))}
                </div>
              )}

              {hotel.nearby?.length > 0 && (
                <div className="small text-muted mb-3">
                  {hotel.nearby.slice(0, 4).map((place) => (
                    <div key={place.name}>
                      {LANDMARK_ICONS[place.type] || "📍"} {formatDistance(place.km)} to {place.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mt-4 p-4">
        <h4 className="fw-bold mb-3">Choose your room</h4>

        <div className="row g-2 mb-3">
          <div className="col-sm-4">
            <label className="form-label small">Check In</label>
            <input type="date" className="form-control" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
          </div>
          <div className="col-sm-4">
            <label className="form-label small">Check Out</label>
            <input type="date" className="form-control" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
          </div>
          <div className="col-sm-4">
            <label className="form-label small">Guests</label>
            <input type="number" min="1" className="form-control" value={guests} onChange={(e) => setGuests(e.target.value)} />
          </div>
        </div>

        {nights === 0 && (
          <p className="small text-muted">Pick your dates to see prices for your stay and how many rooms are left.</p>
        )}

        {rooms.length > 0 ? (
          <RoomPicker
            rooms={rooms}
            nights={nights}
            guests={guests}
            selectedId={selectedRoomId}
            onSelect={setSelectedRoomId}
            loading={roomsLoading}
          />
        ) : (
          <p className="text-muted">This hotel has no rooms set up yet.</p>
        )}

        {noRoomFits && (
          <div className="alert alert-warning mt-3 mb-0 py-2">
            No room fits {Number(guests) || 1} guests{nights > 0 ? " for these dates" : ""}. Try other dates or fewer guests.
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mt-4">
          <div>
            <h3 className="fw-bold mb-0">
              {formatPrice(listedPrice)} <small className="text-muted fs-6">/ night</small>
            </h3>
            {selectedRoom && nights > 0 && (
              <small className="text-muted">
                {selectedRoom.name} · {formatPrice(selectedRoom.pricePerNight * nights)} for {nights} night{nights > 1 ? "s" : ""}
              </small>
            )}
          </div>

          <button
            className="btn btn-gold btn-lg"
            onClick={openBookingForm}
            disabled={booking || noRoomFits || rooms.length === 0}
          >
            {booking ? "Booking..." : "Book Now"}
          </button>
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
