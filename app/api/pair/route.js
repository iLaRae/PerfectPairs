// app/api/pair/route.js
import { NextResponse } from "next/server";
import { z } from "zod";
import { openai, TEXT_MODEL } from "../../lib/openai";

export const runtime = "edge";

const WineSchema = z.object({
  name: z.string(),
  region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  variety_or_style: z.string().nullable().optional(),
  vintage: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  by_glass: z.boolean().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const BodySchema = z.object({
  favorites: z.array(z.string()).default([]),
  meal: z.string().min(3),
  wines: z.array(WineSchema),
});

const systemInstr = `You are a certified sommelier. Rank wines for the user's meal based on classic pairing principles (acidity, tannin, body, sweetness, regional matches, sauce, cooking method). Prefer user's favorites when ties occur, but do not force poor pairings.
Return a JSON object:
{
  "ranked": [
    {
      "wine": string, // human-readable summary (name, vintage, region if known)
      "score": number, // 0-100
      "why": string, // 1-2 sentences
      "estimated_price": number | null
    }
  ],
  "notes": string // brief global note if helpful
}`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { favorites, meal, wines } = BodySchema.parse(body);

    const completion = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemInstr },
        {
          role: "user",
          content: `Meal: ${meal}
Favorites: ${favorites.join(", ")}
Wine Options JSON: ${JSON.stringify(
            wines
          )}
Rank the best pairings; return JSON only as specified.`,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json(parsed, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to rank." },
      { status: 400 }
    );
  }
}
