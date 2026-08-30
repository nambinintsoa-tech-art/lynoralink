import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  maintenanceMode: "false",
  allowRegistration: "true",
  requireEmailVerification: "true",
  maxPostsPerDay: "10",
  maxGroupMembers: "50000",
  autoApprovePosts: "true",
  enableArticles: "true",
  enableGroups: "true",
  enableMessages: "true",
  enablePages: "true",
  contentFilterLevel: "medium",
  defaultGroupPrivacy: "public",
  allowedFileTypes: "jpg, png, gif, pdf, mp4",
  maxFileSize: "25",
};

function pickSetting(rows, key, fallback) {
  const row = rows.find((r) => r.key === key);
  return row ? row.value : fallback;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const settings = await prisma.platformSetting.findMany();

  const shaped = {
    maintenanceMode: pickSetting(settings, "maintenanceMode", DEFAULTS.maintenanceMode) === "true",
    allowRegistration: pickSetting(settings, "allowRegistration", DEFAULTS.allowRegistration) === "true",
    requireEmailVerification: pickSetting(settings, "requireEmailVerification", DEFAULTS.requireEmailVerification) === "true",
    maxPostsPerDay: parseInt(pickSetting(settings, "maxPostsPerDay", DEFAULTS.maxPostsPerDay), 10) || 10,
    maxGroupMembers: parseInt(pickSetting(settings, "maxGroupMembers", DEFAULTS.maxGroupMembers), 10) || 50000,
    autoApprovePosts: pickSetting(settings, "autoApprovePosts", DEFAULTS.autoApprovePosts) === "true",
    enableArticles: pickSetting(settings, "enableArticles", DEFAULTS.enableArticles) === "true",
    enableGroups: pickSetting(settings, "enableGroups", DEFAULTS.enableGroups) === "true",
    enableMessages: pickSetting(settings, "enableMessages", DEFAULTS.enableMessages) === "true",
    enablePages: pickSetting(settings, "enablePages", DEFAULTS.enablePages) === "true",
    contentFilterLevel: pickSetting(settings, "contentFilterLevel", DEFAULTS.contentFilterLevel),
    defaultGroupPrivacy: pickSetting(settings, "defaultGroupPrivacy", DEFAULTS.defaultGroupPrivacy),
    allowedFileTypes: pickSetting(settings, "allowedFileTypes", DEFAULTS.allowedFileTypes),
    maxFileSize: parseInt(pickSetting(settings, "maxFileSize", DEFAULTS.maxFileSize), 10) || 25,
  };

  return NextResponse.json({ settings: shaped });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const settings = body?.settings || {};

    const toUpsert = [
      { key: "maintenanceMode", value: String(Boolean(settings.maintenanceMode)) },
      { key: "allowRegistration", value: String(Boolean(settings.allowRegistration)) },
      { key: "requireEmailVerification", value: String(Boolean(settings.requireEmailVerification)) },
      { key: "maxPostsPerDay", value: String(settings.maxPostsPerDay ?? DEFAULTS.maxPostsPerDay) },
      { key: "maxGroupMembers", value: String(settings.maxGroupMembers ?? DEFAULTS.maxGroupMembers) },
      { key: "autoApprovePosts", value: String(Boolean(settings.autoApprovePosts)) },
      { key: "enableArticles", value: String(Boolean(settings.enableArticles)) },
      { key: "enableGroups", value: String(Boolean(settings.enableGroups)) },
      { key: "enableMessages", value: String(Boolean(settings.enableMessages)) },
      { key: "enablePages", value: String(Boolean(settings.enablePages)) },
      { key: "contentFilterLevel", value: String(settings.contentFilterLevel || DEFAULTS.contentFilterLevel) },
      { key: "defaultGroupPrivacy", value: String(settings.defaultGroupPrivacy || DEFAULTS.defaultGroupPrivacy) },
      { key: "allowedFileTypes", value: String(settings.allowedFileTypes || DEFAULTS.allowedFileTypes) },
      { key: "maxFileSize", value: String(settings.maxFileSize ?? DEFAULTS.maxFileSize) },
    ];

    for (const s of toUpsert) {
      await prisma.platformSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: s,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
