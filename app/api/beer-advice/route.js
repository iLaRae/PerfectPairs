// app/api/beer-advice/route.js
import { NextResponse } from "next/server";
import { z } from "zod";
import { openai, TEXT_MODEL } from "../../lib/openai";

export const runtime = "edge";

const BodySchema = z.object({
  pizza: z
    .object({
      name: z.string().optional(),
      base: z.string().optional(),
      notes: z.string().optional(),
      matched: z
        .object({
          name: z.string().optional(),
          base: z.string().optional(),
          description: z.string().optional(),
          tags: z.array(z.string()).optional(),
          group: z.string().optional(),
        })
        .nullable()
        .optional(),
    })
    .optional(),
  pairingKeys: z.array(z.string()).default([]), // e.g. ["ipa","pilsner"]
});

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

const SYSTEM = `
You are a concise beer sommelier. Explain WHY specific beer styles pair with a given pizza.
Then, provide 2-3 example beers PER STYLE (well-known or typical representations).
Keep answers helpful and compact. Return Markdown (no code fences).
`.trim();

export async function POST(req) {
  try {
    const body = BodySchema.parse(await req.json());
    const pizza = body.pizza || {};
    const keys = body.pairingKeys || [];

    const pizzaName = pizza?.matched?.name || pizza?.name || "This pizza";
    const pizzaDesc = pizza?.matched?.description || pizza?.notes || "";
    const pizzaBase = pizza?.matched?.base || pizza?.base || "";
    const styleList = keys.map((k) => `- ${STYLE_LABELS[k] || k}`).join("\n");

    const userPrompt = `
Pizza:
- name: ${pizzaName}
- base: ${pizzaBase || "n/a"}
- notes: ${pizzaDesc || "n/a"}

Beer styles to explain:
${styleList || "- (none provided)"}

Task:
1) Briefly explain in 3-6 sentences why these styles pair well with this pizza.
2) For each style, give 2-3 example beers (bullet list). If you are not sure, provide typical regional examples.
3) Keep it tight and skimmable.
`.trim();

    const completion = await openai.chat.completions.create({
      model: TEXT_MODEL, // vision not required here; standard text model ok
      temperature: 0.5,
      max_tokens: 600,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion?.choices?.[0]?.message?.content || "";
    return NextResponse.json({ markdown: content }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
