// Ported from the old Python models.py (DEFAULT_THEMES).
export const DEFAULT_THEMES: string[] = [
  "Yourself 🌱",
  "Childhood 👶",
  "Family 🏡",
  "Goals ✨",
  "Work 💼",
  "Love 💖",
  "Friends 🤝",
  "Hobbies 🎨",
  "Travel ✈️",
  "Random 🎲",
];

// Labels/hints come from i18n (keys `level.shallow`, `level.shallow_hint`, …).
export const LEVELS = [
  { key: "shallow", emoji: "🫧" },
  { key: "deep", emoji: "🌊" },
] as const;
