// app/profile/page.jsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "react-oidc-context";
import { useRouter } from "next/navigation";
import WinePairingForm from "../components/WinePairingForm";
import LocalWineComponent from "../components/LocalWineComponent";

// ── Main Profile Page ───────────────────────────────────────────────

export default function ProfilePage() {
  const auth = useAuth();
  const router = useRouter();

  // Active view for the main area
  const [activeView, setActiveView] = useState("ecomEditor");

  // Mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sign-out in-flight state
  const [loggingOut, setLoggingOut] = useState(false);

  // Protected route: redirect unauthenticated users to sign-in
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      try {
        sessionStorage.setItem("ecs_post_login_redirect", "/profile");
      } catch {}
      auth.signinRedirect();
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.signinRedirect]);

  // Full deep sign-out (same behavior as before, just kept here)
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
      router.push("/"); // optimistic client route
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      window.location.replace(cognitoLogoutUrl); // server-side logout
    }
  }, [auth, loggingOut, router]);

  // Loading while we determine auth state
  if (auth.isLoading) return <LoadingSpinner />;

  // Redirect in progress
  if (!auth.isAuthenticated) {
    return <LoadingSpinner text="Redirecting to sign-in..." />;
  }

  // Authenticated UI (no Navbar)
  return (
    <div
      className={[
        "flex flex-col",
        // Use small viewport height units (svh) to avoid the iOS Safari address bar jump
        "min-h-[100svh]",
        // Respect safe areas on mobile
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        "bg-gray-50",
      ].join(" ")}
    >
      {/* NOTE: Navbar removed as requested */}

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

        {/* Main Content Area */}
        <main
          className={[
            "flex-1 min-w-0",
            // Make the main area scroll independently so the sidebar stays fixed on large screens
            "overflow-y-auto",
            "p-4 sm:p-6 lg:p-8",
          ].join(" ")}
        >
          {/* Mobile hamburger menu to open sidebar */}
          <div className="sm:hidden mb-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
          </div>

          {/* Render the active view */}
          {activeView === "ecomEditor" && <EcomEditorView />}
          {activeView === "dashboard" && <DashboardView />}
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
    // { id: "account", label: "Account Settings", icon: <UserIcon /> },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/35 backdrop-blur-[1px] z-40 sm:hidden ${
          isSidebarOpen ? "block" : "hidden"
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Sidebar rail */}
      <aside
        className={[
          "fixed sm:sticky top-0 left-0 z-50 h-[100svh] sm:h-[calc(100svh)]",
          "bg-white shadow-lg border-r border-gray-200",
          "flex flex-col",
          // Width: a bit narrower on very small screens
          "w-[15.5rem] sm:w-64",
          // Slide in/out on mobile
          "transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0",
          // Safe-areas
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        ].join(" ")}
      >
        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="btn btn-ghost btn-sm btn-circle sm:hidden absolute top-3 right-3"
          aria-label="Close menu"
        >
          <CloseIcon />
        </button>

        {/* User header */}
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

        {/* Menu (scrollable if needed on small phones) */}
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

        {/* Footer: Sign Out */}
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
      {/* Keep inner content responsive and centered */}
      <WinePairingForm />
    </div>
  );
}

function DashboardView() {
  return (
    <div className="prose max-w-3xl mx-auto">
      <LocalWineComponent/>
    
    </div>
  );
}

function AccountView({ user }) {
  return (
    <div className="prose max-w-3xl mx-auto">
      <h2>Account Settings</h2>
      <p>This is where the user could manage their profile settings.</p>
      <div className="mockup-code mt-4 text-xs sm:text-sm">
        <pre data-prefix="$">
          <code>User Profile Data:</code>
        </pre>
        <pre className="whitespace-pre-wrap break-words">
          <code>{JSON.stringify(user?.profile, null, 2)}</code>
        </pre>
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
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const DashboardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const SignOutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
