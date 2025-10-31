// LocalWineComponent.jsx
"use client";

import React, { useEffect, useRef, useState } from "react";

export default function LocalWineComponent() {
  // ---- Brand palette from image ----
  const PALETTE = {
    cream: "#F0EEEA",
    linen: "#DCD7D1",
    bluegray: "#718B9C",
    amber: "#DB9B3F",
    navy: "#143A56",
    burgundy: "#6E3538",
  };

  const [locationLabel, setLocationLabel] = useState("Location not set");
  const [coords, setCoords] = useState(null); // { lat, lon, acc, ts }
  const [radius, setRadius] = useState(15); // miles (1–50)
  const [zip, setZip] = useState(""); // ZIP input
  const [zipActive, setZipActive] = useState(false);
  const [zipError, setZipError] = useState("");

  const [wines, setWines] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);

  const debounceRef = useRef(null);
  const radiusDebounceRef = useRef(null);

  const validateZip = (z) => /^\d{5}$/.test(z);

  const formatLabelFromPos = (pos) => {
    const { latitude, longitude, accuracy } = pos.coords;
    const ts = new Date(pos.timestamp);
    return `Lat ${latitude.toFixed(4)} • Lon ${longitude.toFixed(4)} • ±${Math.round(
      accuracy
    )}m • ${ts.toLocaleTimeString()}`;
  };

  const fetchPicksByCoords = async (latitude, longitude, miles = radius) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/localwine?latitude=${latitude}&longitude=${longitude}&radius=${miles}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        let details = "";
        try {
          const j = await res.json();
          details = j?.error ? ` – ${j.error}` : "";
        } catch {}
        throw new Error(`HTTP ${res.status}${details}`);
      }
      const data = await res.json();
      setWines(Array.isArray(data?.wines) ? data.wines : []);
      setRestaurants(Array.isArray(data?.restaurants) ? data.restaurants : []);
    } catch (err) {
      console.error("Failed to fetch local picks:", err);
      setError(err?.message || "Failed to load local picks.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPicksByZip = async (zipCode, miles = radius) => {
    if (!validateZip(zipCode)) {
      setZipError("Enter a valid 5-digit ZIP");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/localwine?zip=${encodeURIComponent(zipCode)}&radius=${miles}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        let details = "";
        try {
          const j = await res.json();
          details = j?.error ? ` – ${j.error}` : "";
        } catch {}
        throw new Error(`HTTP ${res.status}${details}`);
      }
      const data = await res.json();
      setWines(Array.isArray(data?.wines) ? data.wines : []);
      setRestaurants(Array.isArray(data?.restaurants) ? data.restaurants : []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch local picks (zip):", err);
      setError(
        String(err?.message || "").includes("Unable to resolve ZIP")
          ? "Couldn’t find that ZIP. Double-check it or try a nearby ZIP."
          : err?.message || "Failed to load local picks."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationLabel("Geolocation not supported.");
      setError("Your browser does not support geolocation.");
      return;
    }
    setZipActive(false);
    setZipError("");
    try {
      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: "geolocation" });
          if (status.state === "denied") {
            setLocationLabel("Location permission denied.");
            setError("Enable location permissions to get nearby picks.");
            return;
          }
        } catch {}
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setCoords({ lat: latitude, lon: longitude, acc: accuracy, ts: pos.timestamp });
          setLocationLabel(formatLabelFromPos(pos));
          setLocating(false);
          fetchPicksByCoords(latitude, longitude, radius);
        },
        (geoErr) => {
          console.error("Geolocation error:", geoErr);
          setLocationLabel("Location access denied or unavailable.");
          setError("Could not get your location to recommend picks.");
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
      );
    } catch (e) {
      console.error(e);
      setLocating(false);
    }
  };

  // Debounce refetch when the radius changes
  useEffect(() => {
    if (radiusDebounceRef.current) clearTimeout(radiusDebounceRef.current);
    radiusDebounceRef.current = setTimeout(() => {
      if (zipActive && zip) {
        if (validateZip(zip)) fetchPicksByZip(zip, radius);
      } else if (coords) {
        fetchPicksByCoords(coords.lat, coords.lon, radius);
      }
    }, 350);
    return () => {
      if (radiusDebounceRef.current) clearTimeout(radiusDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  // Debounce ZIP typing; fetch when valid & activated
  useEffect(() => {
    setZipError("");
    if (!zipActive) return;
    if (!zip) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!validateZip(zip)) {
        setZipError("Enter a valid 5-digit ZIP");
        return;
      }
      fetchPicksByZip(zip, radius);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, zipActive]);

  return (
    <div
      className="
        w-full max-w-xl mx-auto
        rounded-3xl border
        backdrop-blur-xl shadow-2xl
        p-6 sm:p-8
        transition-colors
      "
      style={{
        // soft cream glass card with linen edge
        background: `linear-gradient(180deg, ${PALETTE.cream}CC, ${PALETTE.cream}99)`,
        borderColor: `${PALETTE.navy}26`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2
            className="text-xl sm:text-2xl font-semibold tracking-tight"
            style={{ color: PALETTE.navy }}
          >
            Local Picks (Wine Menus Only)
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: `${PALETTE.bluegray}` }}>
            {zipActive && zip ? `ZIP ${zip}` : locationLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(locating || loading) && (
            <div className="relative inline-flex w-8 h-8" aria-label="Loading">
              <span
                className="animate-spin inline-block w-full h-full rounded-full border-[3px] border-t-transparent"
                style={{
                  borderColor: `${PALETTE.bluegray}B3`,
                  borderRightColor: "transparent",
                }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (zipActive && zip) {
                if (validateZip(zip)) fetchPicksByZip(zip, radius);
                else setZipError("Enter a valid 5-digit ZIP");
              } else if (coords) {
                fetchPicksByCoords(coords.lat, coords.lon, radius);
              } else {
                handleUseMyLocation();
              }
            }}
            className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition active:opacity-90"
            style={{
              background: `linear-gradient(135deg, ${PALETTE.navy}, #0f2f47)`,
              color: PALETTE.cream,
              boxShadow: `0 8px 22px ${PALETTE.navy}44, inset 0 0 0 1px #ffffff14`,
              border: `1px solid ${PALETTE.amber}59`,
            }}
            disabled={locating || loading}
            title="Refresh picks"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ZIP controls */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            placeholder="Enter ZIP (US)"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
            className="w-full px-3 py-2 rounded-xl outline-none placeholder-opacity-70"
            style={{
              background: `${PALETTE.cream}CC`,
              border: `1px solid ${PALETTE.navy}33`,
              color: PALETTE.navy,
            }}
            aria-label="ZIP code"
          />
          {zipActive ? (
            <button
              type="button"
              onClick={() => {
                setZipActive(false);
                setZipError("");
                setWines([]);
                setRestaurants([]);
                setLocationLabel(coords ? "Location set (tap Refresh)" : "Location not set");
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium hover:opacity-90"
              style={{
                background: `${PALETTE.linen}B3`,
                color: PALETTE.navy,
                border: `1px solid ${PALETTE.navy}26`,
              }}
              title="Use current location instead"
            >
              Use my location
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!validateZip(zip)) {
                  setZipError("Enter a valid 5-digit ZIP");
                  return;
                }
                setZipActive(true);
                setLocationLabel(`ZIP ${zip}`);
                fetchPicksByZip(zip, radius);
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${PALETTE.navy}, #0f2f47)`,
                color: PALETTE.cream,
                border: `1px solid ${PALETTE.amber}59`,
              }}
              title="Search by ZIP"
            >
              Use ZIP
            </button>
          )}
        </div>

        {/* Radius control */}
        <div>
          <label
            htmlFor="radius"
            className="flex items-center justify-between mb-2"
            style={{ color: `${PALETTE.bluegray}` }}
          >
            <span className="text-xs sm:text-sm">Restaurant radius</span>
            <span className="font-medium tabular-nums text-xs sm:text-sm" style={{ color: PALETTE.navy }}>
              {radius} mi
            </span>
          </label>
          <input
            id="radius"
            type="range"
            min={1}
            max={50}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: PALETTE.amber }}
            aria-label="Restaurant radius in miles"
          />
          <div className="flex justify-between text-[11px] mt-1" style={{ color: PALETTE.bluegray }}>
            <span>1</span>
            <span>25</span>
            <span>50</span>
          </div>
        </div>
      </div>

      {/* Manual "Use my location" CTA */}
      {!zipActive && !coords && (
        <div className="mb-6">
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium transition active:opacity-90"
            style={{
              background: `linear-gradient(135deg, ${PALETTE.navy}, #0f2f47)`,
              color: PALETTE.cream,
              border: `1px solid ${PALETTE.amber}59`,
              boxShadow: `0 10px 24px ${PALETTE.navy}33`,
            }}
            disabled={locating}
          >
            {locating ? "Getting location…" : "Use my current location"}
          </button>
          <p className="mt-2 text-xs" style={{ color: `${PALETTE.bluegray}` }}>
            We’ll only request your location when you tap the button.
          </p>
        </div>
      )}

      {zipError && (
        <div
          className="mb-4 rounded-xl px-3 py-2 text-sm"
          style={{
            border: `1px solid ${PALETTE.amber}80`,
            background: `${PALETTE.amber}1A`,
            color: `${PALETTE.burgundy}`,
          }}
        >
          {zipError}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="rounded-2xl px-4 py-3"
          style={{
            border: `1px solid ${PALETTE.burgundy}66`,
            background: `${PALETTE.burgundy}14`,
            color: `${PALETTE.burgundy}`,
          }}
        >
          {error}
        </div>
      )}

      {/* Content */}
      {!error && (
        <div className="space-y-8">
          {/* Restaurants */}
          <section>
            <h3
              className="text-sm font-medium uppercase tracking-wider mb-3"
              style={{ color: `${PALETTE.bluegray}` }}
            >
              Nearby Restaurants With Wine Menus ({radius} mi)
            </h3>
            {loading ? (
              <SkeletonList palette={PALETTE} count={3} />
            ) : restaurants.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3">
                {restaurants.map((r, i) => (
                  <li
                    key={`${r.place_id || r.name}-${i}`}
                    className="group rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
                    style={{
                      background: `${PALETTE.cream}B3`,
                      border: `1px solid ${PALETTE.navy}26`,
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Photo */}
                      {r.photo_name ? (
                        <img
                          src={`/api/placesPhoto?name=${encodeURIComponent(r.photo_name)}&w=128&h=128`}
                          alt={r.name}
                          className="w-16 h-16 rounded-xl object-cover"
                          style={{ border: `1px solid ${PALETTE.navy}26`, background: PALETTE.linen }}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              `data:image/svg+xml;utf8,` +
                              encodeURIComponent(
                                `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
                                  <rect width='100%' height='100%' fill='${PALETTE.linen}'/>
                                  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
                                    font-family='system-ui, sans-serif' font-size='12' fill='${PALETTE.bluegray}'>
                                    No image
                                  </text>
                                </svg>`
                              );
                          }}
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center text-[11px]"
                          style={{
                            border: `1px solid ${PALETTE.navy}26`,
                            background: PALETTE.linen,
                            color: PALETTE.bluegray,
                          }}
                        >
                          No image
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-semibold truncate" style={{ color: PALETTE.navy }}>
                              {r.name}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: `${PALETTE.bluegray}` }}>
                              {r.cuisine || "Restaurant"}
                              {r.price ? ` • ${r.price}` : ""}
                              {r.rating ? ` • ${Number(r.rating).toFixed(1)}★` : ""}
                              {typeof r.reviews === "number" ? ` (${r.reviews})` : ""}
                            </p>
                            {r.address && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: `${PALETTE.bluegray}` }}>
                                {r.address}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {typeof r.miles === "number" && isFinite(r.miles) && (
                              <span
                                className="inline-flex items-center justify-center rounded-full px-2 py-1 text-[11px] font-medium"
                                style={{ background: PALETTE.navy, color: PALETTE.cream }}
                                title="Approximate distance"
                              >
                                {r.miles} mi
                              </span>
                            )}
                            <span
                              className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                              style={{ background: PALETTE.amber, color: "#fff" }}
                              title="Wine menu detected"
                            >
                              Wine menu
                            </span>
                          </div>
                        </div>

                        {/* Links */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {r.wine_menu_url && (
                            <a
                              href={r.wine_menu_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90"
                              style={{
                                background: `${PALETTE.linen}CC`,
                                color: PALETTE.navy,
                                border: `1px solid ${PALETTE.navy}26`,
                              }}
                              title="Open wine menu"
                            >
                              Wine Menu
                            </a>
                          )}
                          {r.website && (
                            <a
                              href={r.website}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90"
                              style={{
                                background: `${PALETTE.linen}CC`,
                                color: PALETTE.navy,
                                border: `1px solid ${PALETTE.navy}26`,
                              }}
                              title="Visit website"
                            >
                              Website
                            </a>
                          )}
                          {r.maps_url && (
                            <a
                              href={r.maps_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90"
                              style={{
                                background: `${PALETTE.linen}CC`,
                                color: PALETTE.navy,
                                border: `1px solid ${PALETTE.navy}26`,
                              }}
                              title="Open in Google Maps"
                            >
                              Maps
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                label={
                  zipActive || coords
                    ? "No wine menus found for this radius."
                    : "Choose ZIP or use your location to see restaurants with wine menus."
                }
                palette={PALETTE}
              />
            )}
          </section>

          {/* Popular wines with more detail */}
          <section>
            <h3
              className="text-sm font-medium uppercase tracking-wider mb-3"
              style={{ color: `${PALETTE.bluegray}` }}
            >
              Local Popular Wines (detailed)
            </h3>
            {loading ? (
              <SkeletonList palette={PALETTE} count={3} />
            ) : wines.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3">
                {wines.map((w, i) => (
                  <li
                    key={`${w.name}-${i}`}
                    className="group rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
                    style={{
                      background: `${PALETTE.cream}B3`,
                      border: `1px solid ${PALETTE.navy}26`,
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold" style={{ color: PALETTE.navy }}>
                          {w.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                          {w.style && (
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{ background: PALETTE.navy, color: PALETTE.cream }}
                            >
                              {w.style}
                            </span>
                          )}
                          {w.grape && (
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{ background: `${PALETTE.linen}CC`, color: PALETTE.navy }}
                            >
                              {w.grape}
                            </span>
                          )}
                          {w.region && (
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{ background: `${PALETTE.linen}CC`, color: PALETTE.navy }}
                            >
                              {w.region}
                            </span>
                          )}
                          {typeof w.typical_abv === "number" && (
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{ background: `${PALETTE.linen}CC`, color: PALETTE.navy }}
                            >
                              {w.typical_abv}% ABV
                            </span>
                          )}
                          {(w.typical_price?.glass || w.typical_price?.bottle) && (
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{ background: `${PALETTE.linen}CC`, color: PALETTE.navy }}
                            >
                              {w.typical_price?.glass
                                ? `${w.typical_price.currency}${w.typical_price.glass} glass`
                                : ""}
                              {w.typical_price?.glass && w.typical_price?.bottle ? " · " : ""}
                              {w.typical_price?.bottle
                                ? `${w.typical_price.currency}${w.typical_price.bottle} bottle`
                                : ""}
                            </span>
                          )}
                        </div>

                        {w.profile && (
                          <p className="text-sm mt-2 leading-relaxed" style={{ color: `${PALETTE.bluegray}` }}>
                            {w.profile}
                          </p>
                        )}

                        {(w.food_pairings?.length || w.notable_producers?.length) && (
                          <div className="mt-2 grid grid-cols-1 gap-2">
                            {w.food_pairings?.length > 0 && (
                              <div className="text-xs" style={{ color: `${PALETTE.bluegray}` }}>
                                <span className="font-semibold" style={{ color: PALETTE.navy }}>
                                  Pairs with:
                                </span>{" "}
                                {w.food_pairings.join(", ")}
                              </div>
                            )}
                            {w.notable_producers?.length > 0 && (
                              <div className="text-xs" style={{ color: `${PALETTE.bluegray}` }}>
                                <span className="font-semibold" style={{ color: PALETTE.navy }}>
                                  Notable producers:
                                </span>{" "}
                                {w.notable_producers.join(", ")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                label={
                  zipActive || coords ? "No regional wine info found." : "Choose ZIP or use your location to see popular wines."
                }
                palette={PALETTE}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/* ---------- Presentational helpers ---------- */

function SkeletonList({ count = 3, palette }) {
  return (
    <ul className="grid grid-cols-1 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="rounded-2xl px-4 py-3"
          style={{
            background: `${palette.cream}80`,
            border: `1px solid ${palette.navy}26`,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            className="h-4 w-2/5 rounded animate-pulse"
            style={{ background: `${palette.bluegray}55` }}
          />
          <div
            className="mt-2 h-3 w-3/5 rounded animate-pulse"
            style={{ background: `${palette.bluegray}40` }}
          />
          <div
            className="mt-2 h-3 w-4/5 rounded animate-pulse"
            style={{ background: `${palette.bluegray}40` }}
          />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ label, palette }) {
  return (
    <div
      className="rounded-2xl px-4 py-6 text-sm"
      style={{
        background: `${palette.cream}80`,
        border: `1px solid ${palette.navy}26`,
        color: palette.bluegray,
      }}
    >
      {label}
    </div>
  );
}
