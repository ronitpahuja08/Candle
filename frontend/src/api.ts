const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.detail) detail = j.detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export function wsUrl(pairId: string): string {
  const base = (BASE || "").replace(/^http/, "ws");
  return `${base}/api/ws/${pairId}`;
}

// ---- Pairs -----------------------------------------------------------------
export function createPair(payload: {
  type: string;
  intent?: string | null;
  proximity?: string | null;
  pace: number;
  device_id: string;
  name?: string | null;
}) {
  return req("/pairs", { method: "POST", body: JSON.stringify(payload) });
}

export function joinPair(payload: {
  code: string;
  device_id: string;
  name?: string | null;
}) {
  return req("/pairs/join", { method: "POST", body: JSON.stringify(payload) });
}

export function pairsByDevice(deviceId: string) {
  return req(`/pairs/by-device/${deviceId}`);
}

// ---- Responses (the seal) --------------------------------------------------
export function getState(pairId: string, promptIndex: number, deviceId: string) {
  return req(
    `/responses/state?pair_id=${pairId}&prompt_index=${promptIndex}&device_id=${deviceId}`
  );
}

export function submitResponse(payload: {
  pair_id: string;
  prompt_index: number;
  device_id: string;
  body: string;
  mood?: string | null;
}) {
  return req("/responses", { method: "POST", body: JSON.stringify(payload) });
}

export function sendKiss(pairId: string, deviceId: string) {
  return req("/kiss", {
    method: "POST",
    body: JSON.stringify({ pair_id: pairId, device_id: deviceId }),
  });
}

// ---- Memories --------------------------------------------------------------
export function getMemories(pairId: string) {
  return req(`/memories?pair_id=${pairId}`);
}

export function addMemory(payload: {
  pair_id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
}) {
  return req("/memories", { method: "POST", body: JSON.stringify(payload) });
}

// ---- Plans -----------------------------------------------------------------
export function getPlans(pairId: string) {
  return req(`/plans?pair_id=${pairId}`);
}

export function createPlan(payload: {
  pair_id: string;
  device_id: string;
  name?: string | null;
  title: string;
  category: string;
  notes?: string | null;
  when?: string | null;
}) {
  return req("/plans", { method: "POST", body: JSON.stringify(payload) });
}

export function acceptPlan(planId: string, deviceId: string) {
  return req(`/plans/${planId}/accept`, {
    method: "POST",
    body: JSON.stringify({ device_id: deviceId }),
  });
}

export function completePlan(planId: string, deviceId: string) {
  return req(`/plans/${planId}/complete`, {
    method: "POST",
    body: JSON.stringify({ device_id: deviceId }),
  });
}

export function deletePlan(planId: string, deviceId: string) {
  return req(`/plans/${planId}/delete`, {
    method: "POST",
    body: JSON.stringify({ device_id: deviceId }),
  });
}
