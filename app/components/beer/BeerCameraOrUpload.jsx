"use client";

import { useEffect, useRef, useState, useMemo } from "react";

/**
 * Props:
 * - onCapture: (dataUrl: string) => void
 * - onExtract?: () => void
 * - className?: string
 * - title?: string
 * - autoStartOnMount?: boolean
 * - isExtracting?: boolean
 * - results?: Array<{
 *     name?: string, brewery?: string|null, style?: string|null,
 *     abv?: number|null, ibu?: number|null, origin?: string|null,
 *     size?: string|null, price?: string|null, notes?: string|null
 *   }>
 * - suggestedStyles?: string[]
 * - selectedPizzaName?: string
 * - onAskAI?: (beerItem) => Promise<{ markdown?: string }>
 * - onConfirmPairing?: (payload: { beer: any, pizzaName: string }) => void
 * - pizzaOptions?: Array<string | { name: string }>
 * - onSelectPizza?: (pizzaName: string) => void
 * - onSelectBeer?: (beer: any) => void                   // ✅ NEW: lift beer up
 */
export default function BeerCameraOrUpload({
  onCapture,
  onExtract,
  className = "",
  title = "Scan Beer List",
  autoStartOnMount = false,
  isExtracting = false,
  results = [],
  suggestedStyles = [],
  selectedPizzaName = "",
  onAskAI,
  onConfirmPairing,
  pizzaOptions = [],
  onSelectPizza,
  onSelectBeer,                                            // ✅ receive from parent
}) {
  const PALETTE = {
    hops: "#17503A",
    darkHops: "#0E3727",
    foam: "#FAF7EF",
    glass: "rgba(250,247,239,0.92)",
    amber: "#F2B23A",
    malt: "#7B4A1B",
  };

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  const [usingCamera, setUsingCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [mounted, setMounted] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [hasMediaDevices, setHasMediaDevices] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setIsSecure(
        typeof window !== "undefined" &&
          (window.location.protocol === "https:" ||
            window.location.hostname === "localhost")
      );
      setHasMediaDevices(
        typeof navigator !== "undefined" &&
          !!navigator.mediaDevices &&
          !!navigator.mediaDevices.getUserMedia
      );
    } catch {}
  }, []);

  const attachStreamToVideo = async (videoEl, mediaStream) => {
    if (!videoEl) return;
    try {
      if (videoEl.srcObject !== mediaStream) videoEl.srcObject = mediaStream;
      videoEl.setAttribute("playsinline", "");
      videoEl.setAttribute("autoplay", "");
      videoEl.muted = true;

      if (videoEl.readyState < 1) {
        await new Promise((resolve) => {
          const h = () => {
            videoEl.removeEventListener("loadedmetadata", h);
            resolve();
          };
          videoEl.addEventListener("loadedmetadata", h, { once: true });
        });
      }
      await videoEl.play().catch(() => {});
    } catch (e) {
      console.warn("attachStreamToVideo failed:", e);
    }
  };

  const tapToFocus = async (e) => {
    try {
      const stream = streamRef.current;
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      const video = videoRef.current;
      if (!video) return;
      const rect = video.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      await track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x: px, y: py }] }] });
    } catch {}
  };

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    const isMobileUA =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
        navigator.userAgent || ""
      );
    if (autoStartOnMount && mounted && hasMediaDevices && isSecure && isMobileUA && !usingCamera) {
      startCamera();
    }
  }, [autoStartOnMount, mounted, hasMediaDevices, isSecure, usingCamera]);

  useEffect(() => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (usingCamera && stream && video) {
      const id = requestAnimationFrame(() => attachStreamToVideo(video, stream));
      return () => cancelAnimationFrame(id);
    }
  }, [usingCamera]);

  async function startCamera() {
    if (!isSecure) {
      setError("Camera requires HTTPS or localhost.");
      return;
    }
    if (!hasMediaDevices) {
      setError("Camera not supported. Try uploading an image instead.");
      return;
    }
    try {
      setError("");
      setBusy(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 640, max: 1920 },
          height: { ideal: 360, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });

      try {
        const track = stream.getVideoTracks()[0];
        await track.applyConstraints({
          advanced: [{ focusMode: "continuous" }, { exposureMode: "continuous" }],
        });
      } catch {}

      streamRef.current = stream;
      setUsingCamera(true);
      const video = videoRef.current;
      if (video) await attachStreamToVideo(video, stream);
    } catch {
      setError("Could not access camera. You can still upload a photo.");
      setUsingCamera(false);
      streamRef.current = null;
    } finally {
      setBusy(false);
    }
  }

  function stopCamera() {
    try {
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const v = videoRef.current;
      if (v) v.srcObject = null;
    } catch {} finally {
      streamRef.current = null;
      setUsingCamera(false);
    }
  }

  function snapPhoto() {
    try {
      setError("");
      const video = videoRef.current;
      if (!video) return;
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onCapture?.(dataUrl);
    } catch {
      setError("Failed to capture image. Try again or upload instead.");
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    setBusy(true);
    reader.onload = () => {
      onCapture?.(String(reader.result));
      setBusy(false);
    };
    reader.onerror = () => setBusy(false);
    reader.readAsDataURL(file);
  }

  /* ---------- Search / rank / selection ---------- */

  const [query, setQuery] = useState("");
  const [activeStyle, setActiveStyle] = useState("");

  const [pizzaLocal, setPizzaLocal] = useState(selectedPizzaName || "");
  useEffect(() => setPizzaLocal(selectedPizzaName || ""), [selectedPizzaName]);
  useEffect(() => {
    if (pizzaLocal !== (selectedPizzaName || "")) onSelectPizza?.(pizzaLocal);
  }, [pizzaLocal, selectedPizzaName, onSelectPizza]);

  const effectivePizzaName = pizzaLocal || selectedPizzaName || "";

  const normalize = (s) =>
    String(s || "").toLowerCase().replace(/[^a-z0-9\s/+-]/g, " ").replace(/\s+/g, " ").trim();

  const tokenize = (s) =>
    new Set(
      normalize(s)
        .split(/\s|\/|\+/)
        .filter(Boolean)
    );

  const styleTokensList = useMemo(
    () => (suggestedStyles || []).map((s) => tokenize(s)),
    [suggestedStyles]
  );

  const similarity = (aTokens, bTokens) => {
    if (!aTokens.size || !bTokens.size) return 0;
    let intersect = 0;
    aTokens.forEach((t) => {
      if (bTokens.has(t)) intersect += 1;
    });
    const union = aTokens.size + bTokens.size - intersect;
    return union ? intersect / union : 0;
  };

  const scoreBeer = (beer) => {
    const base = 20;
    const styleTokens = tokenize(normalize(beer.style || ""));
    let maxSim = 0;
    for (const sTok of styleTokensList) maxSim = Math.max(maxSim, similarity(styleTokens, sTok));
    const styleScore = Math.round(maxSim * 70);
    const abv = Number.isFinite(beer.abv) ? Number(beer.abv) : null;
    const abvScore = abv != null && abv >= 4.0 && abv <= 6.5 ? 5 : 0;
    const ibu = Number.isFinite(beer.ibu) ? Number(beer.ibu) : null;
    const ibuScore = ibu != null && ibu >= 15 && ibu <= 45 ? 5 : 0;

    let notesBonus = 0;
    const notes = normalize(beer.notes || "");
    if (notes && styleTokensList.length) {
      const notesTokens = tokenize(notes);
      for (const sTok of styleTokensList) {
        if (similarity(notesTokens, sTok) >= 0.25) {
          notesBonus = 5;
          break;
        }
      }
    }
    return Math.max(0, Math.min(100, base + styleScore + abvScore + ibuScore + notesBonus));
  };

  const uniqueStyles = useMemo(() => {
    const s = new Set((results || []).map((b) => (b.style || "").trim()).filter(Boolean));
    (suggestedStyles || []).forEach((x) => s.add(x));
    return Array.from(s);
  }, [results, suggestedStyles]);

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (results || []).filter((b) => {
      const hay = `${b.name || ""} ${b.brewery || ""} ${b.style || ""} ${b.notes || ""}`.toLowerCase();
      const qOk = !q || hay.includes(q);
      const styleOk = !activeStyle || (b.style || "").toLowerCase() === activeStyle.toLowerCase();
      return qOk && styleOk;
    });
  }, [results, query, activeStyle]);

  const makeKey = (b) =>
    JSON.stringify({
      n: b?.name || "",
      br: b?.brewery || "",
      st: b?.style || "",
      abv: Number.isFinite(b?.abv) ? Number(b.abv) : null,
      ibu: Number.isFinite(b?.ibu) ? Number(b.ibu) : null,
      sz: b?.size || "",
      pr: b?.price || "",
    });

  const scoredResults = useMemo(() => {
    const withScores = filteredResults.map((b) => ({ beer: b, score: scoreBeer(b), key: makeKey(b) }));
    withScores.sort((a, b) => b.score - a.score);
    return withScores.map((x, i) => ({ ...x, rank: i + 1 }));
  }, [filteredResults, styleTokensList.length]);

  const [selectedBeerKey, setSelectedBeerKey] = useState("");
  const selectedBeerObj = useMemo(
    () => (selectedBeerKey ? scoredResults.find((i) => i.key === selectedBeerKey)?.beer || null : null),
    [selectedBeerKey, scoredResults]
  );

  // ✅ Whenever beer selection changes, notify parent so bottom button enables
  useEffect(() => {
    if (selectedBeerObj) onSelectBeer?.(selectedBeerObj);
  }, [selectedBeerObj, onSelectBeer]);

  // --- AI advice state (optional feature) ---
  const [advice, setAdvice] = useState({});
  async function askAIFor(idx) {
    const item = scoredResults[idx]?.beer;
    if (!item) return;
    setAdvice((s) => ({ ...s, [idx]: { ...(s[idx] || {}), loading: true, error: "", open: true } }));
    try {
      let payload = { markdown: "" };
      if (onAskAI) {
        payload = (await onAskAI(item)) || { markdown: "" };
      } else {
        const res = await fetch("/api/beer-advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ beer: item, pizzaName: effectivePizzaName || null }),
        });
        if (!res.ok) throw new Error(`Advice failed (${res.status})`);
        payload = await res.json();
      }
      setAdvice((s) => ({
        ...s,
        [idx]: { ...(s[idx] || {}), loading: false, markdown: payload.markdown || "No advice returned.", error: "", open: true },
      }));
    } catch (e) {
      setAdvice((s) => ({
        ...s,
        [idx]: { ...(s[idx] || {}), loading: false, error: e.message || "Advice error.", open: true },
      }));
    }
  }
  function toggleAdvice(idx) {
    setAdvice((s) => ({ ...s, [idx]: { ...(s[idx] || {}), open: !s[idx]?.open } }));
  }

  function handleConfirm() {
    if (!selectedBeerObj || !effectivePizzaName) return;
    onConfirmPairing?.({ beer: selectedBeerObj, pizzaName: effectivePizzaName });
  }

  const ResultSkeleton = () => (
    <div className="animate-pulse rounded-2xl border border-gray-200 p-4">
      <div className="h-5 w-1/3 rounded bg-gray-200" />
      <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
      <div className="mt-3 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-gray-200" />
        <div className="h-6 w-12 rounded-full bg-gray-200" />
        <div className="h-6 w-20 rounded-full bg-gray-200" />
      </div>
    </div>
  );

  const ScoreBadge = ({ score }) => (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
      Pairing Score {score}/100
    </span>
  );

  const ScoreBar = ({ score }) => (
    <div className="mt-2">
      <div className="h-2 w-full rounded-full bg-gray-100 ring-1 ring-gray-200" />
      <div
        className="h-2 -mt-2 rounded-full"
        style={{
          width: `${score}%`,
          background: "linear-gradient(90deg, rgba(23,80,58,0.85) 0%, rgba(242,178,58,0.9) 100%)",
        }}
      />
    </div>
  );

  const BeerCard = ({ item, idx }) => {
    const { beer, score, rank, key } = item;
    const s = advice[idx] || {};
    const isSelected = selectedBeerKey === key;

    const tag = (label) => (
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] sm:text-xs text-gray-700">
        {label}
      </span>
    );

    return (
      <div
        className={[
          "rounded-2xl border bg-white p-4 shadow-sm transition",
          isSelected ? "border-emerald-400 ring-2 ring-emerald-200" : "border-gray-200",
        ].join(" ")}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedBeerKey(key)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedBeerKey(key)}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[15px] sm:text-base font-semibold text-gray-900 truncate">
                {beer.name || "Unnamed Beer"}
              </div>
              <span className="text-[11px] sm:text-xs text-gray-500">#{rank}</span>
              {isSelected && (
                <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-white">
                  Selected
                </span>
              )}
            </div>
            <div className="text-[13px] leading-5 sm:text-sm sm:leading-6 text-gray-600">
              {beer.brewery ? `${beer.brewery} · ` : ""}{beer.style || "—"}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <ScoreBadge score={score} />
              {beer.abv != null && tag(`${Number(beer.abv).toFixed(1)}% ABV`)}
              {beer.ibu != null && tag(`${beer.ibu} IBU`)}
              {beer.origin && tag(beer.origin)}
              {beer.size && tag(beer.size)}
              {beer.price && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] sm:text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                  {beer.price}
                </span>
              )}
            </div>

            <ScoreBar score={score} />

            {beer.notes && (
              <div className="mt-2 text-[13px] leading-5 sm:text-sm sm:leading-6 text-gray-700 line-clamp-2">
                {beer.notes}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBeerKey(key);            // selects & triggers onSelectBeer via effect
              }}
              className={[
                "btn btn-sm rounded-xl font-semibold",
                isSelected
                  ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
              ].join(" ")}
              aria-pressed={isSelected ? "true" : "false"}
            >
              {isSelected ? "Selected" : "Select"}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                askAIFor(idx);
              }}
              disabled={!!s.loading}
              className="btn btn-sm rounded-xl border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
              title={effectivePizzaName ? `Why with “${effectivePizzaName}”?` : "AI tips"}
            >
              {s.loading ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-2" />
                  Asking AI…
                </>
              ) : effectivePizzaName ? (
                `Why with “${effectivePizzaName}”?`
              ) : (
                "AI tips"
              )}
            </button>
          </div>
        </div>

        {s.error && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {s.error}
          </div>
        )}

        {s.markdown && (
          <div className="mt-3">
            <button
              className="text-xs text-gray-600 underline hover:text-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                toggleAdvice(idx);
              }}
            >
              {s.open ? "Hide details" : "Show details"}
            </button>

            {s.open && (
              <div className="mt-2 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-[13.5px] sm:text-[14px] md:text-[15px] lg:text-[16px] leading-[1.65] sm:leading-[1.7] space-y-2 sm:space-y-2.5 break-words [hyphens:auto] text-gray-800">
                  {s.markdown.split("\n").map((line, i) => {
                    const t = line.trim();
                    if (!t) return <div key={`sp-${i}`} className="h-1" />;
                    if (t.startsWith("- "))
                      return (
                        <ul key={`ul-${i}`} className="list-disc pl-4 sm:pl-5">
                          <li>{t.replace(/^- /, "")}</li>
                        </ul>
                      );
                    return <p key={`p-${i}`} className="m-0">{t}</p>;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // UI — top section with pizza select and pair button
  const pizzaNames = useMemo(
    () => (pizzaOptions || []).map((p) => (typeof p === "string" ? p : p?.name)).filter(Boolean),
    [pizzaOptions]
  );

  const canConfirm = !!selectedBeerObj && !!effectivePizzaName;
  const selectedPizzaDisplay = effectivePizzaName || "The Works";
  const chosenStyleDisplay =
    activeStyle || (suggestedStyles && suggestedStyles.length ? suggestedStyles.join(", ") : "Dry Stout");

  return (
    <div
      className={["relative", "card rounded-3xl shadow-2xl max-w-full", "ring-1", className].join(" ")}
      style={{
        background: PALETTE.glass,
        borderColor: "rgba(14,39,55,0.12)",
        boxShadow: "0 18px 50px rgba(10,30,43,.18), inset 0 1px 0 rgba(255,255,255,.4)",
      }}
    >
      {(busy || isExtracting) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-3xl bg-black/5">
          <div className="loading loading-spinner loading-lg text-black" />
        </div>
      )}

      <div className="card-body gap-4 sm:gap-5">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg sm:text-xl font-semibold tracking-wide text-black">{title}</h2>
          <div className="flex items-center gap-2">
            {isExtracting && <span className="loading loading-spinner loading-sm text-black" />}
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: PALETTE.amber }} />
          </div>
        </div>

        {/* Top pairing bar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900 mb-2">Choose your beer from the scanned list:</div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[13px] sm:text-sm text-gray-700">
              <span className="font-medium">Pizza:</span>{" "}
              {pizzaNames.length ? (
                <span className="inline-block">
                  <label className="sr-only" htmlFor="pizzaSelectTop">Choose a pizza</label>
                  <select
                    id="pizzaSelectTop"
                    className="ml-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-[13px] sm:text-sm text-gray-900 shadow-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    value={pizzaLocal || ""}
                    onChange={(e) => setPizzaLocal(e.target.value)}
                  >
                    <option value="" disabled>Choose a pizza to continue</option>
                    {pizzaNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </span>
              ) : (
                <span className="text-gray-500">Choose a pizza to continue</span>
              )}
            </div>

            <div className="text-[13px] sm:text-sm text-gray-700">
              {selectedBeerObj ? (
                <>
                  <span className="font-medium">Selected beer:</span>{" "}
                  {selectedBeerObj.name || "Unnamed Beer"}
                  {selectedBeerObj.style ? ` • ${selectedBeerObj.style}` : ""}
                  {selectedBeerObj.brewery ? ` • ${selectedBeerObj.brewery}` : ""}
                </>
              ) : (
                <span className="text-gray-500">Selected beer: none (tap “Select” on a card below)</span>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-800 ring-1 ring-gray-200 px-3 py-1 text-xs">
                <span className="font-semibold mr-1.5">Selected Pizza:</span>
                {selectedPizzaDisplay}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-800 ring-1 ring-gray-200 px-3 py-1 text-xs">
                <span className="font-semibold mr-1.5">Chosen Beer Styles:</span>
                {chosenStyleDisplay}
              </span>
            </div>

            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className={[
                "btn btn-sm sm:btn-md rounded-2xl font-semibold min-w-[10rem]",
                canConfirm
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
                  : "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed",
              ].join(" ")}
              title={canConfirm ? "Pair the selected beer with this pizza" : "Pick a pizza and select a beer"}
            >
              Pair Beer + Pizza
            </button>
          </div>
        </div>

        {/* Camera/Upload & controls */}
        {/* ...unchanged content below (camera, upload, extract button, results grid using BeerCard) ... */}

        {/* Upload/Camera toolbar */}
        <div className="join w-full flex-wrap sm:flex-nowrap gap-2 sm:gap-0">
          <button
            onClick={usingCamera ? stopCamera : startCamera}
            disabled={busy || isExtracting}
            className="btn join-item btn-sm sm:btn-md font-semibold transition-colors"
            style={
              usingCamera
                ? {
                    background: "linear-gradient(135deg, #F2B23A 0%, #E39D1C 100%)",
                    color: "#000",
                    border: "1px solid rgba(14,39,55,0.18)",
                  }
                : {
                    background: "linear-gradient(135deg, #17503A 0%, #0E3727 100%)",
                    color: "#fff",
                    border: "1px solid rgba(242,178,58,0.35)",
                  }
            }
          >
            {busy ? <span className="loading loading-spinner text-black" /> : usingCamera ? "Stop Camera" : "Use Camera"}
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy || isExtracting}
            className="btn join-item btn-sm sm:btn-md font-semibold"
            style={{ background: "rgba(255,255,255,.9)", color: "#000", border: "1px solid rgba(14,39,55,0.18)" }}
          >
            {isExtracting || busy ? (
              <>
                <span className="loading loading-spinner loading-xs mr-2 text-black" />
                Upload Photo
              </>
            ) : (
              "Upload Photo"
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
        </div>

        {/* Live preview */}
        {usingCamera && (
          <div
            className="rounded-3xl overflow-hidden shadow-xl"
            style={{
              background: "linear-gradient(180deg, rgba(214,232,223,0.35) 0%, rgba(250,247,239,0.55) 100%)",
              border: "1px solid rgba(14,39,55,0.12)",
            }}
          >
            <div
              className="p-2"
              style={{ background: "linear-gradient(180deg, rgba(23,80,58,0.08) 0%, rgba(23,80,58,0.03) 100%)" }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                onClick={tapToFocus}
                className="rounded-2xl w-full h-auto object-contain bg-black"
                style={{ maxHeight: "min(60svh, 480px)" }}
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 justify-between">
              <div className="text-xs sm:text-sm text-black">Center the beer list and tap snap. Rear camera when available.</div>
              <button
                onClick={snapPhoto}
                disabled={busy || isExtracting}
                className="btn btn-sm sm:btn-md rounded-2xl font-semibold"
                style={{
                  background: "linear-gradient(135deg, #F2B23A 0%, #E39D1C 100%)",
                  color: "#000",
                  border: "1px solid rgba(14,39,55,0.18)",
                }}
              >
                {isExtracting ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2 text-black" />
                    Snap Photo
                  </>
                ) : (
                  "Snap Photo"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Insecure tip */}
        {mounted && !isSecure && <div className="text-xs text-black/70">Tip: Camera only works over HTTPS or on localhost.</div>}

        {/* Extract button */}
        <div className="mt-2 sm:mt-4 flex justify-end">
          <button
            onClick={() => onExtract?.()}
            disabled={isExtracting}
            aria-busy={isExtracting ? "true" : "false"}
            className="btn btn-sm sm:btn-md px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-semibold min-w-[10rem]"
            style={{
              background: "linear-gradient(135deg, #17503A 0%, #0E3727 100%)",
              color: "#fff",
              border: "1px solid rgba(242,178,58,0.35)",
            }}
          >
            {isExtracting ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2 text-black bg-transparent" />
                Extracting…
              </>
            ) : (
              "Extract Beer List"
            )}
          </button>
        </div>

        {/* Results */}
        <div className="text-black mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-base font-semibold text-gray-900">Beer Results (ranked best first)</div>
              <div className="text-gray-600 text-[13px] leading-5 sm:text-sm sm:leading-6">
                {results.length ? `Found ${results.length} item${results.length === 1 ? "" : "s"}` : isExtracting ? "Extracting…" : "No results yet"}
              </div>
              {!!suggestedStyles.length && (
                <div className="mt-1 text-[11px] sm:text-xs text-gray-500">Scoring uses style match to: {suggestedStyles.join(", ")}.</div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, brewery, style…"
                className="w-full sm:w-64 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
              {!!uniqueStyles.length && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    className={["rounded-full px-3 py-1 text-xs border", !activeStyle ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-800 border-gray-200"].join(" ")}
                    onClick={() => setActiveStyle("")}
                  >
                    All
                  </button>
                  {uniqueStyles.map((s) => (
                    <button
                      key={s}
                      className={[
                        "rounded-full px-3 py-1 text-xs border",
                        activeStyle.toLowerCase() === s.toLowerCase() ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-800 border-gray-200",
                      ].join(" ")}
                      onClick={() => setActiveStyle(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Skeletons */}
          {isExtracting && !results.length && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ResultSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Cards */}
          {!!scoredResults.length && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {scoredResults.map((item, i) => (
                <BeerCard key={`${item.key}-${i}`} item={item} idx={i} />
              ))}
            </div>
          )}

          {!isExtracting && results.length > 0 && scoredResults.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
              No matches for your filters.
            </div>
          )}
        </div>

        {!!error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
      </div>
    </div>
  );
}
