import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "À l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const accountMode = url.searchParams.get("account") === "company" ? "company" : "personal";
    const targetUserId = url.searchParams.get("userId");
    const profileScopeUserId = targetUserId && targetUserId !== user.id ? null : (targetUserId || user.id);
    let companyPage = null;
    if (accountMode === "company") {
      const setting = await prisma.userSetting.findUnique({
        where: { userId_key: { userId: user.id, key: "companyPage" } },
      });
      try { companyPage = setting ? JSON.parse(setting.value) : null; } catch { companyPage = null; }
      if (!companyPage || typeof companyPage !== "object") {
        return NextResponse.json({ error: "Page entreprise introuvable" }, { status: 404 });
      }
    }

    const now = new Date();
    if (targetUserId && targetUserId !== user.id) {
      return NextResponse.json({ currentUser: { id: user.id, name: user.name, initials: initials(user.name), image: user.image }, groups: [] });
    }

    const connections = await prisma.connection.findMany({
      where: { status: "accepted", OR: [{ userAId: user.id }, { userBId: user.id }] },
      select: { userAId: true, userBId: true },
    });
    const connectedIds = new Set(connections.map((connection) => connection.userAId === user.id ? connection.userBId : connection.userAId));
    
    // Récupère les stories non expirées, groupées par utilisateur
    const stories = await prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
        companyPageId: accountMode === "company" ? user.id : null,
        OR: [{ userId: profileScopeUserId || user.id }, { privacy: "network", userId: { in: [...connectedIds] } }, { privacy: "close", userId: { in: [...connectedIds] } }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, image: true, title: true } },
        views: { 
          include: { 
            user: { select: { id: true, name: true, image: true } } 
          }
        },
        reactions: { select: { id: true, userId: true, reaction: true } },
      },
    });

    // Groupe les stories par utilisateur
    const grouped = {};
    stories.forEach((story) => {
      const userId = story.userId;
      const isCompanyStory = accountMode === "company" && story.companyPageId === user.id;
      const authorName = isCompanyStory ? (companyPage.name || "Page entreprise") : story.author.name;
      const authorImage = isCompanyStory ? (companyPage.logoUrl || companyPage.avatarUrl || companyPage.image || null) : story.author.image;
      if (!grouped[userId]) {
        grouped[userId] = {
          id: `group-${userId}`,
          user: {
            id: story.author.id,
            name: authorName,
            initials: initials(authorName),
            image: authorImage,
            authorType: isCompanyStory ? "page" : "person",
            pageId: isCompanyStory ? story.companyPageId : null,
          },
          items: [],
        };
      }
      grouped[userId].items.push({
        id: story.id,
        companyPageId: story.companyPageId,
        authorType: isCompanyStory ? "page" : "person",
        type: story.type,
        text: story.text,
        image: story.image,
        bg: story.backgroundColor,
        privacy: story.privacy,
        createdAt: story.createdAt.getTime(),
        seen: story.views.some((v) => v.userId === user.id),
        views: story.views.map((v) => ({
          id: v.id,
          userId: v.user.id,
          name: v.user.name,
          initials: initials(v.user.name),
          image: v.user.image,
          time: timeAgo(v.viewedAt),
        })),
        reactions: story.reactions.reduce((acc, r) => {
          acc[r.reaction] = (acc[r.reaction] || 0) + 1;
          return acc;
        }, {}),
      });
    });

    // Tri : stories de l'utilisateur en premier, puis autres par ordre décroissant
    const groups = Object.values(grouped);
    const currentUserGroup = groups.find((g) => g.user.id === user.id);
    const otherGroups = groups.filter((g) => g.user.id !== user.id);

    const result = [];
    if (currentUserGroup) result.push(currentUserGroup);
    result.push(...otherGroups);

    return NextResponse.json({
      currentUser: {
        id: user.id,
        name: accountMode === "company" ? (companyPage.name || "Page entreprise") : user.name,
        initials: initials(accountMode === "company" ? (companyPage.name || "Page entreprise") : user.name),
        image: accountMode === "company" ? (companyPage.logoUrl || companyPage.avatarUrl || companyPage.image || null) : user.image,
        authorType: accountMode === "company" ? "page" : "person",
        pageId: accountMode === "company" ? user.id : null,
      },
      groups: result,
    });
  } catch (err) {
    console.error("GET /api/stories:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { text, image, type, backgroundColor, privacy } = body;
    const accountMode = body.account === "company" ? "company" : "personal";
    let companyPageId = null;
    if (accountMode === "company") {
      const companyPage = await prisma.userSetting.findUnique({
        where: { userId_key: { userId: user.id, key: "companyPage" } },
      });
      if (!companyPage) return NextResponse.json({ error: "Page entreprise introuvable" }, { status: 404 });
      companyPageId = user.id;
    }

    if (!text && !image) {
      return NextResponse.json({ error: "Text or image is required" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    const story = await prisma.story.create({
      data: {
        userId: user.id,
        companyPageId,
        text,
        image,
        type: type || "text",
        privacy: ["network", "close", "private"].includes(privacy) ? privacy : "network",
        backgroundColor,
        expiresAt,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        views: { select: { id: true } },
        reactions: { select: { id: true, userId: true, reaction: true } },
      },
    });

    return NextResponse.json({
      id: story.id,
      type: story.type,
      text: story.text,
      image: story.image,
      bg: story.backgroundColor,
      privacy: story.privacy,
      createdAt: story.createdAt.getTime(),
      seen: false,
      views: [],
    });
  } catch (err) {
    console.error("POST /api/stories:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
