import React, { useEffect, useState } from 'react';
import { formatPrice } from "../utils/formatPrice";
import { nightsBetween } from "../utils/stay";
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import StripeContainer from '../components/StripeContainer';
import HoldNotice from '../components/HoldNotice';
import useVoicePageContext from '../hooks/useVoicePageContext';
import { useVoice } from '../context/VoiceContext';
import PageHeader from '../components/PageHeader';
import { CardIcon, CheckIcon, ShieldIcon } from '../components/Icons';

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
            <div className="container py-5 text-center text-secondary">
                <div className="spinner-border text-warning mb-3" role="status" />
                <p>Loading your booking…</p>
            </div>
        );
    }

    const nights = nightsBetween(booking.checkInDate, booking.checkOutDate);
    const isPaid = booking.paymentStatus === "Paid";

    const cancelled = booking.bookingStatus === "Cancelled";

    const row = (label, value) => (
        <div className="d-flex justify-content-between gap-3 py-2 border-top small">
            <span className="text-secondary">{label}</span>
            <span className="fw-semibold text-end">{value}</span>
        </div>
    );

    return (
        <div>
            <PageHeader
                eyebrow={`Booking #${booking.id}`}
                title={isPaid ? "You're all set" : cancelled ? "Booking cancelled" : "Complete your booking"}
                subtitle={isPaid ? "Your booking is paid and confirmed." : "Card details are typed here and never spoken."}
                image={booking.hotelImage}
                overlap
            />

            <div className="container position-relative pb-5" style={{ marginTop: -56 }}>
                <div className="row g-4 justify-content-center">
                    <div className="col-lg-5 order-lg-2">
                        <div className="card border-0 rounded-4 shadow-sm overflow-hidden">
                            {booking.hotelImage && (
                                <img src={booking.hotelImage} alt="" className="w-100" style={{ height: 160, objectFit: "cover" }} />
                            )}
                            <div className="p-4">
                                <h5 className="fw-bold mb-3">{booking.hotelName}</h5>
                                {booking.RoomType && row("Room", `${booking.RoomType.name} (sleeps ${booking.RoomType.capacity})`)}
                                {nights > 0 && row("Dates", `${booking.checkInDate} → ${booking.checkOutDate}`)}
                                {nights > 0 && row("Stay", `${nights} night${nights > 1 ? "s" : ""}, ${booking.guests} guest${booking.guests > 1 ? "s" : ""}`)}
                                <div className="d-flex justify-content-between align-items-center pt-3 mt-1 border-top">
                                    <span className="fw-semibold">Total</span>
                                    <span className="fw-bold fs-4">{formatPrice(booking.amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-6 order-lg-1">
                        <div className="card border-0 rounded-4 shadow-lg p-4">
                            {!isPaid && !cancelled && <HoldNotice holdExpiresAt={booking.holdExpiresAt} />}

                            {showItem ? (
                                <>
                                    <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                        <CardIcon size={20} /> Card details
                                    </h5>
                                    <StripeContainer
                                        bookingId={bookingId}
                                        // Paid: stop the hold countdown and tell the voice assistant.
                                        onPaid={(paid) => setBooking((current) => ({ ...current, ...paid, paymentStatus: "Paid" }))}
                                    />
                                </>
                            ) : isPaid ? (
                                <div className="text-center py-3">
                                    <div
                                        className="rounded-circle bg-success bg-opacity-10 text-success d-inline-flex align-items-center justify-content-center mb-3"
                                        style={{ width: 64, height: 64 }}
                                    >
                                        <CheckIcon size={30} />
                                    </div>
                                    <h5 className="fw-bold">This booking is already paid</h5>
                                    <Link to="/my-bookings" className="btn btn-dark rounded-pill px-4 mt-2">View my bookings</Link>
                                </div>
                            ) : cancelled ? (
                                <div className="text-center py-3">
                                    <h5 className="fw-bold">This booking was cancelled</h5>
                                    <p className="text-secondary">The room was released.</p>
                                    <Link to={`/hotels/${booking.hotelId}`} className="btn btn-accent rounded-pill px-4">Book this hotel again</Link>
                                </div>
                            ) : (
                                <>
                                    <h5 className="fw-bold mb-2">Ready to pay?</h5>
                                    <p className="text-secondary small mb-4">
                                        You'll enter your card on the next step. Payments are processed securely by Stripe.
                                    </p>

                                    <button
                                        className="btn btn-accent btn-lg rounded-pill w-100 d-inline-flex align-items-center justify-content-center gap-2"
                                        onClick={() => setShowItem(true)}
                                    >
                                        <CardIcon size={20} /> Pay {formatPrice(booking.amount)}
                                    </button>

                                    {confirmingCancel ? (
                                        <div className="mt-3 p-3 rounded-3 border border-warning bg-warning bg-opacity-10 small">
                                            <p className="mb-2 fw-semibold">Cancel this booking and release the room?</p>
                                            <div className="d-flex gap-2">
                                                <button className="btn btn-sm btn-danger rounded-pill px-3" onClick={cancelBooking} disabled={cancelling}>
                                                    {cancelling ? "Cancelling…" : "Yes, cancel"}
                                                </button>
                                                <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => setConfirmingCancel(false)} disabled={cancelling}>
                                                    Keep it
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            className="btn btn-link w-100 mt-2 text-decoration-none text-secondary"
                                            onClick={() => setConfirmingCancel(true)}
                                        >
                                            Cancel booking and go back
                                        </button>
                                    )}
                                </>
                            )}

                            <div className="d-flex align-items-center justify-content-center gap-2 text-secondary small mt-4 pt-3 border-top">
                                <ShieldIcon size={16} /> Secure checkout with Stripe
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Payment;
