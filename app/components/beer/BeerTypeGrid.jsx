// app/components/beer/BeerTypeGrid.jsx
"use client";

import { useState } from "react";
import BeerCameraOrUpload from "./BeerCameraOrUpload";

export default function BeerTypeGrid({
  items = DEFAULT_BEERS,
  onChange,
  multi = true,
  cols,
  size = "md",

  // Pairing integration
  selectedPizzaName = "",
  selectedBeer = null,      // concrete beer chosen in scanner (object)
  onSelectBeer,             // lifts beer selection up from scanner
  onConfirmPairing,

  // Optional scanner
  showScanner = false,
  onCapture,
  onExtract,
  isExtracting = false,
  scannerTitle = "Scan Beer List",
  scannerClassName = "",
}) {
  const [selected, setSelected] = useState([]);

  const toggle = (k) => {
    let next = [];
    if (multi) next = selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k];
    else next = selected.includes(k) ? [] : [k];
    setSelected(next);
    onChange?.(next);
  };

  const SZ =
    {
      sm: { tile: "size-16", emoji: "text-2xl", label: "text-xs", gap: "gap-2 sm:gap-3" },
      md: { tile: "size-20", emoji: "text-3xl", label: "text-sm", gap: "gap-3 sm:gap-4" },
      lg: { tile: "size-24", emoji: "text-4xl", label: "text-sm", gap: "gap-3 sm:gap-4 md:gap-5" },
    }[size] || { tile: "size-20", emoji: "text-3xl", label: "text-sm", gap: "gap-3 sm:gap-4" };

  const gridCols = cols != null ? `grid-cols-${cols}` : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5";

  const hasPizza = !!selectedPizzaName?.trim();
  const hasBeer  = !!selectedBeer;
  const canPair  = hasPizza && hasBeer;

  const pairClick = () => {
    if (!canPair) return;
    onConfirmPairing?.({ beer: selectedBeer, pizzaName: selectedPizzaName });
  };

  return (
    <div className="w-full text-black">
      {/* Beer style tiles */}
      <div className={`grid ${gridCols} ${SZ.gap}`}>
        {items.map((it) => {
          const isOn = selected.includes(it.key);
          const theme = TILE_THEMES[it.key] ?? TILE_THEMES._default;
          return (
            <div key={it.key} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => toggle(it.key)}
                className={[
                  "relative rounded-[24px] transition-transform",
                  "shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:scale-[1.02] active:scale-[0.98]",
                  "ring-1 ring-white/10",
                  SZ.tile,
                ].join(" ")}
                style={{ background: `linear-gradient(180deg, ${theme.from} 0%, ${theme.to} 100%)` }}
                aria-pressed={isOn ? "true" : "false"}
              >
                <div
                  className="absolute inset-[2px] rounded-[22px]"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%)" }}
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-[24px]"
                  style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 8px 20px rgba(255,255,255,0.05)" }}
                />
                {isOn && <div className="absolute inset-0 rounded-[24px] outline outline-2 outline-primary/70" />}
                <div className="relative z-10 flex h-full w-full items-center justify-center">
                  <span className={SZ.emoji}>{it.emoji ?? "🍺"}</span>
                </div>
              </button>
              <div className={`mt-2 text-center ${SZ.label} text-black/95`}>{it.label}</div>
            </div>
          );
        })}
      </div>

      {/* Scanner */}
      {showScanner && (
        <div className="mt-6">
          {/* NOTE: JSX comments cannot live inside the attribute list. */}
          <BeerCameraOrUpload
            onCapture={onCapture}
            onExtract={onExtract}
            isExtracting={isExtracting}
            title={scannerTitle}
            className={scannerClassName}
            selectedPizzaName={selectedPizzaName}
            suggestedStyles={items.filter((i) => selected.includes(i.key)).map((i) => i.label)}
            onConfirmPairing={onConfirmPairing}
            onSelectPizza={() => {}}
            onSelectBeer={onSelectBeer}
          />
        </div>
      )}

      {/* Single bottom action */}
      <div className="mt-6 flex justify-end">
        <button
          id="pair-beer-button"
          type="button"
          disabled={!canPair}
          onClick={pairClick}
          className={[
            "btn btn-sm sm:btn-md rounded-2xl font-semibold min-w-[12rem]",
            canPair
              ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
              : "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed",
          ].join(" ")}
          title={canPair ? "Pair the chosen beer with this pizza" : "Pick a pizza and a beer to enable"}
        >
          Pair This Beer + Pizza
        </button>
      </div>
    </div>
  );
}

/* Per-tile color themes */
const TILE_THEMES = {
  pilsner: { from: "#143B4A", to: "#0A1C23" },
  helles: { from: "#153C2B", to: "#0B1E16" },
  kolsch: { from: "#16404A", to: "#0B1E24" },
  lager: { from: "#12324A", to: "#0A1823" },
  "pale-ale": { from: "#0E3A29", to: "#071A13" },
  ipa: { from: "#114332", to: "#081E16" },
  "west-coast-ipa": { from: "#0E3F36", to: "#081C18" },
  "hazy-ipa": { from: "#15453D", to: "#0A201C" },
  "double-ipa": { from: "#183E2D", to: "#0B1B14" },
  "amber-ale": { from: "#4B2A14", to: "#1C1008" },
  "vienna-lager": { from: "#4D2C13", to: "#1E0F07" },
  "brown-ale": { from: "#3D2A16", to: "#160F08" },
  bock: { from: "#3A230F", to: "#140C06" },
  dunkel: { from: "#3A2112", to: "#150B06" },
  schwarzbier: { from: "#1C1D2A", to: "#0A0B13" },
  porter: { from: "#281919", to: "#0F0A0A" },
  stout: { from: "#19191F", to: "#0A0A0E" },
  "dry-stout": { from: "#181A20", to: "#0A0C0F" },
  "imperial-stout": { from: "#1A1421", to: "#0B0810" },
  hefeweizen: { from: "#233A19", to: "#0F1A0B" },
  witbier: { from: "#183744", to: "#0A1920" },
  saison: { from: "#2A3E19", to: "#111A0C" },
  tripel: { from: "#213A2A", to: "#0D1A12" },
  dubbel: { from: "#3C2218", to: "#160D09" },
  "belgian-strong-golden": { from: "#1E3C38", to: "#0C1B19" },
  gose: { from: "#1A3E3C", to: "#0B1D1C" },
  lambic: { from: "#183B2E", to: "#0A1A14" },
  "kettle-sour": { from: "#1D3F2C", to: "#0B1C12" },
  "berliner-weisse": { from: "#1E3940", to: "#0C191D" },
  _default: { from: "#0f172a", to: "#0b1022" },
};

/* Popular beer styles */
const DEFAULT_BEERS = [
  { key: "pilsner", label: "Pilsner", emoji: "🍺" },
  { key: "helles", label: "Helles", emoji: "🍺" },
  { key: "kolsch", label: "Kölsch", emoji: "🍺" },
  { key: "lager", label: "Lager", emoji: "🍺" },
  { key: "pale-ale", label: "Pale Ale", emoji: "🍺" },
  { key: "ipa", label: "IPA", emoji: "🍺" },
  { key: "west-coast-ipa", label: "West Coast IPA", emoji: "🍺" },
  { key: "hazy-ipa", label: "Hazy IPA", emoji: "🍺" },
  { key: "double-ipa", label: "Double IPA", emoji: "🍺" },
  { key: "amber-ale", label: "Amber Ale", emoji: "🍺" },
  { key: "vienna-lager", label: "Vienna Lager", emoji: "🍺" },
  { key: "brown-ale", label: "Brown Ale", emoji: "🍺" },
  { key: "bock", label: "Bock", emoji: "🍺" },
  { key: "dunkel", label: "Dunkel", emoji: "🍺" },
  { key: "schwarzbier", label: "Schwarzbier", emoji: "🍺" },
  { key: "porter", label: "Porter", emoji: "🍻" },
  { key: "stout", label: "Stout", emoji: "🍻" },
  { key: "dry-stout", label: "Dry Stout", emoji: "🍻" },
  { key: "imperial-stout", label: "Imperial Stout", emoji: "🍻" },
  { key: "hefeweizen", label: "Hefeweizen", emoji: "🥨" },
  { key: "witbier", label: "Witbier", emoji: "🥨" },
  { key: "saison", label: "Saison", emoji: "🌾" },
  { key: "tripel", label: "Belgian Tripel", emoji: "🌾" },
  { key: "dubbel", label: "Belgian Dubbel", emoji: "🌾" },
  { key: "belgian-strong-golden", label: "Belgian Strong Golden", emoji: "🌾" },
  { key: "gose", label: "Gose", emoji: "🧂" },
  { key: "lambic", label: "Lambic", emoji: "🍋" },
  { key: "kettle-sour", label: "Kettle Sour", emoji: "🍋" },
  { key: "berliner-weisse", label: "Berliner Weisse", emoji: "🍋" },
];

export { DEFAULT_BEERS, TILE_THEMES };
