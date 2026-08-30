"""
New endpoints (Jan 2026 iteration):
- GET /api/cards/state (per-prompt summaries + seal)
- POST /api/upload + GET /api/files/{path} (Emergent Object Storage)
- Plans w/ image_url + date; memories w/ image_url; seed memories carry image_url
"""
import io
import os
import uuid

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"


@pytest.fixture(scope="module")
def s():
    ses = requests.Session()
    return ses


@pytest.fixture(scope="module")
def pair(s):
    dev_a = f"TEST-NA-{uuid.uuid4()}"
    dev_b = f"TEST-NB-{uuid.uuid4()}"
    r = s.post(f"{API}/pairs", json={
        "type": "romantic", "intent": "closer", "proximity": "near",
        "pace": 5, "device_id": dev_a, "name": "Ana",
    })
    assert r.status_code == 200, r.text
    pair = r.json()["pair"]
    r2 = s.post(f"{API}/pairs/join", json={
        "code": pair["code"], "device_id": dev_b, "name": "Ben",
    })
    assert r2.status_code == 200
    return {"pair_id": pair["id"], "code": pair["code"], "dev_a": dev_a, "dev_b": dev_b}


# --- seeded memories now carry image_url on most ---
class TestSeedImages:
    def test_seed_memories_have_image_url(self, s, pair):
        r = s.get(f"{API}/memories", params={"pair_id": pair["pair_id"]})
        assert r.status_code == 200
        mems = r.json()["memories"]
        assert len(mems) == 6
        with_img = [m for m in mems if m.get("image_url")]
        # spec: "seeds 6 memories now WITH image_url on most"
        assert len(with_img) >= 4, f"Expected >=4 seeded mems with images, got {len(with_img)}"


# --- GET /api/cards/state ---
class TestCardsState:
    def test_empty_when_no_answers(self, s, pair):
        r = s.get(f"{API}/cards/state", params={
            "pair_id": pair["pair_id"], "device_id": pair["dev_a"],
        })
        assert r.status_code == 200
        assert r.json()["cards"] == []

    def test_seal_hides_partner_body(self, s, pair):
        # Device A answers prompt 3
        s.post(f"{API}/responses", json={
            "pair_id": pair["pair_id"], "prompt_index": 3,
            "device_id": pair["dev_a"], "body": "A secret",
        })
        # B fetches cards/state: sees their_turn, no revealed
        rb = s.get(f"{API}/cards/state", params={
            "pair_id": pair["pair_id"], "device_id": pair["dev_b"],
        }).json()
        card = next(c for c in rb["cards"] if c["prompt_index"] == 3)
        assert card["state"] == "their_turn"
        assert card["mine"] is False
        assert card["count"] == 1
        assert card["revealed"] is None

        # A's own view: waiting
        ra = s.get(f"{API}/cards/state", params={
            "pair_id": pair["pair_id"], "device_id": pair["dev_a"],
        }).json()
        card_a = next(c for c in ra["cards"] if c["prompt_index"] == 3)
        assert card_a["state"] == "waiting"
        assert card_a["mine"] is True
        assert card_a["revealed"] is None

    def test_reveal_after_both(self, s, pair):
        s.post(f"{API}/responses", json={
            "pair_id": pair["pair_id"], "prompt_index": 3,
            "device_id": pair["dev_b"], "body": "B secret",
        })
        r = s.get(f"{API}/cards/state", params={
            "pair_id": pair["pair_id"], "device_id": pair["dev_a"],
        }).json()
        card = next(c for c in r["cards"] if c["prompt_index"] == 3)
        assert card["state"] == "revealed"
        assert card["count"] == 2
        assert card["revealed"] is not None
        bodies = {row["body"] for row in card["revealed"]}
        assert bodies == {"A secret", "B secret"}


# --- POST /api/upload + GET /api/files/{path} ---
class TestUploadAndServe:
    # Minimal 1x1 PNG (base64 decoded)
    PNG_BYTES = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "890000000d49444154789c6300010000000500010d0a2db40000000049454e44"
        "ae426082"
    )

    def test_upload_and_fetch(self, s, pair):
        files = {"file": ("tiny.png", io.BytesIO(self.PNG_BYTES), "image/png")}
        data = {"device_id": pair["dev_a"], "pair_id": pair["pair_id"]}
        r = requests.post(f"{API}/upload", files=files, data=data, timeout=60)
        assert r.status_code == 200, r.text
        path = r.json()["path"]
        assert path and "/" in path

        # fetch it back
        fr = requests.get(f"{API}/files/{path}", timeout=30)
        assert fr.status_code == 200
        assert fr.headers.get("content-type", "").startswith("image/")
        assert len(fr.content) > 0

    def test_missing_file_404(self, s):
        fr = requests.get(f"{API}/files/candle/uploads/nope/{uuid.uuid4()}.jpg", timeout=30)
        assert fr.status_code == 404


# --- Plans accept image_url + date ---
class TestPlansImageAndDate:
    def test_create_plan_with_image_and_date(self, s, pair):
        r = s.post(f"{API}/plans", json={
            "pair_id": pair["pair_id"], "device_id": pair["dev_a"],
            "name": "Ana", "title": "TEST_kyoto",
            "category": "trip",
            "date": "2026-04-01",
            "image_url": "https://images.unsplash.com/photo-japan.jpg",
        })
        assert r.status_code == 200, r.text
        plan = r.json()["plan"]
        assert plan["image_url"] == "https://images.unsplash.com/photo-japan.jpg"
        assert plan["date"] == "2026-04-01"
        assert plan["status"] == "proposed"
        pid = plan["id"]

        # Complete → memory carries image_url
        s.post(f"{API}/plans/{pid}/accept", json={"device_id": pair["dev_b"]})
        s.post(f"{API}/plans/{pid}/complete", json={"device_id": pair["dev_a"]})
        mems = s.get(f"{API}/memories", params={"pair_id": pair["pair_id"]}).json()["memories"]
        kyoto = next(m for m in mems if m["title"] == "TEST_kyoto")
        assert kyoto["image_url"] == "https://images.unsplash.com/photo-japan.jpg"
        # cleanup
        s.post(f"{API}/plans/{pid}/delete", json={"device_id": pair["dev_a"]})


# --- POST /api/memories with image_url ---
class TestMemoryImage:
    def test_memory_with_image(self, s, pair):
        r = s.post(f"{API}/memories", json={
            "pair_id": pair["pair_id"], "kind": "occasion",
            "title": "TEST_photo_memo",
            "image_url": "https://images.unsplash.com/x.jpg",
        })
        assert r.status_code == 200
        assert r.json()["memory"]["image_url"] == "https://images.unsplash.com/x.jpg"
