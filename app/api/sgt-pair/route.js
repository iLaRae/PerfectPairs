// app/api/sgt-pair/route.js
import { NextResponse } from "next/server";
import { z } from "zod";
import PIZZAS from "../../data/pizzas";
import { openai, TEXT_MODEL } from "../../lib/openai";

export const runtime = "edge";

/* ----------------------------- Input schema ------------------------------ */
// Accept either an image (OCR path) OR a direct pizza payload.
const BodySchema = z
  .object({
    // OCR path
    imageDataUrl: z.string().url().startsWith("data:image/").optional(),
    imageUrl: z.string().url().optional(),

    // Direct path
    pizzaName: z.string().min(1).optional(),
    pizzas: z
      .array(
        z.object({
          name: z.string().min(1),
          base: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .optional(),
  })
  .refine((b) => {
    const hasImage = !!b.imageDataUrl || !!b.imageUrl;
    const hasDirect = !!b.pizzaName || (!!b.pizzas && b.pizzas.length > 0);
    return hasImage || hasDirect;
  }, { message: "Provide imageDataUrl/imageUrl (OCR) or pizzaName/pizzas (direct)." });

/* ----------------------------- Vision prompt ----------------------------- */
const SYSTEM = `
You are a meticulous OCR and parser for PIZZA menus.
Extract distinct pizza entries and normalize them.

Output ONLY JSON with this shape:
{
  "pizzas": [
    {
      "name": string,
      "base": string | null,
      "notes": string | null
    }
  ]
}

Rules:
- Combine multi-line entries sensibly.
- Prefer the most prominent name line as "name".
- Keep "base" short if visible ("Marinara", "No base", etc.).
- Put toppings/extra descriptors into "notes" as a short phrase.
- No commentary outside the JSON.
`.trim();

/* ------------------------- JSON sanitizer/parser ------------------------- */
function sanitizeAndParseJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```(?:json)?|```/g, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj === "object" && Array.isArray(obj.pizzas)) return obj;
  } catch {}
  return null;
}

/* ------------------------------ Text utils ------------------------------- */
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’'"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function catalogMatch(extractedName, catalog) {
  const n = norm(extractedName);
  if (!n) return null;

  const exact = catalog.find((p) => norm(p.name) === n);
  if (exact) return { match: exact, score: 1.0 };

  const partial = catalog.find(
    (p) => norm(p.name).includes(n) || n.includes(norm(p.name))
  );
  if (partial) return { match: partial, score: 0.7 };

  const tok = n.split(" ")[0];
  const tokenHit = catalog.find((p) => norm(p.name).includes(tok));
  if (tokenHit) return { match: tokenHit, score: 0.5 };

  return null;
}

/* ------------------------ Beer pairing (server) -------------------------- */
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
  const text = `${pizzaLike?.name || ""} ${pizzaLike?.description || ""} ${pizzaLike?.base || ""}`;
  const keys = getBeerPairingsByText(text);
  const labels = keys.map((k) => STYLE_LABELS[k] || k);
  const bestKeys = keys.slice(0, 3);
  const bestLabels = bestKeys.map((k) => STYLE_LABELS[k] || k);
  return { keys, labels, bestKeys, bestLabels };
}

/* ----------------------------- Helpers (IO) ------------------------------ */
function shapeItemFromPizza(xp) {
  const matchRes = catalogMatch(xp.name, PIZZAS);
  const matched = matchRes?.match || null;
  const score = matchRes?.score ?? 0;

  const pairing = matched
    ? pairingsForPizza(matched)
    : pairingsForPizza({
        name: xp.name,
        description: xp.notes,
        base: xp.base,
      });

  return {
    rawName: xp.name,
    base: xp.base ?? null,
    notes: xp.notes ?? null,
    matched: matched
      ? {
          name: matched.name,
          base: matched.base || null,
          tags: matched.tags || [],
          group: matched.group || null,
          description: matched.description || null,
        }
      : null,
    matchScore: score,
    pairings: pairing, // { keys, labels, bestKeys, bestLabels }
  };
}

function uniqueStylesFromItems(items) {
  const uniqueKeys = Array.from(
    new Set(items.flatMap((r) => r.pairings?.keys || []))
  );
  const uniqueLabels = uniqueKeys.map((k) => STYLE_LABELS[k] || k);
  return { keys: uniqueKeys, labels: uniqueLabels };
}

/* --------------------------------- POST ---------------------------------- */
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

    const { imageDataUrl, imageUrl, pizzaName, pizzas } = parsed.data;

    /* ----------- DIRECT PATH (no OCR: pizzaName or pizzas provided) ----------- */
    if ((!imageDataUrl && !imageUrl) && (pizzaName || (pizzas && pizzas.length))) {
      const directList = pizzas && pizzas.length
        ? pizzas
        : [{ name: pizzaName, base: null, notes: null }];

      const items = directList
        .map((p) => ({
          name: p?.name ? String(p.name).trim() : null,
          base: p?.base ? String(p.base).trim() : null,
          notes: p?.notes ? String(p.notes).trim() : null,
        }))
        .filter((p) => p.name)
        .map(shapeItemFromPizza);

      const recommendedStyles = uniqueStylesFromItems(items);

      return NextResponse.json(
        {
          mode: "direct",
          items,
          recommendedStyles,
        },
        { status: 200 }
      );
    }

    /* ---------------------------- OCR PATH (image) ---------------------------- */
    const imagePart = imageDataUrl
      ? { type: "image_url", image_url: { url: imageDataUrl } }
      : { type: "image_url", image_url: { url: imageUrl } };

    const completion = await openai.chat.completions.create({
      model: TEXT_MODEL,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract pizzas from this image and format as specified JSON." },
            imagePart,
          ],
        },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    const parsedJSON = sanitizeAndParseJson(raw);

    if (!parsedJSON) {
      return NextResponse.json(
        {
          mode: "ocr",
          items: [],
          raw,
          warning: "Parser returned no valid JSON. See 'raw' for model output.",
        },
        { status: 200 }
      );
    }

    const extracted = (parsedJSON.pizzas || [])
      .map((p) => ({
        name: p?.name ? String(p.name).trim() : null,
        base: p?.base ? String(p.base).trim() : null,
        notes: p?.notes ? String(p.notes).trim() : null,
      }))
      .filter((p) => p.name);

    const items = extracted.map(shapeItemFromPizza);
    const recommendedStyles = uniqueStylesFromItems(items);

    return NextResponse.json(
      {
        mode: "ocr",
        items,
        recommendedStyles,
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ error: e.message || "Unknown error." }, { status: 400 });
  }
}
