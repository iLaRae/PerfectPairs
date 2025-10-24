"use client";

import { useState, useRef, useEffect } from "react";

/* ---------------------------------------------
   (Optional) Side chat wrapper — desktop only
   Use this where you previously rendered the
   “side chat” so it disappears on mobile.
   Example:
     <SideChat>
       <YourExistingSideChatUI />
     </SideChat>
------------------------------------------------ */
export function SideChat({ children, className = "" }) {
  return (
    <aside
      className={`hidden md:flex md:flex-col md:w-80 md:shrink-0 ${className}`}
      aria-label="Sommelier side chat (desktop only)"
    >
      {children}
    </aside>
  );
}

/**
 * Minimal placeholder for Camera/Upload so this file is self-contained.
 */
function CameraOrUpload({ onCapture, title }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      const reader = new FileReader();
      reader.onload = (readEvent) => onCapture?.(readEvent.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg border-base-300 bg-base-100">
      <h4 className="text-lg font-semibold mb-2">{title || "Camera or Upload"}</h4>
      <p className="text-sm text-base-content/70 mb-4">
        This is a placeholder. A real component would show a camera view or file
        upload button.
      </p>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="file-input file-input-bordered file-input-primary w-full max-w-xs"
      />
      {file && <p className="text-sm mt-2">Selected: {file.name}</p>}
      <p className="text-xs text-base-content/50 mt-4">
        (Selecting a file will simulate a capture)
      </p>
    </div>
  );
}

/**
 * Props:
 * - onCapture: (dataUrl: string) => void
 * - active?: "home" | "settings" | "chat"
 * - onNavigate?: (key: "home" | "settings" | "chat") => void
 * - chatContext?: { meal?: string, favorites?: string[], wines?: any[] }
 */
export default function MobileDock({
  onCapture,
  active = "home",
  onNavigate,
  chatContext = { meal: "", favorites: [], wines: [] },
}) {
  const [openSnap, setOpenSnap] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const snapRef = useRef(null);

  useEffect(() => {
    if (openSnap) snapRef.current?.showModal?.();
    else snapRef.current?.close?.();
  }, [openSnap]);

  function handleCapture(dataUrl) {
    onCapture?.(dataUrl);
    setOpenSnap(false);
  }

  // Consistent mobile sizing
  const btnBase =
    "flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 min-w-16";
  const icon = "w-5 h-5";
  const label = "dock-label text-xs";

  return (
    <>
      {/* Bottom Dock — MOBILE ONLY */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 pb-[calc(env(safe-area-inset-bottom)+0.65rem)]">
        <div className="dock dock-md mx-auto w-full max-w-3xl bg-base-100/95 backdrop-blur border-t border-base-200 shadow-lg rounded-t-2xl px-2">
          {/* Home */}
          <button
            className={`${btnBase} ${active === "home" ? "dock-active" : ""}`}
            onClick={() => onNavigate?.("home")}
          >
            <svg
              className={icon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt">
                <polyline
                  points="1 11 12 2 23 11"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="2"
                />
                <path
                  d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="square"
                  strokeMiterlimit="10"
                  strokeWidth="2"
                />
                <line
                  x1="12"
                  y1="22"
                  x2="12"
                  y2="18"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="square"
                  strokeMiterlimit="10"
                  strokeWidth="2"
                />
              </g>
            </svg>
            <span className={label}>Home</span>
          </button>

          {/* Big Snap */}
          <button
            onClick={() => setOpenSnap(true)}
            className="relative -mt-7 rounded-full btn btn-primary btn-circle shadow-xl w-14 h-14"
            aria-label="Snap wine list"
            title="Snap wine list"
          >
            <svg
              className="w-6 h-6 opacity-95"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 8h4l2-3h4l2 3h4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                <circle cx="12" cy="13" r="3.5" />
              </g>
            </svg>
            <span className="sr-only">Snap</span>
          </button>

          {/* Chat (opens modal) */}
          <button
            className={`${btnBase} ${active === "chat" ? "dock-active" : ""}`}
            onClick={() => {
              onNavigate?.("chat");
              setOpenChat(true);
            }}
            aria-label="Open chat"
            title="Sommelier Chat"
          >
            <svg
              className={icon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M21 12c0 3.866-3.806 7-8.5 7a9.9 9.9 0 0 1-2.9-.42L4 20l1.59-3.18A7.6 7.6 0 0 1 3 12c0-3.866 3.806-7 8.5-7S21 8.134 21 12Z" />
                <path d="M8 11h8M8 14h5" />
              </g>
            </svg>
            <span className={label}>Chat</span>
          </button>

          {/* Settings */}
          <button
            className={`${btnBase} ${
              active === "settings" ? "dock-active" : ""
            }`}
            onClick={() => onNavigate?.("settings")}
          >
            <svg
              className={icon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt">
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="square"
                  strokeMiterlimit="10"
                  strokeWidth="2"
                />
                <path
                  d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287.518.515,1.073.682,1.654l2.318-.966Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="square"
                  strokeMiterlimit="10"
                  strokeWidth="2"
                />
              </g>
            </svg>
            <span className={label}>Settings</span>
          </button>
        </div>
      </div>

      {/* SNAP Modal */}
      <dialog ref={snapRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box w-[calc(100vw-1rem)] sm:w-full max-w-lg p-0 overflow-hidden">
          <div className="p-3 flex items-center justify-between border-b border-base-200">
            <h3 className="font-semibold">Snap Wine List</h3>
            <form method="dialog">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setOpenSnap(false)}
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </form>
          </div>
          <div className="p-3 max-h-[70vh] overflow-auto">
            <CameraOrUpload onCapture={handleCapture} title="Camera or Upload" />
          </div>
          <div className="modal-action p-3 pt-0">
            <form method="dialog">
              <button className="btn" onClick={() => setOpenSnap(false)}>
                Close
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setOpenSnap(false)}>close</button>
        </form>
      </dialog>

      {/* CHAT Modal (only opened from the dock) */}
      <DockChat
        open={openChat}
        onClose={() => setOpenChat(false)}
        context={chatContext}
      />
    </>
  );
}

/* ---------- Dock Chat (no side avatar bubbles) ---------- */
function DockChat({ open, onClose, context }) {
  const dlgRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Bonjour! I’m Monsieur Verre. Ask me anything about pairings, styles, or this wine list.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) dlgRef.current?.showModal?.();
    else dlgRef.current?.close?.();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, open]);

  async function ask(q) {
    const question = (q ?? input).trim();
    if (!question) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const data = {
        answer: `I've received your query about "${question}". Here is a simulated response.`,
      };
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
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

  return (
    <dialog ref={dlgRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box w-[calc(100vw-1rem)] sm:w-full max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 flex items-center gap-3 border-b border-base-200">
          <div className="font-semibold leading-tight">Sommelier Chat</div>
          <div className="text-xs opacity-70">Your interactive wine expert</div>
          {sending && (
            <div className="ml-auto badge badge-primary badge-outline">
              Thinking…
            </div>
          )}
          <form method="dialog" className="ml-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
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
                className={m.role === "user" ? "text-right" : "text-left"}
              >
                <div
                  className={[
                    "inline-block rounded-2xl px-3 py-2 max-w-[85%] sm:max-w-[80%] align-top",
                    m.role === "user"
                      ? "bg-primary text-primary-content"
                      : "bg-base-200",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="text-left">
                <div className="inline-block rounded-2xl px-3 py-2 bg-base-200">
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
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}