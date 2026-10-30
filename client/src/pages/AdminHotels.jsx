import React, { useEffect, useState } from "react";
import { formatPrice } from "../utils/formatPrice";
import api from "../api";
import AdminHotelRooms from "../components/AdminHotelRooms";
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
      <div className="gradient-navy text-white py-4">
        <div className="container">
          <h1 className="fw-bold mb-0">Manage Hotels</h1>
        </div>
      </div>

      <div className="container py-4">
        <div className="card border-0 shadow-sm p-4 mb-4" style={{ maxWidth: "520px" }}>
          <h4 className="mb-3">{editingId ? "Edit Hotel" : "Add New Hotel"}</h4>

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
              <label className="form-label">Upload Image</label>
              <input type="file" className="form-control" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
            </div>

            <div>
              <label className="form-label">Or Image URL</label>
              <input name="imageUrl" className="form-control" placeholder="https://..." value={formData.imageUrl} onChange={handleChange} />
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-gold" disabled={submitting}>
                {editingId ? "Update Hotel" : "Add Hotel"}
              </button>

              {editingId && (
                <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

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
          <p>Loading hotels...</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
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
                  <tr key={hotel.id} className="hover-lift">
                    <td>
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        style={{ width: "80px", height: "56px", objectFit: "cover", borderRadius: "6px" }}
                      />
                    </td>
                    <td>{hotel.name}</td>
                    <td>{hotel.city}</td>
                    <td>{hotel.category}</td>
                    <td>{formatPrice(hotel.price)}</td>
                    <td>{hotel.rating}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-dark" onClick={() => handleEditClick(hotel)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(hotel.id)}>
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
  );
}

export default AdminHotels;