import React, { useEffect, useState } from 'react';
import { formatPrice } from "../utils/formatPrice";
import { nightsBetween } from "../utils/stay";
import { useParams } from 'react-router-dom';
import api from '../api';
import StripeContainer from '../components/StripeContainer';
import HoldNotice from '../components/HoldNotice';
import useVoicePageContext from '../hooks/useVoicePageContext';
import { useVoice } from '../context/VoiceContext';

function Payment() {

    const { bookingId } = useParams();

    const [showItem, setShowItem] = useState(false);
    const [booking, setBooking] = useState(null);
    const { promptIfActive } = useVoice();

    // Voice: explains that the card is entered by hand (never spoken).
    useVoicePageContext({ describe: () => ({ page: "payment", paid: booking?.paymentStatus === "Paid" }) });

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

                {!isPaid && <HoldNotice holdExpiresAt={booking.holdExpiresAt} />}

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
                            ) : (
                                <button
                                    className="btn btn-gold w-100"
                                    onClick={() => setShowItem(true)}
                                >
                                    Pay Now
                                </button>
                            )}
                        </>
                    )
                }
            </div>
        </div>
    );
}

export default Payment;
