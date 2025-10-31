// components/MobileDockClient.jsx
"use client";

import { useRouter } from "next/navigation";
import MobileDock from "./MobileDock";

export default function MobileDockClient() {
  const router = useRouter();

  return (
    <MobileDock
      onCapture={(dataUrl) => {
        // Broadcast so other parts (OCR, ranker, etc.) can react
        try {
          window.dispatchEvent(new CustomEvent("mobile-dock:capture", { detail: dataUrl }));
        } catch {}
      }}
      active="home"
      onNavigate={(key) => {
        if (key === "home") router.push("/");
        if (key === "chat") router.push("/inbox"); // or keep within page if you've embedded chat
        if (key === "settings") router.push("/settings");
      }}
    />
  );
}