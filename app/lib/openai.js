// lib/openai.js
import OpenAI from "openai";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const VISION_MODEL = "gpt-4o-mini";   // supports vision
export const TEXT_MODEL = "gpt-4o";          // high-quality reasoning for ranking
