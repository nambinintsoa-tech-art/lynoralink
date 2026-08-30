const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const seedEmails = [
    "hery.rakoto@lynoralink.com",
    "fanja.rasolofoson@lynoralink.com",
  ];

  const seedUsers = await prisma.user.findMany({
    where: { email: { in: seedEmails } },
    select: { id: true },
  });
  const seedUserIds = seedUsers.map(({ id }) => id);

  if (seedUserIds.length > 0) {
    await prisma.$transaction(async (tx) => {
      const conversations = await tx.conversation.findMany({
        where: { OR: [{ userAId: { in: seedUserIds } }, { userBId: { in: seedUserIds } }] },
        select: { id: true },
      });
      const conversationIds = conversations.map(({ id }) => id);

      if (conversationIds.length > 0) {
        await tx.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
        await tx.conversation.deleteMany({ where: { id: { in: conversationIds } } });
      }

      await tx.notification.deleteMany({
        where: { OR: [{ userId: { in: seedUserIds } }, { senderId: { in: seedUserIds } }] },
      });
      await tx.user.deleteMany({ where: { id: { in: seedUserIds } } });
    });
  }

  console.log(`Nettoyage terminé : ${seedUserIds.length} utilisateur(s) seed supprimé(s), avec leurs messages et notifications.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
