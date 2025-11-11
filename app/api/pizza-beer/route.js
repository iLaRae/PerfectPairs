// app/api/pizza-beer/route.js
import { NextResponse } from "next/server";
import { z } from "zod";
import PIZZAS from "../../data/pizzas";
import { openai, TEXT_MODEL } from "../../lib/openai";

export const runtime = "edge";

/* ------------------------------ Input schema ------------------------------ */
// Helpers to be tolerant of nulls/strings for numeric inputs (abv/price/pops)
const ZNumLoose = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "string") {
    const trimmed = v.trim().replace(/[%$]/g, "");
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return typeof v === "number" ? v : null;
}, z.number().nullable());

const MenuItemSchema = z.object({
  draftNo: z.preprocess((v) => (v === null ? undefined : v), z.coerce.number()),
  brewery: z.string(),
  name: z.string(),
  style: z.string(),
  abv: ZNumLoose,                 // allow number | null | string like "6.9"
  pour: z.string().nullable().optional(),
  pops: ZNumLoose.optional(),     // allow number | null
  price: ZNumLoose.optional(),    // allow number | null | string like "$9"
});

const BodySchema = z.object({
  pizzaName: z.string().min(1),
  description: z.string().optional().nullable(),
  base: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),

  selectedBeer: z
    .object({
      key: z.string().min(1),
      label: z.string().min(1),
    })
    .optional()
    .nullable(),

  selectedMenuBeer: MenuItemSchema.optional().nullable(),

  beersMenu: z.array(MenuItemSchema).optional().nullable(),
});

/* ------------------------------ Utilities --------------------------------- */
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’'"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function catalogMatch(name, catalog) {
  const n = norm(name);
  if (!n) return null;
  const exact = catalog.find((p) => norm(p.name) === n);
  if (exact) return { match: exact, score: 1.0 };
  const partial = catalog.find((p) => norm(p.name).includes(n) || n.includes(norm(p.name)));
  if (partial) return { match: partial, score: 0.7 };
  const tok = n.split(" ")[0];
  const tokenHit = catalog.find((p) => norm(p.name).includes(tok));
  if (tokenHit) return { match: tokenHit, score: 0.5 };
  return null;
}

const STYLE_LABELS = {
  "hazy-ipa": "Hazy IPA",
  ipa: "IPA",
  lager: "Lager",
  witbier: "Witbier",
  "berliner-weisse": "Berliner Weisse",
  "amber-ale": "Amber Ale",
  "brown-ale": "Brown Ale",
  porter: "Porter",
  "vienna-lager": "Vienna Lager",
  pilsner: "Pilsner",
  kolsch: "Kölsch",
  hefeweizen: "Hefeweizen",
  saison: "Saison",
  "pale-ale": "Pale Ale",
  helles: "Helles",
  "belgian-strong-golden": "Belgian Strong Golden",
};

function getBeerPairingsByText(text) {
  const t = (text || "").toLowerCase();
  const has = (w) => t.includes(w);

  if (has("jalape") || has("buffalo") || has("spicy") || has("frank"))
    return ["hazy-ipa", "ipa", "lager", "witbier", "berliner-weisse"];

  if (has("barbecue") || has("bbq"))
    return ["amber-ale", "brown-ale", "porter", "vienna-lager"];

  if (has("white pizza") || has("ricotta") || has("crème") || has("creme") || has("sour cream"))
    return ["pilsner", "kolsch", "hefeweizen", "witbier", "saison"];

  if (has("margherita") || has("roma") || has("basil") || has("grandmas pie") || has("grandma"))
    return ["pilsner", "helles", "kolsch", "saison"];

  if (has("hawaii") || has("pineapple"))
    return ["hazy-ipa", "ipa", "witbier", "belgian-strong-golden"];

  if (has("meat") || has("pepperoni") || has("sausage") || has("meatball") || has("the works") || has("bronx bomber"))
    return ["ipa", "pale-ale", "amber-ale", "brown-ale", "porter"];

  if (has("veggie") || has("spinach") || has("broccoli") || has("mushroom"))
    return ["pilsner", "kolsch", "saison", "witbier"];

  if (has("marinara")) return ["pilsner", "pale-ale", "ipa", "amber-ale"];
  if (has("no base")) return ["pilsner", "kolsch", "hefeweizen", "saison"];
  return ["pilsner", "kolsch", "ipa"];
}

function pairingsForPizza(pizzaLike) {
  const text = `${pizzaLike?.name || ""} ${pizzaLike?.description || ""} ${pizzaLike?.base || ""} ${(pizzaLike?.tags || []).join(" ")}`;
  const keys = getBeerPairingsByText(text);
  const labels = keys.map((k) => STYLE_LABELS[k] || k);
  const bestKeys = keys.slice(0, 3);
  const bestLabels = bestKeys.map((k) => STYLE_LABELS[k] || k);
  return { keys, labels, bestKeys, bestLabels };
}

function sanitizeJSONBlock(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/```(?:json)?|```/g, "").trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

/* --------------------------- Sommelier (LLM) ------------------------------ */
const SOMM_SYSTEM = `
You are a certified Cicerone-level beer sommelier. Given a specific pizza (name, base/sauce, toppings, flavor words)
and a concrete draft list, pick and RANK the best beers for that pizza based on pairings principles:
- Match intensity (not overpowering)
- Use carbonation to cut fat/cheese
- Use hop bitterness vs. heat/sweetness thoughtfully
- Use malt toastiness to complement char/caramelization
Return only JSON.
`.trim();

const SOMM_USER_PREFIX = `
Return ONLY JSON with this shape (no prose):

{
  "bestDraftNo": number,
  "ranking": [
    { "draftNo": number, "score": number, "reason": string }
  ],
  "styleSummary": {
    "bestKeys": [string, string, string],
    "bestLabels": [string, string, string]
  }
}
`.trim();

export async function POST(req) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || "Invalid body." },
        { status: 400 }
      );
    }

    const {
      pizzaName,
      description = null,
      base = null,
      tags = null,
      selectedBeer,
      selectedMenuBeer,
      beersMenu,
    } = parsed.data;

    // Resolve pizza details from catalog if possible
    const match = catalogMatch(pizzaName, PIZZAS);
    const pizza = match?.match
      ? {
          name: match.match.name,
          base: match.match.base ?? base,
          description: match.match.description ?? description,
          tags: match.match.tags ?? tags ?? [],
        }
      : { name: pizzaName, base, description, tags: tags ?? [] };

    // If a specific beer was chosen by user, confirm pairing and add reasons.
    if (selectedBeer) {
      const explanations = [];
      const lower = `${pizza.name} ${pizza.description || ""} ${pizza.base || ""}`.toLowerCase();
      if (lower.includes("spicy") || lower.includes("jalape") || lower.includes("buffalo"))
        explanations.push("Heat needs bubbles and hop bite; bitterness and carbonation scrub spice and fat.");
      if (lower.includes("bbq") || lower.includes("barbecue"))
        explanations.push("Caramelized, smoky sauce plays well with toasty, caramel malt.");
      if (/(ricotta|white pizza|sour cream|cr[èe]me)/i.test(lower))
        explanations.push("Creamy dairy benefits from crisp, high-carb pils/kölsch/wheat to cleanse the palate.");
      if (!explanations.length)
        explanations.push("Balanced interplay of malt, hops, and carbonation complements the pizza’s flavor and richness.");

      return NextResponse.json({
        status: "paired",
        pizza,
        beer: selectedBeer,
        beerMenu: selectedMenuBeer ?? null,
        recommendedStyles: pairingsForPizza(pizza),
        explanations,
      }, { status: 200 });
    }

    // If no beer selected but we have a concrete draft list → ask sommelier (LLM)
    if (beersMenu && Array.isArray(beersMenu) && beersMenu.length) {
      const prompt = {
        role: "user",
        content: [
          { type: "text", text: SOMM_USER_PREFIX },
          {
            type: "text",
            text:
`Pizza:
- name: ${pizza.name}
- base: ${pizza.base || "n/a"}
- description: ${pizza.description || "n/a"}
- tags: ${(pizza.tags || []).join(", ") || "n/a"}

Draft List (JSON):
${JSON.stringify(beersMenu, null, 2)}
`
          }
        ]
      };

      let aiJSON = null;
      try {
        const completion = await openai.chat.completions.create({
          model: TEXT_MODEL,
          temperature: 0.2,
          max_tokens: 700,
          messages: [
            { role: "system", content: SOMM_SYSTEM },
            prompt,
          ],
        });
        const raw = completion?.choices?.[0]?.message?.content || "";
        aiJSON = sanitizeJSONBlock(raw);
      } catch (e) {
        // fall through to heuristic
      }

      // Validate and map AI choice to actual menu items
      let bestMenu = null;
      let ranking = [];
      if (aiJSON && typeof aiJSON === "object" && Array.isArray(aiJSON.ranking)) {
        ranking = aiJSON.ranking
          .map((r) => ({
            draftNo: Number(r?.draftNo),
            score: typeof r?.score === "number" ? r.score : 0,
            reason: typeof r?.reason === "string" ? r.reason : "",
          }))
          .filter((r) => Number.isFinite(r.draftNo))
          .map((r) => ({
            ...r,
            beerMenu: beersMenu.find((m) => Number(m.draftNo) === r.draftNo) || null,
          }))
          .filter((r) => r.beerMenu);

        const bestNo = Number(aiJSON.bestDraftNo ?? ranking[0]?.draftNo);
        bestMenu = beersMenu.find((m) => Number(m.draftNo) === bestNo) || ranking[0]?.beerMenu || null;
      }

      // Fallback heuristic if AI empty
      if (!bestMenu) {
        const styles = pairingsForPizza(pizza);
        const weightForIndex = (i) => (i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0);
        const toKey = (s) => {
          const k = (s || "").toLowerCase();
          if (k.includes("west coast ipa")) return "west-coast-ipa";
          if (k.includes("hazy ipa")) return "hazy-ipa";
          if (k.includes("double ipa") || k === "dipa") return "double-ipa";
          if (k.includes("pale ale")) return "pale-ale";
          if (k.includes("pilsner")) return "pilsner";
          if (k.includes("kolsch") || k.includes("kölsch")) return "kolsch";
          if (k.includes("hefe")) return "hefeweizen";
          if (k.includes("amber") || k.includes("red ale")) return "amber-ale";
          if (k.includes("porter")) return "porter";
          if (k.includes("brown ale")) return "brown-ale";
          if (k.includes("vienna")) return "vienna-lager";
          if (k.includes("saison")) return "saison";
          if (k.includes("wit")) return "witbier";
          if (k.includes("sour")) return "kettle-sour";
          if (k.includes("cider")) return "belgian-strong-golden";
          return "ipa";
        };
        const scored = beersMenu
          .map((m) => {
            const key = toKey(m.style);
            const idx = styles.bestKeys.indexOf(key);
            const baseScore = idx >= 0 ? weightForIndex(idx) : 0;
            const pops = typeof m.pops === "number" ? m.pops : 0;
            return { beerMenu: m, score: baseScore + pops * 0.05, idx };
          })
          .filter((s) => s.score > 0)
          .sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
        bestMenu = scored[0]?.beerMenu || beersMenu[0];
        ranking = scored.slice(0, 5).map((s) => ({
          draftNo: Number(s.beerMenu.draftNo),
          score: +s.score.toFixed(2),
          reason: "Heuristic style match",
          beerMenu: s.beerMenu,
        }));
      }

      // Helper: map bestMenu.style to pairing key
      const bestStyleKeyFromMenu = (() => {
        const s = (bestMenu?.style || "").toLowerCase();
        if (s.includes("west coast ipa")) return "west-coast-ipa";
        if (s.includes("hazy ipa")) return "hazy-ipa";
        if (s.includes("double ipa") || s === "dipa") return "double-ipa";
        if (s.includes("pale ale")) return "pale-ale";
        if (s.includes("pilsner")) return "pilsner";
        if (s.includes("kolsch") || s.includes("kölsch")) return "kolsch";
        if (s.includes("hefe")) return "hefeweizen";
        if (s.includes("amber") || s.includes("red ale")) return "amber-ale";
        if (s.includes("porter")) return "porter";
        if (s.includes("brown ale")) return "brown-ale";
        if (s.includes("vienna")) return "vienna-lager";
        if (s.includes("saison")) return "saison";
        if (s.includes("wit")) return "witbier";
        if (s.includes("sour")) return "kettle-sour";
        if (s.includes("cider")) return "belgian-strong-golden";
        return "ipa";
      })();

      const explanations = [
        "Matched intensity and flavor: carbonation, bitterness, and malt character complement the pizza’s base and toppings.",
        "Selected from the current draft list using pizza ingredients and pairing principles.",
      ];

      return NextResponse.json({
        status: "paired-by-sommelier",
        pizza,
        beer: { key: bestStyleKeyFromMenu, label: bestMenu?.style || "Beer" },
        beerMenu: {
          draftNo: Number(bestMenu?.draftNo),
          brewery: bestMenu?.brewery || "",
          name: bestMenu?.name || "",
          style: bestMenu?.style || "",
          abv: bestMenu?.abv ?? null,
          pour: bestMenu?.pour ?? null,
          pops: bestMenu?.pops ?? null,
          price: bestMenu?.price ?? null,
        },
        recommendedStyles: pairingsForPizza(pizza),
        ranking: ranking.map((r) => ({
          draftNo: Number(r.draftNo),
          score: r.score,
          reason: r.reason,
          beerMenu: {
            draftNo: Number(r.beerMenu.draftNo),
            brewery: r.beerMenu.brewery,
            name: r.beerMenu.name,
            style: r.beerMenu.style,
            abv: r.beerMenu.abv ?? null,
            pour: r.beerMenu.pour ?? null,
            pops: r.beerMenu.pops ?? null,
            price: r.beerMenu.price ?? null,
          },
        })),
        explanations,
      }, { status: 200 });
    }

    // Fallback: style suggestions only
    return NextResponse.json({
      status: "suggestions",
      pizza,
      recommendedStyles: pairingsForPizza(pizza),
    }, { status: 200 });

  } catch (e) {
    return NextResponse.json({ error: e.message || "Unknown error." }, { status: 400 });
  }
}
