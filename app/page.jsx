"use client";

import PizzaBeerPair from "./components/pairing/PizzaBeerPair";
import RestaurantSpecials from "./components/RestaurantSpecials";



export default function Page() {
  return (
    <>
      <main className="min-h-[100svh] ">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <div className="mb-6"></div>
          <RestaurantSpecials/>
         
     <PizzaBeerPair/>

     
        </div>
      </main>
    </>
  );
}
