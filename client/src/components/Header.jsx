import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import { clearSession, getSession } from "../auth";

function Header() {

    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef(null);

    const [token, setToken] = useState(() => getSession()?.token ?? null);
    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem("user") || "null")
    );

    const [showProfile, setShowProfile] = useState(false);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        // getSession() also clears an expired token, so the header stops
        // showing a logged-in state once the 7-day login runs out.
        setToken(getSession()?.token ?? null);
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
    }, [location]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowProfile(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const openProfile = async () => {
        setShowProfile((prev) => !prev);

        if (!profile && user?.id) {
            try {
                const response = await api.get(`/users/${user.id}`);
                setProfile(response.data.user);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleLogout = () => {
        clearSession();
        setToken(null);
        setUser(null);
        setShowProfile(false);
        navigate("/");
    };

    return (
        <nav
            className="navbar navbar-expand-lg sticky-top px-4 py-3 gradient-navy"
            style={{ zIndex: 1030 }}
        >
            <div className="container-fluid">
                <Link className="navbar-brand fw-bold text-white fs-4" to="/">
                    Echo<span className="text-gold">Stay</span>
                </Link>

                <div className="d-none d-lg-flex align-items-center gap-4 mx-auto">
                    <Link className="nav-link text-white" to="/">Home</Link>
                    <Link className="nav-link text-white" to="/#destinations">Explore</Link>
                    <Link className="nav-link text-white" to="/hotels">Hotels</Link>
                    {token && (
                        <Link className="nav-link text-white" to="/my-bookings">My Bookings</Link>
                    )}
                    <Link className="nav-link text-white" to="/#why-us">About</Link>
                    <Link className="nav-link text-white" to="/#footer">Contact</Link>
                </div>

                {!token ? (
                    <div className="d-flex gap-2">
                        <Link to="/login">
                            <button className="btn btn-outline-glass btn-sm">Sign In</button>
                        </Link>
                        <Link to="/register">
                            <button className="btn btn-gold btn-sm">Sign Up</button>
                        </Link>
                    </div>
                ) : (
                    <div className="position-relative" ref={dropdownRef}>
                        <button
                            className="btn btn-outline-glass rounded-circle"
                            style={{ width: "42px", height: "42px" }}
                            onClick={openProfile}
                        >
                            {user?.firstName?.[0]?.toUpperCase() || "U"}
                        </button>

                        {showProfile && (
                            <div
                                className="glass-card shadow-lg p-3 position-absolute end-0 mt-2"
                                style={{ width: "240px", zIndex: 1050 }}
                            >
                                <p className="fw-bold mb-1">
                                    {profile?.firstName || user?.firstName} {profile?.lastName || ""}
                                </p>

                                {profile?.EmailAddress && (
                                    <p className="text-muted small mb-2">{profile.EmailAddress}</p>
                                )}

                                <p className="text-muted small mb-3 text-capitalize">
                                    Role: {user?.role || "user"}
                                </p>

                                <Link
                                    to="/my-bookings"
                                    className="btn btn-sm btn-outline-dark w-100 mb-2"
                                    onClick={() => setShowProfile(false)}
                                >
                                    My Bookings
                                </Link>

                                {user?.role === "admin" && (
                                    <Link
                                        to="/admin"
                                        className="btn btn-sm btn-outline-dark w-100 mb-2"
                                        onClick={() => setShowProfile(false)}
                                    >
                                        Admin Dashboard
                                    </Link>
                                )}

                                <button
                                    className="btn btn-sm btn-dark w-100"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Header;