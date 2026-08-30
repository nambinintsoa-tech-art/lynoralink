import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true },
  });
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
  const isAdmin = user?.role === "admin" || Boolean(adminEmail && user?.email?.toLowerCase() === adminEmail);
  if (!isAdmin) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { user, session };
}

async function analyzeTasks() {
    const [pendingReports, pendingPosts, restrictedUsers, openSupport, incompleteProfiles] = await Promise.all([
      prisma.report.count({ where: { status: "pending" } }),
      prisma.post.count({ where: { status: "pending_review" } }),
      prisma.user.count({ where: { status: { in: ["suspended", "banned"] } } }),
      prisma.supportRequest.count({ where: { status: "open" } }),
      prisma.user.count({ where: { OR: [{ location: null }, { location: "" }, { sector: null }, { sector: "" }] } }),
    ]);

    const tasks = [];
    if (pendingReports > 0) tasks.push({ id: "reports", section: "reports", priority: "high", label: "Traiter les signalements", description: `${pendingReports} signalement${pendingReports > 1 ? "s" : ""} attend${pendingReports > 1 ? "ent" : ""} une décision de modération.`, count: pendingReports, requiresManualAction: true, autoHandledByAssistant: false });
    if (pendingPosts > 0) tasks.push({ id: "posts", section: "posts", priority: "high", label: "Modérer les publications", description: `${pendingPosts} publication${pendingPosts > 1 ? "s" : ""} en attente de validation.`, count: pendingPosts, requiresManualAction: true, autoHandledByAssistant: false });
    if (openSupport > 0) tasks.push({ id: "support", section: "support", priority: "medium", label: "Répondre au support", description: `${openSupport} demande${openSupport > 1 ? "s" : ""} support ouverte${openSupport > 1 ? "s" : ""}.`, count: openSupport, requiresManualAction: true, autoHandledByAssistant: false });
    if (restrictedUsers > 0) tasks.push({ id: "users", section: "users", priority: "medium", label: "Vérifier les comptes restreints", description: `${restrictedUsers} utilisateur${restrictedUsers > 1 ? "s" : ""} suspendu${restrictedUsers > 1 ? "s" : ""} ou banni${restrictedUsers > 1 ? "s" : ""}.`, count: restrictedUsers, requiresManualAction: true, autoHandledByAssistant: false });
    if (incompleteProfiles > 0) tasks.push({ id: "profiles", section: "users", priority: "low", label: "Envoyer le rappel de profil", description: `${incompleteProfiles} profil${incompleteProfiles > 1 ? "s" : ""} n’a pas encore de localisation ou de secteur ; un rappel automatique est déclenché toutes les 48h.`, count: incompleteProfiles, requiresManualAction: false, autoHandledByAssistant: true, reminderIntervalHours: 48 });

    const priorityRank = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

    const manualTasks = tasks.filter((task) => task.requiresManualAction && !task.autoHandledByAssistant);
    return {
      tasks,
      manualTasks,
      generatedAt: new Date().toISOString(),
      summary: tasks.length ? `${tasks.length} action${tasks.length > 1 ? "s" : ""} à surveiller, dont ${manualTasks.length} action${manualTasks.length === 1 ? "" : "s"} manuelle${manualTasks.length === 1 ? "" : "s"}.` : "Aucune action à traiter pour l’instant.",
      notificationEligible: tasks.length > 0,
    };
}

async function sendProfileCompletionReminders() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { location: null },
        { location: "" },
        { sector: null },
        { sector: "" },
      ],
    },
    select: { id: true },
  });

  let sent = 0;
  for (const user of users) {
    const lastReminder = await prisma.notification.findFirst({
      where: { userId: user.id, type: "profile_completion_reminder" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const isDue = !lastReminder || Date.now() - new Date(lastReminder.createdAt).getTime() >= 48 * 60 * 60 * 1000;
    if (!isDue) continue;

    await createNotification({
      userId: user.id,
      type: "profile_completion_reminder",
      actor: "LynoraLink",
      text: "Complétez votre profil pour améliorer votre visibilité et votre expérience.",
      meta: {
        kind: "profile_completion_reminder",
        reminderIntervalHours: 48,
      },
      title: "Complétez votre profil",
      url: "/settings?section=profil",
    });

    sent += 1;
  }

  return sent;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    return NextResponse.json(await analyzeTasks());
  } catch (error) {
    console.error("Erreur analyse des tâches admin:", error);
    return NextResponse.json({ error: "Impossible d'analyser les tâches administratives." }, { status: 500 });
  }
}

export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const analysis = await analyzeTasks();
    const profileReminderSent = await sendProfileCompletionReminders();

    if (!analysis.notificationEligible) {
      return NextResponse.json({ ok: true, ...analysis, notification: null, duplicate: false, profileReminderSent, message: "Aucune action à traiter pour l’instant." });
    }

    const taskDetails = analysis.tasks.length
      ? analysis.tasks.map((task) => `${task.priority.toUpperCase()} - ${task.label}: ${task.description}`).join("\n")
      : "Aucune action à traiter pour l’instant.";
    const recentNotification = await prisma.notification.findFirst({
      where: { userId: auth.session.user.id, type: "admin_ai_tasks", read: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });
    const isDuplicate = recentNotification && Date.now() - recentNotification.createdAt.getTime() < 30 * 60 * 1000;
    const notification = isDuplicate ? recentNotification : await prisma.notification.create({
      data: {
        userId: auth.session.user.id,
        type: "admin_ai_tasks",
        actor: "LynoraLink",
        initials: "LL",
        text: analysis.summary,
        message: `Actions à surveiller dans l'espace admin:\n${taskDetails}`,
        meta: JSON.stringify({
          tasks: analysis.tasks,
          generatedAt: analysis.generatedAt,
          profileReminderSent,
          manualActionsRequired: Boolean(analysis.manualTasks.length),
          avatarUrl: "/logo_lynora.svg",
          actorAvatar: "/logo_lynora.svg",
        }),
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, ...analysis, notification, duplicate: Boolean(isDuplicate), profileReminderSent });
  } catch (error) {
    console.error("Erreur exécution autonome admin:", error);
    return NextResponse.json({ error: "Impossible d'exécuter l'analyse autonome." }, { status: 500 });
  }
}
