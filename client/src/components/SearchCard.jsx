import React from "react";
import { CalendarIcon, CloseIcon, MapPinIcon, MicIcon, SearchIcon, UsersIcon } from "./Icons";

const FIELD = "form-control form-control-lg border-0 bg-white bg-opacity-75 rounded-3 fs-6";

function Label({ icon, children }) {
  return (
    <label className="form-label small fw-semibold text-secondary mb-1 d-flex align-items-center gap-1">
      {icon} {children}
    </label>
  );
}

// Glass search panel over the bottom of the home hero.
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
  onClear, // shown only when there's something to clear
  onMicClick,
  listening,
  browserSupportsSpeechRecognition,
}) {
  return (
    <div className="glass-card shadow-lg p-3 p-lg-4 text-dark">
      <form onSubmit={onSubmit} className="row g-3 align-items-end">
        <div className="col-lg-4">
          <Label icon={<MapPinIcon size={14} />}>Destination</Label>
          <input
            type="text"
            className={FIELD}
            placeholder="Where are you going?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>

        <div className="col-6 col-lg-2">
          <Label icon={<CalendarIcon size={14} />}>Check in</Label>
          <input
            type="date"
            className={FIELD}
            value={checkInDate}
            onChange={(e) => setCheckInDate(e.target.value)}
          />
        </div>

        <div className="col-6 col-lg-2">
          <Label icon={<CalendarIcon size={14} />}>Check out</Label>
          <input
            type="date"
            className={FIELD}
            value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.target.value)}
          />
        </div>

        <div className="col-lg-2">
          <Label icon={<UsersIcon size={14} />}>Guests</Label>
          <input
            type="number"
            min="1"
            className={FIELD}
            placeholder="Add guests"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
          />
        </div>

        <div className="col-lg-2 d-flex gap-2">
          {browserSupportsSpeechRecognition && (
            <button
              type="button"
              className={`btn rounded-circle p-0 flex-shrink-0 d-inline-flex align-items-center justify-content-center ${listening ? "mic-button listening" : "btn-dark"}`}
              style={{ width: 48, height: 48 }}
              onClick={onMicClick}
              title="Voice search"
              aria-label="Voice search"
            >
              <MicIcon size={20} />
            </button>
          )}

          <button
            type="submit"
            className="btn btn-accent rounded-pill flex-grow-1 d-inline-flex align-items-center justify-content-center gap-2"
            style={{ height: 48 }}
          >
            <SearchIcon size={18} /> Search
          </button>
        </div>
      </form>

      {onClear && (
        <div className="text-end mt-2">
          <button type="button" className="btn btn-link btn-sm text-secondary text-decoration-none p-0 d-inline-flex align-items-center gap-1" onClick={onClear}>
            <CloseIcon size={14} /> New search (clear trip)
          </button>
        </div>
      )}
    </div>
  );
}

export default SearchCard;
