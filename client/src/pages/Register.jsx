import React, { useState } from "react";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";

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

                age: "0",
                Origin: "NA",
                Destination: "NA",

                travelDate: "NA",
                checkInDate: "NA",
                checkOutDate: "NA",

                NoOfGuests: "0",

                PhoneNo: "9876543210",

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
        <div
            className="d-flex align-items-center justify-content-center"
            style={{ minHeight: "80vh", background: "#f4f6fb" }}
        >
            <div className="card shadow-lg border-0 p-4" style={{ width: "400px" }}>
                <h2 className="fw-bold text-center mb-4">Create Account</h2>

                {error && (
                    <div className="alert alert-danger py-2">{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">First Name</label>
                        <input
                            type="text"
                            name="firstName"
                            className="form-control"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Last Name</label>
                        <input
                            type="text"
                            name="lastName"
                            className="form-control"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            name="EmailAddress"
                            className="form-control"
                            value={formData.EmailAddress}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="form-control"
                            value={formData.password}
                            onChange={handleChange}
                            minLength={8}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-dark w-100"
                        disabled={submitting}
                    >
                        {submitting ? "Creating account..." : "Register"}
                    </button>
                </form>

                <p className="text-center text-muted mt-3 mb-0">
                    Already have an account?{" "}
                    <Link to="/">Login</Link>
                </p>
            </div>
        </div>
    );
}

export default Register;