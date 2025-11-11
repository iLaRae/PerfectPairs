// app/components/pizza/PizzaTypeGrid.jsx
"use client";

import { useState } from "react";
import PizzaCameraOrUpload from "./PizzaCameraOrUpload"; // optional scanner, same pattern as Beer

/**
 * API mirrors BeerTypeGrid so you can swap easily.
 *
 * Props:
 * - items?: array of { key: string; label: string; emoji?: string }
 * - onChange?: (selectedKeys: string[]) => void
 * - multi?: boolean  (default true)
 * - cols?: number (default: responsive 3/4/5)
 * - size?: "sm" | "md" | "lg"
 * - showScanner?: boolean
 * - onCapture?: (dataUrl: string) => void
 * - onExtract?: () => void
 * - isExtracting?: boolean
 * - scannerTitle?: string
 * - scannerClassName?: string
 */

export default function PizzaTypeGrid({
  items = DEFAULT_PIZZAS,
  onChange,
  multi = true,
  cols,
  size = "md",

  // Optional: show a pizza menu/photo scanner under the grid
  showScanner = false,
  onCapture, // (dataUrl: string) => void
  onExtract, // () => void
  isExtracting = false,
  scannerTitle = "Scan Pizza Menu",
  scannerClassName = "",
}) {
  const [selected, setSelected] = useState([]);

  const toggle = (k) => {
    let next = [];
    if (multi) {
      next = selected.includes(k)
        ? selected.filter((x) => x !== k)
        : [...selected, k];
    } else {
      next = selected.includes(k) ? [] : [k];
    }
    setSelected(next);
    onChange?.(next);
  };

  // size tokens → icon tile sizing & emoji size
  const SZ =
    {
      sm: { tile: "size-16", emoji: "text-2xl", label: "text-xs", gap: "gap-2 sm:gap-3" },
      md: { tile: "size-20", emoji: "text-3xl", label: "text-sm", gap: "gap-3 sm:gap-4" },
      lg: { tile: "size-24", emoji: "text-4xl", label: "text-sm", gap: "gap-3 sm:gap-4 md:gap-5" },
    }[size] || { tile: "size-20", emoji: "text-3xl", label: "text-sm", gap: "gap-3 sm:gap-4" };

  const gridCols =
    cols != null ? `grid-cols-${cols}` : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"; // safelist custom counts if needed

  return (
    <div className="w-full">
      {/* optional heading — blank for parity with Beer grid */}
      <h2 className="text-xl font-semibold mb-4 text-black"></h2>

      <div className={`grid ${gridCols} ${SZ.gap}`}>
        {items.map((it) => {
          const isOn = selected.includes(it.key);
          const theme = TILE_THEMES[it.key] ?? TILE_THEMES._default;

          return (
            <div key={it.key} className="flex flex-col items-center">
              {/* Icon tile */}
              <button
                onClick={() => toggle(it.key)}
                className={[
                  "relative rounded-[24px] transition-transform",
                  "shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:scale-[1.02] active:scale-[0.98]",
                  "ring-1 ring-white/10",
                  SZ.tile,
                ].join(" ")}
                style={{
                  background: `linear-gradient(180deg, ${theme.from} 0%, ${theme.to} 100%)`,
                }}
              >
                {/* subtle inner bevel */}
                <div
                  className="absolute inset-[2px] rounded-[22px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%)",
                  }}
                />
                {/* highlight arc (top-left) */}
                <div
                  className="pointer-events-none absolute -top-1 -left-1 h-3/5 w-3/5 rounded-[28px] opacity-60"
                  style={{
                    background:
                      "radial-gradient(120% 80% at 10% 0%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 55%, transparent 70%)",
                    maskImage:
                      "radial-gradient(120% 80% at 10% 0%, black 0%, black 55%, transparent 70%)",
                  }}
                />
                {/* inner glow ring */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-[24px]"
                  style={{
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 8px 20px rgba(255,255,255,0.05)",
                  }}
                />
                {/* selected outline */}
                {isOn && (
                  <div className="absolute inset-0 rounded-[24px] outline outline-2 outline-primary/70" />
                )}
                {/* emoji */}
                <div className="relative z-10 flex h-full w-full items-center justify-center">
                  <span className={SZ.emoji}>{it.emoji ?? "🍕"}</span>
                </div>
                {/* tiny status badge */}
                {isOn && (
                  <div className="absolute left-2 top-2 z-10">
                    <span className="badge badge-primary badge-sm">Selected</span>
                  </div>
                )}
              </button>

              {/* label */}
              <div className={`mt-2 text-center ${SZ.label} text-black/95`}>{it.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center text-sm text-gray-700">
        Tip: Tap to {multi ? "select multiple" : "select one"} pizza {multi ? "styles" : "style"}.
      </div>

      {/* Optional Pizza Scanner */}
      {showScanner && (
        <div className="mt-6">
          <PizzaCameraOrUpload
            onCapture={onCapture}
            onExtract={onExtract}
            isExtracting={isExtracting}
            title={scannerTitle}
            className={scannerClassName}
          />
        </div>
      )}
    </div>
  );
}

/* Per-tile color themes (tomato, basil, cheese, crust, etc.) */
export const TILE_THEMES = {
  margherita: { from: "#5A1B1B", to: "#220A0A" },
  pepperoni: { from: "#6C1F13", to: "#2A0B07" },
  "bbq-chicken": { from: "#3E1E0F", to: "#160904" },
  hawaiian: { from: "#5C3A14", to: "#231607" },
  veggie: { from: "#163A1F", to: "#0A190F" },
  "meat-lovers": { from: "#4A1F1F", to: "#1B0B0B" },
  "four-cheese": { from: "#0E2E3A", to: "#08161B" },
  "white-pizza": { from: "#19343D", to: "#0A171C" },
  pesto: { from: "#1B3D1A", to: "#0C1A0B" },
  "mushroom-truffle": { from: "#2C2416", to: "#130F09" },
  sausage: { from: "#3D2516", to: "#160D08" },
  supreme: { from: "#3D1B2C", to: "#170914" },
  neapolitan: { from: "#2E2A1A", to: "#121008" },
  sicilian: { from: "#2F1F13", to: "#130C07" },
  detroit: { from: "#1E2A3D", to: "#0B121C" },
  chicago: { from: "#3A1522", to: "#14070C" },
  calzone: { from: "#2C1E10", to: "#110B06" },

  _default: { from: "#0f172a", to: "#0b1022" },
};

/* Popular pizza styles */
export const DEFAULT_PIZZAS = [
  { key: "margherita", label: "Margherita", emoji: "🍕" },
  { key: "pepperoni", label: "Pepperoni", emoji: "🍕" },
  { key: "bbq-chicken", label: "BBQ Chicken", emoji: "🍗" },
  { key: "hawaiian", label: "Hawaiian", emoji: "🍍" },
  { key: "veggie", label: "Veggie", emoji: "🥦" },
  { key: "meat-lovers", label: "Meat Lovers", emoji: "🥓" },
  { key: "four-cheese", label: "Four Cheese", emoji: "🧀" },
  { key: "white-pizza", label: "White Pizza", emoji: "🧄" },
  { key: "pesto", label: "Pesto", emoji: "🌿" },
  { key: "mushroom-truffle", label: "Mushroom & Truffle", emoji: "🍄" },
  { key: "sausage", label: "Sausage", emoji: "🌶️" },
  { key: "supreme", label: "Supreme", emoji: "🍕" },
  { key: "neapolitan", label: "Neapolitan", emoji: "🇮🇹" },
  { key: "sicilian", label: "Sicilian", emoji: "🧱" },
  { key: "detroit", label: "Detroit", emoji: "🧂" },
  { key: "chicago", label: "Chicago Deep Dish", emoji: "🏙️" },
  { key: "calzone", label: "Calzone", emoji: "🥟" },
];
