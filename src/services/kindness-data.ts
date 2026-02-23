// Kindness data pipeline: baseline generator + curated event extraction
// Produces green pulses on the happy map representing acts of kindness worldwide

import { inferGeoHubsFromTitle } from './geo-hub-index';

export interface KindnessPoint {
  lat: number;
  lon: number;
  name: string;
  description: string;
  intensity: number;      // 0-1, higher = more prominent on map
  type: 'baseline' | 'real';
  timestamp: number;
}

// ~60 major world cities with lat/lon and population (millions) for density weighting
const MAJOR_CITIES: Array<{ name: string; lat: number; lon: number; population: number }> = [
  // Top 15 by population
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, population: 37.4 },
  { name: 'Delhi', lat: 28.7041, lon: 77.1025, population: 32.9 },
  { name: 'Shanghai', lat: 31.2304, lon: 121.4737, population: 28.5 },
  { name: 'Sao Paulo', lat: -23.5505, lon: -46.6333, population: 22.4 },
  { name: 'Mexico City', lat: 19.4326, lon: -99.1332, population: 21.8 },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357, population: 21.3 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, population: 21.0 },
  { name: 'Beijing', lat: 39.9042, lon: 116.4074, population: 20.9 },
  { name: 'Dhaka', lat: 23.8103, lon: 90.4125, population: 22.5 },
  { name: 'Osaka', lat: 34.6937, lon: 135.5023, population: 19.1 },
  { name: 'New York', lat: 40.7128, lon: -74.0060, population: 18.8 },
  { name: 'Karachi', lat: 24.8607, lon: 67.0011, population: 16.8 },
  { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816, population: 15.4 },
  { name: 'Istanbul', lat: 41.0082, lon: 28.9784, population: 15.6 },
  { name: 'Lagos', lat: 6.5244, lon: 3.3792, population: 15.4 },

  // 15 European
  { name: 'London', lat: 51.5074, lon: -0.1278, population: 9.5 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522, population: 11.1 },
  { name: 'Berlin', lat: 52.5200, lon: 13.4050, population: 3.7 },
  { name: 'Madrid', lat: 40.4168, lon: -3.7038, population: 6.7 },
  { name: 'Rome', lat: 41.9028, lon: 12.4964, population: 4.3 },
  { name: 'Amsterdam', lat: 52.3676, lon: 4.9041, population: 1.2 },
  { name: 'Stockholm', lat: 59.3293, lon: 18.0686, population: 1.6 },
  { name: 'Vienna', lat: 48.2082, lon: 16.3738, population: 1.9 },
  { name: 'Warsaw', lat: 52.2297, lon: 21.0122, population: 1.8 },
  { name: 'Prague', lat: 50.0755, lon: 14.4378, population: 1.3 },
  { name: 'Brussels', lat: 50.8503, lon: 4.3517, population: 2.1 },
  { name: 'Dublin', lat: 53.3498, lon: -6.2603, population: 1.4 },
  { name: 'Lisbon', lat: 38.7223, lon: -9.1393, population: 2.9 },
  { name: 'Zurich', lat: 47.3769, lon: 8.5417, population: 1.4 },
  { name: 'Helsinki', lat: 60.1699, lon: 24.9384, population: 1.3 },

  // 10 Asian
  { name: 'Seoul', lat: 37.5665, lon: 126.9780, population: 9.8 },
  { name: 'Bangkok', lat: 13.7563, lon: 100.5018, population: 10.7 },
  { name: 'Jakarta', lat: -6.2088, lon: 106.8456, population: 10.6 },
  { name: 'Manila', lat: 14.5995, lon: 120.9842, population: 14.2 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198, population: 5.9 },
  { name: 'Kuala Lumpur', lat: 3.1390, lon: 101.6869, population: 8.3 },
  { name: 'Taipei', lat: 25.0330, lon: 121.5654, population: 7.0 },
  { name: 'Hong Kong', lat: 22.3193, lon: 114.1694, population: 7.5 },
  { name: 'Hanoi', lat: 21.0278, lon: 105.8342, population: 8.1 },
  { name: 'Ho Chi Minh City', lat: 10.8231, lon: 106.6297, population: 9.3 },

  // 10 Americas
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, population: 12.5 },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298, population: 8.9 },
  { name: 'Toronto', lat: 43.6532, lon: -79.3832, population: 6.3 },
  { name: 'Bogota', lat: 4.7110, lon: -74.0721, population: 11.2 },
  { name: 'Lima', lat: -12.0464, lon: -77.0428, population: 10.9 },
  { name: 'Santiago', lat: -33.4489, lon: -70.6693, population: 6.8 },
  { name: 'Montreal', lat: 45.5017, lon: -73.5673, population: 4.2 },
  { name: 'Vancouver', lat: 49.2827, lon: -123.1207, population: 2.6 },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194, population: 3.3 },
  { name: 'Miami', lat: 25.7617, lon: -80.1918, population: 6.2 },

  // 10 Africa/Middle East/Oceania
  { name: 'Nairobi', lat: -1.2921, lon: 36.8219, population: 5.0 },
  { name: 'Johannesburg', lat: -26.2041, lon: 28.0473, population: 6.1 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708, population: 3.5 },
  { name: 'Riyadh', lat: 24.7136, lon: 46.6753, population: 7.7 },
  { name: 'Tel Aviv', lat: 32.0853, lon: 34.7818, population: 4.2 },
  { name: 'Casablanca', lat: 33.5731, lon: -7.5898, population: 3.8 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, population: 5.3 },
  { name: 'Melbourne', lat: -37.8136, lon: 144.9631, population: 5.1 },
  { name: 'Auckland', lat: -36.8485, lon: 174.7633, population: 1.7 },
  { name: 'Cape Town', lat: -33.9249, lon: 18.4241, population: 4.6 },
];

const POSITIVE_PHRASES = [
  'Community helping neighbors',
  'Volunteers at work',
  'Donations flowing',
  'Random acts of kindness',
  'People making a difference',
];

/**
 * Generate baseline kindness points from major cities, weighted by population.
 * Targets 50-80 points total. Each call produces slightly different results
 * due to random jitter and inclusion, creating a "living map" effect.
 */
function generateBaselineKindness(): KindnessPoint[] {
  const included: Array<{ city: typeof MAJOR_CITIES[0]; weight: number }> = [];
  const remaining: typeof MAJOR_CITIES = [];

  for (const city of MAJOR_CITIES) {
    const weight = Math.min(1, city.population / 30);
    if (Math.random() < weight) {
      included.push({ city, weight });
    } else {
      remaining.push(city);
    }
  }

  // Trim if over 80
  while (included.length > 80) {
    const idx = Math.floor(Math.random() * included.length);
    included.splice(idx, 1);
  }

  // Fill if under 50
  while (included.length < 50 && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    const city = remaining[idx]!;
    remaining.splice(idx, 1);
    included.push({ city, weight: Math.min(1, city.population / 30) });
  }

  return included.map(({ city }) => ({
    lat: city.lat + (Math.random() - 0.5) * 0.3,
    lon: city.lon + (Math.random() - 0.5) * 0.3,
    name: city.name,
    description: POSITIVE_PHRASES[Math.floor(Math.random() * POSITIVE_PHRASES.length)] ?? 'Acts of kindness nearby',
    intensity: Math.min(1, city.population / 20),
    type: 'baseline' as const,
    timestamp: Date.now() - Math.random() * 3600_000,
  }));
}

/**
 * Extract real kindness events from curated news items.
 * Filters for humanity-kindness category and geocodes via title.
 */
function extractKindnessEvents(
  newsItems: Array<{ title: string; happyCategory?: string }>,
): KindnessPoint[] {
  const kindnessItems = newsItems.filter(
    item => item.happyCategory === 'humanity-kindness',
  );

  const events: KindnessPoint[] = [];
  for (const item of kindnessItems) {
    const matches = inferGeoHubsFromTitle(item.title);
    const firstMatch = matches[0];
    if (firstMatch) {
      events.push({
        lat: firstMatch.hub.lat,
        lon: firstMatch.hub.lon,
        name: item.title,
        description: item.title,
        intensity: 0.8,
        type: 'real',
        timestamp: Date.now(),
      });
    }
  }

  return events;
}

/**
 * Fetch kindness data: baseline synthetic points + real kindness events from news.
 * Synchronous (no API calls) -- baseline is generated locally, real events
 * come from already-fetched news items.
 */
export function fetchKindnessData(
  newsItems?: Array<{ title: string; happyCategory?: string }>,
): KindnessPoint[] {
  const baseline = generateBaselineKindness();
  const real = newsItems ? extractKindnessEvents(newsItems) : [];
  // Real events first so they render on top
  return [...real, ...baseline];
}
