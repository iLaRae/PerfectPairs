"use client";

import { useEffect, useRef, useState, useMemo } from "react";

export default function SommelierChat({
  context = { meal: "", favorites: [], wines: [] },
  busy = false,
  avatarSrc = "/Pairings.png", // This is the default path for the avatar
  className = "",
  defaultOpen = false,
  position = "bottom-right",
  label = "Chat with the Sommelier",
}) {
  // Brand palette (derived from the logo)
  const PALETTE = {
    navy: "#0E2737",
    deepNavy: "#0A1E2B",
    cream: "#F4F1EA",
    glass: "rgba(244, 241, 234, 0.92)",
    amber: "#F2B23A",
    burgundy: "#7B1532",
  };

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Bonjour! I’m Monsieur Verre. Ask me anything about pairings, styles, or this wine list.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const [unread, setUnread] = useState(false);

  const endRef = useRef(null);
  const dialogRef = useRef(null);
  const stickyFooterRef = useRef(null);
  const textareaRef = useRef(null);

  // Floating launcher position (safe-area aware)
  const posClass = useMemo(() => {
    const base = "fixed z-50 p-2";
    switch (position) {
      case "top-left":
        return `${base} top-[calc(env(safe-area-inset-top)+1rem)] left-[calc(env(safe-area-inset-left)+1rem)]`;
      case "top-right":
        return `${base} top-[calc(env(safe-area-inset-top)+1rem)] right-[calc(env(safe-area-inset-right)+1rem)]`;
      case "bottom-left":
        return `${base} bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-[calc(env(safe-area-inset-left)+1rem)]`;
      default:
        return `${base} bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-[calc(env(safe-area-inset-right)+1rem)]`;
    }
  }, [position]);

  // Open/close dialog and lock page scroll
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;

    const handleClose = () => setOpen(false);
    const handleCancel = (e) => {
      e.preventDefault();
      setOpen(false);
    };

    if (open) {
      dlg.showModal?.();
      setUnread(false);
      document.documentElement.style.overflow = "hidden";
    } else {
      dlg.close?.();
      document.documentElement.style.overflow = "";
    }

    dlg.addEventListener("close", handleClose);
    dlg.addEventListener("cancel", handleCancel);

    return () => {
      document.documentElement.style.overflow = "";
      dlg.removeEventListener("close", handleClose);
      dlg.removeEventListener("cancel", handleCancel);
    };
  }, [open]);

  // Autoscroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, busy, open]);

  // Keep input visible above mobile keyboards
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv || !stickyFooterRef.current) return;
    const el = stickyFooterRef.current;
    const handler = () => {
      const bottomInset = Math.max(
        0,
        (window.innerHeight - vv.height - vv.offsetTop) || 0
      );
      el.style.paddingBottom = `calc(1.25rem + ${bottomInset}px + env(safe-area-inset-bottom))`;
    };
    handler();
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => {
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
      el.style.paddingBottom = "";
    };
  }, [open]);

  // Auto-grow textarea (cap ~10 lines)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    const next = Math.min(ta.scrollHeight, 180);
    ta.style.height = `${next}px`;
  }, [input]);

  // Plain-text sanitize
  function sanitize(s = "") {
    let t = s;
    t = t.replace(/\*\*(.*?)\*\*/g, "$1");
    t = t.replace(/\*(.*?)\*/g, "$1");
    t = t.replace(/__(.*?)__/g, "$1");
    t = t.replace(/_(.*?)_/g, "$1");
    t = t.replace(/`{1,3}([^`]+)`{1,3}/g, "$1");
    t = t.replace(/^>+\s?/gm, "");
    t = t.replace(/^#{1,6}\s+/gm, "");
    t = t.replace(/^\s*[-*]\s+/gm, "• ");
    t = t.replace(/\n{3,}/g, "\n\n");
    return t.trim();
  }

  async function ask(q) {
    const question = (q ?? input).trim();
    if (!question) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          meal: context.meal || "",
          favorites: context.favorites || [],
          wines: context.wines || [],
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: sanitize(
            data?.answer || "Here’s my take—though I don’t have more details yet."
          ),
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I couldn’t answer just now." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  }

  // Accept injected search results
  useEffect(() => {
    function onSearchResult(e) {
      const { query, answer } = e?.detail || {};
      if (!query || !answer) return;
      setMessages((m) => [
        ...m,
        { role: "user", content: query },
        { role: "assistant", content: sanitize(answer) },
      ]);
      if (!open) setUnread(true);
    }
    window.addEventListener("sommelier:search-result", onSearchResult);
    return () =>
      window.removeEventListener("sommelier:search-result", onSearchResult);
  }, [open]);

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        className={[
          posClass,
          "size-16 sm:size-[4.5rem] rounded-full shadow-2xl transition-transform hover:scale-105",
          "ring-2",
        ].join(" ")}
        style={{
          background:
            "radial-gradient(80% 80% at 30% 30%, #1B3A4B 0%, #0A1E2B 100%)",
          boxShadow:
            "0 10px 30px rgba(10,30,43,.35), inset 0 0 0 1px rgba(255,255,255,.06)",
          borderColor: PALETTE.amber,
        }}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <span
          className="absolute inset-0 rounded-full opacity-30 blur-lg"
          style={{ background: PALETTE.amber }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc} // Using the avatarSrc prop here
          alt="Sommelier avatar"
          className="w-full h-full object-cover rounded-full"
        />
        {unread && (
          <span
            className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 py-0.5"
            style={{ background: PALETTE.amber, color: PALETTE.navy }}
          >
            1
          </span>
        )}
      </button>

      {/* Modal */}
      <dialog ref={dialogRef} className="modal">
        <div
          className={[
            "modal-box p-0 overflow-hidden flex flex-col",
            "w-[96vw] max-w-lg sm:max-w-xl md:max-w-2xl xl:max-w-3xl",
            "max-h-[90svh] md:max-h-[88svh] h-auto",
            "rounded-3xl",
            "shadow-[0_20px_60px_rgba(10,30,43,0.45)] ring-1",
            className,
          ].join(" ")}
          style={{
            background: PALETTE.glass,
            backdropFilter: "saturate(120%) blur(10px)",
            WebkitBackdropFilter: "saturate(120%) blur(10px)",
            borderColor: "rgba(14,39,55,0.15)",
          }}
        >
          {/* Header */}
          <div
            className="px-5 sm:px-6 py-4 sm:py-5 flex items-center gap-4"
            style={{
              background:
                "linear-gradient(135deg, #0E2737 0%, #122F44 60%, #14344C 100%)",
              color: PALETTE.cream,
              boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shrink-0 ring-2"
              style={{ ringColor: PALETTE.amber, ringOffsetWidth: 0 }}
            >
              <img src={avatarSrc} alt="Sommelier avatar" className="w-full h-full object-cover" /> {/* Using the avatarSrc prop here */}
            </div>
            <div className="min-w-0">
              <div className="font-semibold leading-tight truncate tracking-wide">
                Sommelier Chat
              </div>
              <div className="text-xs opacity-70">
                Perfect pairings for wine, spirits &amp; beer
              </div>
            </div>

            {(busy || sending) && (
              <div
                className="ml-auto text-xs px-2.5 py-1 rounded-full"
                style={{ background: "rgba(242,178,58,0.18)", color: PALETTE.cream }}
              >
                Thinking…
              </div>
            )}

            <button
              className="btn btn-ghost btn-sm ml-2 text-base-100/90 hover:opacity-80"
              onClick={() => setOpen(false)}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto overscroll-contain">
            <div className="space-y-4 sm:space-y-5 pr-1.5 sm:pr-2">
              {messages.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={[
                    "chat",
                    m.role === "user" ? "chat-end" : "chat-start",
                    "text-[1.0em]",
                  ].join(" ")}
                >
                  {m.role !== "user" && (
                    <div className="chat-image avatar">
                      <div
                        className="w-9 sm:w-10 rounded-xl overflow-hidden ring-2 ring-[rgba(14,39,55,.15)]"
                        style={{ boxShadow: "0 2px 8px rgba(10,30,43,.25)" }}
                      >
                        <img src={avatarSrc} alt="Sommelier avatar" /> {/* Using the avatarSrc prop here */}
                      </div>
                    </div>
                  )}

                  {m.role === "user" ? (
                    <div
                      className={[
                        "chat-bubble break-words leading-relaxed",
                        "px-4 sm:px-5 py-3 sm:py-3.5",
                        "max-w-[84vw] sm:max-w-[76vw] md:max-w-[60ch]",
                        "text-white",
                      ].join(" ")}
                      style={{
                        background:
                          "linear-gradient(135deg, #7B1532 0%, #5E0F25 100%)",
                        boxShadow:
                          "0 6px 18px rgba(123,21,50,.35), inset 0 0 0 1px rgba(255,255,255,.06)",
                      }}
                    >
                      {m.content}
                    </div>
                  ) : (
                    <div
                      className={[
                        "chat-bubble break-words leading-relaxed",
                        "px-4 sm:px-5 py-3 sm:py-3.5",
                        "max-w-[84vw] sm:max-w-[76vw] md:max-w-[60ch]",
                      ].join(" ")}
                      style={{
                        background: "rgba(244,241,234,0.85)",
                        color: PALETTE.navy,
                        border: "1px solid rgba(14,39,55,0.12)",
                        boxShadow:
                          "0 6px 18px rgba(10,30,43,.15), inset 0 0 0 1px rgba(255,255,255,.35)",
                      }}
                    >
                      {m.content}
                    </div>
                  )}
                </div>
              ))}

              {(sending || busy) && (
                <div className="chat chat-start">
                  <div className="chat-image avatar">
                    <div className="w-9 sm:w-10 rounded-xl overflow-hidden ring-2 ring-[rgba(14,39,55,.15)]">
                      <img src={avatarSrc} alt="Sommelier avatar" /> {/* Using the avatarSrc prop here */}
                    </div>
                  </div>
                  <div
                    className="chat-bubble px-4 sm:px-5 py-3 sm:py-3.5"
                    style={{
                      background: "rgba(244,241,234,0.85)",
                      color: PALETTE.navy,
                      border: "1px solid rgba(14,39,55,0.12)",
                    }}
                  >
                    <span className="loading loading-dots loading-sm" />
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          {/* Input row (extra bottom padding + new button style) */}
          <div
            ref={stickyFooterRef}
            className="px-5 sm:px-6 pb-4 sm:pb-5 pt-3 sm:pt-4"
            style={{
              borderTop: "1px solid rgba(14,39,55,0.12)",
              background:
                "linear-gradient(180deg, rgba(244,241,234,0.9) 0%, rgba(244,241,234,0.95) 100%)",
            }}
          >
            <div className="join w-full items-end gap-0">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                className={[
                  "textarea join-item w-full",
                  "min-h-[4.5rem] sm:min-h-[4.75rem] max-h-44",
                  "px-4 sm:px-5 py-3.5 sm:py-4 pb-6", // <-- extra bottom padding
                  "text-[1rem] sm:text-[1.05rem] leading-relaxed",
                  "rounded-none bg-white placeholder:text-slate-500",
                  "border focus:outline-none",
                ].join(" ")}
                style={{
                  borderColor: "rgba(14,39,55,0.2)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)",
                }}
                placeholder="Ask the sommelier…"
                inputMode="text"
                autoCapitalize="sentences"
                autoCorrect="on"
                spellCheck
                rows={1}
              />

              {/* Navy pill button with amber glow */}
              <button
                onClick={() => ask()}
                disabled={sending || !input.trim()}
                className={[
                  "join-item btn btn-lg font-semibold px-6 sm:px-7 py-3.5 sm:py-4",
                  "rounded-r-full rounded-l-none group transition-all duration-200",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                ].join(" ")}
                style={{
                  background:
                    "linear-gradient(135deg, #0E2737 0%, #0A1E2B 100%)",
                  color: PALETTE.cream,
                  border: "1px solid rgba(244,178,58,0.35)",
                  boxShadow:
                    "0 8px 22px rgba(14,39,55,.35), 0 0 0 0 rgba(242,178,58,0.0), inset 0 0 0 1px rgba(255,255,255,.05)",
                }}
                aria-label="Send message"
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 8px 22px rgba(14,39,55,.35), 0 0 0 6px rgba(242,178,58,0.15), inset 0 0 0 1px rgba(255,255,255,.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 8px 22px rgba(14,39,55,.35), 0 0 0 0 rgba(242,178,58,0.0), inset 0 0 0 1px rgba(255,255,255,.05)";
                }}
              >
                <span className="mr-1">Chat</span>
                <svg
                  className="inline-block size-4 translate-x-0 group-hover:translate-x-0.5 transition-transform"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Backdrop */}
        <form
          method="dialog"
          className="modal-backdrop"
          style={{ background: "rgba(10,30,43,.45)" }}
        >
          <button onClick={() => setOpen(false)} aria-label="Close overlay">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}