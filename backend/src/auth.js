import crypto from "node:crypto";
import { getToken } from "next-auth/jwt";

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, item) => {
    const separator = item.indexOf("=");
    if (separator === -1) return cookies;
    const name = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (name) {
      try { cookies[name] = decodeURIComponent(value); } catch { cookies[name] = value; }
    }
    return cookies;
  }, {});
}

export async function getSessionUserId(request) {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET is required by the backend");
  }

  const rawRequest = request.raw;
  const forwardedUserId = rawRequest.headers["x-lynora-user-id"];
  const forwardedSignature = rawRequest.headers["x-lynora-user-signature"];
  if (forwardedUserId && forwardedSignature) {
    const expectedSignature = crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET).update(forwardedUserId).digest("hex");
    if (forwardedSignature.length === expectedSignature.length && crypto.timingSafeEqual(Buffer.from(forwardedSignature), Buffer.from(expectedSignature))) return forwardedUserId;
  }
  const token = await getToken({
    req: {
      headers: rawRequest.headers,
      cookies: parseCookies(rawRequest.headers.cookie),
    },
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.id || token?.sub || null;
}
