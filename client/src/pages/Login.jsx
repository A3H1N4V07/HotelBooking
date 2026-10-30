import React, { useState, useEffect } from "react";
import api from "../api";
import useVoicePageContext from "../hooks/useVoicePageContext";
import { useVoice } from "../context/VoiceContext";
import { useNavigate, useLocation, Link } from "react-router-dom";

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
        <div
            className="d-flex align-items-center justify-content-center"
            style={{ minHeight: "80vh", background: "#f4f6fb" }}
        >
            <div className="card shadow-lg border-0 p-4" style={{ width: "380px" }}>
                <h2 className="fw-bold text-center mb-4">Welcome Back</h2>

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
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-control"
                            placeholder="you@example.com"
                            value={EmailAddress}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-dark w-100"
                        disabled={submitting}
                    >
                        {submitting ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="text-center text-muted mt-3 mb-0">
                    New here?{" "}
                    <Link to="/register">Create an account</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;