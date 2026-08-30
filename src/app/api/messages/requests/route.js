import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const filterSetting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: session.user.id, key: "messageSetting:filterRequests" } },
    select: { value: true },
  });
  if (filterSetting?.value === "false") return NextResponse.json({ users: [] });

  const conversations = await prisma.conversation.findMany({
    where: {
      isGroup: false,
      OR: [{ userAId: session.user.id }, { userBId: session.user.id }],
      messages: { some: { senderId: { not: session.user.id } } },
    },
    include: {
      userA: { select: { id: true, name: true, title: true, image: true } },
      userB: { select: { id: true, name: true, title: true, image: true } },
      messages: { select: { senderId: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const otherIds = conversations.map((conversation) => conversation.userAId === session.user.id ? conversation.userBId : conversation.userAId);
  const accepted = await prisma.connection.findMany({
    where: {
      status: "accepted",
      OR: otherIds.flatMap((targetId) => [
        { userAId: session.user.id, userBId: targetId },
        { userAId: targetId, userBId: session.user.id },
      ]),
    },
    select: { userAId: true, userBId: true },
  });
  const acceptedIds = new Set(accepted.map((connection) => connection.userAId === session.user.id ? connection.userBId : connection.userAId));
  const requests = conversations.filter((conversation) => {
    const otherId = conversation.userAId === session.user.id ? conversation.userBId : conversation.userAId;
    return !acceptedIds.has(otherId) && conversation.messages.some((message) => message.senderId === otherId);
  });

  return NextResponse.json({
    users: requests.map((conversation) => {
      const user = conversation.userAId === session.user.id ? conversation.userB : conversation.userA;
      return { ...user, conversationId: conversation.id };
    }),
  });
}
