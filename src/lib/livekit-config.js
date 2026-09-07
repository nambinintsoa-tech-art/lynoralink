export function getLiveKitUrl() {
  const value = (process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://lynoralink-zq81w6x1.livekit.cloud").trim();
  if (!value) return "";
  return value.replace(/\/$/, "").replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
}

export function hasLiveKitConfig() {
  return Boolean(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && getLiveKitUrl());
}