# Candle — PRD

## Problem statement
A private two-person space (couple/friends/family) built around a daily ritual:
**neither person sees the other's answer until both have answered** — the 2nd
submit reveals both together and vibrates both phones. Expanded into a full
relationship app: a Connect home dashboard, category question decks, photo
challenges, Arcade games, shared plans (dates/cafés/trips) and a photo memory
wall.

## Architecture
- **Backend:** FastAPI + MongoDB. WebSocket realtime per pair (`/api/ws/{pair_id}`).
  Photos via **Emergent Object Storage** (`/api/upload`, `/api/files/{path}`).
  "The pair is the account." Seal enforced server-side (partner body/image only
  returned when 2 responses exist).
- **Frontend:** Expo Router single orchestrator (`app/index.tsx`) + internal state
  machine. 3 bottom tabs: Home / Cards / Memories. Overlays: CardDetail, Plans,
  Join, game notice. Reanimated, Instrument Serif, ember-on-warm-black + vibrant
  category accents. Remote Unsplash imagery for plan ideas + wall.
- **No auth.** Anonymous device UUID (`@/src/utils/storage`).

## Implemented (2026-08-30)
- Onboarding Welcome -> Context -> FirstCard (seal + Continue) -> Home. No dead-ends.
- Connect banner on Home: 4-letter code, Send code, Enter their code (either
  person can connect). Fixed the reported "stuck on Locked" bug.
- Home: flame streak, Fun & Light (daily card + trip countdown), Arcade games,
  Thumb Kiss.
- Cards (Conversations): Today/All/Your move filters; category-colored cards with
  per-card seal state.
- CardDetail: question / photo (upload) / this-or-that (Perfect Pair) types;
  reveal shows both answers + images; save to wall.
- Plans: photo "Ideas to steal" rail, compose (category + date chips + image),
  propose -> accept -> confirmed -> complete (adds photo memory) -> soft delete;
  trip countdown on Home.
- Memory Wall: 6 seeded memories with real photos; completed plans + saved
  reveals append here.
- WebSocket realtime: reveal (per card), member_joined, kiss, plan/memory refresh.
- Verified: 20/20 backend pytest + two-device frontend e2e. Seal holds.

## Backlog
- P1: subscribe Home Connect banner to WS `member_joined` (currently 2s poll).
- P1: Draw Duel game (currently a tasteful "coming soon").
- P2: server-side upload size cap + magic-byte validation.
- P2: multiple pairs (partner + parent + friend), each own streak.
- P2: split server.py into routers; migrate `on_event` -> lifespan.
