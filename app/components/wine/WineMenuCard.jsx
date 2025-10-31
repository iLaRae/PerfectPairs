"use client";

import { capWordsFromKey } from "../../utils/wineUtils";

export default function WineMenuCard({
  items,
  selected = [],
  onChangeSelected,
  notes,
  onChangeNotes,
  WineTypeGrid,
}) {
  return (
    <div className="text-red-600 card bg-white shadow-xl rounded-3xl ring-1 ring-slate-200">
      <div className="card-body gap-5">
        <div className="flex items-center justify-between">
          <h2 className="card-title">What are you eating?</h2>
          <div className="badge badge-secondary badge-outline">Menu</div>
        </div>

        <WineTypeGrid items={items} multi onChange={onChangeSelected} />

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 -mt-1">
            {selected.map((k) => (
              <div key={k} className="badge badge-neutral gap-1">
                {capWordsFromKey(k)}
              </div>
            ))}
          </div>
        )}

        <div className="mt-2">
          <label className="label pb-1">
            <span className="label-text">
              Add more detail
            </span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            className="textarea textarea-bordered min-h-28 w-full bg-white"
            placeholder="e.g., Medium-rare ribeye with peppercorn sauce; truffle fries"
          />
        </div>
      </div>
    </div>
  );
}
