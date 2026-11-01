import React, { useEffect, useState } from 'react';
import { formatPrice } from "../utils/formatPrice";
import { nightsBetween } from "../utils/stay";
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import StripeContainer from '../components/StripeContainer';
import HoldNotice from '../components/HoldNotice';
import useVoicePageContext from '../hooks/useVoicePageContext';
import { useVoice } from '../context/VoiceContext';

function Payment() {

    const { bookingId } = useParams();

    const [showItem, setShowItem] = useState(false);
    const [booking, setBooking] = useState(null);
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const { promptIfActive, notify } = useVoice();
    const navigate = useNavigate();

    const canCancel = booking && booking.paymentStatus !== "Paid" && booking.bookingStatus !== "Cancelled";

    // Releases the held room and goes back to the hotel to change the room
    // or dates (the trip details are kept).
    const cancelBooking = async () => {
        setCancelling(true);
        try {
            await api.post(`/bookings/${bookingId}/cancel`);
            notify("Booking cancelled and the room released. You can pick another room or change the dates.");
            navigate(`/hotels/${booking.hotelId}`);
        } catch (error) {
            console.error(error);
            notify(error.response?.data?.message || "Couldn't cancel the booking. Please try again.", "error");
            setCancelling(false);
            setConfirmingCancel(false);
        }
    };

    // Voice: explains that the card is entered by hand (never spoken), and
    // can cancel an unpaid booking.
    useVoicePageContext({
        describe: () => ({ page: "payment", paid: booking?.paymentStatus === "Paid" }),
        ...(canCancel && { cancelBooking }),
    });

    useEffect(() => {
        if (booking) promptIfActive();
    }, [booking, promptIfActive]);

    useEffect(() => {

        api
            .get(`/bookings/details/${bookingId}`)
            .then((response) => {
                setBooking(response.data.booking);
            })
            .catch((error) => {
                console.error(error);
            });

    }, [bookingId]);

    if (!booking) {
        return (
            <div className="container py-5 text-center">
                <h2>Loading Booking...</h2>
            </div>
        );
    }

    const nights = nightsBetween(booking.checkInDate, booking.checkOutDate);
    const isPaid = booking.paymentStatus === "Paid";

    return (
        <div
            className="d-flex align-items-center justify-content-center py-5 gradient-navy"
            style={{ minHeight: "80vh" }}
        >
            <div className="glass-card shadow-lg p-4" style={{ width: "420px" }}>
                <h3 className="fw-bold text-center mb-3">Complete Your Booking</h3>

                {!isPaid && booking.bookingStatus !== "Cancelled" && <HoldNotice holdExpiresAt={booking.holdExpiresAt} />}

                {
                    showItem ? (
                        <StripeContainer
                            bookingId={bookingId}
                            // Paid: stop the hold countdown and tell the voice assistant.
                            onPaid={(paid) => setBooking((current) => ({ ...current, ...paid, paymentStatus: "Paid" }))}
                        />
                    ) : (
                        <>
                            <p className="mb-1"><strong>Booking #:</strong> {booking.id}</p>
                            <p className="mb-1"><strong>Hotel:</strong> {booking.hotelName}</p>
                            {booking.RoomType && (
                                <p className="mb-1"><strong>Room:</strong> {booking.RoomType.name} (sleeps {booking.RoomType.capacity})</p>
                            )}
                            {nights > 0 && (
                                <p className="mb-1">
                                    <strong>Stay:</strong> {booking.checkInDate} → {booking.checkOutDate} ({nights} night{nights > 1 ? "s" : ""}, {booking.guests} guest{booking.guests > 1 ? "s" : ""})
                                </p>
                            )}
                            <p className="mb-3"><strong>Amount:</strong> {formatPrice(booking.amount)}</p>

                            {isPaid ? (
                                <div className="alert alert-success py-2 mb-0">This booking is already paid.</div>
                            ) : booking.bookingStatus === "Cancelled" ? (
                                <div className="alert alert-secondary py-2 mb-0">
                                    This booking was cancelled.{" "}
                                    <Link to={`/hotels/${booking.hotelId}`}>Book this hotel again</Link>
                                </div>
                            ) : (
                                <>
                                    <button
                                        className="btn btn-gold w-100"
                                        onClick={() => setShowItem(true)}
                                    >
                                        Pay Now
                                    </button>

                                    {confirmingCancel ? (
                                        <div className="mt-3 p-2 rounded border border-warning small">
                                            <p className="mb-2">Cancel this booking and release the room?</p>
                                            <div className="d-flex gap-2">
                                                <button className="btn btn-sm btn-outline-danger" onClick={cancelBooking} disabled={cancelling}>
                                                    {cancelling ? "Cancelling…" : "Yes, cancel"}
                                                </button>
                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmingCancel(false)} disabled={cancelling}>
                                                    Keep it
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            className="btn btn-link w-100 mt-2 text-decoration-none"
                                            onClick={() => setConfirmingCancel(true)}
                                        >
                                            Cancel booking and go back
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    )
                }
            </div>
        </div>
    );
}

export default Payment;
