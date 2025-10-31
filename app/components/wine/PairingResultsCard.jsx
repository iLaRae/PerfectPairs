"use client";

export default function PairingResultsCard({ pairings, moreInfo, onMoreInfo }) {
  return (
    <div className="text-red-600 card bg-white shadow-2xl rounded-3xl ring-1 ring-slate-200 overflow-hidden">
      <div className="card-body gap-5">
        <div className="flex items-center justify-between">
          <h2 className="card-title">Best Pairings</h2>
          <div className="badge badge-success badge-outline">Ranked</div>
        </div>

        {Array.isArray(pairings.ranked) && pairings.ranked.length > 0 ? (
          <ol className="space-y-4">
            {pairings.ranked.map((r, i) => {
              const info = moreInfo[i] || { loading: false, text: "", err: "" };
              return (
                <li key={i} className="relative group">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 grid place-items-center size-10 rounded-2xl ring-1 ring-slate-200 text-slate-900 font-semibold shadow bg-white">
                      {i + 1}
                    </div>

                    <div className="flex-1 rounded-3xl ring-1 ring-slate-200 bg-gray-50 shadow p-4 md:p-5">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <div className="text-lg md:text-xl font-semibold leading-tight">{r.wine}</div>
                        {typeof r.score === "number" && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium ring-1 ring-slate-200 bg-white">
                            Score {r.score}
                          </span>
                        )}
                        {r.estimated_price != null && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium ring-1 ring-slate-200 bg-white">
                            Est. ${r.estimated_price}
                          </span>
                        )}
                      </div>

                      {r.why && <p className="mt-2 text-sm opacity-80">{r.why}</p>}

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
                        <span className="opacity-50 text-xs">Ask the sommelier bot for deeper detail</span>
                      </div>

                      {(info.text || info.err || info.loading) && (
                        <div className="mt-3 rounded-2xl ring-1 ring-slate-200 bg-white p-3">
                          {info.err ? (
                            <div className="text-error text-sm">{info.err}</div>
                          ) : info.loading ? (
                            <div className="text-sm opacity-80">
                              <span className="loading loading-dots loading-sm mr-1" />
                              Fetching more insight…
                            </div>
                          ) : (
                            <div className="text-sm whitespace-pre-wrap">{info.text}</div>
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
  );
}
