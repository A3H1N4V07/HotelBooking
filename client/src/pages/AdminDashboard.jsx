import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function AdminDashboard() {

    const [stats, setStats] = useState(null);

    useEffect(() => {
        api
            .get("/admin/stats")
            .then((response) => {
                setStats(response.data);
            })
            .catch((error) => {
                console.error(error);
            });
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
        { label: "Total Revenue", value: `$${stats.totalRevenue}` },
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
                                                <td>${booking.amount}</td>
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
                                                <td>${payment.amount}</td>
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
            </div>
        </div>
    );
}

export default AdminDashboard;