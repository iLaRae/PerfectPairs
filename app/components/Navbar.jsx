// components/Navbar.jsx
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useRouter } from "next/navigation";

export default function Navbar({
  context = { meal: "", favorites: [], wines: [] },
  brand = "Perfect Pairs",
  onPushToChat, // kept for compatibility (unused)
}) {
  // ---- Brand palette (from Pairings artwork) ----
  const PALETTE = {
    navy: "#0E2737",
    deepNavy: "#0A1E2B",
    cream: "#F4F1EA",
    amber: "#F2B23A",
    burgundy: "#7B1532",
  };

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);

  // ---- Auth ----
  const auth = useAuth();
  const router = useRouter();
  const isAuthenticated = !!auth?.isAuthenticated;

  const userProfile = auth?.user?.profile || {};
  const displayName =
    userProfile.name || userProfile.preferred_username || "Account";
  const avatarUrl = userProfile.picture || "/pairings-logo.png";

  const handleSignIn = useCallback(() => {
    try {
      sessionStorage.setItem("ecs_post_login_redirect", "/profile");
    } catch {}
    auth?.signinRedirect?.().catch(console.error);
  }, [auth]);

  const handleSignOut = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    const logoutUri = process.env.NEXT_PUBLIC_COGNITO_LOGOUT_REDIRECT;
    const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;

    if (!clientId || !logoutUri || !cognitoDomain) {
      console.error("Cognito environment variables are not configured.");
      setLoggingOut(false);
      return;
    }

    const idToken = auth?.user?.id_token;
    const params = new URLSearchParams({
      client_id: clientId,
      logout_uri: logoutUri,
    });
    if (idToken) params.set("id_token_hint", idToken);
    const cognitoLogoutUrl = `${cognitoDomain}/logout?${params.toString()}`;

    const deepClientCleanup = async () => {
      try {
        await auth?.removeUser?.();
      } catch {}
      try {
        localStorage.clear();
      } catch {}
      try {
        sessionStorage.clear();
      } catch {}
      try {
        const bc = new BroadcastChannel("easycommercestudio-auth");
        bc.postMessage({ type: "LOGOUT" });
        bc.close();
      } catch {}
    };

    try {
      await deepClientCleanup();
      router.push("/");
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      window.location.replace(cognitoLogoutUrl);
    }
  }, [auth, loggingOut, router]);

  // Cross-tab/session logout sync
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel("easycommercestudio-auth");
      bc.onmessage = (evt) => {
        if (evt?.data?.type === "LOGOUT") auth?.removeUser?.().catch(() => {});
      };
    } catch {}
    const storageHandler = (e) => {
      if (e.key && e.key.startsWith("oidc.user:") && !e.newValue) {
        auth?.removeUser?.().catch(() => {});
      }
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", storageHandler);
    };
  }, [auth]);

  // ---- Search ----
  async function search(source = "desktop") {
    const value =
      (source === "mobile" ? mobileInputRef.current?.value : q) || "";
    const query = value.trim();
    if (!query || loading) return;

    const setPanelOpen = source === "mobile" ? setMobileOpen : setOpen;
    setPanelOpen(true);
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
      search("desktop");
    }
  }

  function clearAndClose() {
    setOpen(false);
    setLoading(false);
    setAnswer("");
    setError("");
  }

  function clearAndCloseMobile() {
    setMobileOpen(false);
    setLoading(false);
    setAnswer("");
    setError("");
  }

  return (
    <div
      className={[
        "navbar sticky top-0 z-40 px-2 sm:px-4 min-h-14",
        "pt-[max(env(safe-area-inset-top),0px)] supports-[backdrop-filter]:backdrop-blur",
        "shadow-[0_6px_24px_rgba(10,30,43,0.12)] ring-1",
      ].join(" ")}
      style={{
        background: "rgba(244,241,234,0.86)", // cream glass
        borderColor: "rgba(14,39,55,0.15)",    // navy tint
        color: PALETTE.navy,
      }}
    >
      {/* Left: Brand */}
      <div className="flex-1 min-w-0">
        <a
          className="btn btn-ghost px-2 sm:px-3 text-lg sm:text-xl normal-case truncate"
          style={{ color: PALETTE.navy }}
        >
          {brand}
        </a>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
        {/* MOBILE: search icon opens square card */}
        <button
          className="btn btn-ghost btn-circle md:hidden"
          aria-label="Search wines"
          onClick={() => {
            setMobileOpen(true);
            setTimeout(() => mobileInputRef.current?.focus(), 0);
          }}
          style={{ color: PALETTE.navy }}
        >
          <SearchIcon />
        </button>

        {/* DESKTOP/TABLET: inline search */}
        <div className="relative hidden md:block">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] sm:text-xs"
              style={{
                background: "rgba(242,178,58,0.18)", // amber haze
                color: PALETTE.navy,
                border: "1px solid rgba(14,39,55,0.15)",
              }}
            >
              <span aria-hidden>🍷</span>
              <span className="font-medium">Perfect Pairs Sommelier</span>
            </div>
            <span className="hidden lg:inline text-xs opacity-70">
              Ask pairings, styles, regions…
            </span>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search a wine (e.g., Barolo)"
              aria-label="Ask The Sommelier Bot"
              className="input bg-white pr-12 w-[min(70vw,26rem)] xl:w-[32rem]"
              style={{
                color: PALETTE.navy,
                border: "1px solid rgba(14,39,55,0.25)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)",
              }}
              inputMode="search"
            />
            <button
              onClick={q ? () => search("desktop") : undefined}
              className="btn btn-ghost btn-circle absolute right-1 top-1/2 -translate-y-1/2"
              aria-label="Search"
              style={{ color: PALETTE.navy }}
            >
              {loading ? <span className="loading loading-spinner" /> : <SearchIcon />}
            </button>
          </div>

          {/* Desktop/Tablet popover — square card */}
          {open && (
            <div className="absolute right-0 mt-2">
              <div
                className="rounded-2xl shadow-2xl w-[min(90vw,36rem)] h-[min(75svh,36rem)]"
                style={{
                  background: "rgba(244,241,234,0.95)",
                  border: "1px solid rgba(14,39,55,0.15)",
                  color: PALETTE.navy,
                  backdropFilter: "blur(8px)",
                }}
              >
                <div className="p-4 sm:p-5 h-full flex flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold truncate">Sommelier on “{q}”</div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={clearAndClose}
                      style={{ color: PALETTE.navy }}
                    >
                      Close
                    </button>
                  </div>

                  <div className="divider my-3" />

                  {/* Scrollable content area */}
                  <div className="flex-1 overflow-auto pr-1">
                    {error ? (
                      <div
                        className="alert rounded-xl"
                        style={{
                          background: "rgba(123,21,50,0.08)",
                          color: PALETTE.burgundy,
                          border: "1px solid rgba(123,21,50,0.25)",
                        }}
                      >
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

        {/* Login */}
        {!isAuthenticated && (
          <button
            onClick={handleSignIn}
            className="btn rounded-md px-3 sm:px-4 py-2 text-sm font-semibold"
            aria-label="Login"
            title="Login"
            style={{
              background: "linear-gradient(135deg, #0E2737 0%, #0A1E2B 100%)",
              color: PALETTE.cream,
              border: "1px solid rgba(244,178,58,0.35)",
              boxShadow:
                "0 8px 22px rgba(14,39,55,.28), inset 0 0 0 1px rgba(255,255,255,.06)",
            }}
          >
            Login
          </button>
        )}

        {/* Avatar / Menu */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar"
            aria-label="Account menu"
          >
            <div
              className="w-9 sm:w-10 rounded-full overflow-hidden ring-2"
              style={{ ringColor: PALETTE.amber }}
            >
              <img alt="User avatar" src={avatarUrl} />
            </div>
          </div>
          <ul
            tabIndex={-1}
            className="menu menu-sm dropdown-content rounded-box z-50 mt-3 w-56 p-2 shadow"
            style={{
              background: "rgba(244,241,234,0.98)",
              border: "1px solid rgba(14,39,55,0.15)",
              color: PALETTE.navy,
              backdropFilter: "blur(8px)",
            }}
          >
            {isAuthenticated ? (
              <>
                <li className="px-2 py-2">
                  <div className="text-[10px] uppercase opacity-60">Signed in as</div>
                  <div className="font-medium truncate">{displayName}</div>
                </li>
                <li>
                  <a href="/profile" className="justify-between">
                    Profile
                  </a>
                </li>
                <li>
                  <button onClick={handleSignOut} disabled={loggingOut}>
                    {loggingOut ? "Signing out…" : "Sign Out"}
                  </button>
                </li>
              </>
            ) : (
              <li>
                <button onClick={handleSignIn}>Login</button>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* MOBILE SQUARE CHAT CARD (centered) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden pt-[env(safe-area-inset-top)]"
          style={{ background: "rgba(10,30,43,0.25)", backdropFilter: "blur(6px)" }}
        >
          {/* Centered square card */}
          <div
            className="mx-auto mt-[max(72px,10svh)] w-[min(92vw,28rem)] h-[min(80svh,28rem)] aspect-square rounded-2xl shadow-2xl"
            style={{
              background: "rgba(244,241,234,0.96)",
              border: "1px solid rgba(14,39,55,0.15)",
              color: PALETTE.navy,
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="p-3 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px]"
                  style={{
                    background: "rgba(242,178,58,0.18)",
                    border: "1px solid rgba(14,39,55,0.15)",
                  }}
                >
                  <span aria-hidden>🍷</span>
                  <span className="font-medium">Perfect Pairs Sommelier</span>
                </div>
                <button
                  className="btn btn-ghost btn-sm ml-auto"
                  onClick={clearAndCloseMobile}
                  aria-label="Close search"
                  style={{ color: PALETTE.navy }}
                >
                  Close
                </button>
              </div>

              <div className="relative mb-2">
                <input
                  ref={mobileInputRef}
                  type="search"
                  defaultValue={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      search("mobile");
                    }
                  }}
                  placeholder="Search a wine (e.g., Barolo)"
                  aria-label="Search wines"
                  className="input w-full pr-12 bg-white"
                  style={{
                    color: PALETTE.navy,
                    border: "1px solid rgba(14,39,55,0.25)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)",
                  }}
                  inputMode="search"
                />
                <button
                  onClick={() => search("mobile")}
                  className="btn btn-ghost btn-circle absolute right-1 top-1/2 -translate-y-1/2"
                  aria-label="Search"
                  style={{ color: PALETTE.navy }}
                >
                  {loading ? <span className="loading loading-spinner" /> : <SearchIcon />}
                </button>
              </div>

              <div className="divider my-2" />

              {/* Scrollable area fills remaining space */}
              <div className="flex-1 overflow-auto pr-1" role="region" aria-live="polite">
                {error ? (
                  <div
                    className="alert rounded-xl"
                    style={{
                      background: "rgba(123,21,50,0.08)",
                      color: PALETTE.burgundy,
                      border: "1px solid rgba(123,21,50,0.25)",
                    }}
                  >
                    <span>{error}</span>
                  </div>
                ) : loading ? (
                  <ModernSkeleton />
                ) : (
                  !!answer && <AnswerBlocks text={answer} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- Icons & Helpers -------- */
function SearchIcon() {
  return (
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
  );
}

function toModernPlain(s) {
  if (!s) return "";
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
            className="rounded-2xl p-3"
            style={{
              background: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(14,39,55,0.15)",
            }}
          >
            {hasBullets ? (
              <ul className="menu menu-compact bg-transparent p-0">
                {lines.map((l, idx) =>
                  l.trim().startsWith("• ") ? (
                    <li key={idx} className="text-sm leading-relaxed">
                      <a className="pointer-events-none">{l.replace(/^•\s*/, "")}</a>
                    </li>
                  ) : l.trim() ? (
                    <li key={idx} className="text-sm opacity-80 pointer-events-none">
                      <a className="pointer-events-none">{l}</a>
                    </li>
                  ) : null
                )}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{block}</p>
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
      <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
      <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
      <div className="divider my-2" />
      <div className="h-4 w-4/5 bg-gray-100 rounded animate-pulse" />
      <div className="h-4 w-3/5 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}
