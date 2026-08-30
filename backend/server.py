from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import string
import asyncio
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Set
import uuid
from datetime import datetime, timezone, date


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ----------------------------------------------------------------------------
# Emergent Object Storage (managed) — the app talks only to us; we talk to storage.
# ----------------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "candle"
storage_key = None


def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 503:
        # stale key: reset and retry once
        globals()["storage_key"] = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(doc: dict) -> dict:
    """Strip Mongo _id so documents are JSON serializable."""
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


# ----------------------------------------------------------------------------
# Realtime: one set of websocket connections per pair. One channel, many events.
# ----------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, pair_id: str, ws: WebSocket):
        await ws.accept()
        async with self.lock:
            self.rooms.setdefault(pair_id, set()).add(ws)

    async def disconnect(self, pair_id: str, ws: WebSocket):
        async with self.lock:
            room = self.rooms.get(pair_id)
            if room and ws in room:
                room.discard(ws)
            if room is not None and not room:
                self.rooms.pop(pair_id, None)

    async def broadcast(self, pair_id: str, message: dict):
        room = list(self.rooms.get(pair_id, set()))
        dead = []
        for ws in room:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(pair_id, ws)


manager = ConnectionManager()


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
class CreatePairIn(BaseModel):
    type: str
    intent: Optional[str] = None
    proximity: Optional[str] = None
    pace: int = 5
    device_id: str
    name: Optional[str] = None


class JoinPairIn(BaseModel):
    code: str
    device_id: str
    name: Optional[str] = None


class ResponseIn(BaseModel):
    pair_id: str
    prompt_index: int
    device_id: str
    body: str = ""
    mood: Optional[str] = None
    image_path: Optional[str] = None


class KissIn(BaseModel):
    pair_id: str
    device_id: str


class MemoryIn(BaseModel):
    pair_id: str
    kind: str
    title: str
    subtitle: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    occurred_on: Optional[str] = None


class PlanIn(BaseModel):
    pair_id: str
    device_id: str
    name: Optional[str] = None
    title: str
    category: str
    notes: Optional[str] = None
    when: Optional[str] = None
    date: Optional[str] = None
    image_url: Optional[str] = None


class PlanActionIn(BaseModel):
    device_id: str


SEED_MEMORIES = [
    {"kind": "two_views", "title": "Same sky, 2,100 km",
     "subtitle": "Both answered your view right now within four minutes", "body": None,
     "image_url": "https://images.unsplash.com/photo-1495197359483-d092478c170a?w=800&q=70&auto=format&fit=crop"},
    {"kind": "occasion", "title": "Her 27th",
     "subtitle": "birthday", "body": "you said the terrace was too cold and stayed anyway",
     "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=70&auto=format&fit=crop"},
    {"kind": "month", "title": "July, the two of you",
     "subtitle": "28 cards · 3 outings · 84% attuned", "body": None,
     "image_url": None},
    {"kind": "two_views", "title": "Monday, 8am, both of us",
     "subtitle": "Neither of us was awake", "body": None,
     "image_url": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=70&auto=format&fit=crop"},
    {"kind": "occasion", "title": "The lake, finally",
     "subtitle": "outing", "body": "we said we'd go for two years",
     "image_url": "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=70&auto=format&fit=crop"},
    {"kind": "occasion", "title": "Your handwriting on the window",
     "subtitle": "note", "body": "I kept the photo",
     "image_url": "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=70&auto=format&fit=crop"},
]


async def gen_code() -> str:
    for _ in range(50):
        code = "".join(random.choices(string.ascii_uppercase, k=4))
        exists = await db.pairs.find_one({"code": code})
        if not exists:
            return code
    return "".join(random.choices(string.ascii_uppercase, k=4))


async def get_partner(pair_id: str, device_id: str) -> Optional[dict]:
    partner = await db.members.find_one(
        {"pair_id": pair_id, "device_id": {"$ne": device_id}}
    )
    return clean(partner) if partner else None


async def members_of(pair_id: str) -> List[dict]:
    ms = await db.members.find({"pair_id": pair_id}).to_list(10)
    return [clean(m) for m in ms]


# ----------------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Candle API"}


@api_router.post("/pairs")
async def create_pair(payload: CreatePairIn):
    code = await gen_code()
    pair = {
        "id": str(uuid.uuid4()),
        "code": code,
        "type": payload.type,
        "intent": payload.intent,
        "proximity": payload.proximity,
        "pace": payload.pace,
        "prompt_index": 0,
        "streak": 0,
        "created_at": now_iso(),
    }
    await db.pairs.insert_one(pair)

    member = {
        "id": str(uuid.uuid4()),
        "pair_id": pair["id"],
        "device_id": payload.device_id,
        "name": payload.name,
        "joined_at": now_iso(),
    }
    await db.members.insert_one(member)

    # Seed the wall so it is never empty on day one.
    for m in SEED_MEMORIES:
        await db.memories.insert_one({
            "id": str(uuid.uuid4()),
            "pair_id": pair["id"],
            "kind": m["kind"],
            "title": m["title"],
            "subtitle": m["subtitle"],
            "body": m["body"],
            "image_url": m.get("image_url"),
            "occurred_on": now_iso(),
            "created_at": now_iso(),
        })

    return {
        "pair": clean(pair),
        "members": [clean(member)],
        "partner": None,
    }


@api_router.post("/pairs/join")
async def join_pair(payload: JoinPairIn):
    code = payload.code.strip().upper()
    pair = await db.pairs.find_one({"code": code})
    if not pair:
        raise HTTPException(status_code=404, detail="No pair with that code")

    existing = await db.members.find_one(
        {"pair_id": pair["id"], "device_id": payload.device_id}
    )
    if existing:
        member = existing
    else:
        member = {
            "id": str(uuid.uuid4()),
            "pair_id": pair["id"],
            "device_id": payload.device_id,
            "name": payload.name,
            "joined_at": now_iso(),
        }
        await db.members.insert_one(member)
        await manager.broadcast(pair["id"], {
            "type": "member_joined",
            "member": clean(member),
        })

    return {
        "pair": clean(pair),
        "members": await members_of(pair["id"]),
        "partner": await get_partner(pair["id"], payload.device_id),
    }


@api_router.get("/pairs/by-device/{device_id}")
async def pairs_by_device(device_id: str):
    ms = await db.members.find({"device_id": device_id}).to_list(50)
    out = []
    for m in ms:
        pair = await db.pairs.find_one({"id": m["pair_id"]})
        if not pair:
            continue
        out.append({
            "pair": clean(pair),
            "members": await members_of(pair["id"]),
            "partner": await get_partner(pair["id"], device_id),
        })
    return {"pairs": out}


@api_router.get("/pairs/{pair_id}")
async def get_pair(pair_id: str):
    pair = await db.pairs.find_one({"id": pair_id})
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    return {"pair": clean(pair), "members": await members_of(pair_id)}


async def build_state(pair_id: str, prompt_index: int, device_id: str) -> dict:
    """The seal, enforced in the data layer. Partner's body is only ever
    returned once exactly two responses exist for this pair+prompt."""
    rows = await db.responses.find(
        {"pair_id": pair_id, "prompt_index": prompt_index}
    ).to_list(10)
    count = len(rows)
    mine = any(r["device_id"] == device_id for r in rows)
    pair = await db.pairs.find_one({"id": pair_id})
    streak = pair.get("streak", 0) if pair else 0

    if count >= 2:
        revealed = [clean(r) for r in sorted(rows, key=lambda r: r["created_at"])]
        state = "revealed"
    else:
        revealed = None
        if mine:
            state = "waiting"
        elif count == 1:
            state = "their_turn"
        else:
            state = "open"

    return {
        "state": state,
        "count": count,
        "mine": mine,
        "revealed": revealed,
        "streak": streak,
        "prompt_index": prompt_index,
    }


@api_router.get("/responses/state")
async def response_state(pair_id: str, prompt_index: int, device_id: str):
    return await build_state(pair_id, prompt_index, device_id)


@api_router.get("/cards/state")
async def cards_state(pair_id: str, device_id: str):
    """Per-card summary for every prompt_index that has any activity.
    The seal holds: partner bodies/images only ship when count == 2."""
    rows = await db.responses.find({"pair_id": pair_id}).to_list(2000)
    by_index: Dict[int, list] = {}
    for r in rows:
        by_index.setdefault(r["prompt_index"], []).append(r)
    out = []
    for idx, group in by_index.items():
        count = len(group)
        mine = any(r["device_id"] == device_id for r in group)
        if count >= 2:
            revealed = [clean(r) for r in sorted(group, key=lambda r: r["created_at"])]
            state = "revealed"
        else:
            revealed = None
            state = "waiting" if mine else "their_turn"
        out.append({
            "prompt_index": idx,
            "count": count,
            "mine": mine,
            "state": state,
            "revealed": revealed,
        })
    return {"cards": out}


@api_router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    device_id: str = Form(...),
    pair_id: str = Form(...),
):
    data = await file.read()
    ext = (file.filename or "photo.jpg").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "heic", "gif"):
        ext = "jpg"
    path = f"{APP_NAME}/uploads/{device_id}/{uuid.uuid4()}.{ext}"
    ctype = file.content_type or "image/jpeg"
    try:
        result = await run_in_threadpool(put_object, path, data, ctype)
    except requests.HTTPError as e:
        code = e.response.status_code if e.response is not None else 500
        if code == 402:
            raise HTTPException(status_code=402, detail="Storage quota reached")
        raise HTTPException(status_code=500, detail="Upload failed")
    stored = result.get("path", path)
    await db.uploads.insert_one({
        "id": str(uuid.uuid4()),
        "path": stored,
        "pair_id": pair_id,
        "device_id": device_id,
        "content_type": ctype,
        "created_at": now_iso(),
    })
    return {"path": stored}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    rec = await db.uploads.find_one({"path": path})
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        content, ctype = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(content=content, media_type=ctype)


@api_router.post("/responses")
async def submit_response(payload: ResponseIn):
    existing = await db.responses.find_one({
        "pair_id": payload.pair_id,
        "prompt_index": payload.prompt_index,
        "device_id": payload.device_id,
    })
    if not existing:
        row = {
            "id": str(uuid.uuid4()),
            "pair_id": payload.pair_id,
            "prompt_index": payload.prompt_index,
            "device_id": payload.device_id,
            "body": payload.body,
            "mood": payload.mood,
            "image_path": payload.image_path,
            "created_at": now_iso(),
        }
        await db.responses.insert_one(row)

    rows = await db.responses.find({
        "pair_id": payload.pair_id,
        "prompt_index": payload.prompt_index,
    }).to_list(10)
    count = len(rows)

    if count >= 2:
        # Reveal is now allowed. Increment streak once per prompt index.
        pair = await db.pairs.find_one({"id": payload.pair_id})
        already_revealed = pair.get("revealed_index") if pair else None
        streak = pair.get("streak", 0) if pair else 0
        if already_revealed != payload.prompt_index:
            streak = streak + 1
            await db.pairs.update_one(
                {"id": payload.pair_id},
                {"$set": {"streak": streak, "revealed_index": payload.prompt_index}},
            )
        revealed = [clean(r) for r in sorted(rows, key=lambda r: r["created_at"])]
        await manager.broadcast(payload.pair_id, {
            "type": "reveal",
            "prompt_index": payload.prompt_index,
            "responses": revealed,
            "streak": streak,
        })
        return {"count": count, "revealed": revealed, "streak": streak}

    # Only one answer: tell the room someone answered, but never the body.
    await manager.broadcast(payload.pair_id, {
        "type": "response_added",
        "prompt_index": payload.prompt_index,
        "author_device_id": payload.device_id,
        "count": count,
    })
    return {"count": count, "revealed": None}


@api_router.post("/kiss")
async def thumb_kiss(payload: KissIn):
    await manager.broadcast(payload.pair_id, {
        "type": "kiss",
        "from": payload.device_id,
    })
    return {"ok": True}


@api_router.get("/memories")
async def list_memories(pair_id: str):
    ms = await db.memories.find(
        {"pair_id": pair_id, "deleted_at": {"$exists": False}}
    ).sort("created_at", -1).to_list(200)
    return {"memories": [clean(m) for m in ms]}


@api_router.post("/memories")
async def add_memory(payload: MemoryIn):
    mem = {
        "id": str(uuid.uuid4()),
        "pair_id": payload.pair_id,
        "kind": payload.kind,
        "title": payload.title,
        "subtitle": payload.subtitle,
        "body": payload.body,
        "image_url": payload.image_url,
        "occurred_on": payload.occurred_on or now_iso(),
        "created_at": now_iso(),
    }
    await db.memories.insert_one(mem)
    await manager.broadcast(payload.pair_id, {"type": "memory_added"})
    return {"memory": clean(mem)}


# ----------------------------------------------------------------------------
# Plans — the shared planning / experiences area
# ----------------------------------------------------------------------------
@api_router.get("/plans")
async def list_plans(pair_id: str):
    ps = await db.plans.find(
        {"pair_id": pair_id, "deleted_at": {"$exists": False}}
    ).sort("created_at", -1).to_list(200)
    return {"plans": [clean(p) for p in ps]}


@api_router.post("/plans")
async def create_plan(payload: PlanIn):
    plan = {
        "id": str(uuid.uuid4()),
        "pair_id": payload.pair_id,
        "proposed_by": payload.device_id,
        "proposer_name": payload.name,
        "title": payload.title,
        "category": payload.category,
        "notes": payload.notes,
        "when": payload.when,
        "date": payload.date,
        "image_url": payload.image_url,
        "accepted_by": [payload.device_id],
        "status": "proposed",
        "created_at": now_iso(),
    }
    await db.plans.insert_one(plan)
    await manager.broadcast(payload.pair_id, {"type": "plan_added"})
    return {"plan": clean(plan)}


@api_router.post("/plans/{plan_id}/accept")
async def accept_plan(plan_id: str, payload: PlanActionIn):
    plan = await db.plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    accepted = set(plan.get("accepted_by", []))
    accepted.add(payload.device_id)
    member_count = await db.members.count_documents({"pair_id": plan["pair_id"]})
    status = plan.get("status", "proposed")
    if len(accepted) >= 2 and len(accepted) >= member_count:
        status = "confirmed"
    await db.plans.update_one(
        {"id": plan_id},
        {"$set": {"accepted_by": list(accepted), "status": status}},
    )
    await manager.broadcast(plan["pair_id"], {"type": "plan_updated"})
    plan = await db.plans.find_one({"id": plan_id})
    return {"plan": clean(plan)}


@api_router.post("/plans/{plan_id}/complete")
async def complete_plan(plan_id: str, payload: PlanActionIn):
    plan = await db.plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.plans.update_one(
        {"id": plan_id},
        {"$set": {"status": "done", "completed_at": now_iso()}},
    )
    # Completed outings feed the memory wall.
    mem = {
        "id": str(uuid.uuid4()),
        "pair_id": plan["pair_id"],
        "kind": "occasion",
        "title": plan["title"],
        "subtitle": plan.get("category"),
        "body": plan.get("notes") or "we finally did it",
        "image_url": plan.get("image_url"),
        "occurred_on": now_iso(),
        "created_at": now_iso(),
    }
    await db.memories.insert_one(mem)
    await manager.broadcast(plan["pair_id"], {"type": "plan_updated"})
    await manager.broadcast(plan["pair_id"], {"type": "memory_added"})
    plan = await db.plans.find_one({"id": plan_id})
    return {"plan": clean(plan)}


@api_router.post("/plans/{plan_id}/delete")
async def delete_plan(plan_id: str, payload: PlanActionIn):
    plan = await db.plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.plans.update_one(
        {"id": plan_id}, {"$set": {"deleted_at": now_iso()}}
    )
    await manager.broadcast(plan["pair_id"], {"type": "plan_updated"})
    return {"ok": True}


# ----------------------------------------------------------------------------
# WebSocket — subscribe once per pair.
# ----------------------------------------------------------------------------
@app.websocket("/api/ws/{pair_id}")
async def websocket_endpoint(websocket: WebSocket, pair_id: str):
    await manager.connect(pair_id, websocket)
    try:
        while True:
            # Client may send a ping / kiss over the socket; we mainly push.
            data = await websocket.receive_json()
            if isinstance(data, dict) and data.get("type") == "kiss":
                await manager.broadcast(pair_id, {
                    "type": "kiss",
                    "from": data.get("from"),
                })
    except WebSocketDisconnect:
        await manager.disconnect(pair_id, websocket)
    except Exception:
        await manager.disconnect(pair_id, websocket)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_init():
    try:
        await run_in_threadpool(init_storage)
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Storage init deferred: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
