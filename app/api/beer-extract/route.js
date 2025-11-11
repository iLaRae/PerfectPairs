// app/api/beer-extract/route.js
import { NextResponse } from "next/server";
import { z } from "zod";
import { openai, TEXT_MODEL } from "../../lib/openai";

export const runtime = "edge";

// Accept either a base64 data URL or a remote image URL
const BodySchema = z.object({
  imageDataUrl: z.string().url().startsWith("data:image/").optional(),
  imageUrl: z.string().url().optional(),
});

const SYSTEM = `
You are a meticulous menu OCR and parser for BEER lists.
Return clean, deduplicated items. If something is ambiguous, make your best guess conservatively.

Output ONLY JSON with this shape:
{
  "beers": [
    {
      "name": string,             // e.g., "Pliny the Elder"
      "brewery": string | null,   // e.g., "Russian River Brewing"
      "style": string | null,     // e.g., "Double IPA"
      "abv": number | null,       // as percent, e.g., 8.0
      "ibu": number | null,       // if listed
      "origin": string | null,    // city/region/country if shown
      "size": string | null,      // e.g., "16oz draft", "12oz can", "Bottle 500ml"
      "price": string | null,     // keep formatting, e.g., "$8" or "8"
      "notes": string | null      // brief descriptors (e.g., "hazy, tropical, citrus")
    }
  ]
}

Rules:
- Combine multi-line entries sensibly.
- Keep brewery & style distinct when possible.
- If multiple sizes/prices exist, include the most prominent or put them in "size" text.
- Do not add commentary outside the JSON.
`.trim();

function sanitizeAndParseJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```(?:json)?|```/g, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj === "object" && Array.isArray(obj.beers)) return obj;
  } catch {}
  return null;
}

export async function POST(req) {
  try {
    const body = BodySchema.parse(await req.json());
    const { imageDataUrl, imageUrl } = body;

    if (!imageDataUrl && !imageUrl) {
      return NextResponse.json(
        { error: "Provide imageDataUrl or imageUrl." },
        { status: 400 }
      );
    }

    // Build the vision message with whichever source we have
    const imagePart = imageDataUrl
      ? { type: "image_url", image_url: { url: imageDataUrl } }
      : { type: "image_url", image_url: { url: imageUrl } };

    const completion = await openai.chat.completions.create({
      // Your TEXT_MODEL should be a vision-capable model (e.g., gpt-4o / gpt-4.1-mini)
      model: TEXT_MODEL,
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the beer list from this image and format as specified JSON." },
            imagePart,
          ],
        },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    const parsed = sanitizeAndParseJson(raw);

    // Fallback if model didn’t return valid JSON
    if (!parsed) {
      return NextResponse.json(
        {
          beers: [],
          raw, // helpful for debugging client-side if needed
          warning: "Parser returned no valid JSON. 'raw' contains model output.",
        },
        { status: 200 }
      );
    }

    // Normalize fields just a bit
    const beers = (parsed.beers || []).map((b) => ({
      name: b?.name ?? null,
      brewery: b?.brewery ?? null,
      style: b?.style ?? null,
      abv: typeof b?.abv === "number" ? b.abv : b?.abv ? Number(String(b.abv).replace(/[^\d.]/g, "")) || null : null,
      ibu: typeof b?.ibu === "number" ? b.ibu : b?.ibu ? Number(String(b.ibu).replace(/[^\d.]/g, "")) || null : null,
      origin: b?.origin ?? null,
      size: b?.size ?? null,
      price: b?.price ?? null,
      notes: b?.notes ?? null,
    }));

    return NextResponse.json({ beers }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
