"use client";

import { useEffect, useRef, useState, useMemo } from "react";

export default function PizzaCameraOrUpload({
  onCapture,
  onExtract,
  className = "",
  title = "Scan Pizza Menu",
  autoStartOnMount = false,
  isExtracting = false,
}) {
  const PALETTE = {
    tomato: "#B42025",
    deepTomato: "#7E1518",
    basil: "#1E7A3C",
    deepBasil: "#10532A",
    mozzarella: "#FFF7E6",
    glass: "rgba(255,247,230,0.92)",
    crust: "#C48A4A",
  };

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  const [usingCamera, setUsingCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // NEW: mount + support computed after mount to avoid SSR/client divergence
  const [mounted, setMounted] = useState(false);
  const [support, setSupport] = useState({
    mediaDevices: false,
    fileInput: true,
    secure: false,
  });

  useEffect(() => {
    // compute once on client
    const mediaDevices =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia;

    const secure =
      typeof window !== "undefined" &&
      (location.protocol === "https:" || location.hostname === "localhost");

    setSupport({ mediaDevices, fileInput: true, secure });
    setMounted(true);
  }, []);

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
      await track.applyConstraints({
        advanced: [{ pointsOfInterest: [{ x: px, y: py }] }],
      });
    } catch {}
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start camera only AFTER mounted and when secure + supported
  useEffect(() => {
    const isMobileUA =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
        navigator.userAgent || ""
      );
    if (
      mounted &&
      autoStartOnMount &&
      support.mediaDevices &&
      support.secure &&
      isMobileUA &&
      !usingCamera
    ) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, autoStartOnMount, support.mediaDevices, support.secure]);

  useEffect(() => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (usingCamera && stream && video) {
      const id = requestAnimationFrame(() => attachStreamToVideo(video, stream));
      return () => cancelAnimationFrame(id);
    }
  }, [usingCamera]);

  async function startCamera() {
    if (!support.secure) {
      setError(
        "Camera requires HTTPS or localhost. Open the site over https:// to use the camera."
      );
      return;
    }
    if (!support.mediaDevices) {
      setError("Camera not supported. Try uploading a menu photo instead.");
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
          advanced: [
            { focusMode: "continuous" },
            { exposureMode: "continuous" },
            { noiseSuppression: true },
          ],
        });
      } catch {}

      streamRef.current = stream;
      setUsingCamera(true);

      const video = videoRef.current;
      if (video) {
        await attachStreamToVideo(video, stream);
      }
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
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const v = videoRef.current;
      if (v) v.srcObject = null;
    } catch {}
    streamRef.current = null;
    setUsingCamera(false);
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
    reader.onload = () => onCapture?.(String(reader.result));
    reader.readAsDataURL(file);
  }

  // --- Render --------------------------------------------------------------
  return (
    <div
      className={[
        "card rounded-3xl shadow-2xl max-w-full",
        "ring-1",
        className,
      ].join(" ")}
      style={{
        background: PALETTE.glass,
        borderColor: "rgba(180,32,37,0.18)",
        boxShadow:
          "0 18px 50px rgba(16,83,42,.18), inset 0 1px 0 rgba(255,255,255,.4)",
      }}
    >
      <div className="card-body gap-4 sm:gap-5">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h2
            className="card-title text-lg sm:text-xl font-semibold tracking-wide"
            style={{ color: PALETTE.deepBasil }}
          >
            {title}
          </h2>
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: PALETTE.tomato }}
          />
        </div>

        {/* Toolbar */}
        <div className="join w-full flex-wrap sm:flex-nowrap gap-2 sm:gap-0">
          <button
            onClick={usingCamera ? stopCamera : startCamera}
            disabled={busy || isExtracting || !mounted}
            className={[
              "btn join-item btn-sm sm:btn-md font-semibold",
              "transition-colors",
            ].join(" ")}
            style={
              usingCamera
                ? {
                    background:
                      "linear-gradient(135deg, #B42025 0%, #7E1518 100%)",
                    color: PALETTE.mozzarella,
                    border: "1px solid rgba(180,32,37,0.25)",
                    boxShadow:
                      "0 8px 22px rgba(180,32,37,.35), inset 0 0 0 1px rgba(255,255,255,.5)",
                  }
                : {
                    background:
                      "linear-gradient(135deg, #1E7A3C 0%, #10532A 100%)",
                    color: PALETTE.mozzarella,
                    border: "1px solid rgba(16,83,42,0.25)",
                    boxShadow:
                      "0 8px 22px rgba(16,83,42,.35), inset 0 0 0 1px rgba(255,255,255,.06)",
                  }
            }
          >
            {busy ? (
              <span className="loading loading-spinner" />
            ) : usingCamera ? (
              "Stop Camera"
            ) : (
              "Use Camera"
            )}
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy || isExtracting}
            className="btn join-item btn-sm sm:btn-md font-semibold"
            style={{
              background: "rgba(255,255,255,.85)",
              color: PALETTE.deepBasil,
              border: "1px solid rgba(16,83,42,0.18)",
            }}
          >
            {isExtracting ? (
              <>
                <span className="loading loading-spinner loading-xs mr-2" />
                Upload Photo
              </>
            ) : (
              "Upload Photo"
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            className="hidden"
          />
        </div>

        {/* Live preview */}
        {usingCamera && (
          <div
            className="rounded-3xl overflow-hidden shadow-xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,247,230,0.55) 0%, rgba(255,255,255,0.75) 100%)",
              border: "1px solid rgba(16,83,42,0.12)",
            }}
          >
            <div
              className="p-2"
              style={{
                background:
                  "linear-gradient(180deg, rgba(30,122,60,0.08) 0%, rgba(30,122,60,0.03) 100%)",
              }}
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
              <div className="text-xs sm:text-sm" style={{ color: PALETTE.deepBasil }}>
                Fill the frame with the pizza section. Avoid glare if laminated.
              </div>

              <button
                onClick={snapPhoto}
                disabled={busy || isExtracting}
                className="btn btn-sm sm:btn-md rounded-2xl font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, #B42025 0%, #7E1518 100%)",
                  color: PALETTE.mozzarella,
                  border: "1px solid rgba(180,32,37,0.25)",
                  boxShadow:
                    "0 8px 22px rgba(180,32,37,.35), inset 0 0 0 1px rgba(255,255,255,.5)",
                }}
              >
                {isExtracting ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2" />
                    Snap Photo
                  </>
                ) : (
                  "Snap Photo"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Upload tile */}
        {!usingCamera && (
          <label
            onClick={() => fileRef.current?.click()}
            className={[
              "relative w-full rounded-3xl cursor-pointer transition-all",
              "min-h-40 sm:min-h-48 grid place-items-center",
            ].join(" ")}
            style={{
              border: "2px dashed rgba(16,83,42,0.2)",
              background:
                "linear-gradient(180deg, rgba(255,247,230,.8) 0%, rgba(255,255,255,.8) 100%)",
            }}
          >
            <div className="relative z-10 flex flex-col items-center gap-2 px-4 py-8 sm:py-10 text-center">
              <div
                className="grid size-14 sm:size-16 place-items-center rounded-2xl shadow-sm"
                style={{
                  background: "rgba(255,255,255,.95)",
                  border: "1px solid rgba(16,83,42,0.12)",
                }}
              >
                <span className="text-2xl sm:text-3xl">📷</span>
              </div>
              <div
                className="font-medium text-sm sm:text-base"
                style={{ color: PALETTE.deepBasil }}
              >
                Tap to upload a clear photo of the pizza menu
              </div>
              <div className="text-xs sm:text-sm" style={{ color: "#6b7280" }}>
                Good lighting • No glare • Crop to pizza section if possible
              </div>
            </div>
          </label>
        )}

        {/* Error + HTTPS tip — ONLY render after mount to keep SSR/CSR identical on first paint */}
        {mounted && error && (
          <div
            className="alert rounded-2xl"
            style={{
              background: "rgba(180,32,37,0.08)",
              color: PALETTE.deepTomato,
              border: "1px solid rgba(180,32,37,0.25)",
            }}
          >
            <span>{error}</span>
          </div>
        )}

        {mounted && !support.secure && (
          <div className="text-xs" style={{ color: "#6b7280" }}>
            Tip: Camera only works over HTTPS or on localhost.
          </div>
        )}

        {/* Primary action */}
        <div className="mt-2 sm:mt-4 flex justify-end">
          <button
            onClick={() => onExtract?.()}
            disabled={isExtracting}
            aria-busy={isExtracting ? "true" : "false"}
            className={[
              "btn btn-sm sm:btn-md px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-semibold",
              "min-w-[10rem] justify-center transition-all",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
            style={{
              background: "linear-gradient(135deg, #1E7A3C 0%, #10532A 100%)",
              color: PALETTE.mozzarella,
              border: "1px solid rgba(16,83,42,0.25)",
              boxShadow:
                "0 10px 28px rgba(16,83,42,.35), 0 0 0 0 rgba(196,138,74,0.0), inset 0 0 0 1px rgba(255,255,255,.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 10px 28px rgba(16,83,42,.35), 0 0 0 6px rgba(196,138,74,0.20), inset 0 0 0 1px rgba(255,255,255,.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 10px 28px rgba(16,83,42,.35), 0 0 0 0 rgba(196,138,74,0.0), inset 0 0 0 1px rgba(255,255,255,.06)";
            }}
          >
            {isExtracting ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2" />
                Extracting…
              </>
            ) : (
              "Extract Pizza Menu"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
