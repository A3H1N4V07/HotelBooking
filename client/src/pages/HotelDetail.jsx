import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

import Loader from "../components/Loader";
import ErrorComponent from "../components/ErrorComponent";
import HotelDetailsCard from "../components/HotelDetailsCard";

function HotelDetail() {

  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState(null);

  useEffect(() => {

    const fetchHotel = async () => {

      try {

        const response = await api.get(`/hotels/${id}`);

        setHotel(response.data);

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);

      }
    };

    fetchHotel();

  }, [id]);

  if (loading) {
    return <Loader />;
  }

  if (!hotel) {
    return <ErrorComponent />;
  }

  return <HotelDetailsCard hotel={hotel} />;
}

export default HotelDetail;
