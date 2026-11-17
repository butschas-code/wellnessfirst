export interface GlobalCity {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: number; // UTC offset in hours e.g. 5.5, -5, +1
}

export const POPULAR_CITIES: GlobalCity[] = [
  // Europe
  { name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timezone: 0 },
  { name: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.405, timezone: 1 },
  { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, timezone: 1 },
  { name: 'Zurich', country: 'Switzerland', latitude: 47.3769, longitude: 8.5417, timezone: 1 },
  { name: 'Vienna', country: 'Austria', latitude: 48.2082, longitude: 16.3738, timezone: 1 },
  { name: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, timezone: 1 },
  { name: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964, timezone: 1 },
  { name: 'Madrid', country: 'Spain', latitude: 40.4168, longitude: -3.7038, timezone: 1 },
  { name: 'Stockholm', country: 'Sweden', latitude: 59.3293, longitude: 18.0686, timezone: 1 },
  { name: 'Dublin', country: 'Ireland', latitude: 53.3498, longitude: -6.2603, timezone: 0 },

  // North America
  { name: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006, timezone: -5 },
  { name: 'Los Angeles', country: 'United States', latitude: 34.0522, longitude: -118.2437, timezone: -8 },
  { name: 'San Francisco', country: 'United States', latitude: 37.7749, longitude: -122.4194, timezone: -8 },
  { name: 'Chicago', country: 'United States', latitude: 41.8781, longitude: -87.6298, timezone: -6 },
  { name: 'Miami', country: 'United States', latitude: 25.7617, longitude: -80.1918, timezone: -5 },
  { name: 'Austin', country: 'United States', latitude: 30.2672, longitude: -97.7431, timezone: -6 },
  { name: 'Seattle', country: 'United States', latitude: 47.6062, longitude: -122.3321, timezone: -8 },
  { name: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: -5 },
  { name: 'Vancouver', country: 'Canada', latitude: 49.2827, longitude: -123.1207, timezone: -8 },

  // Asia & Middle East
  { name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, timezone: 5.5 },
  { name: 'Mumbai', country: 'India', latitude: 19.076, longitude: 72.8777, timezone: 5.5 },
  { name: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 5.5 },
  { name: 'Chennai', country: 'India', latitude: 13.0827, longitude: 80.2707, timezone: 5.5 },
  { name: 'Kolkata', country: 'India', latitude: 22.5726, longitude: 88.3639, timezone: 5.5 },
  { name: 'Hyderabad', country: 'India', latitude: 17.385, longitude: 78.4867, timezone: 5.5 },
  { name: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, timezone: 4 },
  { name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 8 },
  { name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 9 },
  { name: 'Hong Kong', country: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, timezone: 8 },
  { name: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, timezone: 7 },

  // Oceania & Latin America
  { name: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezone: 10 },
  { name: 'Melbourne', country: 'Australia', latitude: -37.8136, longitude: 144.9631, timezone: 10 },
  { name: 'Auckland', country: 'New Zealand', latitude: -36.8485, longitude: 174.7633, timezone: 12 },
  { name: 'São Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333, timezone: -3 },
  { name: 'Buenos Aires', country: 'Argentina', latitude: -34.6037, longitude: -58.3816, timezone: -3 },
  { name: 'Mexico City', country: 'Mexico', latitude: 19.4326, longitude: -99.1332, timezone: -6 },
];

