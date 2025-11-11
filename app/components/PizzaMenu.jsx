"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import PIZZAS from "../data/pizzas";
import BeerTypeGrid, { DEFAULT_BEERS } from "../components/beer/BeerTypeGrid";
import SGTBeerPair from "../components/beer/SGTBeerPair"; // Beer list scanner

/* ---------------------------- Badges ---------------------------- */
function Badge({ children, tone = "neutral", className = "" }) {
  const toneClasses =
    tone === "accent"
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : tone === "spicy"
      ? "bg-red-100 text-red-800 ring-red-200"
      : "bg-gray-100 text-gray-800 ring-gray-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-medium ring-1 ${toneClasses} ${className}`}
    >
      {children}
    </span>
  );
}

/* ----------------------- Image (safe) -------------------------- */
function normalizeSrc(src) {
  if (typeof src !== "string") return null;
  const s = src.trim();
  if (!s) return null;
  if (s.startsWith("/") || s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) {
    return s;
  }
  return "/" + s.replace(/^\.?\/+/, "");
}

function CardImage({ src, alt, selected }) {
  const [broken, setBroken] = useState(false);
  const safeSrc = useMemo(() => normalizeSrc(src), [src]);
  const showPlaceholder = broken || !safeSrc;

  return (
    <div
      className={[
        "relative w-full overflow-hidden rounded-t-2xl border-b bg-gray-50",
        selected ? "border-amber-200" : "border-gray-200",
        "aspect-[4/3]",
      ].join(" ")}
    >
      {showPlaceholder ? (
        <div className="absolute inset-0 grid place-items-center text-gray-400">
          <span className="text-3xl">🍕</span>
        </div>
      ) : (
        <Image
          src={safeSrc}
          alt={alt || "Pizza image"}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/10 to-transparent" />
    </div>
  );
}

/* --------------------------- Card ------------------------------ */
function Card({ item, selected, onSelect }) {
  const isSpicy =
    /jalapeño|spicy|buffalo|hot|heat|frank/i.test(item.description || "") ||
    item.tags?.some((t) => /spicy|heat/i.test(t));

  return (
    <button
      type="button"
      onClick={() => onSelect?.(item)}
      className={[
        "group relative w-full overflow-hidden rounded-2xl border bg-white text-left transition",
        "hover:shadow-sm",
        selected ? "border-amber-400 ring-2 ring-amber-200 shadow-md" : "border-gray-200 hover:border-gray-300",
        "grid grid-rows-[auto,1fr,auto] h-full",
      ].join(" ")}
    >
      <CardImage src={item.image} alt={item.alt || item.name} selected={!!selected} />
      <div className="pt-3">
        <div className="flex items-start justify-between gap-2 px-4">
          <h3 className="truncate font-semibold text-gray-900 text-[15px] leading-5 sm:text-lg sm:leading-6">
            {item.name}
          </h3>
          <div className="flex gap-2">
            {item.limited && <Badge tone="accent">Limited</Badge>}
            {isSpicy && <Badge tone="spicy">Spicy</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 pt-2">
          {item.base && <Badge>{item.base} base</Badge>}
          {item.tags?.filter((t) => !/base|spicy/i.test(t)).map((t) => <Badge key={t}>{t}</Badge>)}
        </div>

        <p className="px-4 py-4 text-[13px] sm:text-sm leading-6 text-gray-700 line-clamp-3">
          {item.description}
        </p>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 group-hover:from-amber-50 group-hover:via-amber-100 group-hover:to-amber-50" />
    </button>
  );
}

/* ------------------- Pairing heuristics ------------------------ */
function getBeerPairings(pizza) {
  if (!pizza) return [];
  const text = `${pizza.name} ${pizza.description || ""} ${pizza.base || ""}`.toLowerCase();
  const has = (w) => text.includes(w);

  if (has("jalape") || has("buffalo") || has("spicy") || has("frank"))
    return ["hazy-ipa", "ipa", "lager", "witbier", "berliner-weisse"];

  if (has("barbecue") || has("bbq"))
    return ["amber-ale", "brown-ale", "porter", "vienna-lager"];

  if (has("white pizza") || has("ricotta") || has("crème") || has("creme") || has("sour cream"))
    return ["pilsner", "kolsch", "hefeweizen", "witbier", "saison"];

  if (has("margherita") || has("roma") || has("basil") || has("grandmas pie") || has("grandma"))
    return ["pilsner", "helles", "kolsch", "saison"];

  if (has("hawaii") || has("pineapple"))
    return ["hazy-ipa", "ipa", "witbier", "belgian-strong-golden"];

  if (has("meat") || has("pepperoni") || has("sausage") || has("meatball") || has("the works") || has("bronx bomber"))
    return ["ipa", "pale-ale", "amber-ale", "brown-ale", "porter"];

  if (has("veggie") || has("spinach") || has("broccoli") || has("mushroom"))
    return ["pilsner", "kolsch", "saison", "witbier"];

  if (has("marinara"))
    return ["pilsner", "pale-ale", "ipa", "amber-ale"];

  if (has("no base"))
    return ["pilsner", "kolsch", "hefeweizen", "saison"];

  return ["pilsner", "kolsch", "ipa"];
}

/* ------------------------ Fuzzy match utils -------------------- */
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’'"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function catalogMatch(extractedName, catalog) {
  const n = norm(extractedName);
  if (!n) return null;

  const exact = catalog.find((p) => norm(p.name) === n);
  if (exact) return exact;

  const partial = catalog.find((p) => norm(p.name).includes(n) || n.includes(norm(p.name)));
  if (partial) return partial;

  const tok = n.split(" ")[0];
  return catalog.find((p) => norm(p.name).includes(tok)) || null;
}

/* ---- Resolve OCR strings → DEFAULT_BEERS keys ------------------ */
function resolveBeerStyleKeys(strings = []) {
  const uniq = new Set();
  const map = DEFAULT_BEERS.map((b) => ({
    key: b.key,
    label: b.label,
    nKey: norm(b.key),
    nLabel: norm(b.label),
  }));

  strings.forEach((s) => {
    const n = norm(String(s));
    if (!n) return;
    const hit =
      map.find((m) => n === m.nKey || n === m.nLabel) ||
      map.find((m) => m.nLabel.includes(n) || n.includes(m.nLabel) || m.nKey.includes(n) || n.includes(m.nKey));
    if (hit) uniq.add(hit.key);
  });

  return Array.from(uniq);
}

/* --------------------------- Component ------------------------- */
export default function PizzaMenu() {
  const [q, setQ] = useState("");
  const [selectedPizza, setSelectedPizza] = useState(null);
  const [chosenBeers, setChosenBeers] = useState([]);

  // --- Beer list scan (SGTBeerPair) ---
  const [beerImg, setBeerImg] = useState(null);
  const [beerExtracting, setBeerExtracting] = useState(false);
  const [beerErr, setBeerErr] = useState("");
  const [beerFound, setBeerFound] = useState([]);

  // --- Pizza menu scan (uses /api/sgt-pair) ---
  const [pizzaExtracting, setPizzaExtracting] = useState(false);
  const [pizzaErr, setPizzaErr] = useState("");
  const [pizzaFound, setPizzaFound] = useState([]);

  // Track viewport to tune line clamps if desired (optional)
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const groups = useMemo(() => {
    const map = new Map();
    PIZZAS.forEach((p) => {
      const k = p.group || "Menu";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    });
    for (const k of map.keys()) {
      map.get(k).sort((a, b) => (b.limited === true) - (a.limited === true));
    }
    return map;
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return groups;
    const next = new Map();
    for (const [k, arr] of groups.entries()) {
      const subset = arr.filter((p) => {
        const hay = `${p.name} ${p.subtitle || ""} ${p.description} ${p.base || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
        return hay.includes(term);
      });
      if (subset.length) next.set(k, subset);
    }
    return next;
  }, [q, groups]);

  const totalCount = [...filtered.values()].reduce((n, arr) => n + arr.length, 0);
  const recommendedBeerKeys = useMemo(() => getBeerPairings(selectedPizza), [selectedPizza]);

  /* ------------------ Beer Scanner (OCR) ------------------------ */
  const handleBeerCapture = useCallback((dataUrl) => {
    setBeerImg(dataUrl);
    setBeerErr("");
  }, []);

  const handleBeerExtract = useCallback(async () => {
    setBeerErr("");
    if (!beerImg) {
      setBeerErr("Please capture or upload a beer list photo first.");
      return;
    }
    try {
      setBeerExtracting(true);
      const res = await fetch("/api/beer-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: beerImg }),
      });
      if (!res.ok) throw new Error(`Beer extraction failed (${res.status})`);

      const data = await res.json();
      const items = (data?.items || data?.beers || []).map((x) =>
        typeof x === "string" ? x : x?.name || x?.style || ""
      );
      setBeerFound(items.filter(Boolean));

      const keys = resolveBeerStyleKeys(items);
      if (keys.length) setChosenBeers(keys);
    } catch (e) {
      setBeerErr(e.message || "Beer extraction error.");
    } finally {
      setBeerExtracting(false);
    }
  }, [beerImg]);

  /* ---------- Pizza Scanner → Pair Beer (auto) -------------- */
  const onPizzaFileChange = useCallback(async (e) => {
    setPizzaErr("");
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setPizzaExtracting(true);
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/sgt-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      if (!res.ok) throw new Error(`Pizza pairing failed (${res.status})`);

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      setPizzaFound(items);

      const recKeys = Array.isArray(data?.recommendedStyles?.keys)
        ? data.recommendedStyles.keys
        : [];
      if (recKeys.length) {
        setChosenBeers(recKeys);
      }

      const strong = items.filter((i) => (i.matchScore ?? 0) >= 0.7);
      const pick = strong[0]?.matched || items[0]?.matched;
      if (pick) setSelectedPizza(pick);
    } catch (err) {
      setPizzaErr(err.message || "Pizza pairing error.");
    } finally {
      setPizzaExtracting(false);
      e.target.value = "";
    }
  }, []);

  /* ----------------------------- UI --------------------------- */
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[22px] sm:text-3xl font-bold tracking-tight text-gray-900">
            Sgt. Pepperoni’s Pizza Menu
          </h1>
          <p className="mt-1 text-[13px] sm:text-sm text-gray-600">
            Pick a pizza, or upload a pizza menu image to auto-pair beer styles.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <label htmlFor="menu-search" className="sr-only">Search menu</label>
          <input
            id="menu-search"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pizzas, bases, tags…"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] sm:text-sm text-gray-900 placeholder:text-gray-400 shadow-sm outline-none ring-0 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          />
        </div>
      </header>

      {/* Pizza → Beer pairing upload */}
      <div className="mb-8">
        <div
          className="relative w-full rounded-3xl cursor-pointer transition-all min-h-40 sm:min-h-48 grid place-items-center"
          style={{
            border: "2px dashed rgba(180,112,20,0.25)",
            background:
              "linear-gradient(180deg, rgba(255,247,230,.55) 0%, rgba(255,255,255,.7) 100%)",
          }}
          onClick={() => document.getElementById("sgt-pizza-upload")?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" ? document.getElementById("sgt-pizza-upload")?.click() : null)}
        >
          {pizzaExtracting && (
            <div className="absolute inset-0 grid place-items-center rounded-3xl bg-black/5">
              <span className="loading loading-spinner loading-lg text-amber-700" />
            </div>
          )}
          <div className="relative z-10 flex flex-col items-center gap-2 px-4 py-8 sm:py-10 text-center">
            <div
              className="grid size-14 sm:size-16 place-items-center rounded-2xl shadow-sm"
              style={{ background: "rgba(255,255,255,.9)", border: "1px solid rgba(14,39,55,0.12)" }}
            >
              <span className="text-2xl sm:text-3xl">📷</span>
            </div>
            <div className="font-medium text-[13px] sm:text-base text-gray-900">
              Upload a pizza menu image to auto-pair beers
            </div>
            <div className="text-[12px] sm:text-[13px] text-gray-600">
              Clear photo • Good lighting • Crop to the menu if possible
            </div>
          </div>
          <input
            id="sgt-pizza-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPizzaFileChange}
          />
        </div>

        {pizzaErr && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] sm:text-sm text-red-700">
            {pizzaErr}
          </div>
        )}

        {!!pizzaFound.length && (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 text-[13px] sm:text-sm text-gray-700 font-medium">
              Detected pizzas & suggested pairings:
            </div>
            <div className="grid gap-3">
              {pizzaFound.map((it, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate text-[14px] sm:text-[15px]">
                      {it.matched?.name || it.rawName}
                    </div>
                    <div className="text-[12px] sm:text-[13px] text-gray-600">
                      {it.matched?.description || it.notes || "—"}
                    </div>
                    {it.matched?.base && (
                      <div className="mt-1">
                        <Badge>{it.matched.base} base</Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(it.pairings?.labels || []).map((label) => (
                      <Badge key={label} tone="accent">{label}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[12px] sm:text-[13px] text-gray-600">
              We pre-selected the union of styles above in the beer picker.
            </div>
          </div>
        )}
      </div>

      {/* Count */}
      <p className="mb-4 text-[12px] sm:text-xs text-gray-500">
        Showing <span className="font-medium text-gray-700">{totalCount}</span> {totalCount === 1 ? "item" : "items"}
      </p>

      {/* Pizza grid */}
      <div className="space-y-10">
        {[...filtered.entries()].map(([groupName, items]) => (
          <section key={groupName}>
            <h2 className="mb-4 text-[16px] sm:text-xl font-semibold text-gray-900">{groupName}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Card
                  key={item.name}
                  item={item}
                  selected={selectedPizza?.name === item.name}
                  onSelect={setSelectedPizza}
                />
              ))}
            </div>
          </section>
        ))}

        {totalCount === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-[13px] sm:text-sm text-gray-600">
              No matches. Try a different search term (e.g., “marinara”, “spicy”, “ricotta”).
            </p>
          </div>
        )}
      </div>

      {/* Pairing panel */}
      <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[18px] sm:text-xl font-semibold text-gray-900">Beer Pairings</h3>
            <p className="text-[13px] sm:text-sm text-gray-600">
              {selectedPizza
                ? `Recommended styles for “${selectedPizza.name}”`
                : "Select a pizza above or upload a pizza menu image."}
            </p>
          </div>
          {selectedPizza && (
            <div className="flex flex-wrap gap-2">
              {DEFAULT_BEERS.filter((b) => recommendedBeerKeys.includes(b.key)).map((b) => (
                <Badge key={b.key} className="!bg-amber-50 !text-amber-800 !ring-amber-200">
                  {b.label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Interactive beer picker (user can pick what they’re drinking) */}
        <div className="mt-6">
          <BeerTypeGrid
            items={DEFAULT_BEERS}
            multi
            onChange={(keys) => setChosenBeers(keys)}
          />
        </div>

        {/* Summary ties pizza selection to chosen beer styles */}
        <div className="mt-6 rounded-xl bg-gray-50 p-4 text-[13px] sm:text-sm text-gray-700">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-gray-500">Selected Pizza</div>
              <div className="font-medium text-gray-900">
                {selectedPizza ? selectedPizza.name : "—"}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Chosen Beer Styles</div>
              <div className="font-medium text-gray-900">
                {chosenBeers.length
                  ? chosenBeers.map((k) => DEFAULT_BEERS.find((b) => b.key === k)?.label || k).join(", ")
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Beer scanner (OCR of the beer list) */}
      <div className="mt-10">
        <h3 className="mb-3 text-[16px] sm:text-lg font-semibold text-gray-900">Scan Beer List</h3>
        <SGTBeerPair
          onCapture={handleBeerCapture}
          onExtract={handleBeerExtract}
          isExtracting={beerExtracting}
          title="Scan Beer List"
          className="border border-emerald-900/10"
        />
        {beerErr && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] sm:text-sm text-red-700">
            {beerErr}
          </div>
        )}
        {!!beerFound.length && (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-2 text-[13px] sm:text-sm text-gray-600">Detected from beer list:</div>
            <div className="flex flex-wrap gap-2">
              {beerFound.map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-amber-800"
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-3 text-[12px] sm:text-[13px] text-gray-600">
              Matched styles are pre-selected above. Adjust anytime.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
