import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import StripeContainer from '../components/StripeContainer';

function Payment() {

    const { bookingId } = useParams();

    const [showItem, setShowItem] = useState(false);
    const [booking, setBooking] = useState(null);

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

    return (
        <div
            className="d-flex align-items-center justify-content-center py-5 gradient-navy"
            style={{ minHeight: "80vh" }}
        >
            <div className="glass-card shadow-lg p-4" style={{ width: "420px" }}>
                <h3 className="fw-bold text-center mb-3">Complete Your Booking</h3>

                {
                    showItem ? (
                        <StripeContainer bookingId={bookingId} />
                    ) : (
                        <>
                            <p className="mb-1"><strong>Booking #:</strong> {booking.id}</p>
                            <p className="mb-1"><strong>Hotel:</strong> {booking.hotelName}</p>
                            <p className="mb-3"><strong>Amount:</strong> ${booking.amount}</p>

                            <button
                                className="btn btn-gold w-100"
                                onClick={() => setShowItem(true)}
                            >
                                Pay Now
                            </button>
                        </>
                    )
                }
            </div>
        </div>
    );
}

export default Payment;