// app/components/wine/WineFinder.jsx
"use client";

import { useEffect, useMemo, useState } from "react";

export default function WineFinder() {
  const [q, setQ] = useState("");
  const [zip, setZip] = useState("");                // ZIP input
  const [coords, setCoords] = useState(null);        // { lat, lng }
  const [locStatus, setLocStatus] = useState("idle");// idle | prompting | granted | denied | error
  const [loadingLoc, setLoadingLoc] = useState(false);

  const [maxDistanceKm, setMaxDistanceKm] = useState(8);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  // Reflect existing geolocation permission in UI if available
  useEffect(() => {
    let cancelled = false;
    async function checkPerm() {
      try {
        if (!("permissions" in navigator)) return;
        const p = await navigator.permissions.query({ name: "geolocation" });
        if (cancelled) return;
        if (p.state === "granted") setLocStatus("granted");
        else if (p.state === "denied") setLocStatus("denied");
        p.onchange = () => {
          if (p.state === "granted") setLocStatus("granted");
          else if (p.state === "denied") setLocStatus("denied");
          else setLocStatus("idle");
        };
      } catch {}
    }
    checkPerm();
    return () => { cancelled = true; };
  }, []);

  const canSearch = useMemo(
    () => Boolean(q.trim()) || Boolean(coords) || zip.trim().length > 0,
    [q, coords, zip]
  );

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      return;
    }
    setLoadingLoc(true);
    setLocStatus("prompting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingLoc(false);
        setLocStatus("granted");
      },
      (e) => {
        setLoadingLoc(false);
        if (e?.code === 1) setLocStatus("denied"); // PERMISSION_DENIED
        else setLocStatus("error");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function handleSearch(e) {
    e?.preventDefault?.();
    if (!canSearch) return;

    setBusy(true);
    setErr("");
    setItems([]);

    // Choose coordinates: geolocation first, else ZIP → coords
    let latLng = coords;
    if (!latLng && zip.trim()) {
      try {
        latLng = await geocodeZip(zip.trim());
      } catch {
        if (!coords) {
          setBusy(false);
          setErr("Could not resolve that ZIP. Try a different ZIP or use your location.");
          return;
        }
      }
    }

    try {
      const res = await fetch("/api/wine-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: q.trim(),
          lat: latLng?.lat ?? null,
          lng: latLng?.lng ?? null,
          radiusMeters: Math.max(1000, maxDistanceKm * 2000),  // discover slightly wider
          maxDistanceMeters: Math.max(1000, Math.round(maxDistanceKm * 1000)),
          limit: 24,
          // storesAllowlist: ["Total Wine", "BevMo"], // optional
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Search failed (HTTP ${res.status})`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setErr(e?.message || "Search failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold">Wine List Finder</h2>
        <p className="mt-1 text-sm text-gray-600">
          Search nearby wines by name or style, ranked by proximity.
        </p>

        <form onSubmit={handleSearch} className="mt-4 space-y-3">
          {/* Query + ZIP + Use my location */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.3fr_0.8fr_auto]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search wines (e.g., "Pinot Noir", "Cabernet")'
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base outline-none focus:ring-2 focus:ring-amber-500"
              autoComplete="off"
            />
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/[^0-9\- ]/g, ""))}
              inputMode="numeric"
              placeholder="ZIP code (optional)"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base outline-none focus:ring-2 focus:ring-amber-500"
              autoComplete="postal-code"
            />
            <button
              type="button"
              onClick={requestLocation}
              disabled={loadingLoc}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              title="Prompt the browser to allow your current location"
            >
              {loadingLoc ? "Locating…" : "Use my location"}
            </button>
          </div>

          {/* Location status hint */}
          <div className="text-xs text-gray-600">
            {locStatus === "granted" && coords ? (
              <span>Using your location: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
            ) : locStatus === "denied" ? (
              <span>Permission denied. Enter a ZIP or allow location in your browser settings.</span>
            ) : locStatus === "error" ? (
              <span>Couldn’t access location. Enter a ZIP instead or try again.</span>
            ) : (
              <span>Tip: Click “Use my location” for the best proximity results.</span>
            )}
          </div>

          {/* Distance slider */}
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[auto_1fr_auto]">
            <label className="text-sm font-medium text-gray-700">Max distance</label>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
            <span className="text-sm tabular-nums text-gray-700">{maxDistanceKm} km</span>
          </div>

          <div>
            <button
              type="submit"
              disabled={busy || !canSearch}
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Searching…" : "Find Wines"}
            </button>
          </div>

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      <div className="mt-6">
        {busy ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-black">
            No results yet. Try a search!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <WineCard key={it.id} item={it} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Presentational ---------- */

function WineCard({ item }) {
  const price =
    item?.price?.amount != null
      ? formatCurrency(item.price.amount, item.price.currency || "USD")
      : "—";
  const distKm =
    item?.store?.distanceMeters != null
      ? `${(item.store.distanceMeters / 1000).toFixed(1)} km`
      : null;

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100">
        {item?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{item.name}</h3>
            {item?.varietal && (
              <p className="mt-0.5 truncate text-sm text-gray-500">{item.varietal}</p>
            )}
          </div>
          <div className="whitespace-nowrap rounded-lg bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-700">
            {price}
          </div>
        </div>

        {item?.rating != null && (
          <div className="mt-2 text-sm text-gray-600">⭐ {Number(item.rating).toFixed(1)}</div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{item?.store?.name || "Local Store"}</span>
          {distKm && <span>• {distKm} away</span>}
          {item?.store?.openNow != null && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                item.store.openNow
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {item.store.openNow ? "Open now" : "Closed"}
            </span>
          )}
        </div>

        {item?.store?.address && (
          <div className="mt-1 line-clamp-2 text-sm text-gray-500">{item.store.address}</div>
        )}

        {item?.store?.url && (
          <div className="mt-3">
            <a
              href={item.store.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-amber-300 hover:text-amber-700"
            >
              View listing
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path d="M7 17L17 7M17 7H9M17 7v8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="aspect-[4/3] w-full bg-gray-100" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-2/3 rounded bg-gray-100" />
        <div className="h-4 w-1/3 rounded bg-gray-100" />
        <div className="h-4 w-1/2 rounded bg-gray-100" />
        <div className="h-9 w-28 rounded bg-gray-100" />
      </div>
    </div>
  );
}

/* ---------- Utils ---------- */

function formatCurrency(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
}

// Simple ZIP → lat/lng via OpenStreetMap Nominatim (demo; swap to Google if desired)
async function geocodeZip(zip) {
  const clean = zip.replace(/[^0-9]/g, "");
  if (clean.length < 3) throw new Error("short zip");
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&postalcode=${encodeURIComponent(
    clean
  )}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("zip not found");
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}
