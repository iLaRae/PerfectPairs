// Home.jsx
"use client";

import React, { useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { useRouter } from "next/navigation";

const LOGO = "/Pairings.png"; // place the attached image in /public as this filename

export default function Home() {
  const auth = useAuth();
  const router = useRouter();
  const isAuthenticated = !!auth?.isAuthenticated;

  const handleStartExploring = useCallback(() => {
    // If already signed in, go straight to profile
    if (isAuthenticated) {
      router.push("/profile");
      return;
    }
    // Otherwise, store desired redirect and start OIDC login
    try {
      sessionStorage.setItem("ecs_post_login_redirect", "/profile");
    } catch {}
    auth?.signinRedirect?.().catch(console.error);
  }, [auth, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* soft bokeh-style background (kept very light over white) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/50 blur-3xl" />
        <div className="absolute top-10 right-0 h-72 w-72 rounded-full bg-[#eaf1f6]/60 blur-3xl" />
        <div className="absolute -bottom-16 left-16 h-64 w-64 rounded-full bg-[#f3f7fb]/70 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <section className="mx-auto rounded-3xl bg-white/80 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
          {/* NAV (brand only with logo image) */}
          <nav className="flex items-center justify-start px-6 py-5 sm:px-10">
            <div className="flex items-center gap-3">
              <img
                src={LOGO}
                alt="Pairings logo"
                className="h-10 w-auto rounded-xl shadow-sm"
                draggable="false"
              />
              <span className="font-semibold tracking-wide text-[#0F2A3D]">
                FLAVOR &amp; PAIR
              </span>
            </div>
          </nav>

          {/* Title + centered logo emblem (LARGER) */}
          <header className="px-6 text-center sm:px-10">
            <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl bg-white/70 px-6 py-5 sm:px-8 sm:py-6 shadow-md ring-1 ring-black/5">
              <img
                src={LOGO}
                alt="Pairings mark"
                className="h-32 w-auto sm:h-48 md:h-64 lg:h-72"
                draggable="false"
              />
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide text-[#0F2A3D] sm:text-4xl">
              UNLOCK PERFECT PAIRINGS
            </h1>
            <p className="mt-2 text-sm text-[#5b6a77]">
              Your Guide to Culinary Harmony
            </p>
          </header>

          {/* Features (image tiles) */}
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8 px-6 py-10 sm:grid-cols-3 sm:px-10">
            <FeatureCard
              title="RED WINE"
              subtitle="Flavor & Fullness"
              circleClass="bg-[#0F2A3D]"
              imageSrc="/Wine-Pair.png"
              imageAlt="Red wine in a glass"
            />
            <FeatureCard
              title="BEER & SPIRITS"
              subtitle="Balance & Notes"
              circleClass="bg-[#0F2A3D]/10 ring-2 ring-[#0F2A3D]/20"
              imageSrc="/Beer-Spirits.png"
              imageAlt="Beer and spirits bottles"
            />
            <FeatureCard
              title="FOODS"
              subtitle="Plates & Pairings"
              circleClass="bg-[#F3EDE4]"
              imageSrc="/Food-Pairings.png"
              imageAlt="Gourmet food plate"
            />
          </div>

          {/* Blurb + CTA */}
          <div className="px-6 pb-10 text-center sm:px-10">
            <p className="mx-auto max-w-2xl text-sm leading-6 text-[#596a78]">
              Explore a curated collection of wine, beer, and spirit profiles.
              Discover expert food pairings, create your own flavor journeys,
              and share with a community of enthusiasts.
            </p>
            <button
              onClick={handleStartExploring}
              className="mx-auto mt-6 inline-flex items-center justify-center rounded-full bg-[#0F2A3D] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c2332] focus:outline-none focus:ring-2 focus:ring-[#0F2A3D]/30 active:scale-[0.99]"
              type="button"
              aria-label={isAuthenticated ? "Go to profile" : "Login to start exploring"}
              title={isAuthenticated ? "Go to your profile" : "Login to start exploring"}
            >
              START EXPLORING
            </button>
          </div>

          <footer className="rounded-b-3xl px-6 pb-8 text-center text-xs text-[#6b7b88] sm:px-10">
            © 2025 FLAVOR &amp; FARE
          </footer>
        </section>
      </main>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function FeatureCard({ title, subtitle, circleClass, imageSrc, imageAlt }) {
  return (
    <div className="group relative flex flex-col items-center text-center">
      <div
        className={`grid h-36 w-36 place-items-center rounded-full overflow-hidden ${circleClass}`}
      >
        <img
          src={imageSrc}
          alt={imageAlt || title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          draggable="false"
        />
      </div>
      <h3 className="mt-5 text-sm font-extrabold tracking-wide text-[#0F2A3D]">
        {title}
      </h3>
      <p className="text-[11px] text-[#7a8a98]">{subtitle}</p>
    </div>
  );
}
