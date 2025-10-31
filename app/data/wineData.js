// data/wineData.js

/* Per-tile color themes to emulate an “app icon” palette */
export const TILE_THEMES = {
  // Reds
  "cabernet-sauvignon": { from: "#2B133E", to: "#0E0718" },
  merlot: { from: "#3A0F28", to: "#14050E" },
  "pinot-noir": { from: "#401B1B", to: "#150808" },
  "syrah-shiraz": { from: "#2E1739", to: "#0E0916" },
  malbec: { from: "#30153A", to: "#0F0616" },
  sangiovese: { from: "#3B1A19", to: "#160908" },
  tempranillo: { from: "#3D2016", to: "#140A06" },
  zinfandel: { from: "#37161F", to: "#12070A" },

  // Whites
  chardonnay: { from: "#0B2B35", to: "#07151A" },
  "sauvignon-blanc": { from: "#0A2F24", to: "#061610" },
  "pinot-grigio": { from: "#0B2A33", to: "#061318" },
  riesling: { from: "#0A2D3B", to: "#06161D" },
  moscato: { from: "#0A2B2D", to: "#061415" },

  // Rosé & Sparkling
  rose: { from: "#3A1533", to: "#150713" },
  champagne: { from: "#0C2843", to: "#071221" },
  prosecco: { from: "#0D2C3E", to: "#081722" },
  cava: { from: "#0B2840", to: "#071724" },

  // Fortified / Dessert
  port: { from: "#34131D", to: "#14070B" },
  sherry: { from: "#2F1B0F", to: "#120805" },

  _default: { from: "#0f172a", to: "#0b1022" }, // slate-like fallback
};

/* Popular / common global wines (varietals & primary styles) */
export const DEFAULT_WINES = [
  // Reds (assuming images like /images/wine/cabernet.png are in your public folder)
  { key: "cabernet-sauvignon", label: "Cabernet Sauvignon", emoji: "/images/wine/Cabernet.png" },
  { key: "merlot", label: "Merlot", emoji: "/images/wine/merlot.png" },
  { key: "pinot-noir", label: "Pinot Noir", emoji: "/images/wine/pinot-noir.png" },
  { key: "syrah-shiraz", label: "Syrah / Shiraz", emoji: "/images/wine/syrah.png" },
  { key: "malbec", label: "Malbec", emoji: "/images/wine/malbec.png" },
  { key: "sangiovese", label: "Sangiovese", emoji: "/images/wine/sangiovese.png" },
  { key: "tempranillo", label: "Tempranillo", emoji: "/images/wine/tempranillo.png" },
  { key: "zinfandel", label: "Zinfandel", emoji: "/images/wine/zinfandel.png" },

  // Whites
  { key: "chardonnay", label: "Chardonnay", emoji: "/images/wine/chardonnay.png" },
  { key: "sauvignon-blanc", label: "Sauvignon Blanc", emoji: "/images/wine/sauvignon-blanc.png" },
  { key: "pinot-grigio", label: "Pinot Grigio / Gris", emoji: "/images/wine/pinot-grigio.png" },
  { key: "riesling", label: "Riesling", emoji: "/images/wine/riesling.png" },
  { key: "moscato", label: "Moscato", emoji: "/images/wine/moscato.png" },

  // Rosé & Sparkling
  { key: "rose", label: "Rosé", emoji: "/images/wine/rose.png" },
  { key: "champagne", label: "Champagne", emoji: "/images/wine/champagne.png" },
  { key: "prosecco", label: "Prosecco", emoji: "/images/wine/prosecco.png" },
  { key: "cava", label: "Cava", emoji: "/images/wine/cava.png" },

  // Fortified / Dessert
  { key: "port", label: "Port", emoji: "/images/wine/port.png" },
  { key: "sherry", label: "Sherry", emoji: "/images/wine/sherry.png" },
];