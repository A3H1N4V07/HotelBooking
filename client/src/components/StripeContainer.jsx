import React from 'react'
import {Elements} from "@stripe/react-stripe-js"
import { loadStripe } from '@stripe/stripe-js';
import PaymentForm from './PaymentForm';

const stripeTestPromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);


// onPaid(booking) runs after the server confirms the payment.
function StripeContainer({ bookingId, onPaid }) {
    return (
        <Elements stripe={stripeTestPromise}>
            <PaymentForm bookingId={bookingId} onPaid={onPaid} />
        </Elements>
    )
}

export default StripeContainer;