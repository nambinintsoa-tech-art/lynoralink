import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const memberSelect = { user: { select: { id: true, name: true, title: true, image: true } } };

function formatMember(member) {
  return {
    id: member.user.id,
    name: member.user.name || "Utilisateur",
    title: member.user.title || "Membre LynoraLink",
    image: member.user.image || null,
  };
}

async function getAuthorizedConversation(conversationId, userId) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { userAId: userId },
        { userBId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: { members: { include: memberSelect } },
  });
}

export async function registerMessageMemberRoutes(app) {
  app.post("/v1/messages/:conversationId/participants", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });

    const conversation = await getAuthorizedConversation(request.params.conversationId, userId);
    if (!conversation) return reply.code(404).send({ error: "Conversation introuvable" });
    if (!conversation.isGroup) return reply.code(400).send({ error: "Les participants ne peuvent être modifiés que pour un groupe" });

    const participantIds = [...new Set((Array.isArray(request.body?.participantIds) ? request.body.participantIds : []).map(String))]
      .filter((participantId) => participantId && participantId !== userId);
    if (!participantIds.length) return reply.code(400).send({ error: "Participant invalide" });

    const users = await prisma.user.findMany({ where: { id: { in: participantIds } }, select: { id: true } });
    if (users.length !== participantIds.length) return reply.code(404).send({ error: "Un participant est introuvable" });

    await prisma.conversationMember.createMany({
      data: participantIds.map((participantId) => ({ conversationId: conversation.id, userId: participantId })),
      skipDuplicates: true,
    });
    const members = await prisma.conversationMember.findMany({ where: { conversationId: conversation.id }, include: memberSelect });
    return reply.send({ ok: true, members: members.map(formatMember) });
  });

  app.delete("/v1/messages/:conversationId/participants", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });

    const conversation = await getAuthorizedConversation(request.params.conversationId, userId);
    if (!conversation) return reply.code(404).send({ error: "Conversation introuvable" });
    if (!conversation.isGroup) return reply.code(400).send({ error: "Seuls les groupes peuvent être quittés" });

    await prisma.conversationMember.deleteMany({ where: { conversationId: conversation.id, userId } });
    return reply.send({ ok: true, conversationId: conversation.id });
  });
}