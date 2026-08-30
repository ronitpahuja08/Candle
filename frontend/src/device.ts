import { storage } from "@/src/utils/storage";

const DEVICE_KEY = "candle.device_id";

function uuid(): string {
  // RFC4122-ish v4, good enough for anonymous device identity.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// getDeviceId — created once, then reused across launches.
export async function getDeviceId(): Promise<string> {
  const existing = await storage.getItem<string>(DEVICE_KEY, "");
  if (existing) return existing;
  const id = uuid();
  await storage.setItem(DEVICE_KEY, id);
  return id;
}
