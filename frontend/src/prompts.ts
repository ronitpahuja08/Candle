export type Prompt = { text: string; deck: string; depth: number };

export const PROMPTS: Prompt[] = [
  { text: "What's something small I did this week that you noticed?", deck: "warmup", depth: 2 },
  { text: "What did you think of me the first time we met?", deck: "rewind", depth: 2 },
  { text: "If we had a completely free Saturday and no budget, what would you want us to do?", deck: "plans", depth: 1 },
  { text: "What's a song that reminds you of me, and why that one?", deck: "rewind", depth: 2 },
  { text: "What are you looking forward to that you haven't told anyone yet?", deck: "deep", depth: 3 },
  { text: "What did your house sound like on a Sunday when you were nine?", deck: "rewind", depth: 3 },
  { text: "What's one thing you wish I asked you about more often?", deck: "deep", depth: 3 },
  { text: "Describe me to a stranger in three words. No cheating.", deck: "warmup", depth: 1 },
  { text: "What's a small thing I did years ago that you've never forgotten?", deck: "rewind", depth: 3 },
  { text: "When did you last feel proud of me?", deck: "deep", depth: 3 },
  { text: "What's something you want to be doing in five years that you've never said out loud?", deck: "deep", depth: 3 },
  { text: "What's the best meal we've ever had together?", deck: "rewind", depth: 1 },
];

export const NEXT_TEASE =
  "Tomorrow: something about the first time you met.";
