import React from 'react'
import {Elements} from "@stripe/react-stripe-js"
import { loadStripe } from '@stripe/stripe-js';
import PaymentForm from './PaymentForm';

const stripeTestPromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);


function StripeContainer({ bookingId }) {
    return (
        <Elements stripe={stripeTestPromise}>
            <PaymentForm bookingId={bookingId} />
        </Elements>
    )
}

export default StripeContainer;