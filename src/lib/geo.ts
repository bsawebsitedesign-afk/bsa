/**
 * City Geocoding & Coordinate Lookup Table for BSA Global Chapters.
 * Automatically resolves latitude & longitude for world cities when added by an Admin.
 */

export interface GeoCoordinates {
  lat: number;
  lng: number;
  country: string;
}

const CITY_GEO_MAP: Record<string, GeoCoordinates> = {
  'new york': { lat: 40.7128, lng: -74.006, country: 'United States' },
  nyc: { lat: 40.7128, lng: -74.006, country: 'United States' },
  london: { lat: 51.5074, lng: -0.1278, country: 'United Kingdom' },
  tokyo: { lat: 35.6762, lng: 139.6503, country: 'Japan' },
  singapore: { lat: 1.3521, lng: 103.8198, country: 'Singapore' },
  dubai: { lat: 25.2048, lng: 55.2708, country: 'United Arab Emirates' },
  sydney: { lat: -33.8688, lng: 151.2093, country: 'Australia' },
  paris: { lat: 48.8566, lng: 2.3522, country: 'France' },
  berlin: { lat: 52.52, lng: 13.405, country: 'Germany' },
  toronto: { lat: 43.6532, lng: -79.3832, country: 'Canada' },
  chicago: { lat: 41.8781, lng: -87.6298, country: 'United States' },
  austin: { lat: 30.2672, lng: -97.7431, country: 'United States' },
  texas: { lat: 30.2672, lng: -97.7431, country: 'United States' },
  'los angeles': { lat: 34.0522, lng: -118.2437, country: 'United States' },
  la: { lat: 34.0522, lng: -118.2437, country: 'United States' },
  california: { lat: 34.0522, lng: -118.2437, country: 'United States' },
  miami: { lat: 25.7617, lng: -80.1918, country: 'United States' },
  florida: { lat: 25.7617, lng: -80.1918, country: 'United States' },
  'san francisco': { lat: 37.7749, lng: -122.4194, country: 'United States' },
  mumbai: { lat: 19.076, lng: 72.8777, country: 'India' },
  delhi: { lat: 28.6139, lng: 77.209, country: 'India' },
  'new delhi': { lat: 28.6139, lng: 77.209, country: 'India' },
  bangalore: { lat: 12.9716, lng: 77.5946, country: 'India' },
  bengaluru: { lat: 12.9716, lng: 77.5946, country: 'India' },
  hyderabad: { lat: 17.385, lng: 78.4867, country: 'India' },
  pune: { lat: 18.5204, lng: 73.8567, country: 'India' },
  chennai: { lat: 13.0827, lng: 80.2707, country: 'India' },
  hongkong: { lat: 22.3193, lng: 114.1694, country: 'Hong Kong' },
  amsterdam: { lat: 52.3676, lng: 4.9041, country: 'Netherlands' },
  frankfurt: { lat: 50.1109, lng: 8.6821, country: 'Germany' },
  zurich: { lat: 47.3769, lng: 8.5417, country: 'Switzerland' },
  seoul: { lat: 37.5665, lng: 126.978, country: 'South Korea' },
};

export function lookupCityGeo(cityInput: string): GeoCoordinates {
  const normalized = cityInput.trim().toLowerCase();
  for (const [key, geo] of Object.entries(CITY_GEO_MAP)) {
    if (normalized.includes(key)) return geo;
  }
  // Default coordinates if city is not in map
  return { lat: 20.0, lng: 0.0, country: 'Global' };
}
