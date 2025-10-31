"use client";

import { useEffect, useState } from "react";

/**
 * useMobileDockCapture
 * - Returns the latest captured dataUrl and a manual clear() helper
 * - Also accepts an optional callback that's fired on every capture
 */
export default function useMobileDockCapture(onCapture) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    const handler = (e) => {
      const url = e?.detail ?? "";
      setDataUrl(url);
      if (onCapture) onCapture(url);
    };
    window.addEventListener("mobile-dock:capture", handler);
    return () => window.removeEventListener("mobile-dock:capture", handler);
  }, [onCapture]);

  const clear = () => setDataUrl("");

  return { dataUrl, clear };
}