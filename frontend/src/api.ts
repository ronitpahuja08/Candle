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

export function fileUrl(path: string): string {
  return `${BASE}/api/files/${path}`;
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

export function getCardsState(pairId: string, deviceId: string) {
  return req(`/cards/state?pair_id=${pairId}&device_id=${deviceId}`);
}

export function submitResponse(payload: {
  pair_id: string;
  prompt_index: number;
  device_id: string;
  body?: string;
  mood?: string | null;
  image_path?: string | null;
}) {
  return req("/responses", { method: "POST", body: JSON.stringify(payload) });
}

export async function uploadPhoto(
  uri: string,
  name: string,
  type: string,
  deviceId: string,
  pairId: string
): Promise<{ path: string }> {
  const form = new FormData();
  const { Platform } = require("react-native");
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    // native FormData file shape
    form.append("file", { uri, name, type } as any);
  }
  form.append("device_id", deviceId);
  form.append("pair_id", pairId);
  const res = await fetch(`${BASE}/api/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return res.json();
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
  date?: string | null;
  image_url?: string | null;
}) {
  return req("/plans", { method: "POST", body: JSON.stringify(payload) });
}

export function addMemory(payload: {
  pair_id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  image_url?: string | null;
}) {
  return req("/memories", { method: "POST", body: JSON.stringify(payload) });
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
