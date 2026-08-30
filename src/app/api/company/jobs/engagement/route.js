import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function keyFor(jobId) {
  return `jobEngagement:${jobId}`;
}

function emptyEngagement() {
  return { reactions: {}, comments: [], shares: 0, bookmarks: [] };
}

function updateCommentReaction(comments, commentId, userId, reaction) {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      const reactions = Object.fromEntries(Object.entries(comment.reactions || {}).map(([name, ids]) => [name, Array.isArray(ids) ? ids : []]));
      if (reactions[reaction]?.includes(userId)) {
        reactions[reaction] = reactions[reaction].filter((id) => id !== userId);
      } else {
        reactions[reaction] = [...new Set([...(reactions[reaction] || []), userId])];
      }
      return { ...comment, reactions };
    }
    return { ...comment, replies: updateCommentReaction(comment.replies || [], commentId, userId, reaction) };
  });
}

function appendCommentReply(comments, parentCommentId, reply) {
  return comments.map((comment) => comment.id === parentCommentId
    ? { ...comment, replies: [...(comment.replies || []), reply] }
    : { ...comment, replies: appendCommentReply(comment.replies || [], parentCommentId, reply) });
}

function findComment(comments, commentId) {
  for (const comment of comments) {
    if (comment.id === commentId) return comment;
    const nestedComment = findComment(comment.replies || [], commentId);
    if (nestedComment) return nestedComment;
  }
  return null;
}

async function readEngagement(ownerId, jobId) {
  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: ownerId, key: keyFor(jobId) } },
  });
  if (!setting) return emptyEngagement();
  try {
    const value = JSON.parse(setting.value);
    return { ...emptyEngagement(), ...value };
  } catch {
    return emptyEngagement();
  }
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const ownerId = params.get("ownerId");
  const jobId = params.get("jobId");
  if (!ownerId || !jobId) return NextResponse.json({ error: "Offre invalide" }, { status: 400 });
  return NextResponse.json(await readEngagement(ownerId, jobId));
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { ownerId, jobId, action, reaction = "ok", commentId, parentCommentId, text = "", media = [] } = body;
  if (!ownerId || !jobId) return NextResponse.json({ error: "Offre invalide" }, { status: 400 });

  const engagement = await readEngagement(ownerId, jobId);
  const userId = session.user.id;
  const next = { ...engagement };
  if (action === "reaction") {
    const reactions = Object.fromEntries(Object.entries(next.reactions || {}).map(([name, ids]) => [name, Array.isArray(ids) ? ids : []]));
    const existingKey = Object.keys(reactions).find((name) => reactions[name].includes(userId));
    if (existingKey) reactions[existingKey] = reactions[existingKey].filter((id) => id !== userId);
    if (existingKey !== reaction) reactions[reaction] = [...new Set([...(reactions[reaction] || []), userId])];
    next.reactions = reactions;
  } else if (action === "comment" && String(text).trim()) {
    next.comments = [...(Array.isArray(next.comments) ? next.comments : []), {
      id: `${userId}-${Date.now()}`,
      authorId: userId,
      author: session.user.name || "Utilisateur",
      initials: (session.user.name || "U").split(" ").filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join(""),
      avatarUrl: session.user.image || null,
      text: String(text).trim(),
      time: new Date().toISOString(),
      replies: [],
    }];
  } else if (action === "commentReaction" && commentId) {
    next.comments = updateCommentReaction(Array.isArray(next.comments) ? next.comments : [], commentId, userId, reaction);
  } else if (action === "commentReply" && parentCommentId && String(text).trim()) {
    next.comments = appendCommentReply(Array.isArray(next.comments) ? next.comments : [], parentCommentId, {
      id: `${userId}-${Date.now()}`,
      authorId: userId,
      author: session.user.name || "Utilisateur",
      initials: (session.user.name || "U").split(" ").filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join(""),
      avatarUrl: session.user.image || null,
      text: String(text).trim(),
      media: Array.isArray(media) ? media : [],
      time: new Date().toISOString(),
      replies: [],
    });
  } else if (action === "share") {
    next.shares = Number(next.shares || 0) + 1;
  } else if (action === "bookmark") {
    const bookmarks = Array.isArray(next.bookmarks) ? next.bookmarks : [];
    next.bookmarks = bookmarks.includes(userId) ? bookmarks.filter((id) => id !== userId) : [...bookmarks, userId];
  }

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: ownerId, key: keyFor(jobId) } },
    create: { userId: ownerId, key: keyFor(jobId), value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  if (action === "commentReaction" && commentId) {
    const updatedComment = findComment(next.comments || [], commentId);
    const commentReactions = updatedComment?.reactions || {};
    return NextResponse.json({
      ...next,
      reaction: Object.entries(commentReactions).find(([, ids]) => ids.includes(userId))?.[0] || null,
      reactionKeys: Object.entries(commentReactions).filter(([, ids]) => ids.length > 0).sort(([, first], [, second]) => second.length - first.length).map(([key]) => key).slice(0, 3),
      totalReactions: Object.values(commentReactions).reduce((total, ids) => total + ids.length, 0),
    });
  }
  return NextResponse.json(next);
}
