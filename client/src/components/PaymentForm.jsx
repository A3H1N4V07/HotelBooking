import React, { useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import api from "../api";
import SuccessComponent from "./SuccessComponent";

const CARD_OPTIONS = {
  style: {
    base: {
      color: "#212529",
      fontWeight: 500,
      fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
      fontSize: "16px",
      "::placeholder": { color: "#6c757d" },
    },
    invalid: {
      color: "#dc3545",
    },
  },
};

function PaymentForm({ bookingId, onPaid }) {
  const [success, setSuccesss] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setProcessing(true);

    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: elements.getElement(CardElement),
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      return;
    }

    try {
      const { id } = paymentMethod;
      const response = await api.post("/payment", { bookingId, id });

      if (response.data.success) {
        setSuccesss(true);
        onPaid?.(response.data.booking);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {!success ? (
        <form onSubmit={handleSubmit}>
          <div className="border rounded p-3 mb-3">
            <CardElement options={CARD_OPTIONS} />
          </div>

          {error && <p className="text-danger small">{error}</p>}

          <button type="submit" className="btn btn-dark w-100" disabled={!stripe || processing}>
            {processing ? "Processing..." : "Pay"}
          </button>
        </form>
      ) : (
        <SuccessComponent />
      )}
    </div>
  );
}

export default PaymentForm;