// app/page.jsx
import WinePairingForm from "./components/WinePairingForm";

export default function Page() {
  return (
    <main className="min-h-[100svh] bg-base-200">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <div className="mb-6">
         
        </div>
        <h1 className="text-4xl font-bold mb-2">WinePairing Sommelier</h1>
        <p className="opacity-80 mb-8">Personalized pairings that respect your taste.</p>
        <WinePairingForm />
      </div>
    </main>
  );
}
