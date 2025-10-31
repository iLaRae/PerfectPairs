"use client";

import { useEffect, useRef, useState } from "react";
import SommelierChat from "./SommelierChat";

/**
 * Props:
 * - context?: { meal?: string; favorites?: string[]; wines?: any[] }
 * - avatarSrc?: string        // default "/pairings-logo.png"
 * - initialQuestion?: string  // optional question to pre-ask on open
 */
export default function SommelierDock({
  context = { meal: "", favorites: [], wines: [] },
  avatarSrc = "/pairings-logo.png", // Default avatar source
  initialQuestion = "",
}) {
  const dialogRef = useRef(null);
  const [open, setOpen] = useState(false);

  // Preview of last navbar search result
  const [lastResult, setLastResult] = useState(null); // { query, answer }
  const [previewVisible, setPreviewVisible] = useState(true);

  // Manage dialog open/close + prevent background scroll
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open) {
      d.showModal?.();
      document.documentElement.style.overflow = "hidden";
      // seed an initial question if provided
      if (initialQuestion.trim()) {
        setTimeout(() => {
          const ev = new CustomEvent("sommelier:seed-question", {
            detail: initialQuestion.trim(),
          });
          window.dispatchEvent(ev);
        }, 0);
      }
    } else {
      try {
        d.close?.();
      } catch {}
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open, initialQuestion]);

  function openChat() {
    setOpen(true);
  }

  // Listen for navbar search results and show compact preview
  useEffect(() => {
    function onResult(e) {
      const payload = e?.detail || {};
      if (!payload.query || !payload.answer) return;
      setLastResult(payload);
      setPreviewVisible(true);
    }
    window.addEventListener("sommelier:search-result", onResult);
    return () => window.removeEventListener("sommelier:search-result", onResult);
  }, []);

  // Push the preview result into chat and open it
  function openInChatFromPreview() {
    if (lastResult?.query) {
      window.dispatchEvent(
        new CustomEvent("sommelier:search-result", { detail: lastResult })
      );
    }
    setOpen(true);
    setPreviewVisible(false);
  }

  return (
    <>
      {/* Top strip with avatar + quick prompt (safe-area aware) */}
      <div className="sticky top-0 z-50 bg-base-100/80 backdrop-blur supports-[backdrop-filter]:bg-base-100/60 border-b border-base-200">
        <div
          className="mx-auto w-full px-3 py-2 flex flex-col gap-2"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.25rem)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10 shadow shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc} // Correctly uses avatarSrc here
                alt="Sommelier avatar"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-xs sm:text-sm opacity-80 hidden xs:block">
              Sommelier is available on every page. Ask pairing questions anytime.
            </div>

            <div className="ml-auto join shrink-0">
              <input
                type="text"
                className="input input-bordered input-sm join-item w-40 xs:w-52 md:w-72"
                placeholder="Ask the sommelier…"
                inputMode="text"
                autoCapitalize="sentences"
                autoCorrect="on"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      setOpen(true);
                      // seed the question after dialog opens
                      setTimeout(() => {
                        const ev = new CustomEvent("sommelier:seed-question", {
                          detail: val,
                        });
                        window.dispatchEvent(ev);
                      }, 0);
                      e.currentTarget.value = "";
                    }
                  }
                }}
              />
              <button
                onClick={openChat}
                className="btn btn-primary btn-sm join-item"
              >
                Open Chat
              </button>
            </div>
          </div>

          {/* Last result preview (responsive) */}
          {lastResult && previewVisible && (
            <div className="rounded-xl border border-base-200 bg-base-100/70 shadow-sm p-2 sm:p-3 flex items-start gap-3">
              <div className="badge badge-neutral shrink-0 mt-0.5">
                Last result
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  “{lastResult.query}”
                </div>
                <p className="text-sm opacity-80 line-clamp-2">
                  {lastResult.answer}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <button
                  className="btn btn-primary btn-xs"
                  onClick={openInChatFromPreview}
                >
                  Open in Chat
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => setPreviewVisible(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal chat panel – full-screen on mobile, card on larger screens */}
      <dialog ref={dialogRef} className="modal">
        <div
          className={[
            "modal-box",
            // Full-bleed on phones; constrained on >=sm
            "w-[100vw] h-[100svh] max-w-none sm:max-w-3xl sm:h-auto",
            "p-0 overflow-hidden flex flex-col",
            "rounded-none sm:rounded-3xl ring-1 ring-white/10 shadow-2xl",
          ].join(" ")}
          style={{
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Header (mobile-friendly) */}
          <div className="px-3 sm:px-4 py-3 flex items-center justify-between border-b border-base-200">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-white/10 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarSrc} alt="Sommelier avatar" /> {/* Correctly uses avatarSrc here */}
              </div>
              <h3 className="font-semibold truncate">Sommelier Chat</h3>
            </div>
            <form method="dialog">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen(false)}
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </form>
          </div>

          {/* Chat body fills remaining height on mobile */}
          <div className="flex-1 min-h-0">
            <SeededSommelierChat
              avatarSrc={avatarSrc} // Correctly passes avatarSrc to SeededSommelierChat
              context={context}
              // Let inner component manage its own layout; remove outer shadows
              className="shadow-none ring-0"
            />
          </div>

          {/* Footer actions (desktop only) */}
          <div className="hidden sm:flex items-center justify-end gap-2 px-4 py-3 border-t border-base-200">
            <form method="dialog">
              <button className="btn" onClick={() => setOpen(false)}>
                Close
              </button>
            </form>
          </div>
        </div>

        {/* Click outside to close */}
        <form method="dialog" className="modal-backdrop">
          <button aria-label="Close overlay" onClick={() => setOpen(false)}>
            close
          </button>
        </form>
      </dialog>
    </>
  );
}

/* Helper: allow the top input to seed a first question into the chat */
function SeededSommelierChat({ avatarSrc, context, className = "" }) {
  const [seed, setSeed] = useState("");

  useEffect(() => {
    const onSeed = (e) => setSeed(e.detail || "");
    window.addEventListener("sommelier:seed-question", onSeed);
    return () => window.removeEventListener("sommelier:seed-question", onSeed);
  }, []);

  // Forward the seeded question via the event that SommelierChat already listens to.
  useEffect(() => {
    if (!seed) return;
    const ev = new CustomEvent("sommelier:search-result", {
      detail: { query: seed, answer: "" },
    });
    window.dispatchEvent(ev);
  }, [seed]);

  return (
    <SommelierChat
      avatarSrc={avatarSrc} // Correctly passes avatarSrc to SommelierChat
      context={context}
      className={["shadow-none ring-0 h-full"].join(" ")}
    />
  );
}