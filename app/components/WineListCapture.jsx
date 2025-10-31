// // components/WineListCapture.jsx
// "use client";

// import { useEffect, useRef, useState } from "react";

// /* -------------------------------------------------------
//    Theme helpers (colors come from globals.css variables)
// ------------------------------------------------------- */
// const borderColor = "#000000"; // black borders
// const subtleText = "#4b5563"; // Dark gray for readability
// const faintText = "#6b7280"; // Medium-dark gray
// const chipBg = "#f9fafb"; // very light gray
// const softBg = "#ffffff"; // white cards
// const headerGrad =
//   "linear-gradient(135deg, var(--gear-blue-medium), var(--gear-blue-light), var(--handle-orange))";

// /** EMA helper for smoothing values */
// const ema = (prev, next, k = 0.2) => (prev == null ? next : prev + k * (next - prev));

// /* Tiny UI bits */
// const TinySpinner = () => (
//   <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
// );

// export default function WineListCapture() {
//   const [error, setError] = useState(null);
//   const [isDragging, setIsDragging] = useState(false);

//   // Camera / upload
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const [stream, setStream] = useState(null);
//   const [camReady, setCamReady] = useState(false);
//   const [camFullscreen, setCamFullscreen] = useState(false);

//   // Stabilization + focus HUD
//   const [stabilize, setStabilize] = useState(true);
//   const [focusScore, setFocusScore] = useState(0);
//   const [focusThreshold, setFocusThreshold] = useState(85);
//   const [inFocus, setInFocus] = useState(false);
//   const [stabTx, setStabTx] = useState({ x: 0, y: 0 });
//   const analysisRef = useRef({ running: false, prevSmall: null, tx: 0, ty: 0 });

//   // Capture + extraction
//   const [lastImageDataUrl, setLastImageDataUrl] = useState(null);
//   const [extracting, setExtracting] = useState(false);
//   const [wines, setWines] = useState([]); // [{ name, region, ... }]
//   const [showJSON, setShowJSON] = useState(false);

//   /* ---------------- Camera helpers ---------------- */

//   // Attach a MediaStream to a <video> and play it safely (iOS-friendly)
//   const attachStreamToVideo = async (videoEl, mediaStream) => {
//     if (!videoEl) return;
//     try {
//       if (videoEl.srcObject !== mediaStream) {
//         videoEl.srcObject = mediaStream;
//       }
//       videoEl.setAttribute("playsinline", "");
//       videoEl.setAttribute("autoplay", "");
//       videoEl.muted = true;

//       if (videoEl.readyState < 1) {
//         await new Promise((resolve) => {
//           const h = () => {
//             videoEl.removeEventListener("loadedmetadata", h);
//             resolve();
//           };
//           videoEl.addEventListener("loadedmetadata", h, { once: true });
//         });
//       }
//       await videoEl.play().catch(() => {});
//       setCamReady(true);
//     } catch (e) {
//       console.warn("attachStreamToVideo failed:", e);
//     }
//   };

//   const startCamera = async () => {
//     setError(null);

//     const isSecure =
//       typeof window !== "undefined" &&
//       (location.protocol === "https:" || location.hostname === "localhost");
//     if (!isSecure) {
//       setError("Camera requires HTTPS or localhost. Open the site over https:// to use the camera.");
//       return;
//     }

//     if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
//       setError("Camera API not available in this browser. Try uploading a photo instead.");
//       return;
//     }

//     try {
//       setCamReady(false);
//       const s = await navigator.mediaDevices.getUserMedia({
//         video: {
//           facingMode: { ideal: "environment" },
//           width: { ideal: 1280, max: 1920 },
//           height: { ideal: 720, max: 1080 },
//           frameRate: { ideal: 30, max: 60 },
//         },
//         audio: false,
//       });

//       // Best-effort extras
//       try {
//         const track = s.getVideoTracks()[0];
//         await track.applyConstraints({
//           advanced: [{ focusMode: "continuous" }, { exposureMode: "continuous" }, { noiseSuppression: true }],
//         });
//       } catch {}

//       setStream(s);
//       await attachStreamToVideo(videoRef.current, s);

//       if (!analysisRef.current.running) {
//         analysisRef.current.running = true;
//         requestAnimationFrame(analysisLoop);
//       }
//     } catch (err) {
//       console.warn(err);
//       setError("Camera access denied or unavailable. You can still upload a photo.");
//     }
//   };

//   const stopCamera = () => {
//     try {
//       stream?.getTracks()?.forEach((t) => t.stop());
//     } catch {}
//     setStream(null);
//     setCamReady(false);
//     analysisRef.current.running = false;
//     analysisRef.current.prevSmall = null;

//     const v = videoRef.current;
//     if (v) v.srcObject = null;
//     setStabTx({ x: 0, y: 0 });
//   };

//   const openFullscreenCamera = async () => {
//     if (!stream) await startCamera();
//     setCamFullscreen(true);
//   };
//   const closeFullscreenCamera = () => setCamFullscreen(false);

//   const tapToFocus = async (e) => {
//     if (!stream) return;
//     const track = stream.getVideoTracks()[0];
//     const video = videoRef.current;
//     if (!video) return;
//     const rect = video.getBoundingClientRect();
//     const px = (e.clientX - rect.left) / rect.width;
//     const py = (e.clientY - rect.top) / rect.height;
//     try {
//       await track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x: px, y: py }] }] });
//     } catch {}
//   };

//   // Re-attach stream when the video element changes (inline ↔ fullscreen)
//   useEffect(() => {
//     if (!stream) return;
//     const id = requestAnimationFrame(async () => {
//       const v = videoRef.current;
//       if (v) await attachStreamToVideo(v, stream);
//     });
//     return () => cancelAnimationFrame(id);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [stream, camFullscreen]);

//   // Cleanup srcObject on unmount
//   useEffect(() => {
//     return () => {
//       const v = videoRef.current;
//       if (v) v.srcObject = null;
//       stopCamera();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Lock body scroll on fullscreen
//   useEffect(() => {
//     if (camFullscreen) {
//       const prev = document.body.style.overflow;
//       document.body.style.overflow = "hidden";
//       return () => {
//         document.body.style.overflow = prev;
//       };
//     }
//   }, [camFullscreen]);

//   // Focus score + micro-shake stabilization
//   const analysisLoop = () => {
//     if (!analysisRef.current.running) return;
//     const v = videoRef.current;
//     if (!v || v.readyState < 2) {
//       requestAnimationFrame(analysisLoop);
//       return;
//     }
//     const w = 192;
//     const h = Math.max(108, Math.round((v.videoHeight / v.videoWidth) * 192)) || 108;
//     const tmp = document.createElement("canvas");
//     tmp.width = w;
//     tmp.height = h;
//     const ctx = tmp.getContext("2d", { willReadFrequently: true });
//     ctx.drawImage(v, 0, 0, w, h);
//     const img = ctx.getImageData(0, 0, w, h).data;

//     const gray = new Float32Array(w * h);
//     for (let i = 0, j = 0; i < img.length; i += 4, j++) {
//       gray[j] = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
//     }

//     let sum = 0,
//       sumSq = 0,
//       cnt = 0;
//     const lap = (x, y) => {
//       const c = y * w + x;
//       const center = gray[c] * 4;
//       return (
//         center -
//         (gray[c - 1] || gray[c]) -
//         (gray[c + 1] || gray[c]) -
//         (gray[c - w] || gray[c]) -
//         (gray[c + w] || gray[c])
//       );
//     };
//     for (let y = 1; y < h - 1; y += 2) {
//       for (let x = 1; x < w - 1; x += 2) {
//         const vL = lap(x, y);
//         sum += vL;
//         sumSq += vL * vL;
//         cnt++;
//       }
//     }
//     const mean = sum / Math.max(1, cnt);
//     const variance = Math.max(0, sumSq / Math.max(1, cnt) - mean * mean);
//     const score = Math.sqrt(variance);
//     setFocusScore((s) => ema(s, score, 0.3));
//     setInFocus(score >= focusThreshold);

//     // Centroid → small translate for micro-shake
//     let cx = 0,
//       cy = 0,
//       weight = 0;
//     for (let y = 0; y < h; y += 3) {
//       for (let x = 0; x < w; x += 3) {
//         const val = gray[y * w + x];
//         const wgt = val * val;
//         cx += x * wgt;
//         cy += y * wgt;
//         weight += wgt;
//       }
//     }
//     cx = weight ? cx / weight : w / 2;
//     cy = weight ? cy / weight : h / 2;

//     const st = analysisRef.current;
//     if (st.prevSmall) {
//       const dx = cx - st.prevSmall.cx;
//       const dy = cy - st.prevSmall.cy;
//       st.tx = ema(st.tx, -dx, 0.25);
//       st.ty = ema(st.ty, -dy, 0.25);
//       const clamp = (v, m) => Math.max(-m, Math.min(m, v));
//       const maxPx = 12;
//       const tx = clamp(st.tx, maxPx);
//       const ty = clamp(st.ty, maxPx);
//       setStabTx((t) => ({ x: ema(t.x, tx, 0.35), y: ema(t.y, ty, 0.35) }));
//     }
//     st.prevSmall = { cx, cy };

//     requestAnimationFrame(analysisLoop);
//   };

//   /* ---------------- Capture + Extract ---------------- */

//   const captureToDataUrl = () => {
//     try {
//       const v = videoRef.current;
//       const c = canvasRef.current;
//       if (!v || !c) return null;
//       const w = v.videoWidth || 1280;
//       const h = v.videoHeight || 720;
//       c.width = w;
//       c.height = h;
//       const ctx = c.getContext("2d");
//       ctx.drawImage(v, 0, 0, w, h);
//       return c.toDataURL("image/jpeg", 0.92); // good OCR balance
//     } catch {
//       setError("Failed to capture image. Try again or upload instead.");
//       return null;
//     }
//   };

//   const sendForExtraction = async (imageDataUrl) => {
//     setError(null);
//     setExtracting(true);
//     setWines([]);
//     setLastImageDataUrl(imageDataUrl);
//     try {
//       const res = await fetch("/api/extract", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ imageDataUrl }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Extraction failed.");
//       setWines(Array.isArray(data.wines) ? data.wines : []);
//     } catch (e) {
//       setError(e.message || "Extraction failed.");
//     } finally {
//       setExtracting(false);
//     }
//   };

//   const snapAndExtract = async () => {
//     const url = captureToDataUrl();
//     if (!url) return;
//     if (camFullscreen) setCamFullscreen(false);
//     await sendForExtraction(url);
//   };

//   const onUploadFile = (file) => {
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = () => {
//       const dataUrl = String(reader.result || "");
//       setLastImageDataUrl(dataUrl);
//       sendForExtraction(dataUrl);
//     };
//     reader.readAsDataURL(file);
//   };

//   /* ---------------- UI ---------------- */

//   const btnBase =
//     "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
//   const btnMuted = `${btnBase}`;
//   const btnPrimary = `${btnBase} text-white btn-accent`;

//   return (
//     <div
//       className={[
//         "mx-auto w-full",
//         "max-w-screen-xl", // roomy on desktop
//         "px-3 sm:px-5 lg:px-8 py-6 sm:py-8", // tighter vertical on small screens
//         "bg-white text-black",
//       ].join(" ")}
//     >
//       {/* Header */}
//       <div className="mb-4 sm:mb-6 rounded-2xl p-[1px]" style={{ background: headerGrad }}>
//         <div className="rounded-2xl px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between card-surface bg-white">
//           <div>
//             <h2
//               className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight"
//               style={{ color: "var(--gear-blue-dark)" }}
//             >
//               Wine List Capture
//             </h2>
//             <p className="mt-1 text-xs sm:text-sm" style={{ color: subtleText }}>
//               Take or upload a clear photo of the wine list. We’ll extract it into structured JSON.
//             </p>
//           </div>
//           <div
//             className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs backdrop-blur"
//             style={{ border: `1px solid ${borderColor}`, background: chipBg, color: "#000000" }}
//           >
//             <span className="h-2 w-2 rounded-full" style={{ background: "#22c55e" }} />
//             Ready
//           </div>
//         </div>
//       </div>

//       {/* Main card */}
//       <div className="rounded-3xl shadow-sm ring-1 card-surface bg-white" style={{ borderColor }}>
//         <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12">
//           {/* LEFT: Camera & Upload */}
//           <section className="space-y-4 lg:col-span-7">
//             <div
//               className="rounded-2xl p-4 shadow-sm backdrop-blur-sm card-surface bg-white"
//               style={{ border: `1px solid ${borderColor}` }}
//             >
//               {/* Controls */}
//               <div className="mb-3 flex flex-wrap items-center gap-2">
//                 {!stream ? (
//                   <button type="button" onClick={startCamera} className={btnPrimary}>
//                     Use Camera
//                   </button>
//                 ) : (
//                   <button
//                     type="button"
//                     onClick={stopCamera}
//                     className={btnMuted}
//                     style={{ background: softBg, color: "#000000", border: `1px solid ${borderColor}` }}
//                   >
//                     Stop Camera
//                   </button>
//                 )}

//                 <button
//                   type="button"
//                   onClick={snapAndExtract}
//                   disabled={!camReady || extracting}
//                   className={`${btnMuted} disabled:opacity-50`}
//                   style={{ background: softBg, color: "#000000", border: `1px solid ${borderColor}` }}
//                 >
//                   {extracting ? (
//                     <span className="inline-flex items-center gap-2">
//                       <TinySpinner /> Extracting…
//                     </span>
//                   ) : (
//                     "Snap & Extract"
//                   )}
//                 </button>

//                 <button
//                   type="button"
//                   onClick={openFullscreenCamera}
//                   className={btnBase}
//                   style={{ background: "linear-gradient(180deg, var(--gear-blue-light), var(--gear-blue-medium))", color: "#fff" }}
//                 >
//                   Full-screen Camera
//                 </button>

//                 <button
//                   type="button"
//                   onClick={() => setStabilize((s) => !s)}
//                   className={btnMuted}
//                   style={{
//                     background: stabilize ? "color-mix(in oklab, #10b981 10%, #ffffff 90%)" : softBg,
//                     color: "#000000",
//                     border: `1px solid ${borderColor}`,
//                   }}
//                 >
//                   {stabilize ? "Stabilization: On" : "Stabilization: Off"}
//                 </button>

//                 <div className="ml-auto flex items-center gap-2">
//                   <span className="text-[11px]" style={{ color: faintText }}>
//                     Focus
//                   </span>
//                   <input
//                     type="range"
//                     min={40}
//                     max={160}
//                     value={focusThreshold}
//                     onChange={(e) => setFocusThreshold(Number(e.target.value))}
//                     className="h-1 w-28 sm:w-32"
//                   />
//                 </div>
//                 <span className="text-xs" style={{ color: faintText }}>
//                   {camReady ? "Camera ready" : stream ? "Loading camera..." : "Camera off"}
//                 </span>
//               </div>

//               {/* Preview + Upload */}
//               <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
//                 {/* Live preview */}
//                 <div
//                   className="lg:col-span-3 overflow-hidden rounded-2xl relative"
//                   style={{ border: `1px solid ${borderColor}`, background: "#f9fafb" }}
//                   onClick={tapToFocus}
//                   title="Tap to focus (when supported)"
//                 >
//                   {/* Use aspect-ratio and responsive height clamps for consistent scaling */}
//                   <div
//                     className="relative w-full"
//                     style={{
//                       aspectRatio: "16 / 9",
//                       // Ensures the video never overwhelms small screens and scales up nicely on desktop
//                       maxHeight: "clamp(220px, 55svh, 520px)",
//                     }}
//                   >
//                     <video
//                       ref={videoRef}
//                       playsInline
//                       autoPlay
//                       muted
//                       className="absolute inset-0 h-full w-full object-contain"
//                       style={{
//                         transform: stabilize ? `translate(${stabTx.x}px, ${stabTx.y}px)` : "none",
//                         transition: "transform 80ms linear",
//                         // Prevent scrollbars on odd aspect ratios
//                         overflow: "hidden",
//                         backgroundColor: "#fff",
//                       }}
//                     />
//                     <div
//                       className="absolute left-3 top-3 flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] backdrop-blur-sm"
//                       style={{ background: "rgba(0,0,0,.45)", color: "#fff", border: `1px solid ${borderColor}` }}
//                     >
//                       <span
//                         className="h-2.5 w-2.5 rounded-full"
//                         style={{
//                           background: inFocus ? "#22c55e" : "#ff3d57",
//                           boxShadow: `0 0 0 3px ${inFocus ? "#22c55e33" : "#ff3d5733"}`,
//                         }}
//                       />
//                       <span>{inFocus ? "In focus" : "Adjust focus"}</span>
//                       <span className="opacity-70">•</span>
//                       <span className="opacity-80">Score {focusScore.toFixed(0)}</span>
//                     </div>
//                     {stabilize && (
//                       <div className="pointer-events-none absolute inset-3 rounded-xl" style={{ border: `1px dashed ${borderColor}` }} />
//                     )}
//                   </div>
//                 </div>

//                 {/* Upload tile & last capture */}
//                 <div className="lg:col-span-2 space-y-3">
//                   <label
//                     className={[
//                       "relative w-full rounded-2xl cursor-pointer",
//                       "shadow-[0_8px_24px_rgba(0,0,0,0.10)]",
//                       "transition-transform hover:scale-[1.01] active:scale-[0.99]",
//                       "grid place-items-center card-surface bg-white",
//                     ].join(" ")}
//                     style={{
//                       border: `2px dashed ${isDragging ? "var(--gear-blue-medium)" : borderColor}`,
//                       minHeight: "clamp(140px, 26svh, 220px)",
//                     }}
//                     onDragOver={(e) => {
//                       e.preventDefault();
//                       setIsDragging(true);
//                     }}
//                     onDragLeave={() => setIsDragging(false)}
//                     onDrop={(e) => {
//                       e.preventDefault();
//                       setIsDragging(false);
//                       const f = e.dataTransfer.files?.[0];
//                       if (f) onUploadFile(f);
//                     }}
//                   >
//                     <input
//                       type="file"
//                       accept="image/*"
//                       capture="environment"
//                       className="sr-only"
//                       onChange={(e) => onUploadFile(e.target.files?.[0] || null)}
//                     />
//                     <div className="text-center p-4">
//                       <div className="mb-2 font-medium">Upload Wine List Photo</div>
//                       <div className="text-xs" style={{ color: faintText }}>
//                         Good lighting • Minimize glare • Fill the frame
//                       </div>
//                     </div>
//                   </label>

//                   <div
//                     className="rounded-2xl p-3 text-center card-surface bg-white"
//                     style={{ border: `2px dashed ${borderColor}` }}
//                   >
//                     <p
//                       className="mb-2 text-xs font-semibold uppercase tracking-wide"
//                       style={{ color: subtleText }}
//                     >
//                       Last Capture
//                     </p>
//                     {lastImageDataUrl ? (
//                       <img
//                         src={lastImageDataUrl}
//                         alt="Last capture"
//                         className="mx-auto w-full rounded-xl object-contain"
//                         style={{
//                           maxHeight: "clamp(140px, 40svh, 380px)",
//                         }}
//                       />
//                     ) : (
//                       <div className="text-xs" style={{ color: faintText }}>
//                         No photo yet.
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               {error && (
//                 <div
//                   className="mt-3 rounded-lg px-3 py-2 text-sm"
//                   style={{
//                     border: "1px solid color-mix(in oklab, #ef4444 40%, transparent)",
//                     background: "color-mix(in oklab, #ef4444 12%, transparent)",
//                     color: "color-mix(in oklab, #ef4444 85%, white 15%)",
//                   }}
//                 >
//                   {error}
//                 </div>
//               )}
//             </div>
//           </section>

//           {/* RIGHT: Extraction results */}
//           <section className="space-y-4 lg:col-span-5">
//             <div className="rounded-2xl p-4 shadow-sm card-surface bg-white" style={{ border: `1px solid ${borderColor}` }}>
//               <div className="mb-3 flex items-center justify-between gap-2">
//                 <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: subtleText }}>
//                   Extraction
//                 </span>
//                 <div className="flex items-center gap-2">
//                   <button
//                     type="button"
//                     onClick={() => setShowJSON((s) => !s)}
//                     className={btnMuted}
//                     style={{ background: softBg, color: "#000000", border: `1px solid ${borderColor}` }}
//                     disabled={!wines?.length}
//                   >
//                     {showJSON ? "Show Table" : "Show JSON"}
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => {
//                       setWines([]);
//                       setLastImageDataUrl(null);
//                     }}
//                     className={btnMuted}
//                     style={{ background: softBg, color: "#000000", border: `1px solid ${borderColor}` }}
//                   >
//                     Reset
//                   </button>
//                 </div>
//               </div>

//               {!extracting && (!wines || wines.length === 0) ? (
//                 <p className="text-sm" style={{ color: faintText }}>
//                   Snap a photo or upload an image of the wine list to extract details.
//                 </p>
//               ) : extracting ? (
//                 <div className="inline-flex items-center gap-2 text-sm" style={{ color: subtleText }}>
//                   <TinySpinner /> Extracting text from the photo…
//                 </div>
//               ) : showJSON ? (
//                 <pre
//                   className="overflow-auto rounded-xl border p-3 text-xs"
//                   style={{
//                     borderColor,
//                     background: "#fafafa",
//                     maxHeight: "min(60svh, 520px)",
//                   }}
//                 >
//                   {JSON.stringify(wines, null, 2)}
//                 </pre>
//               ) : (
//                 <div
//                   className="overflow-auto"
//                   style={{
//                     maxHeight: "min(60svh, 520px)",
//                   }}
//                 >
//                   <table className="w-full text-sm border-collapse">
//                     <thead className="sticky top-0 bg-white">
//                       <tr style={{ color: subtleText }}>
//                         <th className="text-left font-semibold border-b px-2 py-1" style={{ borderColor }}>
//                           Name
//                         </th>
//                         <th className="text-left font-semibold border-b px-2 py-1 hidden md:table-cell" style={{ borderColor }}>
//                           Region
//                         </th>
//                         <th className="text-left font-semibold border-b px-2 py-1 hidden md:table-cell" style={{ borderColor }}>
//                           Country
//                         </th>
//                         <th className="text-left font-semibold border-b px-2 py-1" style={{ borderColor }}>
//                           Style
//                         </th>
//                         <th className="text-left font-semibold border-b px-2 py-1" style={{ borderColor }}>
//                           Vintage
//                         </th>
//                         <th className="text-left font-semibold border-b px-2 py-1" style={{ borderColor }}>
//                           Price
//                         </th>
//                         <th className="text-left font-semibold border-b px-2 py-1 hidden sm:table-cell" style={{ borderColor }}>
//                           By Glass
//                         </th>
//                         <th className="text-left font-semibold border-b px-2 py-1 hidden lg:table-cell" style={{ borderColor }}>
//                           Notes
//                         </th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {wines.map((w, i) => (
//                         <tr key={`${w.name || "row"}-${i}`} className="align-top">
//                           <td className="border-b px-2 py-1 font-medium" style={{ borderColor }}>
//                             {w?.name ?? "—"}
//                           </td>
//                           <td className="border-b px-2 py-1 hidden md:table-cell" style={{ borderColor }}>
//                             {w?.region ?? "—"}
//                           </td>
//                           <td className="border-b px-2 py-1 hidden md:table-cell" style={{ borderColor }}>
//                             {w?.country ?? "—"}
//                           </td>
//                           <td className="border-b px-2 py-1" style={{ borderColor }}>
//                             {w?.variety_or_style ?? "—"}
//                           </td>
//                           <td className="border-b px-2 py-1" style={{ borderColor }}>
//                             {w?.vintage ?? "—"}
//                           </td>
//                           <td className="border-b px-2 py-1" style={{ borderColor }}>
//                             {typeof w?.price === "number" ? w.price : "—"}
//                           </td>
//                           <td className="border-b px-2 py-1 hidden sm:table-cell" style={{ borderColor }}>
//                             {w?.by_glass === true ? "Yes" : w?.by_glass === false ? "No" : "—"}
//                           </td>
//                           <td className="border-b px-2 py-1 hidden lg:table-cell" style={{ borderColor }}>
//                             {w?.notes ?? "—"}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               )}
//             </div>
//           </section>
//         </div>
//       </div>

//       <p className="mt-4 sm:mt-6 text-center text-xs" style={{ color: faintText }}>
//         Tip: Fill the frame with the wine list, avoid glare, and keep the text sharp. When the dot is green (“In focus”), tap Snap.
//       </p>

//       {/* Fullscreen Camera */}
//       {camFullscreen && (
//         <div className="fixed inset-0 z-[100] bg-black/95 text-white">
//           <div className="absolute inset-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
//             <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-4 py-3">
//               <button onClick={closeFullscreenCamera} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">
//                 Close
//               </button>
//               <span className="text-xs opacity-80">{camReady ? "Ready" : "Starting…"}</span>
//             </div>
//             <div className="flex h-[100svh] w-screen items-center justify-center">
//               {/* Use contain to avoid cropping tall lists on mobile */}
//               <video ref={videoRef} playsInline autoPlay muted className="max-h-[100svh] w-screen object-contain" />
//             </div>
//             <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-[calc(16px+env(safe-area-inset-bottom))]">
//               <div className="pointer-events-auto flex items-center gap-3">
//                 <button
//                   onClick={snapAndExtract}
//                   disabled={!camReady || extracting}
//                   className="h-16 w-16 rounded-full border-4 border-white/70 bg-white/90 active:scale-95 disabled:opacity-50"
//                   title="Capture & Extract"
//                 />
//               </div>
//               <div className="pointer-events-auto">
//                 <button className="rounded-lg bg-white/10 px-3 py-1.5 text-xs">Tip: Fill the frame, use even light</button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       <canvas ref={canvasRef} className="hidden" />
//     </div>
//   );
// }


// components/WineListCapture.jsx
"use client";

import { useEffect, useRef, useState } from "react";

/* -------------------------------------------------------
   Theme helpers (colors come from globals.css variables)
------------------------------------------------------- */
const borderColor = "#000000"; // black borders
const subtleText = "#4b5563"; // Dark gray for readability
const faintText = "#6b7280"; // Medium-dark gray
const chipBg = "#f9fafb"; // very light gray
const softBg = "#ffffff"; // white cards
const headerGrad =
  "linear-gradient(135deg, var(--gear-blue-medium), var(--gear-blue-light), var(--handle-orange))";

/** EMA helper for smoothing values */
const ema = (prev, next, k = 0.2) => (prev == null ? next : prev + k * (next - prev));

/* Tiny UI bits */
const TinySpinner = () => (
  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
);

export default function WineListCapture() {
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Camera / upload
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [camReady, setCamReady] = useState(false);
  const [camFullscreen, setCamFullscreen] = useState(false);

  // Stabilization + focus HUD
  const [stabilize, setStabilize] = useState(true);
  const [focusScore, setFocusScore] = useState(0);
  const [focusThreshold, setFocusThreshold] = useState(85);
  const [inFocus, setInFocus] = useState(false);
  const [stabTx, setStabTx] = useState({ x: 0, y: 0 });
  const analysisRef = useRef({ running: false, prevSmall: null, tx: 0, ty: 0 });

  // Capture + extraction
  const [lastImageDataUrl, setLastImageDataUrl] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [wines, setWines] = useState([]); // [{ name, region, ... }]
  const [showJSON, setShowJSON] = useState(false);

  /* ---------------- Camera helpers ---------------- */

  // Attach a MediaStream to a <video> and play it safely (iOS-friendly)
  const attachStreamToVideo = async (videoEl, mediaStream) => {
    if (!videoEl) return;
    try {
      if (videoEl.srcObject !== mediaStream) {
        videoEl.srcObject = mediaStream;
      }
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
      setCamReady(true);
    } catch (e) {
      console.warn("attachStreamToVideo failed:", e);
    }
  };

  const startCamera = async () => {
    setError(null);

    const isSecure =
      typeof window !== "undefined" &&
      (location.protocol === "https:" || location.hostname === "localhost");
    if (!isSecure) {
      setError("Camera requires HTTPS or localhost. Open the site over https:// to use the camera.");
      return;
    }

    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      setError("Camera API not available in this browser. Try uploading a photo instead.");
      return;
    }

    try {
      setCamReady(false);
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });

      // Best-effort extras
      try {
        const track = s.getVideoTracks()[0];
        await track.applyConstraints({
          advanced: [{ focusMode: "continuous" }, { exposureMode: "continuous" }, { noiseSuppression: true }],
        });
      } catch {}

      setStream(s);
      await attachStreamToVideo(videoRef.current, s);

      if (!analysisRef.current.running) {
        analysisRef.current.running = true;
        requestAnimationFrame(analysisLoop);
      }
    } catch (err) {
      console.warn(err);
      setError("Camera access denied or unavailable. You can still upload a photo.");
    }
  };

  const stopCamera = () => {
    try {
      stream?.getTracks()?.forEach((t) => t.stop());
    } catch {}
    setStream(null);
    setCamReady(false);
    analysisRef.current.running = false;
    analysisRef.current.prevSmall = null;

    const v = videoRef.current;
    if (v) v.srcObject = null;
    setStabTx({ x: 0, y: 0 });
  };

  const openFullscreenCamera = async () => {
    if (!stream) await startCamera();
    setCamFullscreen(true);
  };
  const closeFullscreenCamera = () => setCamFullscreen(false);

  const tapToFocus = async (e) => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const video = videoRef.current;
    if (!video) return;
    const rect = video.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    try {
      await track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x: px, y: py }] }] });
    } catch {}
  };

  // Re-attach stream when the video element changes (inline ↔ fullscreen)
  useEffect(() => {
    if (!stream) return;
    const id = requestAnimationFrame(async () => {
      const v = videoRef.current;
      if (v) await attachStreamToVideo(v, stream);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, camFullscreen]);

  // Cleanup srcObject on unmount
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v) v.srcObject = null;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll on fullscreen
  useEffect(() => {
    if (camFullscreen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [camFullscreen]);

  // Focus score + micro-shake stabilization
  const analysisLoop = () => {
    if (!analysisRef.current.running) return;
    const v = videoRef.current;
    if (!v || v.readyState < 2) {
      requestAnimationFrame(analysisLoop);
      return;
    }
    const w = 192;
    const h = Math.max(108, Math.round((v.videoHeight / v.videoWidth) * 192)) || 108;
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const ctx = tmp.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h).data;

    const gray = new Float32Array(w * h);
    for (let i = 0, j = 0; i < img.length; i += 4, j++) {
      gray[j] = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
    }

    let sum = 0,
      sumSq = 0,
      cnt = 0;
    const lap = (x, y) => {
      const c = y * w + x;
      const center = gray[c] * 4;
      return (
        center -
        (gray[c - 1] || gray[c]) -
        (gray[c + 1] || gray[c]) -
        (gray[c - w] || gray[c]) -
        (gray[c + w] || gray[c])
      );
    };
    for (let y = 1; y < h - 1; y += 2) {
      for (let x = 1; x < w - 1; x += 2) {
        const vL = lap(x, y);
        sum += vL;
        sumSq += vL * vL;
        cnt++;
      }
    }
    const mean = sum / Math.max(1, cnt);
    const variance = Math.max(0, sumSq / Math.max(1, cnt) - mean * mean);
    const score = Math.sqrt(variance);
    setFocusScore((s) => ema(s, score, 0.3));
    setInFocus(score >= focusThreshold);

    // Centroid → small translate for micro-shake
    let cx = 0,
      cy = 0,
      weight = 0;
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        const val = gray[y * w + x];
        const wgt = val * val;
        cx += x * wgt;
        cy += y * wgt;
        weight += wgt;
      }
    }
    cx = weight ? cx / weight : w / 2;
    cy = weight ? cy / weight : h / 2;

    const st = analysisRef.current;
    if (st.prevSmall) {
      const dx = cx - st.prevSmall.cx;
      const dy = cy - st.prevSmall.cy;
      st.tx = ema(st.tx, -dx, 0.25);
      st.ty = ema(st.ty, -dy, 0.25);
      const clamp = (v, m) => Math.max(-m, Math.min(m, v));
      const maxPx = 12;
      const tx = clamp(st.tx, maxPx);
      const ty = clamp(st.ty, maxPx);
      setStabTx((t) => ({ x: ema(t.x, tx, 0.35), y: ema(t.y, ty, 0.35) }));
    }
    st.prevSmall = { cx, cy };

    requestAnimationFrame(analysisLoop);
  };

  /* ---------------- Capture + Extract ---------------- */

  const captureToDataUrl = () => {
    try {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) return null;
      const w = v.videoWidth || 1280;
      const h = v.videoHeight || 720;
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(v, 0, 0, w, h);
      return c.toDataURL("image/jpeg", 0.92); // good OCR balance
    } catch {
      setError("Failed to capture image. Try again or upload instead.");
      return null;
    }
  };

  const sendForExtraction = async (imageDataUrl) => {
    setError(null);
    setExtracting(true);
    setWines([]);
    setLastImageDataUrl(imageDataUrl);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed.");
      setWines(Array.isArray(data.wines) ? data.wines : []);
    } catch (e) {
      setError(e.message || "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  };

  const snapAndExtract = async () => {
    const url = captureToDataUrl();
    if (!url) return;
    if (camFullscreen) setCamFullscreen(false);
    await sendForExtraction(url);
  };

  const onUploadFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setLastImageDataUrl(dataUrl);
      sendForExtraction(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const extractFromLast = async () => {
    if (!lastImageDataUrl || extracting) return;
    await sendForExtraction(lastImageDataUrl);
  };

  /* ---------------- UI ---------------- */

  const btnBase =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const btnMuted = `${btnBase}`;
  const btnPrimary = `${btnBase} text-white btn-accent`;

  return (
    <div
      className={[
        "mx-auto w-full",
        "max-w-screen-xl",
        "px-3 sm:px-5 lg:px-8 py-6 sm:py-8",
        "bg-white text-black",
      ].join(" ")}
    >
      {/* Header */}
      <div className="mb-4 sm:mb-6 rounded-2xl p-[1px]" style={{ background: headerGrad }}>
        <div className="rounded-2xl px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between card-surface bg-white">
          <div>
            <h2
              className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight"
              style={{ color: "var(--gear-blue-dark)" }}
            >
              Wine List Capture
            </h2>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: subtleText }}>
              Take or upload a clear photo of the wine list. We’ll extract it into structured JSON.
            </p>
          </div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs backdrop-blur"
            style={{ border: `1px solid ${borderColor}`, background: chipBg, color: "#000000" }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: "#22c55e" }} />
            Ready
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-3xl shadow-sm ring-1 card-surface bg-white" style={{ borderColor }}>
        <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12">
          {/* LEFT: Camera & Upload */}
          <section className="space-y-4 lg:col-span-7">
            <div
              className="rounded-2xl p-4 shadow-sm backdrop-blur-sm card-surface bg-white"
              style={{ border: `1px solid ${borderColor}` }}
            >
              {/* Controls */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {!stream ? (
                  <button type="button" onClick={startCamera} className={btnPrimary} disabled={extracting}>
                    Use Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className={btnMuted}
                    style={{ background: softBg, color: "#000000", border: `1px solid ${borderColor}` }}
                    disabled={extracting}
                  >
                    Stop Camera
                  </button>
                )}

                <button
                  type="button"
                  onClick={snapAndExtract}
                  disabled={!camReady || extracting}
                  className={`${btnMuted} disabled:opacity-50`}
                  style={{ background: softBg, color: "#000000", border: `1px solid ${borderColor}` }}
                >
                  {extracting ? (
                    <span className="inline-flex items-center gap-2">
                      <TinySpinner /> Extracting…
                    </span>
                  ) : (
                    "Snap & Extract"
                  )}
                </button>

                <button
                  type="button"
                  onClick={openFullscreenCamera}
                  className={btnBase}
                  style={{ background: "linear-gradient(180deg, var(--gear-blue-light), var(--gear-blue-medium))", color: "#fff" }}
                  disabled={extracting}
                >
                  Full-screen Camera
                </button>

                <button
                  type="button"
                  onClick={() => setStabilize((s) => !s)}
                  className={btnMuted}
                  style={{
                    background: stabilize ? "color-mix(in oklab, #10b981 10%, #ffffff 90%)" : softBg,
                    color: "#000000",
                    border: `1px solid ${borderColor}`,
                  }}
                  disabled={extracting}
                >
                  {stabilize ? "Stabilization: On" : "Stabilization: Off"}
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: faintText }}>
                    Focus
                  </span>
                  <input
                    type="range"
                    min={40}
                    max={160}
                    value={focusThreshold}
                    onChange={(e) => setFocusThreshold(Number(e.target.value))}
                    className="h-1 w-28 sm:w-32"
                    disabled={extracting}
                  />
                </div>
                <span className="text-xs" style={{ color: faintText }}>
                  {camReady ? "Camera ready" : stream ? "Loading camera..." : "Camera off"}
                </span>
              </div>

              {/* Preview + Upload */}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                {/* Live preview */}
                <div
                  className="lg:col-span-3 overflow-hidden rounded-2xl relative"
                  style={{ border: `1px solid ${borderColor}`, background: "#f9fafb" }}
                  onClick={tapToFocus}
                  title="Tap to focus (when supported)"
                >
                  {/* Use aspect-ratio and responsive height clamps for consistent scaling */}
                  <div
                    className="relative w-full"
                    style={{
                      aspectRatio: "16 / 9",
                      maxHeight: "clamp(220px, 55svh, 520px)",
                    }}
                  >
                    <video
                      ref={videoRef}
                      playsInline
                      autoPlay
                      muted
                      className="absolute inset-0 h-full w-full object-contain"
                      style={{
                        transform: stabilize ? `translate(${stabTx.x}px, ${stabTx.y}px)` : "none",
                        transition: "transform 80ms linear",
                        overflow: "hidden",
                        backgroundColor: "#fff",
                      }}
                    />
                    <div
                      className="absolute left-3 top-3 flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] backdrop-blur-sm"
                      style={{ background: "rgba(0,0,0,.45)", color: "#fff", border: `1px solid ${borderColor}` }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: inFocus ? "#22c55e" : "#ff3d57",
                          boxShadow: `0 0 0 3px ${inFocus ? "#22c55e33" : "#ff3d5733"}`,
                        }}
                      />
                      <span>{inFocus ? "In focus" : "Adjust focus"}</span>
                      <span className="opacity-70">•</span>
                      <span className="opacity-80">Score {focusScore.toFixed(0)}</span>
                    </div>
                    {stabilize && (
                      <div className="pointer-events-none absolute inset-3 rounded-xl" style={{ border: `1px dashed ${borderColor}` }} />
                    )}
                  </div>
                </div>

                {/* Upload tile & last capture */}
                <div className="lg:col-span-2 space-y-3">
                  <label
                    className={[
                      "relative w-full rounded-2xl cursor-pointer",
                      "shadow-[0_8px_24px_rgba(0,0,0,0.10)]",
                      "transition-transform hover:scale-[1.01] active:scale-[0.99]",
                      "grid place-items-center card-surface bg-white",
                    ].join(" ")}
                    style={{
                      border: `2px dashed ${isDragging ? "var(--gear-blue-medium)" : borderColor}`,
                      minHeight: "clamp(140px, 26svh, 220px)",
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) onUploadFile(f);
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => onUploadFile(e.target.files?.[0] || null)}
                      disabled={extracting}
                    />
                    <div className="text-center p-4">
                      <div className="mb-2 font-medium">Upload Wine List Photo</div>
                      <div className="text-xs" style={{ color: faintText }}>
                        Good lighting • Minimize glare • Fill the frame
                      </div>
                    </div>
                  </label>

                  <div
                    className="rounded-2xl p-3 text-center card-surface bg-white"
                    style={{ border: `2px dashed ${borderColor}` }}
                  >
                    <p
                      className="mb-2 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: subtleText }}
                    >
                      Last Capture
                    </p>
                    {lastImageDataUrl ? (
                      <img
                        src={lastImageDataUrl}
                        alt="Last capture"
                        className="mx-auto w-full rounded-xl object-contain"
                        style={{
                          maxHeight: "clamp(140px, 40svh, 380px)",
                        }}
                      />
                    ) : (
                      <div className="text-xs" style={{ color: faintText }}>
                        No photo yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div
                  className="mt-3 rounded-lg px-3 py-2 text-sm"
                  style={{
                    border: "1px solid color-mix(in oklab, #ef4444 40%, transparent)",
                    background: "color-mix(in oklab, #ef4444 12%, transparent)",
                    color: "color-mix(in oklab, #ef4444 85%, white 15%)",
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: Extraction results */}
          <section className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl p-4 shadow-sm card-surface bg-white" style={{ border: `1px solid ${borderColor}` }}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: subtleText }}>
                  Extraction
                </span>
                <div className="flex items-center gap-2">
                  {/* Toggle JSON / Table */}
                  <button
                    type="button"
                    onClick={() => setShowJSON((s) => !s)}
                    className={btnMuted}
                    style={{ background: softBg, color: "#000000", border: `1px solid ${borderColor}` }}
                    disabled={!wines?.length || extracting}
                  >
                    {showJSON ? "Show Table" : "Show JSON"}
                  </button>

                  {/* Reset */}
                  <button
                    type="button"
                    onClick={() => {
                      setWines([]);
                      setLastImageDataUrl(null);
                    }}
                    className={btnMuted}
                    style={{ background: softBg, color: "#000000", border: `1px solid ${borderColor}` }}
                    disabled={extracting}
                  >
                    Reset
                  </button>

                  {/* === SINGLE Extract Wine List button (black bg, white text) === */}
                  <button
                    type="button"
                    onClick={extractFromLast}
                    disabled={!lastImageDataUrl || extracting}
                    aria-busy={extracting ? "true" : "false"}
                    className={[
                      "inline-flex items-center justify-center gap-2",
                      "rounded-2xl px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium",
                      "bg-black text-white border border-black",
                      "hover:bg-black/90",
                      "shadow-sm",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      "min-w-[11rem]",
                    ].join(" ")}
                    title={!lastImageDataUrl ? "Upload or capture a photo first" : "Extract from last capture"}
                  >
                    {extracting ? (
                      <>
                        <TinySpinner /> Extracting…
                      </>
                    ) : (
                      "Extract Wine List"
                    )}
                  </button>
                </div>
              </div>

              {!extracting && (!wines || wines.length === 0) ? (
                <p className="text-sm" style={{ color: faintText }}>
                  Snap a photo or upload an image of the wine list to extract details.
                </p>
              ) : extracting ? (
                <div className="inline-flex items-center gap-2 text-sm" style={{ color: subtleText }}>
                  <TinySpinner /> Extracting text from the photo…
                </div>
              ) : showJSON ? (
                <pre
                  className="overflow-auto rounded-xl border p-3 text-xs"
                  style={{
                    borderColor,
                    background: "#fafafa",
                    maxHeight: "min(60svh, 520px)",
                  }}
                >
                  {JSON.stringify(wines, null, 2)}
                </pre>
              ) : (
                <div
                  className="overflow-auto"
                  style={{
                    maxHeight: "min(60svh, 520px)",
                  }}
                >
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-white">
                      <tr style={{ color: subtleText }}>
                        <th className="text-left font-semibold border-b px-2 py-1" style={{ borderColor }}>
                          Name
                        </th>
                        <th className="text-left font-semibold border-b px-2 py-1 hidden md:table-cell" style={{ borderColor }}>
                          Region
                        </th>
                        <th className="text-left font-semibold border-b px-2 py-1 hidden md:table-cell" style={{ borderColor }}>
                          Country
                        </th>
                        <th className="text-left font-semibold border-b px-2 py-1" style={{ borderColor }}>
                          Style
                        </th>
                        <th className="text-left font-semibold border-b px-2 py-1" style={{ borderColor }}>
                          Vintage
                        </th>
                        <th className="text-left font-semibold border-b px-2 py-1" style={{ borderColor }}>
                          Price
                        </th>
                        <th className="text-left font-semibold border-b px-2 py-1 hidden sm:table-cell" style={{ borderColor }}>
                          By Glass
                        </th>
                        <th className="text-left font-semibold border-b px-2 py-1 hidden lg:table-cell" style={{ borderColor }}>
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {wines.map((w, i) => (
                        <tr key={`${w.name || "row"}-${i}`} className="align-top">
                          <td className="border-b px-2 py-1 font-medium" style={{ borderColor }}>
                            {w?.name ?? "—"}
                          </td>
                          <td className="border-b px-2 py-1 hidden md:table-cell" style={{ borderColor }}>
                            {w?.region ?? "—"}
                          </td>
                          <td className="border-b px-2 py-1 hidden md:table-cell" style={{ borderColor }}>
                            {w?.country ?? "—"}
                          </td>
                          <td className="border-b px-2 py-1" style={{ borderColor }}>
                            {w?.variety_or_style ?? "—"}
                          </td>
                          <td className="border-b px-2 py-1" style={{ borderColor }}>
                            {w?.vintage ?? "—"}
                          </td>
                          <td className="border-b px-2 py-1" style={{ borderColor }}>
                            {typeof w?.price === "number" ? w.price : "—"}
                          </td>
                          <td className="border-b px-2 py-1 hidden sm:table-cell" style={{ borderColor }}>
                            {w?.by_glass === true ? "Yes" : w?.by_glass === false ? "No" : "—"}
                          </td>
                          <td className="border-b px-2 py-1 hidden lg:table-cell" style={{ borderColor }}>
                            {w?.notes ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <p className="mt-4 sm:mt-6 text-center text-xs" style={{ color: faintText }}>
        Tip: Fill the frame with the wine list, avoid glare, and keep the text sharp. When the dot is green (“In focus”), tap Snap.
      </p>

      {/* Fullscreen Camera */}
      {camFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/95 text-white">
          <div className="absolute inset-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-4 py-3">
              <button onClick={closeFullscreenCamera} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">
                Close
              </button>
              <span className="text-xs opacity-80">{camReady ? "Ready" : "Starting…"}</span>
            </div>
            <div className="flex h-[100svh] w-screen items-center justify-center">
              {/* Use contain to avoid cropping tall lists on mobile */}
              <video ref={videoRef} playsInline autoPlay muted className="max-h-[100svh] w-screen object-contain" />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-[calc(16px+env(safe-area-inset-bottom))]">
              <div className="pointer-events-auto flex items-center gap-3">
                <button
                  onClick={snapAndExtract}
                  disabled={!camReady || extracting}
                  className="h-16 w-16 rounded-full border-4 border-white/70 bg-white/90 active:scale-95 disabled:opacity-50"
                  title="Capture & Extract"
                />
              </div>
              <div className="pointer-events-auto">
                <button className="rounded-lg bg-white/10 px-3 py-1.5 text-xs">Tip: Fill the frame, use even light</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}