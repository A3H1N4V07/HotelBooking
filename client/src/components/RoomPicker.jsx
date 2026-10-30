import React from "react";
import { formatPrice } from "../utils/formatPrice";

// Room types for a hotel. With dates, each shows the stay total and how many
// rooms are left; rooms that are sold out or too small can't be selected.
function RoomPicker({ rooms, nights, guests, selectedId, onSelect, loading }) {
  const guestCount = Number(guests) || 1;

  return (
    <div className="d-flex flex-column gap-2">
      {rooms.map((room) => {
        const tooSmall = room.capacity < guestCount;
        const soldOut = room.roomsLeft === 0;
        const disabled = tooSmall || soldOut;
        const selected = room.id === selectedId;

        return (
          <label
            key={room.id}
            className={`card p-3 border ${selected ? "border-warning border-2" : ""}`}
            style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }}
          >
            <div className="d-flex align-items-center gap-3">
              <input
                type="radio"
                name="roomType"
                className="form-check-input mt-0"
                checked={selected}
                disabled={disabled}
                onChange={() => onSelect(room.id)}
              />

              <div className="flex-grow-1">
                <div className="fw-semibold">{room.name}</div>
                <div className="small text-muted">
                  Sleeps {room.capacity}
                  {tooSmall && ` · too small for ${guestCount} guests`}
                </div>
              </div>

              <div className="text-end">
                <div className="fw-bold">
                  {formatPrice(room.pricePerNight)} <small className="text-muted fw-normal">/ night</small>
                </div>

                {nights > 0 && !disabled && (
                  <div className="small text-muted">
                    {formatPrice(room.pricePerNight * nights)} for {nights} night{nights > 1 ? "s" : ""}
                  </div>
                )}

                {room.roomsLeft !== undefined && !tooSmall && (
                  <div className={`small fw-semibold ${soldOut ? "text-danger" : room.roomsLeft <= 3 ? "text-warning" : "text-success"}`}>
                    {soldOut ? "Sold out for these dates" : room.roomsLeft <= 3 ? `Only ${room.roomsLeft} left` : "Available"}
                  </div>
                )}
              </div>
            </div>
          </label>
        );
      })}

      {loading && <small className="text-muted">Checking availability…</small>}
    </div>
  );
}

export default RoomPicker;
