"use client";

import { pickEmoji } from "../../utils/wineUtils";

export default function ExtractedWinesCard({
  extracted = [],
  loadingExtract = false,
  onPair,
  canPair,
  loadingPair = false,
}) {
  return (
    <div className="card bg-white shadow-xl rounded-3xl ring-1 ring-slate-200">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title">Extracted Wines</h2>
          <div className="badge badge-outline">Results</div>
        </div>

        {loadingExtract ? (
          <ul className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className="p-3 rounded-2xl bg-gray-50 animate-pulse flex items-center gap-3 ring-1 ring-slate-200"
              >
                <div className="size-12 rounded-2xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/5 bg-gray-100 rounded" />
                  <div className="h-3 w-3/5 bg-gray-100 rounded" />
                </div>
                <div className="h-6 w-16 bg-gray-100 rounded" />
              </li>
            ))}
          </ul>
        ) : extracted.length === 0 ? (
          <p className="opacity-70">No wines detected. Try a clearer photo or different lighting.</p>
        ) : (
          <ul className="space-y-3">
            {extracted.map((w, i) => (
              <li
                key={i}
                className="p-3 rounded-2xl bg-gray-50 ring-1 ring-slate-200 flex items-center gap-3"
              >
                <div
                  className="size-12 rounded-2xl ring-1 ring-slate-200 shadow"
                  style={{
                    background: "linear-gradient(180deg, #0f172a 0%, #0b1022 100%)",
                  }}
                >
                  <div className="grid place-items-center h-full text-xl text-white">
                    {pickEmoji(w)}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="font-medium leading-tight">{w.name || "Unknown wine"}</div>
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

                <div className="flex items-center gap-2">
                  {w.by_glass && <span className="badge badge-ghost badge-sm">By Glass</span>}
                  {w.price != null && <span className="badge badge-outline badge-sm">${w.price}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex justify-end">
          <button
            onClick={onPair}
            disabled={!canPair}
            className="btn btn-primary btn-wide rounded-2xl shadow-lg"
          >
            {loadingPair ? <span className="loading loading-spinner" /> : "Rank Pairings"}
          </button>
        </div>
      </div>
    </div>
  );
}
