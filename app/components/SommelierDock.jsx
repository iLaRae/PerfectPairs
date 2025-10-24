"use client";

import { useEffect, useRef, useState } from "react";
import SommelierChat from "./SommelierChat";

/**
 * Props:
 * - context?: { meal?: string; favorites?: string[]; wines?: any[] }
 * - avatarSrc?: string        // default "/sommelier-head.png"
 * - initialQuestion?: string  // optional question to pre-ask on open
 */
export default function SommelierDock({
  context = { meal: "", favorites: [], wines: [] },
  avatarSrc = "/sommelier-head.png",
  initialQuestion = "",
}) {
  const dialogRef = useRef(null);
  const [open, setOpen] = useState(false);

  // NEW: preview last navbar search result
  const [lastResult, setLastResult] = useState(null); // { query, answer }
  const [previewVisible, setPreviewVisible] = useState(true);

  useEffect(() => {
    if (open) dialogRef.current?.showModal?.();
    else dialogRef.current?.close?.();
  }, [open]);

  function openChat() {
    setOpen(true);
  }

  // Listen for navbar search results
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
      // seed both question and answer into the chat via events SommelierChat listens to
      window.dispatchEvent(
        new CustomEvent("sommelier:search-result", { detail: lastResult })
      );
    }
    setOpen(true);
    setPreviewVisible(false);
  }

  return (
    <>
      {/* Top strip with avatar + quick prompt */}
      <div className="sticky top-0 z-50 bg-base-100/80 backdrop-blur supports-[backdrop-filter]:bg-base-100/60 border-b border-base-200">
        <div className="mx-auto max-w-6xl px-3 py-2 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10 shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc} alt="Sommelier avatar" className="w-full h-full object-cover" />
            </div>
            <div className="text-sm opacity-80 hidden sm:block">
              Sommelier is available on every page. Ask pairing questions anytime.
            </div>
            <div className="ml-auto join">
              <input
                type="text"
                className="input input-bordered input-sm join-item w-44 md:w-72"
                placeholder="Ask the sommelier…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      // open the chat; we’ll seed the question via separate event
                      setOpen(true);
                      setTimeout(() => {
                        const ev = new CustomEvent("sommelier:seed-question", { detail: val });
                        window.dispatchEvent(ev);
                      }, 0);
                      e.currentTarget.value = "";
                    }
                  }
                }}
              />
              <button onClick={openChat} className="btn btn-primary btn-sm join-item">
                Open Chat
              </button>
            </div>
          </div>

          {/* NEW: compact preview of last navbar search result */}
          {lastResult && previewVisible && (
            <div className="rounded-xl border border-base-200 bg-base-100/70 shadow-sm p-2 sm:p-3 flex items-start gap-3">
              <div className="badge badge-neutral shrink-0 mt-0.5">Last result</div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">“{lastResult.query}”</div>
                <p className="text-sm opacity-80 line-clamp-2">
                  {lastResult.answer}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <button className="btn btn-primary btn-xs" onClick={openInChatFromPreview}>
                  Open in Chat
                </button>
                <button className="btn btn-ghost btn-xs" onClick={() => setPreviewVisible(false)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal chat panel */}
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-3xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-white/10">
                <img src={avatarSrc} alt="Sommelier avatar" />
              </div>
              <h3 className="font-semibold">Sommelier Chat</h3>
            </div>
            <form method="dialog">
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                ✕
              </button>
            </form>
          </div>

          <SeededSommelierChat avatarSrc={avatarSrc} context={context} />

          <div className="modal-action">
            <form method="dialog">
              <button className="btn" onClick={() => setOpen(false)}>Close</button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

/* Helper: allow the top input to seed a first question into the chat */
function SeededSommelierChat({ avatarSrc, context }) {
  const [seed, setSeed] = useState("");

  useEffect(() => {
    const onSeed = (e) => setSeed(e.detail || "");
    window.addEventListener("sommelier:seed-question", onSeed);
    return () => window.removeEventListener("sommelier:seed-question", onSeed);
  }, []);

  // We render SommelierChat; it handles the injected events itself.
  return (
    <SommelierChat
      avatarSrc={avatarSrc}
      context={context}
      className="shadow-none ring-0"
    />
  );
}
