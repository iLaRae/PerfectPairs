// app/api/localwine/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ---------------- Utilities ---------------- */

function sanitizeAndParseJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```(?:json)?|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

function milesBetween(lat1, lon1, lat2, lon2) {
  if (
    !Number.isFinite(lat1) || !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) || !Number.isFinite(lon2)
  ) return Number.POSITIVE_INFINITY;
  const toRad = (x) => (x * Math.PI) / 180;
  const R_km = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R_km * c;
  return km * 0.621371;
}

function clampRadius(val) {
  let r = Number(val);
  if (!Number.isFinite(r)) r = 15;
  return Math.min(50, Math.max(1, Math.round(r)));
}

function isZip5(z) {
  return /^\d{5}$/.test(z || '');
}

function priceLevelToSymbols(level) {
  const map = {
    PRICE_LEVEL_INEXPENSIVE: '$',
    PRICE_LEVEL_MODERATE: '$$',
    PRICE_LEVEL_EXPENSIVE: '$$$',
    PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
  };
  return map[level] || undefined;
}

/* ---------------- Geocoding (ZIP → coords) ---------------- */

async function geocodeZip(zip) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { latitude: null, longitude: null, ok: false, reason: 'missing_google_key' };

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&components=country:US|postal_code:${encodeURIComponent(zip)}&key=${key}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { latitude: null, longitude: null, ok: false, reason: 'http_error' };
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng)) {
      return { latitude: loc.lat, longitude: loc.lng, ok: true };
    }
    return { latitude: null, longitude: null, ok: false, reason: data?.status || 'no_results' };
  } catch {
    return { latitude: null, longitude: null, ok: false, reason: 'network_error' };
  }
}

/* ---------------- Places API (New) ---------------- */

function metersFromMiles(mi) {
  return Math.round(Number(mi) * 1609.344);
}

function pickPrimaryType(p) {
  const types = Array.isArray(p?.types) ? p.types : [];
  return p?.primary_type || (types.length ? types[0] : undefined);
}

// POST https://places.googleapis.com/v1/places:searchNearby
async function placesSearchNearby({ latitude, longitude, radiusMiles, maxResults = 20 }) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, reason: 'missing_google_key', places: [] };

  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const body = {
    includedTypes: ['restaurant'],
    maxResultCount: Math.min(20, Math.max(1, maxResults)),
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: metersFromMiles(radiusMiles),
      },
    },
  };

  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.primaryType',
    'places.rating',
    'places.userRatingCount',
    'places.priceLevel',
    'places.currentOpeningHours.openNow',
    'places.websiteUri',
    'places.googleMapsUri',
    'places.nationalPhoneNumber',
    'places.photos.name',
  ].join(',');

  try {
    const res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}`, places: [] };
    }

    const data = await res.json();
    const rawPlaces = Array.isArray(data?.places) ? data.places : [];

    const normalized = rawPlaces.map((p) => {
      const lat = p?.location?.latitude;
      const lon = p?.location?.longitude;
      const miles = milesBetween(latitude, longitude, lat, lon);

      const photoName = Array.isArray(p?.photos) && p.photos[0]?.name ? p.photos[0].name : null;

      return {
        place_id: p?.id,
        name: p?.displayName?.text,
        address: p?.formattedAddress,
        cuisine: (p?.primaryType || '').replace(/_/g, ' ') || (pickPrimaryType(p) || '').replace(/_/g, ' ') || undefined,
        rating: typeof p?.rating === 'number' ? p.rating : undefined,
        reviews: typeof p?.userRatingCount === 'number' ? p.userRatingCount : undefined,
        price: priceLevelToSymbols(p?.priceLevel),
        open_now: p?.currentOpeningHours?.openNow ?? undefined,
        phone: p?.nationalPhoneNumber || undefined,
        website: p?.websiteUri || undefined,
        maps_url: p?.googleMapsUri || undefined,
        lat,
        lon,
        miles: Math.round(miles * 10) / 10,
        photo_name: photoName || undefined,
      };
    });

    return { ok: true, places: normalized };
  } catch {
    return { ok: false, reason: 'network_error', places: [] };
  }
}

/* ---------------- OpenAI: regional popular wines (richer detail) ---------------- */

function coercePopularWines(payload) {
  // Accept either {wines:[...]} or an array
  const arr = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.wines) ? payload.wines : []);

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const out = arr.map((item) => {
    const name = String(item?.name || '').trim().slice(0, 140);
    const style = String(item?.style || item?.type || '').trim().slice(0, 60);
    const grape = String(item?.grape || '').trim().slice(0, 80);
    const region = String(item?.region || '').trim().slice(0, 120);
    const profile = String(item?.profile || item?.notes || item?.description || '').trim().slice(0, 300);

    const priceObj = item?.typical_price || item?.price || {};
    const currency = String(priceObj?.currency || '$').slice(0, 3);
    const glass = toNum(priceObj?.glass);
    const bottle = toNum(priceObj?.bottle);

    const food = Array.isArray(item?.food_pairings) ? item.food_pairings : [];
    const producers = Array.isArray(item?.notable_producers) ? item.notable_producers : [];

    const typical_abv = toNum(item?.typical_abv);

    return {
      name,
      style: style || undefined,
      grape: grape || undefined,
      region: region || undefined,
      profile: profile || undefined,
      typical_abv,
      typical_price: { currency, glass: glass ?? undefined, bottle: bottle ?? undefined },
      food_pairings: food.filter(Boolean).map((x) => String(x).slice(0, 60)).slice(0, 6),
      notable_producers: producers.filter(Boolean).map((x) => String(x).slice(0, 60)).slice(0, 6),
    };
  }).filter((w) => w.name);

  return out.slice(0, 6);
}

async function getPopularWinesForRegion(latitude, longitude) {
  const messages = [
    { role: 'system', content: 'You are a concise sommelier. Respond ONLY with JSON (no code fences, no prose).' },
    {
      role: 'user',
      content:
        `Given latitude=${latitude.toFixed(5)} and longitude=${longitude.toFixed(5)}, ` +
        `list 4–6 **popular wines** associated with this region (styles or emblematic grapes/labels). ` +
        `Return as {"wines":[{` +
        `"name":"",` +
        `"style":"red|white|rosé|sparkling|dessert|orange|other",` +
        `"grape":"",` +
        `"region":"",` +
        `"profile":"1–2 short sentences of tasting notes",` +
        `"typical_abv": <number>,` +
        `"typical_price":{"currency":"$","glass":<number|null>,"bottle":<number|null>},` +
        `"food_pairings":["",""],` +
        `"notable_producers":["",""]` +
        `}]}. Keep everything short and accurate. Do not include any keys not specified.`
    },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.2,
    max_tokens: 800,
  });

  const raw = completion?.choices?.[0]?.message?.content ?? '';
  const parsed = sanitizeAndParseJson(raw);
  let wines = coercePopularWines(parsed);

  // Fallback if model is unreachable or returns nothing
  if (wines.length === 0) {
    wines = [
      {
        name: 'Regional Red Blend',
        style: 'red',
        grape: 'Blend',
        region: 'Local appellation',
        profile: 'Medium-bodied, red berry and subtle spice.',
        typical_abv: 13.5,
        typical_price: { currency: '$', glass: 10, bottle: 38 },
        food_pairings: ['Roast chicken', 'Mushroom pasta'],
        notable_producers: ['Local Estate', 'Village Winery'],
      },
      {
        name: 'Coastal Rosé',
        style: 'rosé',
        grape: 'Grenache',
        region: 'Nearby coastal hills',
        profile: 'Dry and crisp with strawberry and citrus.',
        typical_abv: 12.5,
        typical_price: { currency: '$', glass: 9, bottle: 32 },
        food_pairings: ['Salads', 'Seafood'],
        notable_producers: ['Sunset Cellars'],
      },
      {
        name: 'Cool-Climate Chardonnay',
        style: 'white',
        grape: 'Chardonnay',
        region: 'Regional AVA',
        profile: 'Citrus, green apple, light oak.',
        typical_abv: 13.0,
        typical_price: { currency: '$', glass: 12, bottle: 45 },
        food_pairings: ['Grilled fish', 'Roast vegetables'],
        notable_producers: ['Hillside Winery'],
      },
    ];
  }

  return wines;
}

/* ---------------- Quick website probe for wine menu ---------------- */

async function fetchWithTimeout(url, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store', redirect: 'follow' });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function quickHasWineMenu(website, mapsUrl) {
  if (!website && !mapsUrl) return { has: false };

  const candidates = [];
  const add = (base, path) => {
    if (!base) return;
    if (path) {
      candidates.push(base.endsWith('/') ? base + path.replace(/^\//, '') : base + '/' + path.replace(/^\//, ''));
    } else {
      candidates.push(base);
    }
  };

  add(website);
  add(website, 'menu');
  add(website, 'wine');
  add(website, 'wine-list');
  add(website, 'drinks');
  add(website, 'beverage');
  if (mapsUrl) add(mapsUrl);

  const wineRe = /(?:\bWine\b|\bWine List\b|\bWines\b|\bBy the Glass\b|\bBottle\b)/i;

  for (const url of candidates) {
    try {
      const res = await fetchWithTimeout(url, 3500);
      if (!res.ok) continue;
      const ctype = res.headers.get('content-type') || '';
      if (!/text\/html/i.test(ctype)) continue;

      const html = (await res.text()).slice(0, 200000);
      if (wineRe.test(html)) {
        return { has: true, url };
      }
    } catch { /* continue */ }
  }

  return { has: false };
}

/* ------------------------- Route ------------------------- */

export async function GET(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Server misconfigured: OPENAI_API_KEY is not set.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const zip = searchParams.get('zip');
    const latStr = searchParams.get('latitude');
    const lonStr = searchParams.get('longitude');
    const radius = clampRadius(searchParams.get('radius'));

    let latitude;
    let longitude;
    let centerSource = 'gps';

    if (zip) {
      if (!isZip5(zip)) {
        return NextResponse.json({ error: 'Invalid ZIP format. Use 5-digit US ZIP.' }, { status: 400 });
      }
      const g = await geocodeZip(zip);
      if (!g.ok || !Number.isFinite(g.latitude) || !Number.isFinite(g.longitude)) {
        return NextResponse.json(
          { error: 'Unable to resolve ZIP to coordinates.' },
          { status: 400 }
        );
      }
      latitude = g.latitude;
      longitude = g.longitude;
      centerSource = 'zip';
    } else {
      if (!latStr || !lonStr) {
        return NextResponse.json({ error: 'Latitude and longitude are required when ZIP is not provided.' }, { status: 400 });
      }
      latitude = parseFloat(latStr);
      longitude = parseFloat(lonStr);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json(
          { error: 'Latitude/longitude must be valid numbers.' },
          { status: 400 }
        );
      }
      centerSource = 'gps';
    }

    // Nearby restaurants
    const nearby = await placesSearchNearby({ latitude, longitude, radiusMiles: radius, maxResults: 20 });
    let candidates = nearby.ok ? nearby.places : [];

    // Require a site or maps URL to probe
    const MAX_CHECK = Math.min(20, candidates.length);
    const BATCH = 5;
    candidates = candidates.slice(0, MAX_CHECK).filter((c) => c.website || c.maps_url);

    const filtered = [];
    for (let i = 0; i < candidates.length; i += BATCH) {
      const slice = candidates.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        slice.map(async (p) => {
          const probe = await quickHasWineMenu(p.website, p.maps_url);
          if (probe.has) {
            return {
              ...p,
              has_wine_menu: true,
              wine_menu_url: probe.url,
            };
          }
          return null;
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) filtered.push(r.value);
      }
    }

    const restaurants = filtered
      .sort((a, b) => {
        const rdiff = (b.rating ?? 0) - (a.rating ?? 0);
        if (Math.abs(rdiff) > 0.01) return rdiff;
        return (a.miles ?? 1e9) - (b.miles ?? 1e9);
      })
      .slice(0, 12);

    // Popular wines with detail
    const wines = await getPopularWinesForRegion(latitude, longitude);

    return NextResponse.json(
      {
        center: { latitude, longitude, radius_miles: radius, source: centerSource, zip: zip || undefined },
        source: { restaurants: 'google-places-new+wine-menu-probe', wines: 'openai-popular' },
        wines,
        restaurants,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in /api/localwine:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch local picks.' },
      { status: 500 }
    );
  }
}
