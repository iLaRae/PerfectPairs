// app/api/pizza-extract/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import PIZZAS from "../../data/pizzas"; // make sure you have a path alias set up or use ../../data/pizzas

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------ Utilities ------------------------------ */

// Small helper to normalize strings for matching
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’'"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Fuzzy-ish match from extracted text to your catalog names
function matchToCatalog(name, catalogNames) {
  const n = norm(name);
  if (!n) return null;

  // exact
  const exact = catalogNames.find((x) => norm(x) === n);
  if (exact) return exact;

  // partial in either direction
  const partial = catalogNames.find((x) => norm(x).includes(n) || n.includes(norm(x)));
  if (partial) return partial;

  // token-level fallback (first word)
  const tok = n.split(" ")[0];
  if (!tok) return null;
  return catalogNames.find((x) => norm(x).includes(tok)) || null;
}

// Remove code fences if model wraps JSON
function stripCodeFences(t) {
  if (!t) return t;
  return String(t).replace(/```(?:json)?\s*|\s*```/g, "").trim();
}

// Safely parse JSON; return null on failure
function safeJsonParse(t) {
  try {
    return JSON.parse(stripCodeFences(t));
  } catch {
    return null;
  }
}

// Ensure we received a data URL (or at least a non-empty string)
function isLikelyDataUrl(s) {
  return typeof s === "string" && s.startsWith("data:image/");
}

/* ------------------------------- Handler -------------------------------- */

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const image = body?.image;

    if (!image) {
      return NextResponse.json(
        { error: "Missing 'image' in request body." },
        { status: 400 }
      );
    }

    // Optional sanity check; still okay to pass non-data URLs if they're reachable
    if (!isLikelyDataUrl(image)) {
      // We'll still try to pass it through; it might be a https:// URL.
      // If you only want to accept data URLs, uncomment below:
      // return NextResponse.json({ error: "Expected data URL for 'image'." }, { status: 400 });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          items: [],
          warning:
            "OPENAI_API_KEY not set on server. Unable to extract items from image.",
        },
        { status: 200 }
      );
    }

    // Build a canonical list of menu item names to map against
    const catalogNames = PIZZAS.map((p) => p.name);

    // Prompt for a strict JSON schema response
    const system = [
      "You are an expert OCR + menu parser.",
      "Goal: read a pizza menu image and list the pizza item NAMES only.",
      "You MUST map names to the provided valid catalog list (case-insensitive).",
      "If a detected item doesn't closely match a catalog name, drop it.",
      'Return ONLY valid JSON like: {"items":[{"name":"Margherita"}, {"name":"Grandmas Pie"}]}',
      "No extra keys. No commentary.",
    ].join(" ");

    const userText = [
      "Extract pizza item names from this image.",
      "Use the following valid catalog names (map close variants to these exactly):",
      catalogNames.map((n) => `- ${n}`).join("\n"),
      "",
      'Return JSON exactly: {"items":[{"name":"<CatalogName>"}]}',
    ].join("\n");

    // Vision call – using the image as a data URL or remote URL
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: image },
          ],
        },
      ],
      response_format: { type: "json_object" }, // helps enforce JSON
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse(raw);

    // If the model somehow didn't return valid JSON, fallback to empty
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
    // Normalize to strings
    const extractedNames = rawItems
      .map((x) => (typeof x === "string" ? x : x?.name))
      .filter(Boolean);

    // Map to catalog & dedupe
    const seen = new Set();
    const matched = [];
    for (const nm of extractedNames) {
      const m = matchToCatalog(nm, catalogNames);
      if (m && !seen.has(m)) {
        seen.add(m);
        matched.push({ name: m });
      }
    }

    return NextResponse.json({ items: matched }, { status: 200 });
  } catch (err) {
    console.error("[pizza-extract] error:", err);
    return NextResponse.json(
      { error: "Failed to extract pizza items from image." },
      { status: 500 }
    );
  }
}
