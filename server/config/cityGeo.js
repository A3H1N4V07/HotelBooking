// Approximate public coordinates for the sample cities: well-known landmarks
// (used for "distance to the beach" etc.) and the areas sample hotels are
// placed in. `inland` keeps coastal hotels on land: hotels in that zone are
// only offset east/west of the zone point, away from the sea.

const CITY_GEO = {
  Goa: {
    zones: [
      { lat: 15.5439, lng: 73.7553, radiusKm: 2.5, inland: "east" }, // Calangute
      { lat: 15.4909, lng: 73.8278, radiusKm: 2.5 }, // Panaji
      { lat: 15.2793, lng: 73.9223, radiusKm: 2, inland: "east" }, // Colva
    ],
    landmarks: [
      { name: "Calangute Beach", type: "beach", lat: 15.5439, lng: 73.7553 },
      { name: "Baga Beach", type: "beach", lat: 15.5553, lng: 73.7517 },
      { name: "Colva Beach", type: "beach", lat: 15.2793, lng: 73.9223 },
      { name: "Panaji city centre", type: "centre", lat: 15.4909, lng: 73.8278 },
      { name: "Goa (Dabolim) Airport", type: "airport", lat: 15.3808, lng: 73.8314 },
      { name: "Madgaon Railway Station", type: "station", lat: 15.2669, lng: 73.9707 },
    ],
  },
  Delhi: {
    zones: [{ lat: 28.6315, lng: 77.2167, radiusKm: 6 }],
    landmarks: [
      { name: "Connaught Place", type: "centre", lat: 28.6315, lng: 77.2167 },
      { name: "India Gate", type: "attraction", lat: 28.6129, lng: 77.2295 },
      { name: "Indira Gandhi International Airport", type: "airport", lat: 28.5562, lng: 77.1 },
      { name: "New Delhi Railway Station", type: "station", lat: 28.643, lng: 77.2194 },
    ],
  },
  Mumbai: {
    zones: [
      { lat: 19.0988, lng: 72.8267, radiusKm: 2, inland: "east" }, // Juhu
      { lat: 18.9398, lng: 72.8355, radiusKm: 1.5 }, // Fort
      { lat: 19.0596, lng: 72.8295, radiusKm: 1.5, inland: "east" }, // Bandra
    ],
    landmarks: [
      { name: "Juhu Beach", type: "beach", lat: 19.0988, lng: 72.8267 },
      { name: "Girgaum Chowpatty", type: "beach", lat: 18.9548, lng: 72.8139 },
      { name: "Gateway of India", type: "attraction", lat: 18.922, lng: 72.8347 },
      { name: "Fort (city centre)", type: "centre", lat: 18.9398, lng: 72.8355 },
      { name: "Mumbai Airport (CSMIA)", type: "airport", lat: 19.0896, lng: 72.8656 },
      { name: "Chhatrapati Shivaji Terminus", type: "station", lat: 18.9401, lng: 72.8352 },
    ],
  },
  Bangalore: {
    zones: [{ lat: 12.9757, lng: 77.605, radiusKm: 6 }],
    landmarks: [
      { name: "MG Road", type: "centre", lat: 12.9757, lng: 77.605 },
      { name: "Cubbon Park", type: "attraction", lat: 12.9763, lng: 77.5929 },
      { name: "Kempegowda International Airport", type: "airport", lat: 13.1986, lng: 77.7066 },
      { name: "Bangalore City Railway Station", type: "station", lat: 12.9781, lng: 77.5695 },
    ],
  },
  Hyderabad: {
    zones: [{ lat: 17.41, lng: 78.45, radiusKm: 6 }],
    landmarks: [
      { name: "Charminar", type: "attraction", lat: 17.3616, lng: 78.4747 },
      { name: "Hussain Sagar", type: "attraction", lat: 17.4239, lng: 78.4738 },
      { name: "Abids (city centre)", type: "centre", lat: 17.3924, lng: 78.4747 },
      { name: "Rajiv Gandhi International Airport", type: "airport", lat: 17.2403, lng: 78.4294 },
      { name: "Secunderabad Railway Station", type: "station", lat: 17.4337, lng: 78.5016 },
    ],
  },
  Chennai: {
    zones: [
      { lat: 13.05, lng: 80.2824, radiusKm: 2.5, inland: "west" }, // Marina
      { lat: 13.0418, lng: 80.2341, radiusKm: 3 }, // T. Nagar
    ],
    landmarks: [
      { name: "Marina Beach", type: "beach", lat: 13.05, lng: 80.2824 },
      { name: "Elliot's Beach", type: "beach", lat: 13.0002, lng: 80.2711 },
      { name: "T. Nagar (city centre)", type: "centre", lat: 13.0418, lng: 80.2341 },
      { name: "Chennai International Airport", type: "airport", lat: 12.9941, lng: 80.1709 },
      { name: "Chennai Central", type: "station", lat: 13.0827, lng: 80.2757 },
    ],
  },
  Pune: {
    zones: [{ lat: 18.5308, lng: 73.8475, radiusKm: 5 }],
    landmarks: [
      { name: "Shivajinagar (city centre)", type: "centre", lat: 18.5308, lng: 73.8475 },
      { name: "Shaniwar Wada", type: "attraction", lat: 18.5195, lng: 73.8553 },
      { name: "Pune Airport", type: "airport", lat: 18.5822, lng: 73.9197 },
      { name: "Pune Junction", type: "station", lat: 18.5289, lng: 73.8744 },
    ],
  },
  Jaipur: {
    zones: [{ lat: 26.9157, lng: 75.809, radiusKm: 5 }],
    landmarks: [
      { name: "MI Road (city centre)", type: "centre", lat: 26.9157, lng: 75.809 },
      { name: "Hawa Mahal", type: "attraction", lat: 26.9239, lng: 75.8267 },
      { name: "Amber Fort", type: "attraction", lat: 26.9855, lng: 75.8513 },
      { name: "Jaipur International Airport", type: "airport", lat: 26.8242, lng: 75.8122 },
      { name: "Jaipur Junction", type: "station", lat: 26.9196, lng: 75.7878 },
    ],
  },
  Kochi: {
    zones: [
      { lat: 9.975, lng: 76.282, radiusKm: 3 }, // Ernakulam
      { lat: 9.9658, lng: 76.2421, radiusKm: 1.2, inland: "east" }, // Fort Kochi
    ],
    landmarks: [
      { name: "Fort Kochi Beach", type: "beach", lat: 9.9658, lng: 76.2421 },
      { name: "Cherai Beach", type: "beach", lat: 10.1416, lng: 76.1783 },
      { name: "MG Road, Ernakulam", type: "centre", lat: 9.975, lng: 76.282 },
      { name: "Cochin International Airport", type: "airport", lat: 10.152, lng: 76.4019 },
      { name: "Ernakulam Junction", type: "station", lat: 9.969, lng: 76.2911 },
    ],
  },
  Mysore: {
    zones: [{ lat: 12.3052, lng: 76.6552, radiusKm: 4 }],
    landmarks: [
      { name: "Mysore Palace", type: "centre", lat: 12.3052, lng: 76.6552 },
      { name: "Chamundi Hill", type: "attraction", lat: 12.2724, lng: 76.673 },
      { name: "Mysore Airport", type: "airport", lat: 12.23, lng: 76.6558 },
      { name: "Mysore Junction", type: "station", lat: 12.3166, lng: 76.645 },
    ],
  },
  Shimla: {
    zones: [{ lat: 31.1048, lng: 77.1734, radiusKm: 2.5 }],
    landmarks: [
      { name: "The Mall, Shimla", type: "centre", lat: 31.1048, lng: 77.1734 },
      { name: "Jakhu Temple", type: "attraction", lat: 31.1009, lng: 77.184 },
      { name: "Shimla Airport", type: "airport", lat: 31.0818, lng: 77.0681 },
      { name: "Shimla Railway Station", type: "station", lat: 31.1033, lng: 77.1563 },
    ],
  },
  Manali: {
    zones: [{ lat: 32.2432, lng: 77.1892, radiusKm: 2.5 }],
    landmarks: [
      { name: "Mall Road, Manali", type: "centre", lat: 32.2432, lng: 77.1892 },
      { name: "Hadimba Temple", type: "attraction", lat: 32.2484, lng: 77.1803 },
      { name: "Solang Valley", type: "attraction", lat: 32.3166, lng: 77.1576 },
      { name: "Kullu-Manali (Bhuntar) Airport", type: "airport", lat: 31.8763, lng: 77.1544 },
    ],
  },
};

// Hill stations: air conditioning is rare and rarely needed.
const COOL_CLIMATE_CITIES = new Set(["Shimla", "Manali"]);

module.exports = { CITY_GEO, COOL_CLIMATE_CITIES };
