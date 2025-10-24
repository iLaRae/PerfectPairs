"use client";

import { useRef, useState } from "react";

export default function AppNavbar({
  context = { meal: "", favorites: [], wines: [] },
  brand = "Sommelier",
  // onPushToChat is now unused (kept for compatibility)
  onPushToChat,
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function search() {
    const query = q.trim();
    if (!query || loading) return;
    setOpen(true);
    setLoading(true);
    setAnswer("");
    setError("");

    const question =
      `Give professional sommelier details about "${query}" ` +
      `(styles, regions, acidity/tannin/body, flavor notes, serving temp, pairings vs pitfalls). ` +
      `Be concise. Avoid markdown formatting.`;

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
      if (!res.ok) throw new Error(data.error || "Failed to fetch details.");

      const clean = toModernPlain(data.answer || "No details returned.");
      setAnswer(clean);

      // Auto-broadcast result so SommelierDock & SommelierChat can show it
      window.dispatchEvent(
        new CustomEvent("sommelier:search-result", {
          detail: { query, answer: clean },
        })
      );
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      search();
    }
  }

  function clearAndClose() {
    setOpen(false);
    setLoading(false);
    setAnswer("");
    setError("");
  }

  return (
    <div className="navbar bg-base-100 shadow-sm sticky top-0 z-40">
      {/* Left: Brand */}
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">{brand}</a>
      </div>

      {/* Right cluster: Search + Avatar */}
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 relative">
        {/* Search block with top label */}
        <div className="relative">
          {/* Top label */}
          <div className="flex items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-base-200 text-xs">
              <span aria-hidden>🍷</span>
              <span className="font-medium">Perfect Pairs Sommelier</span>
            </div>
            <span className="hidden sm:inline text-xs opacity-60">
              Ask pairings, styles, regions…
            </span>
          </div>

          {/* Search input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search a wine (e.g., Barolo)"
              aria-label="Ask The Sommelier Bot"
              className="input input-bordered w-64 sm:w-80 md:w-[28rem] lg:w-[34rem] pr-12"
            />
            <button
              onClick={q ? search : undefined}
              className="btn btn-ghost btn-circle absolute right-1 top-1/2 -translate-y-1/2"
              aria-label="Search"
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-6 opacity-80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-4.35-4.35m1.6-5.4a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Popover */}
          {open && (
            <div className="absolute right-0 mt-2 w-[min(92vw,40rem)]">
              <div className="rounded-2xl shadow-2xl ring-1 ring-white/10 bg-base-100/80 backdrop-blur-md">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold truncate">
                      Sommelier on “{q}”
                    </div>
                    {/* Removed "Send to Chat" button */}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={clearAndClose}
                    >
                      Close
                    </button>
                  </div>

                  <div className="divider my-3" />

                  <div className="max-h-80 overflow-auto pr-1">
                    {error ? (
                      <div className="alert alert-error">
                        <span>{error}</span>
                      </div>
                    ) : loading ? (
                      <ModernSkeleton />
                    ) : (
                      <AnswerBlocks text={answer} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar"
          >
            <div className="w-10 rounded-full">
              <img
                alt="User avatar"
                src="/sommelier-head.png"
              />
            </div>
          </div>
          <ul
            tabIndex={-1}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow"
          >
            <li>
              <a className="justify-between">
                Profile
                <span className="badge"></span>
              </a>
            </li>
            {/* <li>
              <a>Settings</a>
            </li> */}
            <li>
              <a>Logout</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* -------- Helpers: remove ** and modernize formatting -------- */
function toModernPlain(s) {
  if (!s) return "";
  let t = s;

  t = t.replace(/\*\*(.*?)\*\*/g, "$1"); // **bold**
  t = t.replace(/\*(.*?)\*/g, "$1"); // *italic*
  t = t.replace(/__(.*?)__/g, "$1"); // __bold__
  t = t.replace(/_(.*?)_/g, "$1"); // _italic_
  t = t.replace(/`{1,3}([^`]+)`{1,3}/g, "$1"); // `code` or ```code```
  t = t.replace(/^>+\s?/gm, ""); // blockquotes
  t = t.replace(/^#{1,6}\s+/gm, ""); // headings
  t = t.replace(/^\s*[-*]\s+/gm, "• "); // bullets
  t = t.replace(/\n{3,}/g, "\n\n"); // collapse blanks

  return t.trim();
}

function AnswerBlocks({ text }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const lines = block.split(/\n/);
        const hasBullets = lines.some((l) => l.trim().startsWith("• "));
        return (
          <div
            key={i}
            className="rounded-2xl bg-base-200/70 ring-1 ring-white/10 p-3"
          >
            {hasBullets ? (
              <ul className="menu menu-compact bg-transparent p-0">
                {lines.map((l, idx) =>
                  l.trim().startsWith("• ") ? (
                    <li key={idx} className="text-sm leading-relaxed">
                      <a className="pointer-events-none">
                        {l.replace(/^•\s*/, "")}
                      </a>
                    </li>
                  ) : l.trim() ? (
                    <li
                      key={idx}
                      className="text-sm opacity-80 pointer-events-none"
                    >
                      <a className="pointer-events-none">{l}</a>
                    </li>
                  ) : null
                )}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {block}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModernSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-2/3 bg-base-200 rounded animate-pulse" />
      <div className="h-4 w-5/6 bg-base-200 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-base-200 rounded animate-pulse" />
      <div className="divider my-2" />
      <div className="h-4 w-4/5 bg-base-200 rounded animate-pulse" />
      <div className="h-4 w-3/5 bg-base-200 rounded animate-pulse" />
    </div>
  );
}
