"use client";

import { useState } from "react";

export default function WineTypeGrid({
  items = DEFAULT_WINES,
  onChange,
  multi = true,
  cols,
  size = "md",
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
  // UPDATED: 'gap' is now responsive to prevent overflow on small mobile screens.
  const SZ = {
    sm: {
      tile: "size-16",
      emoji: "text-2xl",
      label: "text-xs",
      gap: "gap-2 sm:gap-3",
    },
    md: {
      tile: "size-20",
      emoji: "text-3xl",
      label: "text-sm",
      gap: "gap-3 sm:gap-4",
    },
    lg: {
      tile: "size-24",
      emoji: "text-4xl",
      label: "text-sm",
      gap: "gap-3 sm:gap-4 md:gap-5",
    },
  }[size];

  const gridCols =
    cols != null
      ? `grid-cols-${cols}`
      : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5";

  return (
    <div className="w-full">
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
                  SZ.tile, // This fixed size is now safe due to responsive gap
                ].join(" ")}
                style={{
                  // deep vertical gradient like iOS icons
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

                {/* emoji centered */}
                <div className="relative z-10 flex h-full w-full items-center justify-center">
                  <span className={SZ.emoji}>{it.emoji ?? "🍷"}</span>
                </div>

                {/* tiny status badge */}
                {isOn && (
                  <div className="absolute left-2 top-2 z-10">
                    <span className="badge badge-primary badge-sm">
                      Selected
                    </span>
                  </div>
                )}
              </button>

              {/* label */}
              <div className={`mt-2 text-center ${SZ.label} text-black/95`}>
                {it.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center text-sm text-gray-700">
        Tip: Tap to {multi ? "select multiple" : "select one"} wine type
        {multi ? "s" : ""}.
      </div>
    </div>
  );
}

/* Per-tile color themes to emulate an “app icon” palette */
const TILE_THEMES = {
  // Reds
  "cabernet-sauvignon": { from: "#2B133E", to: "#0E0718" },
  merlot: { from: "#3A0F28", to: "#14050E" },
  "pinot-noir": { from: "#401B1B", to: "#150808" },
  "syrah-shiraz": { from: "#2E1739", to: "#0E0916" },
  malbec: { from: "#30153A", to: "#0F0616" },
  sangiovese: { from: "#3B1A19", to: "#160908" },
  tempranillo: { from: "#3D2016", to: "#140A06" },
  zinfandel: { from: "#37161F", to: "#12070A" },

  // Whites
  chardonnay: { from: "#0B2B35", to: "#07151A" },
  "sauvignon-blanc": { from: "#0A2F24", to: "#061610" },
  "pinot-grigio": { from: "#0B2A33", to: "#061318" },
  riesling: { from: "#0A2D3B", to: "#06161D" },
  moscato: { from: "#0A2B2D", to: "#061415" },

  // Rosé & Sparkling
  rose: { from: "#3A1533", to: "#150713" },
  champagne: { from: "#0C2843", to: "#071221" },
  prosecco: { from: "#0D2C3E", to: "#081722" },
  cava: { from: "#0B2840", to: "#071724" },

  // Fortified / Dessert
  port: { from: "#34131D", to: "#14070B" },
  sherry: { from: "#2F1B0F", to: "#120805" },

  _default: { from: "#0f172a", to: "#0b1022" }, // slate-like fallback
};

/* Popular / common global wines (varietals & primary styles) */
const DEFAULT_WINES = [
  // Reds
  { key: "cabernet-sauvignon", label: "Cabernet Sauvignon", emoji: "🍷" },
  { key: "merlot", label: "Merlot", emoji: "🍷" },
  { key: "pinot-noir", label: "Pinot Noir", emoji: "🍷" },
  { key: "syrah-shiraz", label: "Syrah / Shiraz", emoji: "🍷" },
  { key: "malbec", label: "Malbec", emoji: "🍷" },
  { key: "sangiovese", label: "Sangiovese", emoji: "🍷" },
  { key: "tempranillo", label: "Tempranillo", emoji: "🍷" },
  { key: "zinfandel", label: "Zinfandel", emoji: "🍷" },
 
  // Whites
  { key: "chardonnay", label: "Chardonnay", emoji: "🥂" },
  { key: "sauvignon-blanc", label: "Sauvignon Blanc", emoji: "🥂" },
  { key: "pinot-grigio", label: "Pinot Grigio / Gris", emoji: "🥂" },
  { key: "riesling", label: "Riesling", emoji: "🥂" },
  { key: "moscato", label: "Moscato", emoji: "🥂" },

  // Rosé & Sparkling
  { key: "rose", label: "Rosé", emoji: "🌸" },
  { key: "champagne", label: "Champagne", emoji: "🍾" },
  { key: "prosecco", label: "Prosecco", emoji: "🍾" },
  { key: "cava", label: "Cava", emoji: "🍾" },
 
  // Fortified / Dessert
  { key: "port", label: "Port", emoji: "🛡️" },
  { key: "sherry", label: "Sherry", emoji: "🛡️" },
];