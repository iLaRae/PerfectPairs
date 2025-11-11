// app/components/pizza/PizzaSelectGrid.jsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import PIZZAS from "../../data/pizzas";

export default function PizzaSelectGrid({
  pizzas = PIZZAS,
  onSelect,            // (pizzaObj) => void
  selectedName = "",
  cols = { base: 2, sm: 3, md: 4 },
}) {
  const [hover, setHover] = useState(null);

  const gridCols = useMemo(() => {
    const b = cols?.base ?? 2;
    const s = cols?.sm ?? 3;
    const m = cols?.md ?? 4;
    return `grid grid-cols-${b} sm:grid-cols-${s} md:grid-cols-${m} gap-4 sm:gap-5`;
  }, [cols]);

  return (
    <div className={gridCols}>
      {pizzas.map((p) => {
        const isSelected = selectedName && p.name === selectedName;
        return (
          <button
            key={p.name}
            type="button"
            onClick={() => onSelect?.(p)}
            onMouseEnter={() => setHover(p.name)}
            onMouseLeave={() => setHover(null)}
            className={[
              "group relative rounded-2xl overflow-hidden text-left",
              "border transition-transform focus:outline-none",
              isSelected
                ? "border-emerald-600 ring-2 ring-emerald-500/60"
                : "border-gray-200 hover:scale-[1.01]",
              "bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]",
            ].join(" ")}
          >
            {/* Image */}
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={p.image}
                alt={p.alt || p.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
                priority={false}
              />
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-gray-900 leading-tight">
                  {p.name}
                </h3>
                {p.limited && (
                  <span className="rounded-full bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5">
                    Limited
                  </span>
                )}
              </div>
              {p.subtitle && (
                <p className="text-[12px] text-amber-700 mt-0.5">{p.subtitle}</p>
              )}
              <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                {p.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.tags?.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] rounded-full bg-gray-100 text-gray-700 px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Focus/hover ring overlay */}
            <div
              className={[
                "pointer-events-none absolute inset-0 rounded-2xl",
                (hover === p.name || isSelected) ? "ring-1 ring-emerald-500/50" : "ring-0",
              ].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}
