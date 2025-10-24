// app/api/extract/route.js
import { NextResponse } from "next/server";
import { z } from "zod";
import { openai, VISION_MODEL } from "../../lib/openai";

export const runtime = "edge";

const BodySchema = z.object({
  imageDataUrl: z.string().min(1), // data:image/...;base64,....
});

const systemInstr = `You are a sommelier's assistant. Given a photo of a wine list, 
extract a structured JSON array of wines with fields:
- name (string)
- region (string | null)
- country (string | null)
- variety_or_style (string | null)
- vintage (number | null)
- price (number | null)  // numeric if price is visible; exclude currency symbol
- by_glass (boolean | null) // if obviously by the glass section
- notes (string | null) // any tasting notes/keywords if clearly shown
Return ONLY valid JSON and nothing else.`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { imageDataUrl } = BodySchema.parse(body);

    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: systemInstr },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the wine list as JSON." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { wines: [] };
    }

    const wines = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.wines)
      ? parsed.wines
      : [];

    return NextResponse.json({ wines }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to extract." },
      { status: 400 }
    );
  }
}
