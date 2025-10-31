// app/api/ask/route.js
import { NextResponse } from "next/server";
import { z } from "zod";
import { openai, TEXT_MODEL } from "../../lib/openai";

export const runtime = "edge";

const BodySchema = z.object({
  question: z.string().min(1),
  meal: z.string().optional().default(""),
  favorites: z.array(z.string()).optional().default([]),
  wines: z.array(z.any()).optional().default([]),
});

const SYSTEM = `You are “Monsieur Verre,” a friendly, certified sommelier.
Be concise and practical. Use classic pairing logic (acidity, tannin, sweetness, body, sauces, cooking methods, regional matches).
Prefer the user's favorites for ties, but never force a bad pairing.`;

export async function POST(req) {
  try {
    const body = BodySchema.parse(await req.json());
    const { question, meal, favorites, wines } = body;

    const user = `
Question: ${question}

Context:
- Meal: ${meal || "(none provided)"}
- Favorites: ${favorites.join(", ") || "(none)"}
- Wines on the list: ${JSON.stringify(wines).slice(0, 8000)}
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

    const answer = completion.choices?.[0]?.message?.content ?? "I’m not sure yet.";
    return NextResponse.json({ answer }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}