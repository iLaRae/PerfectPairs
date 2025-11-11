// app/api/beer/route.js
import { NextResponse } from "next/server";
import { z } from "zod";
import { openai, TEXT_MODEL } from "../../lib/openai";

export const runtime = "edge";

const BodySchema = z.object({
  question: z.string().min(1),
  meal: z.string().optional().default(""),
  favorites: z.array(z.string()).optional().default([]), // user's favorite beer styles/brands
  beers: z.array(z.any()).optional().default([]),        // a venue's beer list or parsed items
});

const SYSTEM = `You are "Barley & Hops," a friendly, certified Cicerone®.
Be concise and practical. Use classic beer pairing logic:
- Balance bitterness (IBU) with heat/sweetness; avoid accentuating bitterness with heavy char unless malty sweetness can buffer it.
- Consider malt sweetness, roast, smoke, fruitiness/phenols, acidity (sours), carbonation, body, ABV, and hop aroma.
- Factor sauces and cooking methods (grilled, fried, braised, raw), regional matches, and intensity matching.
Prefer the user's favorites for ties, but never force a bad pairing.
When suggesting pairings, name the beer styles (e.g., German Pils, Hazy IPA, Dry Stout) and give 1–2 line reasons.
If asked off-topic, still answer helpfully.`;

export async function POST(req) {
  try {
    const body = BodySchema.parse(await req.json());
    const { question, meal, favorites, beers } = body;

    const user = `
Question: ${question}

Context:
- Meal: ${meal || "(none provided)"}
- Favorites (beer styles/brands): ${favorites.join(", ") || "(none)"}
- Beers on the list: ${JSON.stringify(beers).slice(0, 8000)}
(If the user asks something off-topic, still answer helpfully.)
`.trim();

    const completion = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      temperature: 0.4,
    });

    const answer =
      completion.choices?.[0]?.message?.content ?? "I’m not sure yet.";
    return NextResponse.json({ answer }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
