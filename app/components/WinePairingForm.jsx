

"use client";

import { useMemo, useRef, useState } from "react";
import WineTypeGrid from "./WineTypeGrid";
import SommelierChat from "./SommelierChat";
import CameraOrUpload from "./CameraOrUpload"; // Assumes this is in the same folder
import WineFavoritesCard from "./wine/WineFavoritesCard";
import WineMenuCard from "./wine/WineMenuCard";
import ExtractedWinesCard from "./wine/ExtractedWinesCard";
import PairingResultsCard from "./wine/PairingResultsCard";
import { capWordsFromKey } from "../utils/wineUtils";
import { DINNER_ITEMS } from "../data/dinnerItems";

export default function WinePairingForm() {
  const fileRef = useRef(null);

  // Favorites
  const [selectedTypes, setSelectedTypes] = useState([]);
  const favorites = useMemo(() => selectedTypes, [selectedTypes]);

  // Menu + notes
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [mealNotes, setMealNotes] = useState("");

  // Image / extraction / results
  // const [imageDataUrl, setImageDataUrl] = useState(""); // <-- No longer needed
  const [extracted, setExtracted] = useState(null);
  const [pairings, setPairings] = useState(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [loadingPair, setLoadingPair] = useState(false);
  const [error, setError] = useState(null);

  // Per-ranked “more info”
  const [moreInfo, setMoreInfo] = useState({});

  // Modified to accept dataUrl directly from onCapture
  async function onExtract(imageDataUrl) {
    if (!imageDataUrl) return; // Guard clause

    try {
      setError(null);
      setLoadingExtract(true);
      setExtracted(null); // Clear previous results

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }), // Use the arg
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

  return (
    <section className="w-full bg-white text-red-600">
      <div className="max-w-3xl mx-auto space-y-8 px-4 sm:px-6 py-6">
        <WineFavoritesCard
          favorites={favorites}
          onChangeTypes={setSelectedTypes}
          WineTypeGrid={WineTypeGrid}
        />

        <WineMenuCard
          items={DINNER_ITEMS}
          selected={selectedDishes}
          onChangeSelected={setSelectedDishes}
          notes={mealNotes}
          onChangeNotes={setMealNotes}
          WineTypeGrid={WineTypeGrid}
        />

        {/* --- UPDATED COMPONENT --- */}
        <CameraOrUpload
          title="Wine List"
          onCapture={onExtract} // <-- Pass the extract function
          isExtracting={loadingExtract} // <-- Pass the loading state
        />

        {/* --- OLD BUTTON REMOVED --- */}
        {/* {imageDataUrl && ( ... )} */}

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {extracted && (
          <ExtractedWinesCard
            extracted={extracted}
            loadingExtract={loadingExtract}
            onPair={onPair}
            canPair={
              (extracted?.length ?? 0) > 0 &&
              (selectedDishes.length > 0 || mealNotes.trim()) &&
              !loadingPair
            }
            loadingPair={loadingPair}
          />
        )}

        {pairings && (
          <PairingResultsCard
            pairings={pairings}
            moreInfo={moreInfo}
            onMoreInfo={onMoreInfo}
          />
        )}

        <SommelierChat
          busy={loadingPair}
          avatarSrc="/sommelier-head.png"
          position="bottom-right"
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
    </section>
  );
}