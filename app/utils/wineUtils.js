export function capWordsFromKey(k) {
  return k
    .split("-")
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(" ");
}

export function pickEmoji(w) {
  const s = `${w?.name ?? ""} ${w?.variety_or_style ?? ""}`.toLowerCase();
  if (s.includes("champagne") || s.includes("prosecco") || s.includes("cava")) return "🍾";
  if (s.includes("rosé") || s.includes("rose")) return "🌸";
  if (s.includes("riesling") || s.includes("sauvignon") || s.includes("chardonnay") || s.includes("moscato"))
    return "🥂";
  return "🍷";
}
