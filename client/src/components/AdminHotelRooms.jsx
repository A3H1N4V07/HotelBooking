import React, { useCallback, useEffect, useState } from "react";
import api from "../api";
import useAmenities from "../hooks/useAmenities";

const EMPTY_ROOM = { name: "", capacity: "2", pricePerNight: "", totalRooms: "5" };

// Admin editor for one hotel's amenities and room types. Room changes
// update the hotel's listed ("from") price on the server; onChanged(price)
// lets the page refresh its list and its edit form with the new price.
function AdminHotelRooms({ hotelId, onChanged }) {
  const { amenities: amenityOptions } = useAmenities();

  const [amenities, setAmenities] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [newRoom, setNewRoom] = useState(EMPTY_ROOM);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await api.get(`/hotels/${hotelId}`);
    setAmenities(response.data.amenities.map((a) => a.code));
    setRooms(response.data.roomTypes);
    setDrafts({});
    return response.data;
  }, [hotelId]);

  useEffect(() => {
    load().catch((error) => console.error(error));
    setMessage(null);
    setNewRoom(EMPTY_ROOM);
  }, [load]);

  // Runs an admin request, shows its outcome, then reloads.
  const run = async (request, successText) => {
    try {
      setBusy(true);
      await request();
      setMessage({ type: "success", text: successText });
      const hotel = await load();
      onChanged?.(hotel.price);
    } catch (error) {
      setMessage({ type: "danger", text: error.response?.data?.message || "Something went wrong" });
    } finally {
      setBusy(false);
    }
  };

  const toggleAmenity = (code) =>
    setAmenities((current) => (current.includes(code) ? current.filter((c) => c !== code) : [...current, code]));

  const draftOf = (room) => drafts[room.id] || room;
  const editDraft = (room, field, value) =>
    setDrafts((current) => ({ ...current, [room.id]: { ...draftOf(room), [field]: value } }));

  const saveRoom = (room) => {
    const draft = draftOf(room);
    return run(
      () => api.put(`/hotels/${hotelId}/rooms/${room.id}`, {
        name: draft.name,
        capacity: Number(draft.capacity),
        pricePerNight: Number(draft.pricePerNight),
        totalRooms: Number(draft.totalRooms),
      }),
      `Saved ${draft.name}`
    );
  };

  const addRoom = (e) => {
    e.preventDefault();
    return run(async () => {
      await api.post(`/hotels/${hotelId}/rooms`, {
        name: newRoom.name,
        capacity: Number(newRoom.capacity),
        pricePerNight: Number(newRoom.pricePerNight),
        totalRooms: Number(newRoom.totalRooms),
      });
      setNewRoom(EMPTY_ROOM);
    }, `Added ${newRoom.name}`);
  };

  const deleteRoom = (room) => {
    if (!window.confirm(`Delete room type "${room.name}"?`)) return;
    run(() => api.delete(`/hotels/${hotelId}/rooms/${room.id}`), `Deleted ${room.name}`);
  };

  const numberInput = (value, onChange, min, width = 90) => (
    <input type="number" min={min} className="form-control form-control-sm" style={{ width }} value={value} onChange={(e) => onChange(e.target.value)} />
  );

  return (
    <div className="card border-0 shadow-sm p-4 mb-4">
      <h4 className="mb-3">Rooms &amp; amenities</h4>

      {message && <div className={`alert alert-${message.type} py-2`}>{message.text}</div>}

      <h6 className="fw-bold">Amenities</h6>
      <div className="d-flex flex-wrap gap-3 mb-2">
        {amenityOptions.map((a) => (
          <label key={a.code} className="form-check-label d-flex align-items-center gap-1">
            <input type="checkbox" className="form-check-input mt-0" checked={amenities.includes(a.code)} onChange={() => toggleAmenity(a.code)} />
            {a.label}
          </label>
        ))}
      </div>
      <div className="mb-4">
        <button
          type="button"
          className="btn btn-sm btn-dark"
          disabled={busy}
          onClick={() => run(() => api.put(`/hotels/${hotelId}/amenities`, { codes: amenities }), "Amenities saved")}
        >
          Save amenities
        </button>
      </div>

      <h6 className="fw-bold">Room types</h6>
      <p className="small text-muted mb-2">The hotel's listed price is always its cheapest room.</p>

      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Sleeps</th>
              <th>₹ / night</th>
              <th>Rooms</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const draft = draftOf(room);
              return (
                <tr key={room.id}>
                  <td>
                    <input className="form-control form-control-sm" value={draft.name} onChange={(e) => editDraft(room, "name", e.target.value)} />
                  </td>
                  <td>{numberInput(draft.capacity, (v) => editDraft(room, "capacity", v), 1, 70)}</td>
                  <td>{numberInput(draft.pricePerNight, (v) => editDraft(room, "pricePerNight", v), 1, 110)}</td>
                  <td>{numberInput(draft.totalRooms, (v) => editDraft(room, "totalRooms", v), 0, 80)}</td>
                  <td className="text-nowrap">
                    <button type="button" className="btn btn-sm btn-outline-dark me-1" disabled={busy || !drafts[room.id]} onClick={() => saveRoom(room)}>
                      Save
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy || rooms.length <= 1} onClick={() => deleteRoom(room)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={addRoom} className="d-flex flex-wrap gap-2 align-items-end">
        <div>
          <label className="form-label small mb-0">New room type</label>
          <input className="form-control form-control-sm" placeholder="e.g. Deluxe Room" value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} required />
        </div>
        <div>
          <label className="form-label small mb-0">Sleeps</label>
          {numberInput(newRoom.capacity, (v) => setNewRoom({ ...newRoom, capacity: v }), 1, 70)}
        </div>
        <div>
          <label className="form-label small mb-0">₹ / night</label>
          {numberInput(newRoom.pricePerNight, (v) => setNewRoom({ ...newRoom, pricePerNight: v }), 1, 110)}
        </div>
        <div>
          <label className="form-label small mb-0">Rooms</label>
          {numberInput(newRoom.totalRooms, (v) => setNewRoom({ ...newRoom, totalRooms: v }), 0, 80)}
        </div>
        <button type="submit" className="btn btn-sm btn-gold" disabled={busy}>Add room type</button>
      </form>
    </div>
  );
}

export default AdminHotelRooms;
