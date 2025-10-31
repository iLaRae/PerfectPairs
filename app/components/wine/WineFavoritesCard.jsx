"use client";

import { capWordsFromKey } from "../../utils/wineUtils";

export default function WineFavoritesCard({ favorites = [], onChangeTypes, WineTypeGrid }) {
  return (
    <div className="text-red-600 card bg-white shadow-xl rounded-3xl ring-1 ring-slate-200">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title">Your Favorite Wine Types</h2>
          
        </div>

        <WineTypeGrid multi onChange={onChangeTypes} />

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
  );
}
