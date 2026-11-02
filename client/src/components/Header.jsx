import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import { clearSession, getSession } from "../auth";
import { useVoice } from "../context/VoiceContext";
import { ChartIcon, CloseIcon, LogoutIcon, MenuIcon, UserIcon, WalletIcon } from "./Icons";

// Height the floating header takes at the top of the page. Full-bleed page
// tops pull themselves up by this much so the glass header sits over them.
export const NAV_HEIGHT = 80;

const LINKS = [
    { to: "/", label: "Home" },
    { to: "/#destinations", label: "Explore" },
    { to: "/hotels", label: "Hotels" },
    { to: "/my-bookings", label: "My Bookings", private: true },
    { to: "/#why-us", label: "About" },
    { to: "/#footer", label: "Contact" },
];

function Header() {

    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef(null);
    const { resetDraft } = useVoice();

    const [token, setToken] = useState(() => getSession()?.token ?? null);
    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem("user") || "null")
    );

    const [showProfile, setShowProfile] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        // getSession() also clears an expired token, so the header stops
        // showing a logged-in state once the 7-day login runs out.
        setToken(getSession()?.token ?? null);
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
        setMenuOpen(false);
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
        resetDraft();
        setToken(null);
        setUser(null);
        setShowProfile(false);
        navigate("/");
    };

    const here = location.pathname + location.hash;
    const isActive = (to) => (to === "/" ? here === "/" : here === to);
    const links = LINKS.filter((link) => !link.private || token);

    const linkClass = (to) =>
        `nav-link px-3 py-2 rounded-pill ${isActive(to) ? "text-accent fw-semibold bg-white bg-opacity-10" : "text-white text-opacity-75"}`;

    return (
        <header className="sticky-top px-2 px-md-3 pt-2 pt-md-3" style={{ zIndex: 1030, height: NAV_HEIGHT, pointerEvents: "none" }}>
            <nav
                className="glass-dark shadow-lg container-xl d-flex align-items-center justify-content-between px-3 px-lg-4 position-relative"
                style={{ height: 60, pointerEvents: "auto" }}
            >
                <Link className="navbar-brand fw-bold text-white fs-4 me-0" to="/">
                    Echo<span className="text-accent">Stay</span>
                </Link>

                <div className="d-none d-lg-flex align-items-center gap-1">
                    {links.map((link) => (
                        <Link key={link.to} className={linkClass(link.to)} to={link.to}>
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="d-flex align-items-center gap-2">
                    {!token ? (
                        <>
                            <Link to="/login" className="btn btn-outline-glass btn-sm rounded-pill px-3 d-none d-sm-inline-block">
                                Sign In
                            </Link>
                            <Link to="/register" className="btn btn-accent btn-sm rounded-pill px-3">
                                Sign Up
                            </Link>
                        </>
                    ) : (
                        <div className="position-relative" ref={dropdownRef}>
                            <button
                                className="btn btn-accent rounded-circle p-0 fw-bold"
                                style={{ width: 40, height: 40 }}
                                onClick={openProfile}
                                aria-label="Account menu"
                                aria-expanded={showProfile}
                            >
                                {user?.firstName?.[0]?.toUpperCase() || "U"}
                            </button>

                            {showProfile && (
                                <div
                                    className="bg-white rounded-4 shadow-lg p-2 position-absolute end-0 mt-3"
                                    style={{ width: 260, zIndex: 1050 }}
                                >
                                    <div className="d-flex align-items-center gap-3 p-2 mb-1">
                                        <div
                                            className="gradient-dark text-white rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                            style={{ width: 42, height: 42 }}
                                        >
                                            {user?.firstName?.[0]?.toUpperCase() || "U"}
                                        </div>
                                        <div className="text-truncate">
                                            <div className="fw-semibold text-truncate">
                                                {profile?.firstName || user?.firstName} {profile?.lastName || ""}
                                            </div>
                                            {profile?.EmailAddress && (
                                                <div className="text-muted small text-truncate">{profile.EmailAddress}</div>
                                            )}
                                            <span className="badge rounded-pill text-bg-light border text-capitalize mt-1">
                                                {user?.role || "user"}
                                            </span>
                                        </div>
                                    </div>

                                    <hr className="my-1" />

                                    <Link
                                        to="/my-bookings"
                                        className="btn btn-light w-100 text-start d-flex align-items-center gap-2 border-0 bg-transparent"
                                        onClick={() => setShowProfile(false)}
                                    >
                                        <WalletIcon size={18} /> My Bookings
                                    </Link>

                                    {user?.role === "admin" && (
                                        <Link
                                            to="/admin"
                                            className="btn btn-light w-100 text-start d-flex align-items-center gap-2 border-0 bg-transparent"
                                            onClick={() => setShowProfile(false)}
                                        >
                                            <ChartIcon size={18} /> Admin Dashboard
                                        </Link>
                                    )}

                                    <button
                                        className="btn btn-light w-100 text-start d-flex align-items-center gap-2 border-0 bg-transparent text-danger"
                                        onClick={handleLogout}
                                    >
                                        <LogoutIcon size={18} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        className="btn btn-outline-glass rounded-circle p-0 d-lg-none"
                        style={{ width: 40, height: 40 }}
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={menuOpen}
                    >
                        {menuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
                    </button>
                </div>

                {menuOpen && (
                    <div className="gradient-dark rounded-4 shadow-lg position-absolute start-0 end-0 p-2 d-lg-none" style={{ top: 68 }}>
                        {links.map((link) => (
                            <Link key={link.to} className={`${linkClass(link.to)} d-block`} to={link.to}>
                                {link.label}
                            </Link>
                        ))}
                        {!token && (
                            <Link to="/login" className="nav-link px-3 py-2 text-white d-flex align-items-center gap-2 d-sm-none">
                                <UserIcon size={18} /> Sign In
                            </Link>
                        )}
                    </div>
                )}
            </nav>
        </header>
    );
}

export default Header;
