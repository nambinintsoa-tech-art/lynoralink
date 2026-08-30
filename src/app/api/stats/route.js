import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [usersCount, companiesCount, postsCount, commentsCount] = await Promise.all([
      prisma.user.count({ where: { status: "active" } }),
      prisma.user.count({ where: { status: "active", title: { not: null } } }),
      prisma.post.count({ where: { status: "published" } }),
      prisma.comment.count({ where: { post: { status: "published" } } }),
    ]);

    const stats = [
      { value: usersCount, label: "Professionnels actifs" },
      { value: companiesCount, label: "Entreprises présentes" },
      { value: postsCount, label: "Publications partagées" },
      { value: commentsCount, label: "Échanges engagés" },
    ];

    return NextResponse.json({ stats });
  } catch (err) {
    console.error("Erreur stats:", err);
    return NextResponse.json({ stats: [] }, { status: 500 });
  }
}
