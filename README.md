# 🕯️ Candle

A private space for two people. Every day you both answer the same card — but
**neither of you can see the other's answer until you've both answered.** The
moment the second person locks it in, both phones reveal the answers together
and buzz at the same time.

Beyond the daily ritual, Candle is a full relationship app: photo challenges,
quick games, shared plans for dates/cafés/trips, and a photo memory wall of
everything the two of you kept.

---

## ✨ Features

- **The seal** — answers stay hidden until both people respond; enforced on the
  server so a partner's answer never reaches your phone early.
- **Connect home** — a dashboard with your streak, the day's card, a trip
  countdown, an Arcade of games, and Thumb Kiss (buzz your partner's phone).
- **Cards across categories** — Fun & Light, Deep, Rewind, Photo, This or That,
  with Today / All / Your move filters.
- **Photo challenges** — pick or snap a photo; it stays sealed until they answer
  too, then both reveal together.
- **Games** — Perfect Pair / This-or-That (guess what they picked).
- **Plans** — a photo "Ideas to steal" gallery of cafés, trips and dinners;
  propose → both say "I'm in" → confirmed → mark done → it lands on the wall.
- **Memory wall** — a beautiful, photo-rich timeline of your reveals and outings.
- **No accounts** — an anonymous device identity; connect with a 4-letter code.

---

## 🧱 Tech stack

| Layer     | Tech |
|-----------|------|
| Mobile    | Expo (SDK 54) + Expo Router, React Native, Reanimated, expo-image |
| Backend   | FastAPI (Python), WebSockets for realtime |
| Database  | MongoDB (Motor async driver) |
| Storage   | Emergent-managed Object Storage (photo uploads) |
| Realtime  | One WebSocket channel per pair (`/api/ws/{pair_id}`) |

The design model is **"the pair is the account"** — pairs, members, responses,
memories and plans all hang off a single `pair` document.

---

## 📁 Project structure

```
app/
├── backend/
│   ├── server.py          # FastAPI app: pairs, seal/reveal, plans, upload, WS
│   ├── requirements.txt
│   └── .env               # MONGO_URL, DB_NAME, EMERGENT_LLM_KEY
└── frontend/
    ├── app/
    │   ├── _layout.tsx     # fonts, providers, splash
    │   └── index.tsx       # onboarding + main state machine
    ├── src/
    │   ├── MainApp.tsx      # tabs (Home / Cards / Memories) + overlays
    │   ├── api.ts           # backend client
    │   ├── cards.ts         # the question/photo/game deck
    │   ├── media.ts         # curated plan-idea imagery
    │   ├── hooks/usePair.ts # realtime seal/reveal hook
    │   └── screens/         # Home, Conversations, CardDetail, Plans, Wall, ...
    └── app.json
```

---

## 🚀 Running locally

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
Requires a running MongoDB and a `.env` with `MONGO_URL`, `DB_NAME`, and
`EMERGENT_LLM_KEY` (used to initialise object storage).

**Frontend**
```bash
cd frontend
yarn install
yarn start        # open in Expo Go, or press w for web
```
Set `EXPO_PUBLIC_BACKEND_URL` in `frontend/.env` to your backend's base URL.
All API routes are prefixed with `/api`.

---

## 🔌 Key API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/pairs` | Create a pair, get a 4-letter code |
| POST | `/api/pairs/join` | Join by code |
| GET  | `/api/pairs/by-device/{device_id}` | Restore a device's pair |
| GET  | `/api/responses/state` | Seal state for one card |
| GET  | `/api/cards/state` | Seal state for every card |
| POST | `/api/responses` | Submit an answer (reveals when both answer) |
| POST | `/api/upload` · GET `/api/files/{path}` | Photo upload / serve |
| GET/POST | `/api/plans` (+ `/accept` `/complete` `/delete`) | Shared plans |
| GET/POST | `/api/memories` | The memory wall |
| WS   | `/api/ws/{pair_id}` | Realtime reveal / kiss / join events |

---

## 📱 Notes

- Haptics (the simultaneous buzz on reveal / Thumb Kiss) only fire on a real
  device via Expo Go or a native build — not in the web preview.
- Photos are stored in managed object storage; the app only ever holds URLs.

---

_Built on Emergent._
