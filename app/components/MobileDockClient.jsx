// components/MobileDockClient.jsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import MobileDock from "./MobileDock";

export default function MobileDockClient() {
  const router = useRouter();
  const pathname = usePathname();

  // Derive active tab from the current route
  const active =
    pathname?.startsWith("/settings") ? "settings" : "home";

  return (
    <MobileDock
      // Send captured image globally so other components can react to it
      onCapture={(dataUrl) => {
        window.dispatchEvent(
          new CustomEvent("mobile-dock:capture", { detail: dataUrl })
        );
      }}
      active={active} // "home" | "settings" (chat opens sheet; no route)
      onNavigate={(key) => {
        if (key === "home") router.push("/");
        if (key === "settings") router.push("/settings");
        // "chat" opens the dock chat sheet; no navigation needed
      }}
      // Optionally pass chat context if you have it:
      // chatContext={{ meal, favorites, wines }}
      // avatarSrc="/sommelier-head.png" // (default already set in MobileDock)
    />
  );
}
