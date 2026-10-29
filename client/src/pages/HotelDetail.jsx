import React, { useEffect, useState } from "react";
import { formatPrice } from "../utils/formatPrice";
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

  return (
    <HotelDetailsCard
      id={hotel.id}
      name={hotel.name}
      address={hotel.address}
      phone={hotel.phone}
      category={hotel.category}
      price={formatPrice(hotel.price)}
      num_reviews={Math.floor(hotel.rating * 100)}
      timezone={hotel.city}
      available={true}
      about={hotel.description}
      img={hotel.image}
    />
  );
}

export default HotelDetail;