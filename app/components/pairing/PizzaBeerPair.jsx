// app/components/pairing/PizzaBeerPair.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PizzaSelectGrid from "../pizza/PizzaSelectGrid";
import BEERS_MENU from "../../data/beersMenu";

/* ---------------- Map menu styles → pairing style keys ------------------- */
const STYLE_KEYS = {
  "west coast ipa": "west-coast-ipa",
  "hazy ipa": "hazy-ipa",
  ipa: "ipa",
  dipa: "double-ipa",
  "double ipa": "double-ipa",
  "pale ale": "pale-ale",
  "german pilsner": "pilsner",
  pilsner: "pilsner",
  "blonde ale": "kolsch", // proxy
  "red ale": "amber-ale",
  "red ale / amber": "amber-ale",
  "red ale amber": "amber-ale",
  amber: "amber-ale",
  hefeweizen: "hefeweizen",
  "nitro stout": "stout",
  stout: "stout",
  "fruited sour": "kettle-sour", // best fit
  "hard cider": "belgian-strong-golden", // fallback for pairing logic
  "hard seltzer": "pilsner", // crisp proxy
};

function toStyleKey(styleRaw) {
  const k = (styleRaw || "").toLowerCase().trim();
  return STYLE_KEYS[k] || null;
}

/* -------------------------- Emoji/icon mapping -------------------------- */
const MENU_STYLE_EMOJI = {
  "west coast ipa": "🍺",
  "hazy ipa": "🍺",
  ipa: "🍺",
  dipa: "🍺",
  "double ipa": "🍺",
  "pale ale": "🍺",
  "german pilsner": "🍺",
  pilsner: "🍺",
  "blonde ale": "🍺",
  "red ale": "🍺",
  "red ale / amber": "🍺",
  "red ale amber": "🍺",
  amber: "🍺",
  hefeweizen: "🥨",
  "nitro stout": "🍻",
  stout: "🍻",
  "fruited sour": "🍋",
  "hard cider": "🍎",
  "hard seltzer": "💧",
};

function emojiForMenuStyle(styleRaw) {
  const ns = (styleRaw || "").toLowerCase().trim();
  return MENU_STYLE_EMOJI[ns] || "🍺";
}

/* --------- quick flavor notes used for the ranked style summary ---------- */
const STYLE_FLAVOR_NOTES = {
  "west-coast-ipa": "Citrus/pine hops, crisp bitterness",
  "hazy-ipa": "Juicy tropical/citrus, soft bitterness",
  ipa: "Bold hops, citrus/pine, firm bitterness",
  "double-ipa": "Intense hops, higher ABV, resinous",
  "pale-ale": "Balanced malt & hops, approachable bitterness",
  pilsner: "Crisp, clean, high carbonation",
  kolsch: "Delicate, floral, lightly fruity",
  hefeweizen: "Banana/clove yeast, creamy wheat",
  witbier: "Citrus/coriander, refreshing wheat",
  saison: "Peppery, dry, effervescent",
  "amber-ale": "Toasty caramel malt, medium bitterness",
  "brown-ale": "Nutty, caramel, gentle bitterness",
  porter: "Chocolate/toast, smooth roast",
  "vienna-lager": "Light toast, clean finish",
  "belgian-strong-golden": "Fruity/spicy yeast, lively bubbles",
  "kettle-sour": "Bright acidity, tart fruit",
  "berliner-weisse": "Light, tart, sparkling",
};

export default function PizzaBeerPair() {
  const [selectedPizza, setSelectedPizza] = useState(null);
  const [selectedMenuBeer, setSelectedMenuBeer] = useState(null); // raw draft item
  const [selectedBeer, setSelectedBeer] = useState(null); // resolved style object {key,label}
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const selectedPizzaName = selectedPizza?.name || "";

  // clear messages when pizza changes
  useEffect(() => {
    setResult(null);
    setError("");
  }, [selectedPizzaName]);

  // Toggle-select a draft from the menu: click again to clear
  const handlePickMenuBeer = useCallback(
    (menuBeer) => {
      const isSame =
        selectedMenuBeer &&
        selectedMenuBeer.draftNo === menuBeer.draftNo &&
        selectedMenuBeer.name === menuBeer.name;

      if (isSame) {
        // Clear selection on second click
        setSelectedMenuBeer(null);
        setSelectedBeer(null);
        return;
      }

      // Set new selection
      setSelectedMenuBeer(menuBeer);
      const mappedKey = toStyleKey(menuBeer.style);
      if (mappedKey) {
        setSelectedBeer({ key: mappedKey, label: menuBeer.style });
      } else {
        setSelectedBeer({
          key: `menu:${(menuBeer.style || "beer").toLowerCase()}`,
          label: menuBeer.style || "Beer",
        });
      }
    },
    [selectedMenuBeer]
  );

  const canPair = useMemo(
    () => Boolean(selectedPizzaName && (selectedBeer || !selectedMenuBeer)),
    [selectedPizzaName, selectedBeer, selectedMenuBeer]
  );

  /* --- Ask API to choose BEST draft from BEERS_MENU for this pizza --------- */
  const handleSommelierPick = useCallback(async () => {
    if (!selectedPizzaName) return;
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/pizza-beer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pizzaName: selectedPizzaName,
          description: selectedPizza?.description || null,
          base: selectedPizza?.base || null,
          tags: selectedPizza?.tags || [],
          beersMenu: BEERS_MENU, // server picks only from this list
        }),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error || `Request failed (${res.status})`);
      }

      const json = await res.json();
      setSelectedMenuBeer(json?.beerMenu || null); // reflect AI-picked draft
      setSelectedBeer(json?.beer || null); // reflect resolved style
      setResult(json);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedPizzaName, selectedPizza]);

  /* --- Pair THIS picked draft (or auto-pick if none chosen) ---------------- */
  const handleConfirmPairing = useCallback(async () => {
    // If the user hasn’t selected a beer yet, auto-run the Best Draft flow.
    if (selectedPizzaName && !selectedBeer && !selectedMenuBeer) {
      await handleSommelierPick();
      return;
    }

    if (!selectedPizzaName) return;

    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/pizza-beer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pizzaName: selectedPizzaName,
          description: selectedPizza?.description || null,
          base: selectedPizza?.base || null,
          tags: selectedPizza?.tags || [],
          selectedBeer, // { key, label } (mapped or synthetic) if user selected one
          selectedMenuBeer, // full draft item (if chosen)
        }),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error || `Request failed (${res.status})`);
      }

      const json = await res.json();
      setResult(json);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedPizzaName, selectedBeer, selectedMenuBeer, selectedPizza, handleSommelierPick]);

  /* --------- Build “On this draft list” matches from beersMenu.js ---------- */
  const menuMatchesByStyle = useMemo(() => {
    const out = {};
    const bestKeys = result?.recommendedStyles?.bestKeys || [];
    bestKeys.forEach((k) => {
      out[k] = BEERS_MENU.filter((m) => toStyleKey(m.style) === k);
    });
    return out;
  }, [result]);

  /* --------- Ranked “Best Drafts for this Pizza” (top 5) ------------------ */
  const rankedDrafts = useMemo(() => {
    const bestKeys = result?.recommendedStyles?.bestKeys || [];
    if (!bestKeys.length) return [];

    // position weights (style rank): #1 = 3pts, #2 = 2pts, #3 = 1pt
    const weightForIndex = (i) => (i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0);

    // For each menu beer, compute score based on style match + pops as soft tiebreak
    const scored = BEERS_MENU.map((m) => {
      const styleKey = toStyleKey(m.style);
      const idx = bestKeys.indexOf(styleKey);
      const base = idx >= 0 ? weightForIndex(idx) : 0;
      const pops = typeof m.pops === "number" ? m.pops : 0;
      const score = base + pops * 0.05; // tweak as needed
      return { beer: m, score, idx };
    })
      .filter((x) => x.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.idx !== b.idx) return a.idx - b.idx;
        const ap = typeof a.beer.pops === "number" ? a.beer.pops : 0;
        const bp = typeof b.beer.pops === "number" ? b.beer.pops : 0;
        return bp - ap;
      });

    // attach human labels/reasons
    return scored.slice(0, 5).map((entry, i) => {
      const styleKey = toStyleKey(entry.beer.style);
      const labelIdx = bestKeys.indexOf(styleKey);
      const styleLabel =
        result?.recommendedStyles?.bestLabels?.[labelIdx] ||
        (styleKey ? styleKey.replace(/-/g, " ") : entry.beer.style);
      const note = STYLE_FLAVOR_NOTES[styleKey] || null;
      return {
        rank: i + 1,
        score: +entry.score.toFixed(2),
        beer: entry.beer,
        styleKey,
        styleLabel,
        note,
      };
    });
  }, [result]);

  return (
    <div className="w-full mx-auto max-w-4xl">
      {/* Step 1: Pick a pizza */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
          1) Pick your pizza
        </h2>
        <PizzaSelectGrid
          onSelect={setSelectedPizza}
          selectedName={selectedPizzaName}
        />

        {/* Current selection pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedPizzaName ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-sm">
              🍕 {selectedPizzaName}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-sm">
              🍕 Choose a pizza
            </span>
          )}
          {selectedMenuBeer ? (
            <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 text-sm">
              {emojiForMenuStyle(selectedMenuBeer.style)}{" "}
              Draft {selectedMenuBeer.draftNo}: {selectedMenuBeer.name} ({selectedMenuBeer.style})
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-sm">
              🍺 Choose a draft or use Best Draft
            </span>
          )}
        </div>
      </section>

      {/* Step 2: Pick a beer (Draft List) */}
      <section className="mt-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
          2) Pick a beer (Draft List)
        </h2>

        <div className="rounded-2xl bg-white/90 border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Draft List</h3>
          <ul className="divide-y divide-gray-100">
            {BEERS_MENU.map((m) => {
              const active =
                selectedMenuBeer?.draftNo === m.draftNo &&
                selectedMenuBeer?.name === m.name;
              const pops =
                typeof m.pops === "number"
                  ? ` • ${m.pops} ${m.pops === 1 ? "pop" : "pops"}`
                  : "";
              return (
                <li key={`${m.draftNo}-${m.name}`}>
                  <button
                    type="button"
                    onClick={() => handlePickMenuBeer(m)}
                    className={[
                      "w-full text-left py-3",
                      active
                        ? "bg-emerald-50 rounded-lg px-3"
                        : "px-1 hover:bg-gray-50 rounded-lg",
                    ].join(" ")}
                    aria-pressed={active ? "true" : "false"}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {emojiForMenuStyle(m.style)}{" "}
                        Draft {m.draftNo}: {m.brewery} – {m.name}
                      </span>
                      <span className="text-xs text-gray-600">${m.price}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {m.style} • {m.abv}% • {m.pour}
                      {pops}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Single bottom action: Pair – Use Best Draft */}
          <div className="mt-6 flex justify-end">
            <button
              id="pair-beer-button"
              type="button"
              disabled={!selectedPizzaName || submitting}
              onClick={handleConfirmPairing}
              className={[
                "btn btn-sm sm:btn-md rounded-2xl font-semibold min-w-[14rem]",
                selectedPizzaName && !submitting
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
                  : "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed",
              ].join(" ")}
              title={
                selectedPizzaName
                  ? selectedBeer
                    ? "Pair the selected draft with this pizza"
                    : "No draft selected — will choose the best draft for you"
                  : "Pick a pizza first"
              }
            >
              {submitting ? "Pairing…" : "Pair – Use Best Draft"}
            </button>
          </div>
        </div>
      </section>

      {/* Result / Error */}
      {(result || error) && (
        <section className="mt-6">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4">
              {error}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 p-4">
              <p className="font-semibold">Pairing confirmed!</p>

              <p className="text-sm mt-1">
                Pizza: <span className="font-medium">{result?.pizza?.name}</span>
              </p>

              {/* If a concrete draft was paired (manual or best-draft pick) */}
              {result?.beerMenu ? (
                <p className="text-sm mt-1">
                  {emojiForMenuStyle(result.beerMenu.style)}{" "}
                  Draft {result.beerMenu.draftNo}: {result.beerMenu.brewery} – {result.beerMenu.name} ({result.beerMenu.style})
                </p>
              ) : null}

              {/* Ranked styles + quick flavor notes */}
              {result?.recommendedStyles?.bestKeys?.length ? (
                <div className="mt-3">
                  <p className="text-sm font-semibold">Top styles for this pizza:</p>
                  <ol className="list-decimal pl-5 mt-1 space-y-1 text-sm">
                    {result.recommendedStyles.bestKeys.map((k, i) => (
                      <li key={k}>
                        <span className="font-medium">
                          {result.recommendedStyles.bestLabels?.[i] || k}
                        </span>
                        {STYLE_FLAVOR_NOTES[k] ? ` — ${STYLE_FLAVOR_NOTES[k]}` : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {/* On this draft list by style (context) */}
              {result?.recommendedStyles?.bestKeys?.length ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold">On this draft list (by style):</p>
                  <div className="mt-2 space-y-3">
                    {result.recommendedStyles.bestKeys.map((k, idx) => {
                      const label =
                        result.recommendedStyles.bestLabels?.[idx] ||
                        k.replace(/-/g, " ");
                      const matches = (menuMatchesByStyle[k] || []).slice(0, 3);
                      if (!matches.length) return null;
                      return (
                        <div key={k} className="text-sm">
                          <p className="font-medium">{label}</p>
                          <ul className="mt-1 list-disc pl-5">
                            {matches.map((m) => (
                              <li key={`${m.draftNo}-${m.name}`}>
                                {emojiForMenuStyle(m.style)} Draft {m.draftNo}: {m.brewery} – {m.name}{" "}
                                <span className="text-gray-700">
                                  ({m.style} • {m.abv}% • {m.pour})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Best Drafts for this Pizza (Ranked) */}
              {rankedDrafts.length ? (
                <div className="mt-5">
                  <p className="text-sm font-semibold">Best Drafts for this Pizza (Ranked):</p>
                  <ol className="mt-2 space-y-2">
                    {rankedDrafts.map((r) => (
                      <li
                        key={`${r.beer.draftNo}-${r.beer.name}`}
                        className="rounded-lg border border-emerald-200 bg-white text-emerald-900 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold px-2">
                              #{r.rank}
                            </span>
                            <span className="text-sm font-semibold">
                              {emojiForMenuStyle(r.beer.style)} Draft {r.beer.draftNo}: {r.beer.brewery} – {r.beer.name}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-emerald-700">
                            score {r.score}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-700">
                          {r.styleLabel}
                          {r.note ? ` — ${r.note}` : ""}
                          {" • "}
                          {r.beer.style} • {r.beer.abv}% • {r.beer.pour}
                          {typeof r.beer.pops === "number" ? ` • ${r.beer.pops} ${r.beer.pops === 1 ? "pop" : "pops"}` : ""}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {/* Expert flavor explanations */}
              {result?.explanations?.length ? (
                <ul className="list-disc pl-5 mt-3 text-sm">
                  {result.explanations.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
