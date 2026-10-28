import React, { useState } from "react";
import { Link } from "react-router-dom";

function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer id="footer" className="gradient-navy text-white pt-5 pb-4 mt-5">
      <div className="container">
        <div className="row g-4">
          <div className="col-md-3">
            <h4 className="fw-bold mb-3">
              Echo<span className="text-gold">Stay</span>
            </h4>
            <p className="text-white-50 small">
              Discover premium hotels with the power of AI & voice.
            </p>
          </div>

          <div className="col-md-3">
            <h6 className="fw-bold mb-3">Quick Links</h6>
            <ul className="list-unstyled small">
              <li className="mb-2"><Link className="text-white-50 text-decoration-none" to="/">Home</Link></li>
              <li className="mb-2"><Link className="text-white-50 text-decoration-none" to="/hotels">Hotels</Link></li>
              <li className="mb-2"><Link className="text-white-50 text-decoration-none" to="/#destinations">Explore</Link></li>
              <li className="mb-2"><Link className="text-white-50 text-decoration-none" to="/#why-us">About</Link></li>
            </ul>
          </div>

          <div className="col-md-3">
            <h6 className="fw-bold mb-3">Contact</h6>
            <ul className="list-unstyled small text-white-50">
              <li className="mb-2">support@echostay.com</li>
              <li className="mb-2">+91 98765 43210</li>
              <li className="mb-2">Bengaluru, India</li>
            </ul>
            <div className="d-flex gap-3 mt-3">
              <a href="#footer" className="text-white-50 fs-5">📘</a>
              <a href="#footer" className="text-white-50 fs-5">📸</a>
              <a href="#footer" className="text-white-50 fs-5">🐦</a>
            </div>
          </div>

          <div className="col-md-3">
            <h6 className="fw-bold mb-3">Newsletter</h6>

            {subscribed ? (
              <p className="text-gold small">Thanks for subscribing!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="d-flex gap-2">
                <input
                  type="email"
                  className="form-control form-control-sm"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" className="btn btn-gold btn-sm">Join</button>
              </form>
            )}
          </div>
        </div>

        <hr className="border-secondary my-4" />

        <p className="text-center text-white-50 small mb-0">
          © {new Date().getFullYear()} EchoStay. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;