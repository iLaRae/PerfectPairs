// components/WinePairingForm.jsx
"use client";

import { useRef, useState, useMemo } from "react";
import WineTypeGrid from "./WineTypeGrid";
import SommelierChat from "./SommelierChat";
import CameraOrUpload from "./CameraOrUpload";

export default function WinePairingForm() {
  const fileRef = useRef(null); // kept for compatibility if needed

  // Favorite wine types
  const [selectedTypes, setSelectedTypes] = useState([]);
  const favorites = useMemo(() => selectedTypes, [selectedTypes]);

  // Dinner menu selections + freeform notes
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [mealNotes, setMealNotes] = useState("");

  // Photo / extraction / results
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [pairings, setPairings] = useState(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [loadingPair, setLoadingPair] = useState(false);
  const [error, setError] = useState(null);

  // Per-item “More info” state
  const [moreInfo, setMoreInfo] = useState({});

  async function onExtract() {
    try {
      setError(null);
      setLoadingExtract(true);
      setExtracted(null);

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extract failed");
      setExtracted(data.wines || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingExtract(false);
    }
  }

  async function onPair() {
    try {
      setError(null);
      setLoadingPair(true);
      setPairings(null);
      setMoreInfo({});

      const prettyFavorites = selectedTypes.map(capWordsFromKey);
      const prettyDishes = selectedDishes.map(capWordsFromKey);
      const combinedMeal =
        (prettyDishes.length ? `Dishes: ${prettyDishes.join(", ")}` : "") +
        (mealNotes.trim()
          ? (prettyDishes.length ? " — " : "") + mealNotes.trim()
          : "");

      const res = await fetch("/api/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favorites: prettyFavorites,
          meal: combinedMeal || mealNotes || "(unspecified)",
          wines: extracted || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pairing failed");
      setPairings(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPair(false);
    }
  }

  async function onMoreInfo(i, item) {
    try {
      setMoreInfo((m) => ({ ...m, [i]: { loading: true, text: "", err: "" } }));

      const prettyFavorites = selectedTypes.map(capWordsFromKey);
      const prettyDishes = selectedDishes.map(capWordsFromKey);
      const mealContext =
        (prettyDishes.length ? `Dishes: ${prettyDishes.join(", ")}` : "") +
        (mealNotes.trim()
          ? (prettyDishes.length ? " — " : "") + mealNotes.trim()
          : "");

      const question = `Give a bit more detail about why “${item.wine}” (rank ${
        i + 1
      }, score ${item.score ?? "—"}) pairs well with my meal. Focus on acidity, tannins, body, flavor bridges, and possible pitfalls.`;

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          meal: mealContext || mealNotes || "(unspecified)",
          favorites: prettyFavorites,
          wines: extracted || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch details");

      setMoreInfo((m) => ({
        ...m,
        [i]: { loading: false, text: data.answer || "No extra info provided.", err: "" },
      }));
    } catch (e) {
      setMoreInfo((m) => ({
        ...m,
        [i]: { loading: false, text: "", err: e.message || "Something went wrong." },
      }));
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Favorite Wine Types */}
      <div className="card bg-base-100 shadow-xl rounded-3xl ring-1 ring-white/10">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Your Favorite Wine Types</h2>
            <div className="badge badge-neutral">Optional</div>
          </div>

          <WineTypeGrid multi onChange={setSelectedTypes} />

          {favorites.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {favorites.map((k) => (
                <div key={k} className="badge badge-outline badge-lg gap-1">
                  {capWordsFromKey(k)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dinner Menu + Notes */}
      <div className="card bg-base-100 shadow-xl rounded-3xl ring-1 ring-white/10">
        <div className="card-body gap-5">
          <div className="flex items-center justify-between">
            <h2 className="card-title">What are you eating?</h2>
            <div className="badge badge-secondary badge-outline">Menu</div>
          </div>

          <WineTypeGrid items={DINNER_ITEMS} multi onChange={setSelectedDishes} />

          {selectedDishes.length > 0 && (
            <div className="flex flex-wrap gap-2 -mt-1">
              {selectedDishes.map((k) => (
                <div key={k} className="badge badge-neutral gap-1">
                  {capWordsFromKey(k)}
                </div>
              ))}
            </div>
          )}

          <div className="mt-2">
            <label className="label pb-1">
              <span className="label-text">
                Add more detail (sauce, doneness, spice level, sides…)
              </span>
            </label>
            <textarea
              value={mealNotes}
              onChange={(e) => setMealNotes(e.target.value)}
              className="textarea textarea-bordered min-h-28 w-full"
              placeholder="e.g., Medium-rare ribeye with peppercorn sauce; truffle fries"
            />
          </div>
        </div>
      </div>

      {/* Camera or Upload + Extract */}
      <CameraOrUpload title="Wine List Photo" onCapture={(dataUrl) => setImageDataUrl(dataUrl)} />

      {imageDataUrl && (
        <div className="flex justify-end">
          <button
            onClick={onExtract}
            disabled={!imageDataUrl || loadingExtract}
            className="btn btn-secondary btn-wide rounded-2xl"
          >
            {loadingExtract ? <span className="loading loading-spinner" /> : "Extract Wine List"}
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Extracted Wines */}
      {extracted && (
        <div className="card bg-base-100 shadow-xl rounded-3xl ring-1 ring-white/10">
          <div className="card-body gap-4">
            <div className="flex items-center justify-between">
              <h2 className="card-title">Extracted Wines</h2>
              <div className="badge badge-outline">Structured JSON</div>
            </div>

            {loadingExtract ? (
              <ul className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-2xl bg-base-200 animate-pulse flex items-center gap-3"
                  >
                    <div className="size-12 rounded-2xl bg-base-300" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/5 bg-base-300 rounded" />
                      <div className="h-3 w-3/5 bg-base-300 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-base-300 rounded" />
                  </li>
                ))}
              </ul>
            ) : extracted.length === 0 ? (
              <p className="opacity-70">
                No wines detected. Try a clearer photo or different lighting.
              </p>
            ) : (
              <ul className="space-y-3">
                {extracted.map((w, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-2xl bg-base-200 ring-1 ring-white/10 flex items-center gap-3"
                  >
                    {/* mini glossy tile */}
                    <div
                      className="size-12 rounded-2xl ring-1 ring-white/10 shadow"
                      style={{
                        background:
                          "linear-gradient(180deg, #0f172a 0%, #0b1022 100%)",
                      }}
                    >
                      <div className="grid place-items-center h-full text-xl">
                        {pickEmoji(w)}
                      </div>
                    </div>

                    {/* details */}
                    <div className="flex-1">
                      <div className="font-medium leading-tight">
                        {w.name || "Unknown wine"}
                      </div>
                      <div className="text-xs opacity-75">
                        {[
                          w.vintage && `(${w.vintage})`,
                          w.region,
                          w.country,
                          w.variety_or_style,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </div>

                    {/* right-side chips */}
                    <div className="flex items-center gap-2">
                      {w.by_glass && (
                        <span className="badge badge-ghost badge-sm">By Glass</span>
                      )}
                      {w.price != null && (
                        <span className="badge badge-outline badge-sm">
                          ${w.price}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Pair button */}
            <div className="mt-3 flex justify-end">
              <button
                onClick={onPair}
                disabled={
                  (extracted?.length ?? 0) === 0 ||
                  (!selectedDishes.length && !mealNotes.trim()) ||
                  loadingPair
                }
                className="btn btn-primary btn-wide rounded-2xl shadow-lg"
              >
                {loadingPair ? <span className="loading loading-spinner" /> : "Rank Pairings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pairing Results */}
      {pairings && (
        <div className="card bg-base-100 shadow-2xl rounded-3xl ring-1 ring-white/10 overflow-hidden">
          <div className="card-body gap-5">
            <div className="flex items-center justify-between">
              <h2 className="card-title">Best Pairings</h2>
              <div className="badge badge-success badge-outline">Ranked</div>
            </div>

            {Array.isArray(pairings.ranked) && pairings.ranked.length > 0 ? (
              <ol className="space-y-4 counter-reset">
                {pairings.ranked.map((r, i) => {
                  const info = moreInfo[i] || { loading: false, text: "", err: "" };
                  return (
                    <li key={i} className="relative group">
                      <div className="flex items-start gap-3">
                        {/* Number */}
                        <div
                          className="shrink-0 grid place-items-center size-10 rounded-2xl ring-1 ring-white/10 text-white font-semibold shadow"
                          style={{
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)",
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          {i + 1}
                        </div>

                        {/* Card */}
                        <div className="flex-1 rounded-3xl ring-1 ring-white/10 bg-base-200/70 shadow p-4 md:p-5">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <div className="text-lg md:text-xl font-semibold leading-tight">
                              {r.wine}
                            </div>
                            {typeof r.score === "number" && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium ring-1 ring-white/10 bg-base-100/70">
                                Score {r.score}
                              </span>
                            )}
                            {r.estimated_price != null && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium ring-1 ring-white/10 bg-base-100/70">
                                Est. ${r.estimated_price}
                              </span>
                            )}
                          </div>

                          {r.why && (
                            <p className="mt-2 text-sm opacity-80">{r.why}</p>
                          )}

                          {/* Actions */}
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              onClick={() => onMoreInfo(i, r)}
                              className="btn btn-ghost btn-sm rounded-xl"
                              disabled={info.loading}
                            >
                              {info.loading ? (
                                <span className="loading loading-dots loading-sm" />
                              ) : (
                                <>More info</>
                              )}
                            </button>
                            <span className="opacity-50 text-xs">
                              Ask the sommelier bot for deeper detail
                            </span>
                          </div>

                          {/* Inline expandable detail */}
                          {(info.text || info.err || info.loading) && (
                            <div className="mt-3 rounded-2xl ring-1 ring-white/10 bg-base-100/80 p-3">
                              {info.err ? (
                                <div className="text-error text-sm">{info.err}</div>
                              ) : info.loading ? (
                                <div className="text-sm opacity-80">
                                  <span className="loading loading-dots loading-sm mr-1" />
                                  Fetching more insight…
                                </div>
                              ) : (
                                <div className="text-sm whitespace-pre-wrap">
                                  {info.text}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="opacity-70">No ranking produced.</p>
            )}

            {pairings.notes && (
              <div className="alert mt-2">
                <span>{pairings.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Sommelier launcher (modal opens with full chat) */}
      <SommelierChat
        busy={loadingPair}
        avatarSrc="/sommelier-head.png"
        position="bottom-right" // or "top-right", "bottom-left", "top-left"
        context={{
          meal:
            (selectedDishes.length
              ? `Dishes: ${selectedDishes.map(capWordsFromKey).join(", ")}`
              : "") +
            (mealNotes.trim()
              ? (selectedDishes.length ? " — " : "") + mealNotes.trim()
              : ""),
          favorites: selectedTypes.map(capWordsFromKey),
          wines: extracted || [],
        }}
      />
    </div>
  );
}

/* ----------------- Helpers & Data ----------------- */

function capWordsFromKey(k) {
  return k
    .split("-")
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Common dinner menu items (compact, broad coverage) */
const DINNER_ITEMS = [
  // Proteins
  { key: "steak", label: "Steak 🥩", emoji: "🥩" },
  { key: "burger", label: "Burger 🍔", emoji: "🍔" },
  { key: "chicken", label: "Chicken 🍗", emoji: "🍗" },
  { key: "lamb", label: "Lamb 🍖", emoji: "🍖" },
  { key: "pork", label: "Pork 🐖", emoji: "🍖" },
  { key: "salmon", label: "Salmon 🐟", emoji: "🐟" },
  { key: "shellfish", label: "Shellfish 🦐", emoji: "🦐" },
  { key: "oysters", label: "Oysters 🦪", emoji: "🦪" },

  // Cuisines / dishes
  { key: "sushi", label: "Sushi 🍣", emoji: "🍣" },
  { key: "pizza", label: "Pizza 🍕", emoji: "🍕" },
  { key: "tacos", label: "Tacos 🌮", emoji: "🌮" },
  { key: "bbq", label: "BBQ 🍖", emoji: "🍖" },
  { key: "curry", label: "Curry 🍛", emoji: "🍛" },

  // Pasta styles
  { key: "pasta-tomato", label: "Pasta (Tomato) 🍝", emoji: "🍝" },
  { key: "pasta-cream", label: "Pasta (Cream) 🍝", emoji: "🍝" },
  { key: "mushroom-risotto", label: "Mushroom Risotto 🍄", emoji: "🍄" },

  // Diet / profile
  { key: "vegetarian", label: "Vegetarian 🥗", emoji: "🥗" },
  { key: "vegan", label: "Vegan 🌿", emoji: "🌿" },
  { key: "spicy", label: "Spicy 🌶️", emoji: "🌶️" },

  // Extras
  { key: "cheese-plate", label: "Cheese Plate 🧀", emoji: "🧀" },
  { key: "dessert", label: "Dessert 🍰", emoji: "🍰" },
  { key: "chocolate", label: "Chocolate 🍫", emoji: "🍫" },
];

/* Tiny emoji heuristic for the extracted wine tiles */
function pickEmoji(w) {
  const s = `${w?.name ?? ""} ${w?.variety_or_style ?? ""}`.toLowerCase();
  if (s.includes("champagne") || s.includes("prosecco") || s.includes("cava"))
    return "🍾";
  if (s.includes("rosé") || s.includes("rose")) return "🌸";
  if (
    s.includes("riesling") ||
    s.includes("sauvignon") ||
    s.includes("chardonnay") ||
    s.includes("moscato")
  )
    return "🥂";
  return "🍷";
}
