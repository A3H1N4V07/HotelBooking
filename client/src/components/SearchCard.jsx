import React from "react";

function SearchCard({
  destination,
  setDestination,
  checkInDate,
  setCheckInDate,
  checkOutDate,
  setCheckOutDate,
  guests,
  setGuests,
  onSubmit,
  onMicClick,
  listening,
  browserSupportsSpeechRecognition,
}) {
  return (
    <div className="container reveal" style={{ marginTop: "-56px", position: "relative", zIndex: 10 }}>
      <div className="glass-card shadow-lg p-4">
        <form onSubmit={onSubmit} className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label text-muted small mb-0">Destination</label>
            <input
              type="text"
              className="form-control border-0 border-bottom rounded-0"
              placeholder="Where are you going?"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted small mb-0">Check in</label>
            <input
              type="date"
              className="form-control border-0 border-bottom rounded-0"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted small mb-0">Check out</label>
            <input
              type="date"
              className="form-control border-0 border-bottom rounded-0"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted small mb-0">Guests</label>
            <input
              type="number"
              min="1"
              className="form-control border-0 border-bottom rounded-0"
              placeholder="Add guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
          </div>

          <div className="col-md-2 d-flex justify-content-end gap-2">
            {browserSupportsSpeechRecognition && (
              <button
                type="button"
                className={`btn rounded-circle ${listening ? "mic-button listening" : "btn-outline-dark"}`}
                style={{ width: "48px", height: "48px" }}
                onClick={onMicClick}
                title="Voice search"
              >
                🎤
              </button>
            )}

            <button
              type="submit"
              className="btn btn-gold rounded-circle"
              style={{ width: "48px", height: "48px" }}
              title="Search"
            >
              🔍
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SearchCard;