import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Haptics from "expo-haptics";
import * as api from "@/src/api";

// Three heavy impacts, 110ms apart. Both phones run this off the same realtime
// event so they land within a few hundred ms of each other.
export async function buzz() {
  for (let i = 0; i < 3; i++) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    await new Promise((r) => setTimeout(r, 110));
  }
}

export type PairState = "open" | "waiting" | "their_turn" | "revealed";

export type RevealPayload = {
  prompt_index: number;
  responses: any[];
  streak: number;
} | null;

export function usePair(
  pairId: string | null,
  promptIndex: number,
  deviceId: string | null
) {
  const [state, setState] = useState<PairState>("open");
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(false);
  const [revealed, setRevealed] = useState<any[] | null>(null);
  const [streak, setStreak] = useState(0);
  const [reveal, setReveal] = useState<RevealPayload>(null); // fires the Reveal screen
  const [partnerJoined, setPartnerJoined] = useState(0);
  const [dataVersion, setDataVersion] = useState(0); // bump to refetch plans/memories

  const wsRef = useRef<WebSocket | null>(null);
  const revealedOnce = useRef<number | null>(null);

  const fireReveal = useCallback(
    (payload: { prompt_index: number; responses: any[]; streak: number }) => {
      if (revealedOnce.current === payload.prompt_index) return;
      revealedOnce.current = payload.prompt_index;
      setRevealed(payload.responses);
      setStreak(payload.streak);
      setState("revealed");
      setCount(2);
      setReveal(payload);
      buzz();
    },
    []
  );

  const refetch = useCallback(async () => {
    if (!pairId || !deviceId) return;
    try {
      const s = await api.getState(pairId, promptIndex, deviceId);
      setCount(s.count);
      setMine(s.mine);
      setStreak(s.streak);
      if (s.state === "revealed") {
        setRevealed(s.revealed);
        setState("revealed");
        revealedOnce.current = promptIndex;
      } else {
        setRevealed(null);
        setState(s.state);
      }
    } catch {}
  }, [pairId, deviceId, promptIndex]);

  const connect = useCallback(() => {
    if (!pairId) return;
    try {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
      const ws = new WebSocket(api.wsUrl(pairId));
      wsRef.current = ws;
      ws.onmessage = (e) => {
        let msg: any;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        if (msg.type === "reveal") {
          // Refresh lists for any card reveal; only fire the overlay for THIS card.
          setDataVersion((n) => n + 1);
          if (msg.prompt_index === promptIndex) fireReveal(msg);
        } else if (msg.type === "response_added") {
          setCount(msg.count);
          if (msg.author_device_id !== deviceId) {
            setState((prev) => (prev === "waiting" ? "waiting" : "their_turn"));
          }
        } else if (msg.type === "member_joined") {
          setPartnerJoined((n) => n + 1);
        } else if (msg.type === "kiss") {
          if (msg.from !== deviceId) buzz();
        } else if (
          msg.type === "plan_added" ||
          msg.type === "plan_updated" ||
          msg.type === "memory_added"
        ) {
          setDataVersion((n) => n + 1);
        }
      };
      ws.onclose = () => {};
    } catch {}
  }, [pairId, deviceId, fireReveal]);

  // Subscribe once per pair; re-fetch initial state.
  useEffect(() => {
    if (!pairId || !deviceId) return;
    revealedOnce.current = null;
    setReveal(null);
    refetch();
    connect();
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairId, deviceId, promptIndex]);

  // A backgrounded phone with a dead socket is how this demo fails on stage.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        connect();
        refetch();
      }
    });
    return () => sub.remove();
  }, [connect, refetch]);

  const submit = useCallback(
    async (opts: { body?: string; mood?: string; image_path?: string }) => {
      if (!pairId || !deviceId) return;
      // Optimistic: set my own answer immediately, never wait for my echo.
      setMine(true);
      setState("waiting");
      try {
        const res = await api.submitResponse({
          pair_id: pairId,
          prompt_index: promptIndex,
          device_id: deviceId,
          body: opts.body || "",
          mood: opts.mood,
          image_path: opts.image_path,
        });
        if (res.revealed) {
          fireReveal({
            prompt_index: promptIndex,
            responses: res.revealed,
            streak: res.streak,
          });
        } else {
          setCount(res.count);
        }
      } catch {}
    },
    [pairId, deviceId, promptIndex, fireReveal]
  );

  const kiss = useCallback(async () => {
    if (!pairId || !deviceId) return;
    try {
      await api.sendKiss(pairId, deviceId);
    } catch {}
  }, [pairId, deviceId]);

  const clearReveal = useCallback(() => setReveal(null), []);

  return {
    state,
    count,
    mine,
    revealed,
    streak,
    reveal,
    clearReveal,
    partnerJoined,
    dataVersion,
    submit,
    kiss,
    refetch,
  };
}
