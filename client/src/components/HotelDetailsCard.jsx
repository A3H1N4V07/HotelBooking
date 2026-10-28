import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import BookingFormModal from "./BookingFormModal";
import useVoicePageContext from "../hooks/useVoicePageContext";

function HotelDetailsCard({
  id,
  name,
  address,
  phone,
  category,
  price,
  num_reviews,
  timezone,
  available,
  about,
  img,
}) {
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

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
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

      const numericPrice = parseFloat(String(price).replace(/[^\d]/g, "")) || 50;

      const response = await api.post("/bookings/create", {
        hotelId: id,
        hotelName: name,
        hotelImage: img,
        location: address || "Location Not Available",
        checkInDate,
        checkOutDate,
        guests,
        guestName: String(guestName).trim(),
        guestPhone: String(guestPhone).trim(),
        amount: numericPrice,
      });

      const bookingId = response.data.booking.id;
      navigate(`/payment/${bookingId}`);
    } catch (error) {
      console.error(error);
      setFormError(
        error.response?.data?.message || "Booking creation failed. Please try again."
      );
      setShowForm(true);
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

  return (
    <div className="container py-4">
      <div className="card border-0 shadow-lg hover-lift">
        <div className="row g-0">
          <div className="col-md-5">
            <img
              src={img}
              alt={name}
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
                <h2 className="fw-bold mb-1">{name}</h2>
                <span
                  className="badge"
                  style={{
                    background: "linear-gradient(135deg, #F6B73C, #d99a1f)",
                    color: "#0B1F3A",
                  }}
                >
                  {category}
                </span>
              </div>

              <p className="text-muted mb-2">{address}</p>

              <p className="mb-2">
                ⭐ {num_reviews} reviews &nbsp;|&nbsp; 📍 {timezone}
              </p>

              <p className="mb-2">📞 {phone}</p>

              <p className="text-secondary">{about}</p>

              <div className="mt-auto d-flex justify-content-between align-items-center">
                <h3 className="fw-bold mb-0">
                  {price} <small className="text-muted fs-6">/ night</small>
                </h3>

                <button
                  className="btn btn-gold btn-lg"
                  onClick={openBookingForm}
                  disabled={!available || booking}
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
          hotelName={name}
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