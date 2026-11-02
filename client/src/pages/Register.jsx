import React, { useState } from "react";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

function Register() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        EmailAddress: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            setSubmitting(true);

            await api.post("/users/register", {

                firstName: formData.firstName,
                lastName: formData.lastName,

                EmailAddress: formData.EmailAddress,

                password: formData.password

            });

            navigate("/login", { state: { registered: true } });

        } catch (error) {
            console.error(error);
            setError(error.response?.data?.message || "Registration failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout title="Create your account" subtitle="It takes a minute. Then just tell us where you want to go.">

                {error && (
                    <div className="alert alert-danger py-2">{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary">First Name</label>
                        <input
                            type="text"
                            name="firstName"
                            className="form-control form-control-lg fs-6 rounded-3"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary">Last Name</label>
                        <input
                            type="text"
                            name="lastName"
                            className="form-control form-control-lg fs-6 rounded-3"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary">Email</label>
                        <input
                            type="email"
                            name="EmailAddress"
                            className="form-control form-control-lg fs-6 rounded-3"
                            value={formData.EmailAddress}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="form-control form-control-lg fs-6 rounded-3"
                            value={formData.password}
                            onChange={handleChange}
                            minLength={8}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-accent btn-lg rounded-pill w-100 fs-6 mt-2"
                        disabled={submitting}
                    >
                        {submitting ? "Creating account..." : "Register"}
                    </button>
                </form>

                <p className="text-center text-secondary mt-4 mb-0">
                    Already have an account?{" "}
                    <Link to="/login" className="fw-semibold">Sign in</Link>
                </p>
        </AuthLayout>
    );
}

export default Register;