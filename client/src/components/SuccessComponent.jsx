import React from 'react';
import { Link } from 'react-router-dom';

function SuccessComponent() {
  return (
    <div className="text-center py-4">
      <div
        className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
        style={{ width: '72px', height: '72px', fontSize: '36px' }}
      >
        ✅
      </div>

      <h4 className="fw-bold mb-2">Payment Successful!</h4>
      <p className="text-muted mb-4">
        Your booking is confirmed. A confirmation email is on its way.
      </p>

      <Link to="/my-bookings">
        <button className="btn btn-dark w-100">View My Bookings</button>
      </Link>
    </div>
  );
}

export default SuccessComponent;