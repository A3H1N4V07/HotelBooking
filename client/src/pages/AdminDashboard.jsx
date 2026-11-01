import React, { useEffect, useState } from "react";
import { formatPrice } from "../utils/formatPrice";
import { Link } from "react-router-dom";
import api from "../api";

const HANDLED_LABELS = {
    local: "Understood locally",
    ai: "Understood by AI",
    missed: "Not understood",
    offline: "AI unavailable",
};

const percent = (share) => `${Math.round(share * 100)}%`;

// How the voice assistant handled phrases over the last week.
function VoiceUsage({ voice }) {
    const row = (key) => voice.byPath.find((p) => p.handledBy === key);

    return (
        <div className="card border-0 shadow-sm p-3 mt-4">
            <h4 className="mb-1">Voice Assistant (last {voice.days} days)</h4>
            <p className="text-muted small mb-3">
                {voice.total} phrases. Local rules are free and instant; the AI is only asked when they can't tell.
            </p>

            {voice.total === 0 ? (
                <p className="text-muted mb-0">No voice usage yet.</p>
            ) : (
                <>
                    <div className="row g-3 mb-3">
                        {Object.keys(HANDLED_LABELS).map((key) => (
                            <div className="col-md-3 col-sm-6" key={key}>
                                <div className="border rounded text-center p-2 h-100">
                                    <h6 className="text-muted small mb-1">{HANDLED_LABELS[key]}</h6>
                                    <div className="fw-bold fs-4 text-gold">{percent(row(key)?.share || 0)}</div>
                                    <div className="small text-muted">
                                        {row(key)?.count || 0} phrases
                                        {row(key)?.avgMs != null && key !== "offline" && ` · avg ${row(key).avgMs} ms`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h6>Phrases the local rules missed most</h6>
                    {voice.topPhrases.length > 0 ? (
                        <table className="table table-sm align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Phrase</th>
                                    <th>Result</th>
                                    <th>Times</th>
                                </tr>
                            </thead>
                            <tbody>
                                {voice.topPhrases.map((p) => (
                                    <tr key={`${p.phrase}-${p.handledBy}`}>
                                        <td>{p.phrase}</td>
                                        <td>{HANDLED_LABELS[p.handledBy]}</td>
                                        <td>{p.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-muted mb-0">None: every phrase was understood locally.</p>
                    )}
                </>
            )}
        </div>
    );
}

function AdminDashboard() {

    const [stats, setStats] = useState(null);
    const [voice, setVoice] = useState(null);

    useEffect(() => {
        api
            .get("/admin/stats")
            .then((response) => {
                setStats(response.data);
            })
            .catch((error) => {
                console.error(error);
            });

        api
            .get("/admin/voice-stats", { params: { days: 7 } })
            .then((response) => setVoice(response.data))
            .catch((error) => console.error(error));
    }, []);

    if (!stats) {
        return (
            <div className="container py-5 text-center">
                <h2>Loading Dashboard...</h2>
            </div>
        );
    }

    const statCards = [
        { label: "Total Users", value: stats.totalUsers },
        { label: "Total Bookings", value: stats.totalBookings },
        { label: "Total Payments", value: stats.totalPayments },
        { label: "Total Revenue", value: formatPrice(stats.totalRevenue) },
    ];

    return (
        <div>
            <div className="gradient-navy text-white py-4">
                <div className="container d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h1 className="fw-bold mb-0">Admin Dashboard</h1>

                    <Link to="/admin/hotels">
                        <button className="btn btn-gold">Manage Hotels</button>
                    </Link>
                </div>
            </div>

            <div className="container py-4">
                <div className="row g-3 mb-4">
                    {statCards.map((card) => (
                        <div className="col-md-3 col-sm-6" key={card.label}>
                            <div className="card border-0 shadow-sm text-center p-3 h-100 hover-lift">
                                <h6 className="text-muted">{card.label}</h6>
                                <h2 className="fw-bold mb-0 text-gold">{card.value}</h2>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="row g-4">
                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm p-3">
                            <h4 className="mb-3">Recent Bookings</h4>

                            {stats.recentBookings?.length > 0 ? (
                                <table className="table table-sm align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Hotel</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recentBookings.map((booking) => (
                                            <tr key={booking.id}>
                                                <td>{booking.id}</td>
                                                <td>{booking.hotelName}</td>
                                                <td>{formatPrice(booking.amount)}</td>
                                                <td>{booking.bookingStatus}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-muted mb-0">No bookings yet.</p>
                            )}
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm p-3">
                            <h4 className="mb-3">Recent Payments</h4>

                            {stats.recentPayments?.length > 0 ? (
                                <table className="table table-sm align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recentPayments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td>{payment.id}</td>
                                                <td>{formatPrice(payment.amount)}</td>
                                                <td>{payment.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-muted mb-0">No payments yet.</p>
                            )}
                        </div>
                    </div>
                </div>

                {voice && <VoiceUsage voice={voice} />}
            </div>
        </div>
    );
}

export default AdminDashboard;