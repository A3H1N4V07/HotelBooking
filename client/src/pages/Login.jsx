import React, { useState, useEffect } from "react";
import api from "../api";
import useVoicePageContext from "../hooks/useVoicePageContext";
import { useVoice } from "../context/VoiceContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

function Login() {

    const navigate = useNavigate();
    const location = useLocation();

    const [EmailAddress, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Voice: passwords are typed, never spoken; the assistant just explains.
    const { promptIfActive } = useVoice();
    useVoicePageContext({ describe: () => ({ page: "login" }) });
    useEffect(() => {
        promptIfActive();
    }, [promptIfActive]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            setSubmitting(true);

            const response = await api.post("/users/login", {
                EmailAddress,
                password,
            });

            localStorage.setItem("token", response.data.token);
            localStorage.setItem("user", JSON.stringify(response.data.user));

            // Back to the hotel (or page) that sent us here, if any.
            navigate(location.state?.from || "/");

        } catch (error) {
            console.error(error);
            setError(error.response?.data?.message || "Login failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout title="Welcome back" subtitle="Sign in to see and pay for your bookings.">

                {location.state?.registered && (
                    <div className="alert alert-success py-2">
                        Account created successfully. Please log in.
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger py-2">{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary">Email</label>
                        <input
                            type="email"
                            className="form-control form-control-lg fs-6 rounded-3"
                            placeholder="you@example.com"
                            value={EmailAddress}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary">Password</label>
                        <input
                            type="password"
                            className="form-control form-control-lg fs-6 rounded-3"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-accent btn-lg rounded-pill w-100 fs-6 mt-2"
                        disabled={submitting}
                    >
                        {submitting ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="text-center text-secondary mt-4 mb-0">
                    New here?{" "}
                    <Link to="/register" className="fw-semibold">Create an account</Link>
                </p>
        </AuthLayout>
    );
}

export default Login;