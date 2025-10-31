// components/PairingsShowcase.jsx
"use client";
import Image from "next/image"; // If not using Next.js, replace with <img>

export default function PairingsShowcase() {
  // Brand palette sampled from your image
  const colors = {
    navy: "#122533",
    navyAlt: "#0E1C27",
    burgundy: "#8B1E3F",
    amber: "#C67720",
    gold: "#F2B233",
    foam: "#F6EED8",
    leaf: "#6CA47A",
    sky: "#BFD3E3",
  };

  const featureCards = [
    {
      title: "Wine Flight",
      copy:
        "Build a flight by style—bold reds, crisp whites, and sparkling. Add tasting notes, aromas, and pairing ideas.",
      accent: colors.burgundy,
      bg: `linear-gradient(180deg, ${colors.foam} 0%, ${colors.sky} 100%)`,
      chip: "Bordeaux • Pinot • Champagne",
      icon: (
        <svg viewBox="0 0 64 64" className="w-9 h-9">
          <path
            d="M20 6h24c0 10-7 14-12 16v18c0 5-4 10-10 10h0"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M22 50h20" stroke="currentColor" strokeWidth="3" />
        </svg>
      ),
    },
    {
      title: "Spirits Tasting",
      copy:
        "Compare neat pours and craft cocktails. Track proof, barrel notes, and finish length.",
      accent: colors.amber,
      bg: `linear-gradient(180deg, ${colors.foam} 0%, #F9F3E7 100%)`,
      chip: "Bourbon • Rye • Single Malt",
      icon: (
        <svg viewBox="0 0 64 64" className="w-9 h-9">
          <rect
            x="16"
            y="14"
            width="32"
            height="36"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M18 38h28"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: "Beer Board",
      copy:
        "Rank lagers to hazy IPAs. Capture bitterness (IBU), SRM color, and foam retention.",
      accent: colors.gold,
      bg: `linear-gradient(180deg, ${colors.foam} 0%, #FFF7E1 100%)`,
      chip: "Pils • Hazy • Stout",
      icon: (
        <svg viewBox="0 0 64 64" className="w-9 h-9">
          <path
            d="M20 14h22v34a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V14z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M42 20h6v16a6 6 0 0 1-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
      ),
    },
  ];

  return (
    <section
      className="min-h-screen w-full"
      style={{
        // Cozy bokeh-ish backdrop like your image
        background:
          `radial-gradient(80rem 50rem at 10% -10%, ${colors.sky}20 0%, transparent 60%),` +
          `radial-gradient(70rem 40rem at 120% 10%, ${colors.gold}15 0%, transparent 60%),` +
          `${colors.navyAlt}`,
      }}
    >
      {/* Header / Brand */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-8">
        <div className="flex items-center gap-4">
          {/* Swap to <img> if not using Next.js */}
          <div className="relative h-16 w-16 shrink-0">
            <Image
              src="/Pairings.png"
              alt="Pairings logo"
              fill
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
          <div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ color: colors.foam }}
            >
              PAIR<span style={{ color: colors.gold }}>I</span>NGS
            </h1>
            <p
              className="text-sm sm:text-base opacity-90"
              style={{ color: colors.sky }}
            >
              Wine • Spirits • Beer — curated tasting flights & smart pairings
            </p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className="rounded-3xl p-6 sm:p-10 shadow-lg"
          style={{
            background:
              `linear-gradient(180deg, ${colors.navy} 0%, ${colors.navyAlt} 100%)`,
            border: `1px solid ${colors.sky}33`,
          }}
        >
          <div className="grid md:grid-cols-[1.1fr,0.9fr] gap-8 items-center">
            <div>
              <h2
                className="text-2xl sm:text-3xl font-bold leading-tight mb-3"
                style={{ color: colors.foam }}
              >
                Build tasting flights in seconds
              </h2>
              <p className="text-base sm:text-lg" style={{ color: colors.sky }}>
                Snap a menu, choose styles, and get instant pairing suggestions.
                Keep notes that match your brand palette.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="px-5 py-2.5 rounded-xl font-semibold shadow hover:opacity-95 transition"
                  style={{
                    background: `linear-gradient(90deg, ${colors.burgundy}, ${colors.burgundy}CC)`,
                    color: colors.foam,
                  }}
                >
                  Create Wine Flight
                </button>
                <button
                  className="px-5 py-2.5 rounded-xl font-semibold shadow hover:opacity-95 transition"
                  style={{
                    background: `linear-gradient(90deg, ${colors.amber}, ${colors.amber}CC)`,
                    color: colors.foam,
                  }}
                >
                  Add Spirits
                </button>
                <button
                  className="px-5 py-2.5 rounded-xl font-semibold shadow hover:opacity-95 transition"
                  style={{
                    background: `linear-gradient(90deg, ${colors.gold}, ${colors.gold}CC)`,
                    color: colors.navy,
                  }}
                >
                  Build Beer Board
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <span
                  className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: `${colors.leaf}22`,
                    color: colors.foam,
                    border: `1px solid ${colors.leaf}55`,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  AI Pairing Suggestions enabled
                </span>
                <span
                  className="text-xs sm:text-sm"
                  style={{ color: colors.sky }}
                >
                  Save notes, ratings, and food matches.
                </span>
              </div>
            </div>

            {/* Feature Cards */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
              {featureCards.map((c) => (
                <li
                  key={c.title}
                  className="rounded-2xl p-4 sm:p-5 border shadow-md hover:shadow-lg transition"
                  style={{
                    background: c.bg,
                    borderColor: `${colors.sky}66`,
                    color: colors.navy,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                    style={{ color: c.accent, backgroundColor: "#FFFFFF" }}
                  >
                    {c.icon}
                  </div>
                  <h3 className="font-semibold text-lg">{c.title}</h3>
                  <p className="text-sm mt-1 opacity-80">{c.copy}</p>
                  <span
                    className="inline-block text-xs mt-3 px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${colors.navy}0D`,
                      border: `1px solid ${colors.navy}1A`,
                    }}
                  >
                    {c.chip}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <p className="text-sm" style={{ color: colors.foam }}>
            © {new Date().getFullYear()} Pairings — curated experiences with{" "}
            <span style={{ color: colors.gold }}>wine</span>,{" "}
            <span style={{ color: colors.amber }}>spirits</span>, and{" "}
            <span style={{ color: colors.gold }}>beer</span>.
          </p>
          <div className="flex gap-2">
            <a
              href="#"
              className="px-4 py-2 rounded-lg text-sm font-semibold shadow hover:opacity-95 transition"
              style={{
                background: colors.burgundy,
                color: colors.foam,
                border: `1px solid ${colors.burgundy}CC`,
              }}
            >
              Start a Flight
            </a>
            <a
              href="#"
              className="px-4 py-2 rounded-lg text-sm font-semibold shadow hover:opacity-95 transition"
              style={{
                background: colors.gold,
                color: colors.navy,
                border: `1px solid ${colors.gold}CC`,
              }}
            >
              Browse Pairings
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
