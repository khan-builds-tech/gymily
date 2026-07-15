import type { FastifyInstance } from 'fastify';
import { selectGymSchema, type GymSearchResult, type SelectGymResult } from '@gymily/types';
import { sendError, sendValidationError } from '../lib/errors.js';
import { createUserClient } from '../lib/supabase.js';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents';

interface PlacesAddressComponent {
  longText?: string;
  types?: string[];
}

interface PlacesSearchResponse {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    addressComponents?: PlacesAddressComponent[];
  }>;
}

function componentByType(
  components: PlacesAddressComponent[] | undefined,
  type: string,
): string | null {
  return components?.find((c) => c.types?.includes(type))?.longText ?? null;
}

export async function gymRoutes(app: FastifyInstance) {
  // GET /api/gyms/search?query=&lat=&lng= — Google Places gym search, proxied
  // server-side so the API key never reaches the client.
  app.get<{ Querystring: { query?: string; lat?: string; lng?: string } }>(
    '/gyms/search',
    { preHandler: app.authenticate },
    async (req, reply) => {
      if (!app.config.GOOGLE_PLACES_API_KEY) {
        return sendError(reply, 503, 'places_not_configured', 'Gym search is not configured yet');
      }

      const query = req.query.query?.trim();
      if (!query || query.length < 2) {
        return sendError(reply, 400, 'validation_error', 'Query must be at least 2 characters');
      }

      const lat = req.query.lat ? Number(req.query.lat) : undefined;
      const lng = req.query.lng ? Number(req.query.lng) : undefined;
      const hasLocationBias = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

      const res = await fetch(PLACES_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': app.config.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': PLACES_FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: query,
          includedType: 'gym',
          ...(hasLocationBias && {
            locationBias: {
              circle: { center: { latitude: lat, longitude: lng }, radius: 20000 },
            },
          }),
        }),
      });

      if (!res.ok) {
        return sendError(reply, 502, 'places_search_failed', 'Gym search is unavailable');
      }

      const data = (await res.json()) as PlacesSearchResponse;
      const results: GymSearchResult[] = (data.places ?? [])
        .filter((p) => p.location?.latitude != null && p.location?.longitude != null)
        .map((p) => ({
          google_place_id: p.id,
          name: p.displayName?.text ?? 'Unnamed gym',
          address: p.formattedAddress ?? null,
          city: componentByType(p.addressComponents, 'locality'),
          state: componentByType(p.addressComponents, 'administrative_area_level_1'),
          country: componentByType(p.addressComponents, 'country'),
          lat: p.location!.latitude!,
          lng: p.location!.longitude!,
        }));

      return reply.send({ results });
    },
  );

  // POST /api/gyms/select — upsert the gym (by Google place id) and set it as
  // the caller's current gym via the select_gym RPC.
  app.post('/gyms/select', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = selectGymSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);

    const token = req.headers.authorization!.slice('Bearer '.length).trim();
    const userClient = createUserClient(app.config, token);
    const { data, error } = await userClient.rpc('select_gym', {
      p_google_place_id: parsed.data.google_place_id,
      p_name: parsed.data.name,
      p_address: parsed.data.address ?? null,
      p_city: parsed.data.city ?? null,
      p_state: parsed.data.state ?? null,
      p_country: parsed.data.country ?? null,
      p_lat: parsed.data.lat,
      p_lng: parsed.data.lng,
    });

    if (error) {
      return sendError(reply, 500, 'select_gym_failed', error.message);
    }

    const result: SelectGymResult = { gym_id: data as string };
    return reply.send(result);
  });
}
