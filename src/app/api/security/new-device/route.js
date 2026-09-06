import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNewDeviceAlertEmail } from "@/lib/emailVerification";

function getDeviceName(userAgent = "") {
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Navigateur";
  const operatingSystem = /Windows/i.test(userAgent) ? "Windows" : /Android/i.test(userAgent) ? "Android" : /iPhone|iPad/i.test(userAgent) ? "iOS" : /Mac OS/i.test(userAgent) ? "macOS" : /Linux/i.test(userAgent) ? "Linux" : "appareil inconnu";
  return `${browser} sur ${operatingSystem}`;
}

function getDeviceHash(clientId) {
  return crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET).update(clientId).digest("hex");
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  if (!/^[a-f0-9-]{16,128}$/i.test(clientId)) return NextResponse.json({ error: "Identifiant appareil invalide" }, { status: 400 });

  const userAgent = request.headers.get("user-agent") || "";
  const deviceHash = getDeviceHash(clientId);
  const deviceName = getDeviceName(userAgent);

  try {
    const existing = await prisma.loginDevice.findUnique({ where: { userId_deviceHash: { userId, deviceHash } } });
    if (existing) {
      await prisma.loginDevice.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
      return NextResponse.json({ ok: true, newDevice: false });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.loginDevice.create({ data: { userId, deviceHash, deviceName } });
      await transaction.notification.create({
        data: {
          userId,
          type: "security_alert",
          actor: "LynoraLink",
          initials: "LL",
          text: `Nouvelle connexion détectée depuis ${deviceName}.`,
          message: "Une nouvelle connexion à votre compte a été détectée.",
          meta: JSON.stringify({ deviceName, kind: "new_login_device" }),
          read: false,
        },
      });
    });
  } catch (error) {
    if (error?.code === "P2002") return NextResponse.json({ ok: true, newDevice: false });
    console.error("New device detection failed:", error);
    return NextResponse.json({ ok: true, newDevice: false });
  }

  if (session.user.email) {
    try {
      await sendNewDeviceAlertEmail(session.user.email, deviceName);
    } catch (error) {
      console.error("New device alert email failed:", error);
    }
  }
  return NextResponse.json({ ok: true, newDevice: true });
}