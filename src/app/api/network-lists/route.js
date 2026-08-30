import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const NETWORK_LISTS_KEY = "network_lists";

function safeParseLists(rawValue) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) return parsed.filter((item) => item && typeof item === "object");
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.lists)) {
      return parsed.lists.filter((item) => item && typeof item === "object");
    }
  } catch {
    return [];
  }

  return [];
}

function normalizeList(item, index) {
  const id = typeof item?.id === "string" && item.id ? item.id : `list-${Date.now()}-${index}`;
  const name = typeof item?.name === "string" && item.name.trim() ? item.name.trim() : `Liste ${index + 1}`;
  const description = typeof item?.description === "string" ? item.description : "";
  const color = typeof item?.color === "string" ? item.color : "#D4A72C";
  const memberIds = Array.isArray(item?.memberIds)
    ? [...new Set(item.memberIds.filter(Boolean).map((value) => String(value)))]
    : [];

  return {
    id,
    name,
    description,
    color,
    memberIds,
    createdAt: item?.createdAt || new Date().toISOString(),
  };
}

async function getNetworkLists(userId) {
  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: userId, key: NETWORK_LISTS_KEY } },
    select: { value: true },
  });

  const selected = safeParseLists(setting?.value);
  return selected.map(normalizeList);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const lists = await getNetworkLists(session.user.id);
  return NextResponse.json({ lists });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Le nom de la liste est obligatoire." }, { status: 400 });
  }

  const existingLists = await getNetworkLists(session.user.id);
  const nextList = normalizeList({
    id: body?.id || `list-${Date.now()}`,
    name,
    description: typeof body?.description === "string" ? body.description : "",
    color: typeof body?.color === "string" ? body.color : "#D4A72C",
    memberIds: Array.isArray(body?.memberIds) ? body.memberIds : [],
    createdAt: new Date().toISOString(),
  }, existingLists.length);

  const nextLists = [nextList, ...existingLists.filter((list) => list.id !== nextList.id)];
  await prisma.userSetting.upsert({
    where: { userId_key: { userId: session.user.id, key: NETWORK_LISTS_KEY } },
    update: { value: JSON.stringify(nextLists) },
    create: { userId: session.user.id, key: NETWORK_LISTS_KEY, value: JSON.stringify(nextLists) },
  });

  return NextResponse.json({ ok: true, list: nextList, lists: nextLists });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const listId = body?.id || body?.listId;
  if (!listId) {
    return NextResponse.json({ error: "Identifiant de liste requis." }, { status: 400 });
  }

  const existingLists = await getNetworkLists(session.user.id);
  const targetIndex = existingLists.findIndex((list) => list.id === listId);
  if (targetIndex === -1) {
    return NextResponse.json({ error: "Liste introuvable." }, { status: 404 });
  }

  const updated = normalizeList({
    ...existingLists[targetIndex],
    name: typeof body?.name === "string" ? body.name : existingLists[targetIndex].name,
    description: typeof body?.description === "string" ? body.description : existingLists[targetIndex].description,
    color: typeof body?.color === "string" ? body.color : existingLists[targetIndex].color,
    memberIds: Array.isArray(body?.memberIds) ? body.memberIds : existingLists[targetIndex].memberIds,
  }, targetIndex);

  const nextLists = [...existingLists];
  nextLists[targetIndex] = updated;

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: session.user.id, key: NETWORK_LISTS_KEY } },
    update: { value: JSON.stringify(nextLists) },
    create: { userId: session.user.id, key: NETWORK_LISTS_KEY, value: JSON.stringify(nextLists) },
  });

  return NextResponse.json({ ok: true, list: updated, lists: nextLists });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("id") || searchParams.get("listId");
  if (!listId) {
    return NextResponse.json({ error: "Identifiant de liste requis." }, { status: 400 });
  }

  const existingLists = await getNetworkLists(session.user.id);
  const nextLists = existingLists.filter((list) => list.id !== listId);

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: session.user.id, key: NETWORK_LISTS_KEY } },
    update: { value: JSON.stringify(nextLists) },
    create: { userId: session.user.id, key: NETWORK_LISTS_KEY, value: JSON.stringify(nextLists) },
  });

  return NextResponse.json({ ok: true, lists: nextLists });
}
