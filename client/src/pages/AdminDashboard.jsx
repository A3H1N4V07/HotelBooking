import React, { useEffect, useState } from "react";
import { formatPrice } from "../utils/formatPrice";
import { Link } from "react-router-dom";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { BuildingIcon, CardIcon, ChartIcon, UsersIcon, WalletIcon } from "../components/Icons";

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
        <div className="card border-0 rounded-4 shadow-sm p-4 mt-4">
            <h5 className="fw-bold mb-1">Voice assistant (last {voice.days} days)</h5>
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
                                <div className="rounded-3 bg-light text-center p-3 h-100">
                                    <h6 className="text-muted small mb-1">{HANDLED_LABELS[key]}</h6>
                                    <div className="fw-bold fs-3 text-warning">{percent(row(key)?.share || 0)}</div>
                                    <div className="small text-muted">
                                        {row(key)?.count || 0} phrases
                                        {row(key)?.avgMs != null && key !== "offline" && ` · avg ${row(key).avgMs} ms`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h6 className="fw-bold">Phrases the local rules missed most</h6>
                    {voice.topPhrases.length > 0 ? (
                        <table className="table table-hover align-middle mb-0 small">
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
            <div className="container py-5 text-center text-secondary">
                <div className="spinner-border text-warning mb-3" role="status" />
                <p>Loading dashboard…</p>
            </div>
        );
    }

    const statCards = [
        { label: "Total Users", value: stats.totalUsers, icon: <UsersIcon size={22} /> },
        { label: "Total Bookings", value: stats.totalBookings, icon: <BuildingIcon size={22} /> },
        { label: "Total Payments", value: stats.totalPayments, icon: <CardIcon size={22} /> },
        { label: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: <WalletIcon size={22} /> },
    ];

    return (
        <div>
            <PageHeader eyebrow="Admin" title="Dashboard" subtitle="Bookings, payments and how the voice assistant is doing." overlap>
                <Link to="/admin/hotels" className="btn btn-accent rounded-pill px-4 d-inline-flex align-items-center gap-2">
                    <ChartIcon size={18} /> Manage Hotels
                </Link>
            </PageHeader>

            <div className="container position-relative pb-5" style={{ marginTop: -56 }}>
                <div className="row g-3 mb-4">
                    {statCards.map((card) => (
                        <div className="col-lg-3 col-sm-6" key={card.label}>
                            <div className="card border-0 rounded-4 shadow-sm p-4 h-100 hover-lift d-flex flex-row align-items-center gap-3">
                                <div className="rounded-3 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 48, height: 48 }}>
                                    {card.icon}
                                </div>
                                <div>
                                    <div className="text-secondary small">{card.label}</div>
                                    <div className="fw-bold fs-4">{card.value}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="row g-4">
                    <div className="col-md-6">
                        <div className="card border-0 rounded-4 shadow-sm p-4 h-100">
                            <h5 className="fw-bold mb-3">Recent bookings</h5>

                            {stats.recentBookings?.length > 0 ? (
                                <table className="table table-hover align-middle mb-0 small">
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
                        <div className="card border-0 rounded-4 shadow-sm p-4 h-100">
                            <h5 className="fw-bold mb-3">Recent payments</h5>

                            {stats.recentPayments?.length > 0 ? (
                                <table className="table table-hover align-middle mb-0 small">
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