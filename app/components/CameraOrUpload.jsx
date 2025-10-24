// components/CameraOrUpload.jsx
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Props:
 * - onCapture: (dataUrl: string) => void      // receives a base64 data URL
 * - className?: string
 * - title?: string
 */
export default function CameraOrUpload({ onCapture, className = "", title = "Camera or Upload" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  const [support, setSupport] = useState({
    mediaDevices: typeof navigator !== "undefined" && !!navigator.mediaDevices,
    fileInput: true,
  });

  const [usingCamera, setUsingCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    if (!support.mediaDevices) {
      setError("Camera not supported. Try uploading an image instead.");
      return;
    }
    try {
      setError("");
      setBusy(true);
      // Try rear camera first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setUsingCamera(true);
    } catch (e) {
      setError("Could not access camera. You can still upload a photo.");
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
      streamRef.current = null;
      setUsingCamera(false);
    } catch {
      /* noop */
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
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      onCapture?.(dataUrl);
      // Optional: stop camera after capture
      stopCamera();
    } catch (e) {
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

  return (
    <div className={["card bg-base-100 shadow-2xl rounded-3xl ring-1 ring-white/10", className].join(" ")}>
      <div className="card-body gap-5">
        <div className="flex items-center justify-between">
          <h2 className="card-title">{title}</h2>
          <div className="badge badge-primary badge-outline">Mobile Ready</div>
        </div>

        {/* Camera / Upload toolbar */}
        <div className="join w-full">
          <button
            onClick={usingCamera ? stopCamera : startCamera}
            className={`btn join-item ${usingCamera ? "btn-warning" : "btn-primary"}`}
            disabled={busy}
          >
            {busy ? <span className="loading loading-spinner" /> : usingCamera ? "Stop Camera" : "Use Camera"}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn btn-ghost join-item"
            disabled={busy}
          >
            Upload Photo
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

        {/* Live preview (glossy frame) */}
        {usingCamera && (
          <div className="rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-xl bg-base-200">
            <div className="p-2 bg-gradient-to-b from-base-300/40 to-base-300/10">
              <video
                ref={videoRef}
                playsInline
                muted
                className="rounded-2xl w-full max-h-[420px] object-contain bg-base-100"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="p-3 flex items-center justify-between">
              <div className="text-sm opacity-80">
                Center the list and tap snap. Uses your rear camera when available.
              </div>
              <button onClick={snapPhoto} className="btn btn-secondary btn-wide rounded-2xl">
                Snap Photo
              </button>
            </div>
          </div>
        )}

        {/* Upload dropzone-style tile (shown when camera is off) */}
        {!usingCamera && (
          <label
            onClick={() => fileRef.current?.click()}
            className={[
              "relative w-full rounded-3xl cursor-pointer",
              "shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
              "ring-1 ring-white/10",
              "transition-transform hover:scale-[1.01] active:scale-[0.99]",
              "min-h-40 grid place-items-center",
            ].join(" ")}
            style={{ background: "linear-gradient(180deg, #0f172a 0%, #0b1022 100%)" }}
          >
            {/* inner bevel */}
            <div
              className="absolute inset-[3px] rounded-[22px]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.03) 100%)",
              }}
            />
            {/* highlight */}
            <div
              className="pointer-events-none absolute -top-2 -left-2 h-1/2 w-1/2 rounded-[28px] opacity-60"
              style={{
                background:
                  "radial-gradient(120% 80% at 10% 0%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 55%, transparent 70%)",
                maskImage:
                  "radial-gradient(120% 80% at 10% 0%, black 0%, black 55%, transparent 70%)",
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-2 px-4 py-10 text-center">
              <div className="grid size-16 place-items-center rounded-2xl bg-base-100/10 ring-1 ring-white/10 backdrop-blur-sm">
                <span className="text-3xl">📷</span>
              </div>
              <div className="text-white/95 font-medium">
                Tap to upload a clear photo of the wine list
              </div>
              <div className="text-white/70 text-sm">Good lighting • No glare • Crop to list if possible</div>
            </div>
          </label>
        )}

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
