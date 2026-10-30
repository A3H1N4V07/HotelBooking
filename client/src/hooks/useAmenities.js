import { useEffect, useState } from "react";
import api from "../api";

// The server's fixed amenity list ([{ code, label }]), fetched once and shared.
let cached = null;
let pending = null;

function loadAmenities() {
  if (cached) return Promise.resolve(cached);

  if (!pending) {
    pending = api
      .get("/hotels/amenities")
      .then((response) => {
        cached = response.data;
        return cached;
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }

  return pending;
}

function useAmenities() {
  const [amenities, setAmenities] = useState(cached || []);

  useEffect(() => {
    let active = true;

    loadAmenities()
      .then((list) => active && setAmenities(list))
      .catch((error) => console.error(error));

    return () => {
      active = false;
    };
  }, []);

  const labels = Object.fromEntries(amenities.map((a) => [a.code, a.label]));

  return { amenities, labels };
}

export default useAmenities;
