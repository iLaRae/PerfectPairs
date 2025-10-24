"use client";

import { useEffect, useRef, useState, useMemo } from "react";

/**
 * Props:
 * - context: { meal?: string, favorites?: string[], wines?: any[] }
 * - busy?: boolean
 * - avatarSrc?: string
 * - className?: string
 * - defaultOpen?: boolean
 * - position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
 * - label?: string
 */
export default function SommelierChat({
  context = { meal: "", favorites: [], wines: [] },
  busy = false,
  avatarSrc = "/sommelier-head.png",
  className = "",
  defaultOpen = false,
  position = "bottom-right",
  label = "Chat with the Sommelier",
}) {
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
  const [unread, setUnread] = useState(false); // NEW: pulse badge when results arrive closed

  const endRef = useRef(null);
  const dialogRef = useRef(null);

  // Positioning classes for the floating launcher
  const posClass = useMemo(() => {
    const base = "fixed z-50 p-2";
    switch (position) {
      case "top-left":
        return `${base} top-4 left-4`;
      case "top-right":
        return `${base} top-4 right-4`;
      case "bottom-left":
        return `${base} bottom-4 left-4`;
      default:
        return `${base} bottom-4 right-4`;
    }
  }, [position]);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal?.();
      setUnread(false);
    } else {
      dialogRef.current?.close?.();
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, busy, open]);

  // Sanitize to plain text (mirrors your navbar cleaner)
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

  // NEW: Inject navbar search results directly into the chat
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
    return () => window.removeEventListener("sommelier:search-result", onSearchResult);
  }, [open]);

  return (
    <>
      {/* Floating launcher (avatar + pulse) */}
      <button
        type="button"
        className={[
          posClass,
          "btn btn-circle btn-primary shadow-xl ring-1 ring-white/10",
          "size-14 sm:size-16 hover:scale-105 transition-transform",
          unread ? "animate-pulse" : "",
        ].join(" ")}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <span className="absolute inset-0 -z-10 rounded-full blur-xl opacity-25" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc}
          alt="Sommelier avatar"
          className="w-full h-full object-cover rounded-full"
        />
        {unread && (
          <span className="badge badge-accent absolute -top-1 -right-1">1</span>
        )}
      </button>

      {/* Dialog */}
      <dialog ref={dialogRef} className="modal">
        <div
          className={[
            "modal-box max-w-lg p-0 overflow-hidden",
            "rounded-3xl ring-1 ring-white/10 shadow-2xl",
            className,
          ].join(" ")}
        >
          {/* Header */}
          <div className="p-3 sm:p-4 flex items-center gap-3 border-b border-base-200">
            <div className="w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow">
              <img
                src={avatarSrc}
                alt="Sommelier avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-semibold leading-tight">Sommelier Chat</div>
              <div className="text-xs opacity-70">
                Your interactive wine expert
              </div>
            </div>

            {(busy || sending) && (
              <div className="ml-auto badge badge-primary badge-outline">
                Thinking…
              </div>
            )}

            <form method="dialog" className="ml-2">
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

          {/* Messages */}
          <div className="px-3 sm:px-4 py-3">
            <div className="space-y-3 max-h-96 overflow-auto pr-1">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={[
                    "chat",
                    m.role === "user" ? "chat-end" : "chat-start",
                  ].join(" ")}
                >
                  {m.role !== "user" && (
                    <div className="chat-image avatar">
                      <div className="w-8 rounded-xl overflow-hidden ring-1 ring-white/10">
                        <img src={avatarSrc} alt="Sommelier avatar" />
                      </div>
                    </div>
                  )}
                  <div
                    className={[
                      "chat-bubble",
                      m.role === "user"
                        ? "bg-primary text-primary-content"
                        : "bg-base-200",
                    ].join(" ")}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {(sending || busy) && (
                <div className="chat chat-start">
                  <div className="chat-image avatar">
                    <div className="w-8 rounded-xl overflow-hidden ring-1 ring-white/10">
                      <img src={avatarSrc} alt="Sommelier avatar" />
                    </div>
                  </div>
                  <div className="chat-bubble bg-base-200">
                    <span className="loading loading-dots loading-sm" />
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t border-base-200">
            <div className="join w-full">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                className="textarea textarea-bordered join-item w-full min-h-12"
                placeholder="Ask the sommelier (e.g., Barolo vs Brunello with ribeye?)"
              />
              <button
                onClick={() => ask()}
                disabled={sending}
                className="btn btn-primary join-item"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Click outside to close */}
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setOpen(false)}>close</button>
        </form>
      </dialog>
    </>
  );
}
