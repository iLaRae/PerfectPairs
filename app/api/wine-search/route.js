// app/api/wine-search/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wine-search
 * Body:
 *  {
 *    q?: string,
 *    lat?: number,
 *    lng?: number,
 *    radiusMeters?: number,        // search radius to discover nearby stores
 *    maxDistanceMeters?: number,   // HARD filter for results (<= this distance)
 *    limit?: number,
 *    storesAllowlist?: string[]    // e.g., ["Total Wine", "BevMo"]
 *  }
 *
 * Returns: { items: WineResult[] }
 * WineResult = {
 *   id: string,
 *   name: string,
 *   varietal?: string,
 *   price?: { amount: number, currency: string },
 *   image?: string,
 *   rating?: number,
 *   store?: {
 *     name: string,
 *     address?: string,
 *     distanceMeters?: number,
 *     openNow?: boolean,
 *     url?: string
 *   }
 * }
 */

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      q = "",
      lat = null,
      lng = null,
      radiusMeters = 8000,
      maxDistanceMeters = null,
      limit = 24,
      storesAllowlist = null,
    } = body || {};

    if (lat == null || lng == null) {
      if (!q) {
        return Response.json(
          { error: "Provide {lat,lng} for proximity search (optionally with 'q')." },
          { status: 400 }
        );
      }
    }

    // 1) Nearby stores (Google Places)
    const places =
      lat != null && lng != null
        ? await fetchNearbyWineStores({ lat, lng, radiusMeters })
        : [];

    // 2) Choose retailer scrapers (prefer nearby or allowlist)
    const nearbyNames = new Set(places.map((p) => (p.name || "").toLowerCase()));
    const allowlist = (storesAllowlist || []).map((s) => s.toLowerCase());
    const adaptersCatalog = [
      { brand: "Total Wine & More", fn: scrapeTotalWine },
      { brand: "BevMo!", fn: scrapeBevMo },
      // Add more chains here as needed…
    ];
    const adapters = adaptersCatalog.filter(({ brand }) => {
      const b = brand.toLowerCase();
      if (allowlist.length > 0) return allowlist.some((a) => b.includes(a));
      // if no explicit allowlist, only run scrapers if a similar brand is detected nearby
      return places.length === 0 || setHasFuzzy(nearbyNames, b);
    });

    // 3) Run scrapers in parallel with a soft timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const results = await Promise.allSettled(
      adapters.map(({ fn }) => fn({ q, lat, lng, places, signal: controller.signal }))
    );
    clearTimeout(timeout);

    // 4) Flatten, normalize, de-dup
    let items = results
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter(Boolean)
      .map(normalizeItem);

    const seen = new Set();
    items = items.filter((it) => {
      const key = `${(it.name || "").toLowerCase()}|${(it.store?.name || "").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 5) HARD proximity filter (optional)
    if (maxDistanceMeters != null) {
      const maxD = Number(maxDistanceMeters);
      items = items.filter(
        (it) => it?.store?.distanceMeters != null && it.store.distanceMeters <= maxD
      );
    }

    // 6) Sort by distance → price → name
    items.sort((a, b) => {
      const da = a.store?.distanceMeters ?? Infinity;
      const db = b.store?.distanceMeters ?? Infinity;
      if (da !== db) return da - db;
      const pa = a.price?.amount ?? Infinity;
      const pb = b.price?.amount ?? Infinity;
      if (pa !== pb) return pa - pb;
      return (a.name || "").localeCompare(b.name || "");
    });

    // 7) Fill missing images with nearest place photo
    if (places?.length) {
      const nearest = [...places].sort(
        (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity)
      )[0];
      for (const it of items) if (!it.image && nearest?.photoUrl) it.image = nearest.photoUrl;
    }

    // 8) Limit or mock
    if (items.length === 0) {
      return Response.json(
        { items: buildMockResults({ q, lat, lng, limit }) },
        { status: 200 }
      );
    }

    items = items.slice(0, Math.max(1, Math.min(limit, items.length)));
    return Response.json({ items }, { status: 200 });
  } catch (err) {
    console.error("wine-search error:", err);
    return Response.json({ error: "Unexpected server error. Check logs." }, { status: 500 });
  }
}

/* ---------------------------
   Google Places helpers
---------------------------- */

async function fetchNearbyWineStores({ lat, lng, radiusMeters }) {
  const placesKey = process.env.GOOGLE_MAPS_API_KEY; // <— single declaration (no duplicates)
  if (!placesKey) return [];

  const types = ["liquor_store", "supermarket", "grocery_or_supermarket"];
  const base = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

  const all = [];
  for (const type of types) {
    let pageToken = null;
    for (let page = 0; page < 2; page++) {
      const url = new URL(base);
      url.searchParams.set("key", placesKey);
      url.searchParams.set("location", `${lat},${lng}`);
      url.searchParams.set("radius", String(radiusMeters));
      url.searchParams.set("type", type);
      if (pageToken) url.searchParams.set("pagetoken", pageToken);

      const data = await googleFetchJson(url.toString());
      if (!data) break;

      (data.results || []).forEach((r) => {
        all.push({
          placeId: r.place_id,
          name: r.name,
          lat: r.geometry?.location?.lat,
          lng: r.geometry?.location?.lng,
          address: r.vicinity,
          openNow: r.opening_hours?.open_now ?? undefined,
          rating: r.rating,
          userRatingsTotal: r.user_ratings_total,
          photoRef: r.photos?.[0]?.photo_reference,
        });
      });

      pageToken = data.next_page_token || null;
      if (!pageToken) break;
      await new Promise((r) => setTimeout(r, 1500)); // required pacing for next_page_token
    }
  }

  // Distance + photo URL
  for (const s of all) {
    s.distanceMeters = s.lat && s.lng ? haversineMeters(lat, lng, s.lat, s.lng) : undefined;
    if (s.photoRef) {
      s.photoUrl = buildPlacePhotoUrl(s.photoRef, placesKey, 600);
    }
  }

  // Deduplicate by placeId
  const map = new Map();
  for (const s of all) map.set(s.placeId, s);
  return Array.from(map.values());
}

async function googleFetchJson(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return null;
}

function buildPlacePhotoUrl(photoRef, key, maxWidth = 800) {
  const u = new URL("https://maps.googleapis.com/maps/api/place/photo");
  u.searchParams.set("maxwidth", String(maxWidth));
  u.searchParams.set("photo_reference", photoRef);
  u.searchParams.set("key", key);
  return u.toString();
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ---------------------------
   Retailer scrapers (examples)
---------------------------- */

async function scrapeTotalWine({ q, lat, lng, places, signal }) {
  try {
    const base = "https://www.totalwine.com";
    const searchUrl = `${base}/search/all?text=${encodeURIComponent(q || "")}`;
    const html = await safeGet(searchUrl, { signal });
    if (!html) return [];

    const items = [];
    const cardRegex = /<a[^>]+data-testid="productCard"[\s\S]*?<\/a>/gi;
    const priceRegex = /\$([0-9]+(?:\.[0-9]{2})?)/;
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/i;
    const linkRegex = /href="([^"]+)"/i;

    const cards = html.match(cardRegex) || [];
    for (let i = 0; i < Math.min(cards.length, 12); i++) {
      const c = cards[i];
      const imgMatch = c.match(imgRegex);
      const linkMatch = c.match(linkRegex);
      const priceMatch = c.match(priceRegex);

      const rawName = imgMatch?.[2] || "Wine";
      const name = sanitizeText(rawName);
      const imgSrc = imgMatch?.[1] || null;
      const image = imgSrc ? (imgSrc.startsWith("http") ? imgSrc : `${base}${imgSrc}`) : null;
      const link = linkMatch?.[1] || null;
      const url = link ? (link.startsWith("http") ? link : `${base}${link}`) : null;
      const amount = priceMatch ? Number(priceMatch[1]) : undefined;

      items.push({
        id: `totalwine-${i}-${name.slice(0, 12)}`,
        name,
        price: amount != null ? { amount, currency: "USD" } : undefined,
        image: image || undefined,
        store: closestStoreMeta("Total Wine & More", places, lat, lng, url),
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function scrapeBevMo({ q, lat, lng, places, signal }) {
  try {
    const base = "https://www.bevmo.com";
    const searchUrl = `${base}/search?q=${encodeURIComponent(q || "")}`;
    const html = await safeGet(searchUrl, { signal });
    if (!html) return [];

    const items = [];
    const cardRegex = /<a[^>]+class="product-tile__image-link"[\s\S]*?<\/a>/gi;
    const priceRegex = /\$([0-9]+(?:\.[0-9]{2})?)/;
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/i;
    const linkRegex = /href="([^"]+)"/i;

    const cards = html.match(cardRegex) || [];
    for (let i = 0; i < Math.min(cards.length, 10); i++) {
      const c = cards[i];
      const imgMatch = c.match(imgRegex);
      const linkMatch = c.match(linkRegex);
      const priceMatch = c.match(priceRegex);

      const rawName = imgMatch?.[2] || "Wine";
      const name = sanitizeText(rawName);
      const imgSrc = imgMatch?.[1] || null;
      const image = imgSrc ? (imgSrc.startsWith("http") ? imgSrc : `${base}${imgSrc}`) : null;
      const link = linkMatch?.[1] || null;
      const url = link ? (link.startsWith("http") ? link : `${base}${link}`) : null;
      const amount = priceMatch ? Number(priceMatch[1]) : undefined;

      items.push({
        id: `bevmo-${i}-${name.slice(0, 12)}`,
        name,
        price: amount != null ? { amount, currency: "USD" } : undefined,
        image: image || undefined,
        store: closestStoreMeta("BevMo!", places, lat, lng, url),
      });
    }
    return items;
  } catch {
    return [];
  }
}

/* ---------------------------
   Utilities & fallbacks
---------------------------- */

function closestStoreMeta(brand, places, lat, lng, url) {
  const candidate = places
    ?.filter((p) => (p.name || "").toLowerCase().includes(brand.toLowerCase()))
    ?.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))?.[0];

  return {
    name: candidate?.name || brand,
    address: candidate?.address || undefined,
    distanceMeters: candidate?.distanceMeters,
    openNow: candidate?.openNow,
    url: url || undefined,
  };
}

function sanitizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function normalizeItem(it) {
  const out = { ...it };
  if (out.price?.amount != null) {
    const n = Number(out.price.amount);
    if (!Number.isFinite(n)) delete out.price;
    else out.price.amount = n;
  }
  if (out.varietal) out.varietal = normalizeVarietal(out.varietal);
  return out;
}

function normalizeVarietal(v) {
  const s = sanitizeText(v).toLowerCase();
  const map = [
    ["pinot noir", /pinot\s*noir/i],
    ["cabernet sauvignon", /cab(ernet)?\s*sauv/i],
    ["sauvignon blanc", /sauvignon\s*blanc/i],
    ["chardonnay", /chardonnay/i],
    ["merlot", /merlot/i],
    ["syrah/shiraz", /(syrah|shiraz)/i],
    ["zinfandel", /zinfandel/i],
    ["sparkling", /(sparkling|prosecco|cava|champagne)/i],
    ["rosé", /(rose|ros\u00e9)/i],
  ];
  for (const [norm, rx] of map) if (rx.test(s)) return norm;
  return sanitizeText(v);
}

async function safeGet(url, { signal } = {}) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function buildMockResults({ q, lat, lng, limit }) {
  const sample = [
    {
      id: "mock-1",
      name: q ? `${capitalize(q)} Reserve Pinot Noir` : "Reserve Pinot Noir",
      varietal: "Pinot Noir",
      price: { amount: 24.99, currency: "USD" },
      image:
        "https://images.unsplash.com/photo-1523365280197-f1783db9fe62?w=800&q=80",
      rating: 4.3,
      store: {
        name: "Neighborhood Wine & Spirits",
        address: "123 Main St",
        distanceMeters: 1200,
        openNow: true,
        url: "https://example.com/pinot",
      },
    },
    {
      id: "mock-2",
      name: q ? `${capitalize(q)} Sauvignon Blanc` : "Crisp Sauvignon Blanc",
      varietal: "Sauvignon Blanc",
      price: { amount: 17.5, currency: "USD" },
      image:
        "https://images.unsplash.com/photo-1541976076758-347942db197e?w=800&q=80",
      rating: 4.1,
      store: {
        name: "City Bottle Shop",
        address: "456 Oak Ave",
        distanceMeters: 2600,
        openNow: false,
        url: "https://example.com/sb",
      },
    },
  ];
  return sample.slice(0, Math.max(1, Math.min(limit ?? 24, sample.length)));
}

function capitalize(s) {
  try {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  } catch {
    return s;
  }
}

function setHasFuzzy(setLowercaseNames, brandLower) {
  for (const n of setLowercaseNames) {
    if (n.includes(brandLower) || brandLower.includes(n)) return true;
  }
  return false;
}
