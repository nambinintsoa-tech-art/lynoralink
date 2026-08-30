export function getClientIp(request) {
  if (!request) return null;

  const headers = request.headers ? request.headers : {};
  const source = typeof headers.get === "function"
    ? [
        headers.get("x-forwarded-for"),
        headers.get("x-real-ip"),
        headers.get("cf-connecting-ip"),
        headers.get("true-client-ip"),
      ].find(Boolean)
    : [
        headers["x-forwarded-for"],
        headers["x-real-ip"],
        headers["cf-connecting-ip"],
        headers["true-client-ip"],
      ].find(Boolean);

  if (!source) return null;

  const ip = String(source).split(",")[0].trim();
  return ip && ip !== "unknown" ? ip : null;
}

export async function resolveGeoForIp(ip) {
  if (!ip || ip.startsWith("127.") || ip === "::1" || ip === "localhost") {
    return { countryCode: null, countryName: null, city: null, region: null, source: "local" };
  }

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { countryCode: null, countryName: null, city: null, region: null, source: "unavailable" };
    }

    const data = await response.json();
    const countryCode = data?.country_code || data?.countryCode || null;
    const countryName = data?.country_name || data?.countryName || null;
    const city = data?.city || null;
    const region = data?.region || data?.region_name || null;

    return {
      countryCode: countryCode ? String(countryCode).toUpperCase() : null,
      countryName: countryName || null,
      city: city || null,
      region: region || null,
      source: "ipapi",
    };
  } catch {
    return { countryCode: null, countryName: null, city: null, region: null, source: "error" };
  }
}

export async function resolveGeoFromRequest(request) {
  const ip = getClientIp(request);
  const geo = await resolveGeoForIp(ip);
  return { ip, ...geo };
}
