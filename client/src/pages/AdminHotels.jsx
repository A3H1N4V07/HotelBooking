import React, { useEffect, useState } from "react";
import { formatPrice } from "../utils/formatPrice";
import api from "../api";
import { Link } from "react-router-dom";
import AdminHotelRooms from "../components/AdminHotelRooms";
import PageHeader from "../components/PageHeader";
import { useVoice } from "../context/VoiceContext";

const CATEGORIES = ["Budget", "Business", "Family", "Luxury"];

const EMPTY_FORM = {
  name: "",
  city: "",
  state: "",
  address: "",
  description: "",
  price: "",
  rating: "",
  phone: "",
  category: "Budget",
  imageUrl: "",
};

function AdminHotels() {
  const { notify } = useVoice();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const response = await api.get("/hotels/search");
      setHotels(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0] || null);
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setImageFile(null);
    setEditingId(null);
  };

  const handleEditClick = (hotel) => {
    setEditingId(hotel.id);
    setFormData({
      name: hotel.name || "",
      city: hotel.city || "",
      state: hotel.state || "",
      address: hotel.address || "",
      description: hotel.description || "",
      price: hotel.price || "",
      rating: hotel.rating || "",
      phone: hotel.phone || "",
      category: hotel.category || "Budget",
      imageUrl: "",
    });
    setImageFile(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this hotel? This cannot be undone.")) {
      return;
    }

    try {
      await api.delete(`/hotels/${id}`);
      fetchHotels();
    } catch (error) {
      console.error(error);
      notify(error.response?.data?.message || "Failed to delete hotel", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });

      if (imageFile) {
        payload.append("image", imageFile);
      }

      if (editingId) {
        await api.put(`/hotels/${editingId}`, payload);
      } else {
        await api.post("/hotels", payload);
      }

      resetForm();
      fetchHotels();
    } catch (error) {
      console.error(error);
      notify(error.response?.data?.message || "Failed to save hotel", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Manage Hotels" subtitle={`${hotels.length} hotels`} overlap>
        <Link to="/admin" className="btn btn-outline-glass rounded-pill px-4">Back to dashboard</Link>
      </PageHeader>

      <div className="container position-relative pb-5" style={{ marginTop: -56 }}>
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="card border-0 rounded-4 shadow-sm p-4">
              <h5 className="fw-bold mb-3">{editingId ? "Edit hotel" : "Add a new hotel"}</h5>

              <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                <input name="name" className="form-control" placeholder="Hotel Name" value={formData.name} onChange={handleChange} required />
                <input name="city" className="form-control" placeholder="City" value={formData.city} onChange={handleChange} required />
                <input name="state" className="form-control" placeholder="State" value={formData.state} onChange={handleChange} />
                <input name="address" className="form-control" placeholder="Address" value={formData.address} onChange={handleChange} />
                <textarea name="description" className="form-control" placeholder="Description" value={formData.description} onChange={handleChange} />

                <div className="row g-2">
                  <div className="col-6">
                    <input name="price" type="number" className="form-control" placeholder="From price per night (cheapest room)" title="Sets the price of the cheapest room type" value={formData.price} onChange={handleChange} required />
                  </div>
                  <div className="col-6">
                    <input name="rating" type="number" step="0.1" min="0" max="5" className="form-control" placeholder="Rating (0-5)" value={formData.rating} onChange={handleChange} />
                  </div>
                </div>

                <input name="phone" className="form-control" placeholder="Phone" value={formData.phone} onChange={handleChange} />

                <select name="category" className="form-select" value={formData.category} onChange={handleChange}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <div>
                  <label className="form-label small fw-semibold text-secondary">Upload Image</label>
                  <input type="file" className="form-control" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
                </div>

                <div>
                  <label className="form-label small fw-semibold text-secondary">Or Image URL</label>
                  <input name="imageUrl" className="form-control" placeholder="https://..." value={formData.imageUrl} onChange={handleChange} />
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-accent rounded-pill px-4" disabled={submitting}>
                    {editingId ? "Update Hotel" : "Add Hotel"}
                  </button>

                  {editingId && (
                    <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={resetForm}>
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="col-lg-7">
            {editingId && (
              <AdminHotelRooms
                hotelId={editingId}
                onChanged={(price) => {
                  fetchHotels();
                  // Keep the form in step, or saving it would undo the room price change.
                  setFormData((current) => ({ ...current, price: String(price) }));
                }}
              />
            )}

            {loading ? (
              <p className="text-secondary">Loading hotels...</p>
            ) : (
              <div className="card border-0 rounded-4 shadow-sm p-2 table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>City</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Rating</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotels.map((hotel) => (
                      <tr key={hotel.id} className={editingId === hotel.id ? "table-warning" : ""}>
                        <td>
                          <img
                            src={hotel.image}
                            alt={hotel.name}
                            className="rounded-3"
                            style={{ width: 72, height: 52, objectFit: "cover" }}
                          />
                        </td>
                        <td>{hotel.name}</td>
                        <td>{hotel.city}</td>
                        <td>{hotel.category}</td>
                        <td>{formatPrice(hotel.price)}</td>
                        <td>{hotel.rating}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-outline-dark rounded-pill px-3" onClick={() => handleEditClick(hotel)}>
                              Edit
                            </button>
                            <button className="btn btn-sm btn-outline-danger rounded-pill px-3" onClick={() => handleDelete(hotel.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminHotels;