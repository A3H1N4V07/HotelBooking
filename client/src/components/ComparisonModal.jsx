import React from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "../utils/formatPrice";
import { formatDistance } from "../utils/stay";

const PLACES = [
  ["beach", "Beach"],
  ["centre", "City centre"],
  ["airport", "Airport"],
];

// Side-by-side comparison asked for by voice ("compare the first two").
// All values come from the database via the server.
function ComparisonModal({ rows, onClose, labels = {} }) {
  const navigate = useNavigate();

  // Amenities any of the hotels has, so differences are visible.
  const amenityCodes = [...new Set(rows.flatMap((r) => r.amenities))];
  const cheapest = Math.min(...rows.map((r) => r.fromPrice));
  const bestRating = Math.max(...rows.map((r) => r.rating));

  const open = (hotelId) => {
    onClose();
    navigate(`/hotels/${hotelId}`);
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(11,31,58,0.6)", zIndex: 1070 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Hotel comparison"
    >
      <div
        className="card border-0 shadow-lg p-4"
        style={{ width: "min(860px, 94vw)", maxHeight: "86vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold mb-0">Compare hotels</h4>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th />
                {rows.map((r) => (
                  <th key={r.hotelId}>{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="small text-muted">From / night</th>
                {rows.map((r) => (
                  <td key={r.hotelId} className={r.fromPrice === cheapest ? "fw-bold text-success" : ""}>
                    {formatPrice(r.fromPrice)}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="small text-muted">Rating</th>
                {rows.map((r) => (
                  <td key={r.hotelId} className={r.rating === bestRating ? "fw-bold text-success" : ""}>⭐ {r.rating}</td>
                ))}
              </tr>
              <tr>
                <th className="small text-muted">Category</th>
                {rows.map((r) => (
                  <td key={r.hotelId}>{r.category}</td>
                ))}
              </tr>
              {PLACES.map(([type, label]) => (
                <tr key={type}>
                  <th className="small text-muted">{label}</th>
                  {rows.map((r) => (
                    <td key={r.hotelId} className="small">
                      {r.distances?.[type]
                        ? `${formatDistance(r.distances[type].km)}${r.sampleLocation ? " (approx.)" : ""}`
                        : "—"}
                    </td>
                  ))}
                </tr>
              ))}
              {amenityCodes.map((code) => (
                <tr key={code}>
                  <th className="small text-muted">{labels[code] || code}</th>
                  {rows.map((r) => (
                    <td key={r.hotelId}>{r.amenities.includes(code) ? "✓" : <span className="text-muted">—</span>}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th className="small text-muted">Rooms</th>
                {rows.map((r) => (
                  <td key={r.hotelId} className="small">
                    {r.rooms.map((room) => `${room.name} (${room.capacity})`).join(", ")}
                  </td>
                ))}
              </tr>
              <tr>
                <th />
                {rows.map((r) => (
                  <td key={r.hotelId}>
                    <button type="button" className="btn btn-sm btn-gold" onClick={() => open(r.hotelId)}>
                      View hotel
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ComparisonModal;
