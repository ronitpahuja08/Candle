"""
Candle backend end-to-end tests.
Covers: pairs, join, by-device, response seal, reveal + streak guard,
kiss, memories, plans lifecycle, and websocket events.
"""
import asyncio
import json
import os
import uuid

import pytest
import requests
import websockets
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"
WS_BASE = BASE.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def s():
    ses = requests.Session()
    ses.headers.update({"Content-Type": "application/json"})
    return ses


@pytest.fixture(scope="module")
def pair_ctx(s):
    """Create a pair with device A and join with device B. Reused across tests."""
    dev_a = f"TEST-A-{uuid.uuid4()}"
    dev_b = f"TEST-B-{uuid.uuid4()}"
    r = s.post(f"{API}/pairs", json={
        "type": "romantic", "intent": "closer", "proximity": "far",
        "pace": 5, "device_id": dev_a, "name": "Alice",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    pair = data["pair"]
    code = pair["code"]
    assert len(code) == 4 and code.isupper()
    # lowercase code must still work
    rj = s.post(f"{API}/pairs/join", json={
        "code": code.lower(), "device_id": dev_b, "name": "Bob",
    })
    assert rj.status_code == 200, rj.text
    return {"pair_id": pair["id"], "code": code, "dev_a": dev_a, "dev_b": dev_b}


# ---------- pairs / join / by-device ----------
class TestPairs:
    def test_create_seeds_six_memories(self, s):
        dev = f"TEST-C-{uuid.uuid4()}"
        r = s.post(f"{API}/pairs", json={"type": "friends", "device_id": dev, "name": "Solo"})
        assert r.status_code == 200
        pid = r.json()["pair"]["id"]
        mr = s.get(f"{API}/memories", params={"pair_id": pid})
        assert mr.status_code == 200
        mems = mr.json()["memories"]
        assert len(mems) == 6, f"Expected 6 seeded memories, got {len(mems)}"
        kinds = {m["kind"] for m in mems}
        assert kinds == {"two_views", "occasion", "month"}

    def test_join_wrong_code_404(self, s):
        r = s.post(f"{API}/pairs/join", json={
            "code": "ZZZZ", "device_id": f"TEST-D-{uuid.uuid4()}", "name": "X",
        })
        assert r.status_code == 404

    def test_by_device_returns_pair_with_partner(self, s, pair_ctx):
        r = s.get(f"{API}/pairs/by-device/{pair_ctx['dev_a']}")
        assert r.status_code == 200
        pairs = r.json()["pairs"]
        assert len(pairs) >= 1
        mine = next(p for p in pairs if p["pair"]["id"] == pair_ctx["pair_id"])
        assert len(mine["members"]) == 2
        assert mine["partner"] is not None
        assert mine["partner"]["device_id"] == pair_ctx["dev_b"]


# ---------- the seal + reveal + streak guard ----------
class TestSealAndReveal:
    def test_state_open_before_any_answer(self, s, pair_ctx):
        r = s.get(f"{API}/responses/state", params={
            "pair_id": pair_ctx["pair_id"], "prompt_index": 0,
            "device_id": pair_ctx["dev_a"],
        })
        assert r.status_code == 200
        d = r.json()
        assert d["revealed"] is None
        assert d["state"] == "open"
        assert d["count"] == 0

    def test_first_submit_hides_body(self, s, pair_ctx):
        r = s.post(f"{API}/responses", json={
            "pair_id": pair_ctx["pair_id"], "prompt_index": 0,
            "device_id": pair_ctx["dev_a"], "body": "A first answer",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 1
        assert d["revealed"] is None

        # dev B sees "their_turn"; body of A is NOT leaked
        rs = s.get(f"{API}/responses/state", params={
            "pair_id": pair_ctx["pair_id"], "prompt_index": 0,
            "device_id": pair_ctx["dev_b"],
        }).json()
        assert rs["state"] == "their_turn"
        assert rs["revealed"] is None

        # dev A sees "waiting"
        rs2 = s.get(f"{API}/responses/state", params={
            "pair_id": pair_ctx["pair_id"], "prompt_index": 0,
            "device_id": pair_ctx["dev_a"],
        }).json()
        assert rs2["state"] == "waiting"
        assert rs2["revealed"] is None

    def test_second_submit_reveals_and_increments_streak(self, s, pair_ctx):
        r = s.post(f"{API}/responses", json={
            "pair_id": pair_ctx["pair_id"], "prompt_index": 0,
            "device_id": pair_ctx["dev_b"], "body": "B answer",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 2
        assert d["revealed"] is not None and len(d["revealed"]) == 2
        bodies = {row["body"] for row in d["revealed"]}
        assert bodies == {"A first answer", "B answer"}
        assert d["streak"] == 1

    def test_repeat_submit_does_not_double_increment(self, s, pair_ctx):
        # A submits again for same prompt
        r = s.post(f"{API}/responses", json={
            "pair_id": pair_ctx["pair_id"], "prompt_index": 0,
            "device_id": pair_ctx["dev_a"], "body": "A again",
        })
        assert r.status_code == 200
        assert r.json()["streak"] == 1  # unchanged

        # B submits again too
        r = s.post(f"{API}/responses", json={
            "pair_id": pair_ctx["pair_id"], "prompt_index": 0,
            "device_id": pair_ctx["dev_b"], "body": "B again",
        })
        assert r.json()["streak"] == 1


# ---------- kiss ----------
class TestKiss:
    def test_kiss_ok(self, s, pair_ctx):
        r = s.post(f"{API}/kiss", json={
            "pair_id": pair_ctx["pair_id"], "device_id": pair_ctx["dev_a"],
        })
        assert r.status_code == 200
        assert r.json() == {"ok": True}


# ---------- memories ----------
class TestMemories:
    def test_add_memory(self, s, pair_ctx):
        r = s.post(f"{API}/memories", json={
            "pair_id": pair_ctx["pair_id"], "kind": "occasion",
            "title": "TEST_memory", "subtitle": "note", "body": "hi",
        })
        assert r.status_code == 200
        mem = r.json()["memory"]
        assert mem["title"] == "TEST_memory"
        # verify listed
        lr = s.get(f"{API}/memories", params={"pair_id": pair_ctx["pair_id"]}).json()
        titles = [m["title"] for m in lr["memories"]]
        assert "TEST_memory" in titles


# ---------- plans lifecycle ----------
class TestPlans:
    def test_full_lifecycle(self, s, pair_ctx):
        # 1. propose
        r = s.post(f"{API}/plans", json={
            "pair_id": pair_ctx["pair_id"], "device_id": pair_ctx["dev_a"],
            "name": "Alice", "title": "TEST_plan_lake",
            "category": "outing", "notes": "bring the flask", "when": "sat",
        })
        assert r.status_code == 200
        plan = r.json()["plan"]
        assert plan["status"] == "proposed"
        assert pair_ctx["dev_a"] in plan["accepted_by"]
        pid = plan["id"]

        # 2. accept (2nd device)
        r = s.post(f"{API}/plans/{pid}/accept", json={"device_id": pair_ctx["dev_b"]})
        assert r.status_code == 200
        assert r.json()["plan"]["status"] == "confirmed"

        # 3. complete → creates memory
        pre_mems = s.get(f"{API}/memories", params={"pair_id": pair_ctx["pair_id"]}).json()["memories"]
        r = s.post(f"{API}/plans/{pid}/complete", json={"device_id": pair_ctx["dev_a"]})
        assert r.status_code == 200
        assert r.json()["plan"]["status"] == "done"
        post_mems = s.get(f"{API}/memories", params={"pair_id": pair_ctx["pair_id"]}).json()["memories"]
        assert len(post_mems) == len(pre_mems) + 1
        assert any(m["title"] == "TEST_plan_lake" for m in post_mems)

        # 4. delete → gone from list
        r = s.post(f"{API}/plans/{pid}/delete", json={"device_id": pair_ctx["dev_a"]})
        assert r.status_code == 200
        lr = s.get(f"{API}/plans", params={"pair_id": pair_ctx["pair_id"]}).json()
        assert not any(p["id"] == pid for p in lr["plans"])


# ---------- websocket ----------
class TestWebSocket:
    def test_reveal_event_broadcast(self, s):
        """Fresh pair; open WS as A, submit A then B, expect a 'reveal' event."""
        async def run():
            dev_a = f"TEST-WA-{uuid.uuid4()}"
            dev_b = f"TEST-WB-{uuid.uuid4()}"
            r = s.post(f"{API}/pairs", json={"type": "romantic", "device_id": dev_a, "name": "A"})
            pair_id = r.json()["pair"]["id"]
            code = r.json()["pair"]["code"]

            async with websockets.connect(f"{WS_BASE}/{pair_id}") as ws_a:
                # join B (should emit member_joined to ws_a)
                s.post(f"{API}/pairs/join", json={"code": code, "device_id": dev_b, "name": "B"})
                got_member = False
                got_reveal = False
                async def submit_both():
                    s.post(f"{API}/responses", json={
                        "pair_id": pair_id, "prompt_index": 0,
                        "device_id": dev_a, "body": "WS A body",
                    })
                    await asyncio.sleep(0.1)
                    s.post(f"{API}/responses", json={
                        "pair_id": pair_id, "prompt_index": 0,
                        "device_id": dev_b, "body": "WS B body",
                    })

                submit_task = asyncio.create_task(submit_both())
                try:
                    for _ in range(8):
                        raw = await asyncio.wait_for(ws_a.recv(), timeout=5)
                        msg = json.loads(raw)
                        if msg.get("type") == "member_joined":
                            got_member = True
                        if msg.get("type") == "reveal":
                            got_reveal = True
                            assert len(msg["responses"]) == 2
                            bodies = {r["body"] for r in msg["responses"]}
                            assert bodies == {"WS A body", "WS B body"}
                            assert msg["streak"] == 1
                            break
                finally:
                    await submit_task
                assert got_reveal, "Did not receive reveal event"
                assert got_member, "Did not receive member_joined event"

        asyncio.get_event_loop().run_until_complete(run())

    def test_kiss_rebroadcast_via_ws(self, s):
        async def run():
            dev_a = f"TEST-KA-{uuid.uuid4()}"
            r = s.post(f"{API}/pairs", json={"type": "romantic", "device_id": dev_a, "name": "A"})
            pair_id = r.json()["pair"]["id"]
            async with websockets.connect(f"{WS_BASE}/{pair_id}") as ws:
                await ws.send(json.dumps({"type": "kiss", "from": dev_a}))
                raw = await asyncio.wait_for(ws.recv(), timeout=5)
                msg = json.loads(raw)
                assert msg["type"] == "kiss"
                assert msg["from"] == dev_a
        asyncio.get_event_loop().run_until_complete(run())
