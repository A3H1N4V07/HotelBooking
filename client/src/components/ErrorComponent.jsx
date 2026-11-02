import React from 'react'
import { Link } from 'react-router-dom'

function ErrorComponent() {
    return (
        <div className="container py-5">
            <div className="card border-0 rounded-4 shadow-sm text-center p-5 mx-auto" style={{ maxWidth: 560 }}>
                <h2 className="fw-bold mb-2">Something went wrong</h2>
                <p className="text-secondary mb-4">
                    We couldn't load this page right now. Please try again in a moment.
                </p>
                <div className="d-flex justify-content-center gap-2">
                    <Link to="/" className="btn btn-dark rounded-pill px-4">Go home</Link>
                    <Link to="/hotels" className="btn btn-accent rounded-pill px-4">Browse hotels</Link>
                </div>
            </div>
        </div>
    )
}

export default ErrorComponent
