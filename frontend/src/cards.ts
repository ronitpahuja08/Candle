export type CardType = "question" | "photo" | "pair";

export type Card = {
  id: number; // stable — used as prompt_index in the seal
  category: string;
  type: CardType;
  text: string;
  options?: string[];
  accent: string;
  accent2: string;
  icon?: string;
};

// A categorized deck. `id` doubles as prompt_index for the reveal seal.
export const CARDS: Card[] = [
  { id: 0, category: "Fun & Light", type: "question", text: "What's something small I did this week that you noticed?", accent: "#F97316", accent2: "#B45309" },
  { id: 1, category: "Rewind", type: "question", text: "What did you think of me the first time we met?", accent: "#7C3AED", accent2: "#4C1D95" },
  { id: 2, category: "Photo", type: "photo", text: "Without moving, take a photo of something around you that reminds you of them.", accent: "#0FB5B0", accent2: "#0E7490" },
  { id: 3, category: "This or That", type: "pair", text: "Who's more likely to set 15 alarms in the morning and sleep through all of them?", options: ["Me", "You"], accent: "#FF2D78", accent2: "#9D174D" },
  { id: 4, category: "Deep", type: "question", text: "What are you looking forward to that you haven't told anyone yet?", accent: "#2563EB", accent2: "#1E3A8A" },
  { id: 5, category: "Photo", type: "photo", text: "Upload a picture of your favorite date from the past year.", accent: "#0FB5B0", accent2: "#0E7490" },
  { id: 6, category: "Fun & Light", type: "question", text: "Describe me to a stranger in three words. No cheating.", accent: "#F97316", accent2: "#B45309" },
  { id: 7, category: "This or That", type: "pair", text: "Who's more likely to cry at a movie you both said looked boring?", options: ["Me", "You"], accent: "#FF2D78", accent2: "#9D174D" },
  { id: 8, category: "Rewind", type: "question", text: "What's a small thing I did years ago that you've never forgotten?", accent: "#7C3AED", accent2: "#4C1D95" },
  { id: 9, category: "Deep", type: "question", text: "When did you last feel proud of me?", accent: "#2563EB", accent2: "#1E3A8A" },
  { id: 10, category: "Photo", type: "photo", text: "Send a photo of the view in front of you, right now.", accent: "#0FB5B0", accent2: "#0E7490" },
  { id: 11, category: "This or That", type: "pair", text: "Who falls asleep first on the couch?", options: ["Me", "You"], accent: "#FF2D78", accent2: "#9D174D" },
  { id: 12, category: "Fun & Light", type: "question", text: "If we had a free Saturday and no budget, what would you want us to do?", accent: "#F97316", accent2: "#B45309" },
  { id: 13, category: "Deep", type: "question", text: "What's one thing you wish I asked you about more often?", accent: "#2563EB", accent2: "#1E3A8A" },
  { id: 14, category: "Rewind", type: "question", text: "What's the best meal we've ever had together?", accent: "#7C3AED", accent2: "#4C1D95" },
];

export const CATEGORIES = ["Fun & Light", "Deep", "Rewind", "Photo", "This or That"];

export const NEXT_TEASE = "Tomorrow: something about the first time you met.";

export function cardById(id: number): Card {
  return CARDS.find((c) => c.id === id) || CARDS[0];
}

// Games shown in the Arcade rail.
export const GAMES = [
  {
    key: "perfect_pair",
    title: "Find the best word path.",
    label: "perfect pair",
    accent: "#0E8F8B",
    accent2: "#0B6E6B",
    icon: "heart",
    playable: true,
  },
  {
    key: "this_or_that",
    title: "Guess who they picked.",
    label: "this or that",
    accent: "#B84DFF",
    accent2: "#7C3AED",
    icon: "sparkles",
    playable: true,
  },
  {
    key: "draw_duel",
    title: "Draw your way to win.",
    label: "draw duel",
    accent: "#F97316",
    accent2: "#C2410C",
    icon: "brush",
    playable: false,
  },
];
