// app/profile/page.jsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "react-oidc-context";
import { useRouter } from "next/navigation";

// Existing components
import WinePairingForm from "../components/WinePairingForm";
import LocalWineComponent from "../components/LocalWineComponent";

// Beer + shared data/utils
import BeerTypeGrid from "../components/beer/BeerTypeGrid";
import { DINNER_ITEMS } from "../data/dinnerItems";
import { capWordsFromKey } from "../utils/wineUtils";

// ⬇️ Pizza
import PizzaTypeGrid from "../components/pizza/PizzaTypeGrid";

// ── Main Profile Page ───────────────────────────────────────────────

export default function ProfilePage() {
  const auth = useAuth();
  const router = useRouter();

  const [activeView, setActiveView] = useState("ecomEditor");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      try {
        sessionStorage.setItem("ecs_post_login_redirect", "/profile");
      } catch {}
      auth.signinRedirect();
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.signinRedirect]);

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
      try { await auth?.removeUser?.(); } catch {}
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
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

  if (auth.isLoading) return <LoadingSpinner />;
  if (!auth.isAuthenticated) return <LoadingSpinner text="Redirecting to sign-in..." />;

  return (
    <div className="flex flex-col min-h-[100svh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-gray-50">
      <div className="flex flex-1 min-h-0">
        <Sidebar
          user={auth.user}
          onSignOut={handleSignOut}
          loggingOut={loggingOut}
          isSidebarOpen={isSidebarOpen}
          activeView={activeView}
          setActiveView={setActiveView}
          onMobileClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="sm:hidden mb-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
          </div>

          {activeView === "ecomEditor" && <EcomEditorView />}
          {activeView === "dashboard" && <DashboardView />}
          {activeView === "beer" && <BeerPicksView />}
          {activeView === "pizza" && <PizzaPicksView />}
          {activeView === "account" && <AccountView user={auth.user} />}
        </main>
      </div>
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────

function Sidebar({
  user,
  onSignOut,
  loggingOut,
  isSidebarOpen,
  activeView,
  setActiveView,
  onMobileClose,
}) {
  const profile = user?.profile || {};
  const name =
    profile.name || profile.preferred_username || profile.email || "User";
  const avatar = profile.picture || null;
  const email = profile.email || "";

  const menuItems = [
    { id: "ecomEditor", label: "Perfect Pair", icon: <StoreIcon /> },
    { id: "dashboard", label: "Local Picks", icon: <DashboardIcon /> },
    { id: "beer", label: "Beer Picks", icon: <BeerIcon /> },
    { id: "pizza", label: "Pizza Picks", icon: <PizzaIcon /> },
    { id: "account", label: "Account", icon: <UserIcon /> },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/35 backdrop-blur-[1px] z-40 sm:hidden ${
          isSidebarOpen ? "block" : "hidden"
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      <aside
        className={[
          "fixed sm:sticky top-0 left-0 z-50 h-[100svh] sm:h-[calc(100svh)]",
          "bg-white shadow-lg border-r border-gray-200",
          "flex flex-col",
          "w-[15.5rem] sm:w-64",
          "transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        ].join(" ")}
      >
        <button
          onClick={onMobileClose}
          className="btn btn-ghost btn-sm btn-circle sm:hidden absolute top-3 right-3"
          aria-label="Close menu"
        >
          <CloseIcon />
        </button>

        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <div className="avatar">
            <div className="w-10 h-10 rounded-full ring-1 ring-primary-content overflow-hidden grid place-items-center bg-gray-100">
              {avatar ? (
                <Image
                  src={avatar}
                  alt="User avatar"
                  width={40}
                  height={40}
                  sizes="40px"
                />
              ) : (
                <span className="text-base font-semibold">
                  {(name[0] || "?").toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{name}</div>
            <div className="text-xs text-gray-500 truncate">{email}</div>
          </div>
        </div>

        <nav className="flex-1 p-3 sm:p-4 min-h-0 overflow-y-auto">
          <ul className="menu space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  className={[
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                    activeView === item.id
                      ? "bg-gray-100 text-gray-900"
                      : "hover:bg-gray-50 text-gray-700",
                  ].join(" ")}
                  onClick={() => {
                    setActiveView(item.id);
                    onMobileClose();
                  }}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-3 sm:p-4 border-t border-gray-200">
          <button
            onClick={onSignOut}
            disabled={loggingOut}
            className="btn btn-ghost w-full justify-start"
          >
            <SignOutIcon />
            <span className="ml-2">
              {loggingOut ? "Signing out..." : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Views ───────────────────────────────────────────────────────────

function EcomEditorView() {
  return (
    <div className="max-w-7xl mx-auto w-full">
      <WinePairingForm />
    </div>
  );
}

function DashboardView() {
  return (
    <div className="prose max-w-3xl mx-auto">
      <LocalWineComponent />
    </div>
  );
}

/** Beer Picks View */
function BeerPicksView() {
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [mealNotes, setMealNotes] = useState("");
  const [question, setQuestion] = useState("What beer pairs best?");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const [loadingExtract, setLoadingExtract] = useState(false);
  const [extractedBeers, setExtractedBeers] = useState([]);

  const toggleDish = (key) => {
    setSelectedDishes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  async function onExtractImage(imageDataUrl) {
    if (!imageDataUrl) return;
    setLoadingExtract(true);
    setError("");
    try {
      const res = await fetch("/api/beer-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Extract failed");
      setExtractedBeers(Array.isArray(data.beers) ? data.beers : []);
    } catch (e) {
      setError(e.message || "Failed to extract beer list.");
      setExtractedBeers([]);
    } finally {
      setLoadingExtract(false);
    }
  }

  const handleAsk = async () => {
    setLoading(true);
    setError("");
    setAnswer("");

    const prettyStyles = selectedStyles.map(capWordsFromKey);
    const prettyDishes = selectedDishes.map(capWordsFromKey);

    const combinedMeal =
      (prettyDishes.length ? `Dishes: ${prettyDishes.join(", ")}` : "") +
      (mealNotes.trim()
        ? (prettyDishes.length ? " — " : "") + mealNotes.trim()
        : "");

    try {
      const res = await fetch("/api/beer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          meal: combinedMeal || mealNotes || "(unspecified)",
          favorites: prettyStyles,
          beers: extractedBeers || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setAnswer(data?.answer || "");
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <h2 className="text-2xl font-semibold tracking-tight">Beer Picks</h2>
      <p className="text-sm text-gray-600 mt-1">
        Select styles you love and what you’re eating. Scan a beer list (optional). I’ll suggest great pairings.
      </p>

      <div className="mt-4">
        <BeerTypeGrid
          onChange={setSelectedStyles}
          showScanner
          onCapture={onExtractImage}
          isExtracting={loadingExtract}
          scannerTitle="Scan Beer List"
          scannerClassName="mt-4"
        />
      </div>

      {extractedBeers?.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Beer List Detected ({extractedBeers.length})</h3>
            {loadingExtract && <span className="loading loading-spinner loading-sm" />}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {extractedBeers.slice(0, 20).map((b, i) => (
              <li key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="font-medium">
                  {b.name || "Unknown"}{b.brewery ? ` — ${b.brewery}` : ""}
                </div>
                <div className="text-gray-600">
                  {[b.style, b.abv ? `${b.abv}%` : null, b.size, b.price]
                    .filter(Boolean)
                    .join(" • ")}
                </div>
              </li>
            ))}
          </ul>
          {extractedBeers.length > 20 && (
            <div className="text-xs text-gray-500 mt-2">Showing first 20 items…</div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold">What are you eating?</h3>
        <p className="text-xs text-gray-500 mt-1">
          Pick one or more dishes. Add notes (sauces, spice level, sides) to refine the pairing.
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {DINNER_ITEMS.map((d) => {
            const active = selectedDishes.includes(d.key);
            return (
              <button
                key={d.key}
                onClick={() => toggleDish(d.key)}
                className={[
                  "group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                  active
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-gray-200 hover:border-gray-300 text-gray-700",
                ].join(" ")}
                title={d.hint || d.label}
              >
                <span className="text-base leading-none">{d.emoji ?? "🍽️"}</span>
                <span className="truncate">{d.label}</span>
              </button>
            );
          })}
        </div>

        <label className="form-control w-full mt-4">
          <span className="label-text text-sm">Meal notes</span>
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="e.g., buffalo sauce, extra spicy, blue cheese dip; or ‘sweet BBQ glaze’"
            value={mealNotes}
            onChange={(e) => setMealNotes(e.target.value)}
            rows={3}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="form-control w-full">
          <span className="label-text text-sm">Question</span>
          <input
            type="text"
            className="input input-bordered w-full"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>

        <div className="mt-1">
          <button onClick={handleAsk} disabled={loading} className="btn btn-primary">
            {loading ? "Thinking…" : "Get Beer Pairing"}
          </button>
        </div>
      </div>

      <div className="mt-6">
        {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}
        {answer && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold mb-2">Suggested Pairings</h3>
            <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Pizza Picks View */
function PizzaPicksView() {
  const [selectedPizzas, setSelectedPizzas] = useState([]);
  const [notes, setNotes] = useState("");
  const [question, setQuestion] = useState("What drink pairs best with this pizza?");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const [loadingExtract, setLoadingExtract] = useState(false);
  const [extractedMenu, setExtractedMenu] = useState([]);

  async function onExtractPizzaImage(imageDataUrl) {
    if (!imageDataUrl) return;
    setLoadingExtract(true);
    setError("");
    try {
      const res = await fetch("/api/pizza-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Extract failed");
      setExtractedMenu(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(
        e?.message?.includes("404")
          ? "Pizza extract API not found. You can still select pizza styles manually."
          : e.message || "Failed to extract pizza menu."
      );
      setExtractedMenu([]);
    } finally {
      setLoadingExtract(false);
    }
  }

  const handleAsk = async () => {
    setLoading(true);
    setError("");
    setAnswer("");

    const prettyPizzas = selectedPizzas.map(capWordsFromKey);
    const mealCtx = [prettyPizzas.length ? `Pizzas: ${prettyPizzas.join(", ")}` : "", notes.trim()]
      .filter(Boolean)
      .join(" — ");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:
            question ||
            "Suggest the best wines and beers for the selected pizza styles. Consider sauce, cheese, fat/salt, herbs, and toppings.",
          meal: mealCtx || "(unspecified pizza)",
          favorites: [],
          wines: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setAnswer(data?.answer || "");
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <h2 className="text-2xl font-semibold tracking-tight">Pizza Picks</h2>
      <p className="text-sm text-gray-600 mt-1">
        Choose pizza styles (or scan a menu). I’ll recommend wines or beers that match the sauce, cheese, herbs, and toppings.
      </p>

      <div className="mt-4">
        <PizzaTypeGrid
          onChange={setSelectedPizzas}
          showScanner
          onCapture={onExtractPizzaImage}
          isExtracting={loadingExtract}
          scannerTitle="Scan Pizza Menu"
          scannerClassName="mt-4"
        />
      </div>

      {extractedMenu?.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Menu Items Detected ({extractedMenu.length})</h3>
            {loadingExtract && <span className="loading loading-spinner loading-sm" />}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {extractedMenu.slice(0, 20).map((it, i) => (
              <li key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="font-medium">{it.name || "Unnamed Pizza"}</div>
                <div className="text-gray-600">
                  {[it.toppings?.join(", "), it.size, it.price].filter(Boolean).join(" • ")}
                </div>
              </li>
            ))}
          </ul>
          {extractedMenu.length > 20 && (
            <div className="text-xs text-gray-500 mt-2">Showing first 20 items…</div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="form-control w-full">
          <span className="label-text text-sm">Notes (sauce, herbs, toppings, spice level)</span>
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="e.g., San Marzano tomato, fresh basil, buffalo mozzarella; or ‘white pie with garlic + ricotta’"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="form-control w-full">
          <span className="label-text text-sm">Question</span>
          <input
            type="text"
            className="input input-bordered w-full"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>

        <div className="mt-1">
          <button onClick={handleAsk} disabled={loading} className="btn btn-primary">
            {loading ? "Thinking…" : "Get Pairing Suggestions"}
          </button>
        </div>
      </div>

      <div className="mt-6">
        {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}
        {answer && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold mb-2">Suggested Pairings</h3>
            <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountView({ user }) {
  const email =
    user?.profile?.email ||
    user?.profile?.preferred_username ||
    "(no email on profile)";

  return (
    <div className="text-black max-w-3xl mx-auto w-full">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold mb-2">Email</h2>
        <p className="text-gray-800">{email}</p>
      </div>
    </div>
  );
}

// ── Utilities / Icons ───────────────────────────────────────────────

function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="flex items-center justify-center min-h-[100svh]">
      <div className="flex flex-col items-center gap-4">
        <span className="loading loading-spinner loading-lg" />
        <span className="text-gray-600">{text}</span>
      </div>
    </div>
  );
}

const StoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const BeerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 7h1a3 3 0 010 6h-1v5a2 2 0 01-2 2H7a2 2 0 01-2-2V9a4 4 0 014-4c.9 0 1.72.3 2.38.8A3.99 3.99 0 0116 5a4 4 0 012 2zm0 2v4h1a2 2 0 100-4h-1zM9 7a2 2 0 00-2 2v11h7V9a2 2 0 00-2-2H9z" />
  </svg>
);

const PizzaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C7.03 2 2.84 4.41 1 8.5l10.59 12.88c.22.27.6.27.82 0L23 8.5C21.16 4.41 16.97 2 12 2zm0 2c3.8 0 7.09 1.78 8.6 4.5l-3.15 3.83A3.5 3.5 0 0012 9a3.5 3.5 0 00-5.45 2.06L3.4 8.5C4.91 5.78 8.2 4 12 4zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const SignOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
