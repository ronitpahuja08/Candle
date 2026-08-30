# Candle — PRD

## Problem statement
A private two-person space where a pair (couple, friends, parent/child) does a
short daily ritual. Core mechanic: **neither person can see the other's answer
until both have answered.** When the second person submits, both phones reveal
the answers together and vibrate simultaneously. Plus a **planning/experiences**
area for coordinating dates, movies, trips and outings together.

## Architecture
- **Backend:** FastAPI + MongoDB. Realtime via a WebSocket channel per pair
  (`/api/ws/{pair_id}`). "The pair is the account" — pairs, members, responses,
  memories and plans all hang off a `pair` row (multi-pair ready).
- **Frontend:** Expo Router single-orchestrator state machine (`app/index.tsx`)
  + custom bottom tabs (Today / Plans / Wall). Reanimated animations,
  Instrument Serif display font, ember-on-warm-black theme.
- **No auth.** Anonymous UUID stored on-device.
- **The seal is enforced server-side:** partner's answer body is never returned
  until exactly two responses exist for a pair+prompt.

## User personas
- The initiator: creates a pair, answers first, invites the other person.
- The joiner: enters a code (from Welcome OR from their own Invite screen).

## Implemented (2026-08-30)
- Onboarding: Welcome → 4 Context steps → FirstCard (answer alone) → Invite.
- Join by 4-letter code from Welcome and from the Invite screen ("They already
  sent me a code") so either person can connect.
- Today: open / waiting / their_turn / revealed states; Thumb Kiss haptic.
- Reveal: staggered FadeInUp, partner-first, streak bump, save-to-wall.
- Wall: 6 seeded memories in 3 layouts (two_views / occasion / month).
- Plans: propose (movie/trip/dinner/outing/surprise/other), accept → confirmed,
  complete → done + auto memory on the Wall, soft delete.
- WebSocket realtime: reveal, member_joined, kiss, plan/memory refresh.
- App-reopen restores straight to the correct pair state.
- Fully tested: backend 12/12 pytest, frontend two-device e2e — all passing.

## Backlog
- P1: subscribe to WS `member_joined` on Invite for instant handoff (currently 2s poll).
- P2: multiple pairs UI (partner + parent + friend), each with its own state.
- P2: migrate FastAPI `on_event` to lifespan handlers.
