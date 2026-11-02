import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MapPinIcon, PhoneIcon, SendIcon } from "./Icons";

const LINK = "text-white-50 text-decoration-none";

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
    <footer id="footer" className="gradient-dark text-white pt-5 pb-4 mt-5">
      <div className="container">
        <div className="row g-4 pb-4">
          <div className="col-lg-4">
            <h4 className="fw-bold mb-3">
              Echo<span className="text-accent">Stay</span>
            </h4>
            <p className="text-white-50 small mb-0" style={{ maxWidth: 320 }}>
              Hotel booking you can talk to. Search, compare and book by voice, or the usual way.
            </p>
          </div>

          <div className="col-6 col-lg-2">
            <h6 className="fw-bold mb-3 text-uppercase small text-accent">Explore</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 mb-0">
              <li><Link className={LINK} to="/">Home</Link></li>
              <li><Link className={LINK} to="/hotels">Hotels</Link></li>
              <li><Link className={LINK} to="/#destinations">Destinations</Link></li>
              <li><Link className={LINK} to="/#why-us">About</Link></li>
            </ul>
          </div>

          <div className="col-6 col-lg-3">
            <h6 className="fw-bold mb-3 text-uppercase small text-accent">Contact</h6>
            <ul className="list-unstyled small text-white-50 d-flex flex-column gap-2 mb-0">
              <li>support@echostay.com</li>
              <li className="d-flex align-items-center gap-2"><PhoneIcon size={14} /> +91 98765 43210</li>
              <li className="d-flex align-items-center gap-2"><MapPinIcon size={14} /> Bengaluru, India</li>
            </ul>
          </div>

          <div className="col-lg-3">
            <h6 className="fw-bold mb-3 text-uppercase small text-accent">Newsletter</h6>

            {subscribed ? (
              <p className="small mb-0">Thanks for subscribing!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="bg-white d-flex gap-2 p-1 rounded-pill shadow-sm">
                <input
                  type="email"
                  className="form-control form-control-sm bg-transparent border-0 shadow-none ps-3"
                  placeholder="Your email"
                  aria-label="Email for the newsletter"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" className="btn btn-accent btn-sm rounded-pill px-3" aria-label="Subscribe">
                  <SendIcon size={16} />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="border-top border-light border-opacity-10 pt-4 d-flex flex-wrap justify-content-between gap-2 small text-white-50">
          <span>© {new Date().getFullYear()} EchoStay. All rights reserved.</span>
          <span>Payments secured by Stripe</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
