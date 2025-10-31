"use client";

import Home from "./components/Home";

export default function Page() {
  return (
    <>
      <main className="min-h-[100svh] ">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <div className="mb-6"></div>

          <Home />
        </div>
      </main>
    </>
  );
}
