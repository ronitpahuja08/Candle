// Curated remote imagery (Unsplash) for plan ideas + memory backdrops.
// Rendered with expo-image over a gradient fallback so a slow/failed load
// still looks intentional.
const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=70&auto=format&fit=crop`;

export const PLACE = {
  cafe: img("1445116572660-236099ec97a0"),
  latte: img("1501339847302-ac426a4a7cbb"),
  dinner: img("1414235077428-338989a2e8c0"),
  fineDining: img("1517248135467-4c7edcad34c4"),
  japan: img("1490806843957-31f4c9a91c65"),
  beach: img("1507525428034-b723cf961d3e"),
  mountains: img("1464822759023-fed622ff2c3b"),
  roadTrip: img("1469474968028-56623f02e42e"),
  picnic: img("1526401485004-46910ecc8e51"),
  cinema: img("1517604931442-7e0c8ed2963c"),
  lake: img("1439066615861-d1af74d74000"),
  city: img("1477959858617-67f85cf4f1df"),
  sunrise: img("1495197359483-d092478c170a"),
  hands: img("1516589178581-6cd7833ae3b2"),
};

export type PlanIdea = {
  key: string;
  title: string;
  category: string;
  blurb: string;
  image: string;
  accent: string;
};

export const PLAN_IDEAS: PlanIdea[] = [
  { key: "cafe", title: "Cosy café morning", category: "dinner", blurb: "Slow coffee, no phones", image: PLACE.cafe, accent: "#B45309" },
  { key: "japan", title: "Trip to Japan", category: "trip", blurb: "The one you keep talking about", image: PLACE.japan, accent: "#2563EB" },
  { key: "dinner", title: "Fancy dinner out", category: "dinner", blurb: "Dress up for no reason", image: PLACE.fineDining, accent: "#9D174D" },
  { key: "beach", title: "A day by the water", category: "outing", blurb: "Sand, sun, nothing to do", image: PLACE.beach, accent: "#0E7490" },
  { key: "mountains", title: "Weekend in the mountains", category: "trip", blurb: "Cabin, quiet, cold air", image: PLACE.mountains, accent: "#166534" },
  { key: "movie", title: "Movie night", category: "movie", blurb: "You pick, they can't complain", image: PLACE.cinema, accent: "#7C3AED" },
  { key: "picnic", title: "Lakeside picnic", category: "outing", blurb: "Blanket, snacks, golden hour", image: PLACE.picnic, accent: "#B45309" },
  { key: "city", title: "Wander a new city", category: "trip", blurb: "No map, just walk", image: PLACE.city, accent: "#1E3A8A" },
];

export function ideaImageFor(category: string): string {
  const map: Record<string, string> = {
    trip: PLACE.mountains,
    movie: PLACE.cinema,
    dinner: PLACE.dinner,
    outing: PLACE.picnic,
    surprise: PLACE.hands,
    other: PLACE.city,
  };
  return map[category] || PLACE.city;
}
