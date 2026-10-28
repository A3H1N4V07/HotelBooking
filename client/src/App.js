import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/theme.css";

import Header from "./components/Header";
import Home from "./pages/Home";
import Hotels from "./pages/Hotels";
import HotelDetail from "./pages/HotelDetail";
import Payment from "./pages/Payment";
import MyBookings from "./pages/MyBookings";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminHotels from "./pages/AdminHotels";
import { VoiceProvider } from "./context/VoiceContext";
import VoiceAssistant from "./components/VoiceAssistant";

function App() {
  return (
    <Router>
      <VoiceProvider>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route path="/hotels" element={<Hotels />} />

          <Route path="/hotels/:id" element={<HotelDetail />} />

          <Route
            path="/payment/:bookingId"
            element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/hotels"
            element={
              <ProtectedRoute adminOnly>
                <AdminHotels />
              </ProtectedRoute>
            }
          />
        </Routes>

        <VoiceAssistant />
      </VoiceProvider>
    </Router>
  );
}

export default App;