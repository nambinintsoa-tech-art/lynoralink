import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionAccess } from "@/lib/subscription";
import { getBlockedUserIds } from "@/lib/blocking";

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const { title, bio, location, company, sector, skills, image, cover, birthDate } = body;

  const normalizedBirthDate = birthDate ? new Date(`${birthDate}T12:00:00`) : null;
  const data = {
    ...(title !== undefined ? { title } : {}),
    ...(bio !== undefined ? { bio } : {}),
    ...(birthDate !== undefined ? { birthDate: Number.isNaN(normalizedBirthDate?.getTime()) ? null : normalizedBirthDate } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(company !== undefined ? { company } : {}),
    ...(sector !== undefined ? { sector } : {}),
    ...(skills !== undefined ? { skills: JSON.stringify(skills) } : {}),
    ...(image !== undefined ? { image } : {}),
    ...(cover !== undefined ? { cover } : {}),
  };

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
  });
  const access = await getSubscriptionAccess(user.id);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();

  return NextResponse.json({
    user: {
      id: user.id,
      title: user.title,
      bio: user.bio,
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : null,
      location: user.location,
      company: user.company,
      sector: user.sector,
      skills: user.skills ? JSON.parse(user.skills) : [],
      image: user.image || null,
      avatarUrl: user.image || null,
      photoUrl: user.image || null,
      isPremium: access.isPremium,
      isPlatformAdmin: user.role === "admin" || Boolean(adminEmail && user.email?.toLowerCase() === adminEmail),
    },
  });
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const targetUserId = new URL(req.url).searchParams.get("userId") || session.user.id;
  const blockedIds = await getBlockedUserIds(prisma, session.user.id);
  if (targetUserId !== session.user.id && blockedIds.has(targetUserId)) {
    return NextResponse.json({ error: "Ce profil n'est pas accessible." }, { status: 403 });
  }
  const [user, settings, connection] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetUserId } }),
    prisma.userSetting.findMany({ where: { userId: targetUserId } }),
    targetUserId === session.user.id ? null : prisma.connection.findFirst({
      where: {
        status: "accepted",
        OR: [
          { userAId: session.user.id, userBId: targetUserId },
          { userAId: targetUserId, userBId: session.user.id },
        ],
      },
      select: { id: true },
    }),
  ]);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  const profileVisibility = settings.find((setting) => setting.key === "profileVisibility")?.value || "public";
  const canViewProfile = targetUserId === session.user.id
    || profileVisibility === "public"
    || (profileVisibility === "connections" && Boolean(connection));
  if (!canViewProfile) return NextResponse.json({ error: "Ce profil est privé." }, { status: 403 });
  const access = await getSubscriptionAccess(user.id);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();

  let skills = [];
  try {
    skills = user.skills ? JSON.parse(user.skills) : [];
    if (!Array.isArray(skills)) skills = [];
  } catch {
    skills = [];
  }
  let experience = [];
  try {
    const rawExperience = settings.find((setting) => setting.key === "profile_experience")?.value || "[]";
    experience = JSON.parse(rawExperience);
    if (!Array.isArray(experience)) experience = [];
  } catch {
    experience = [];
  }
  const aboutSetting = settings.find((setting) => setting.key === "profile_about");
  const about = aboutSetting ? aboutSetting.value : user.bio || null;
  const availability = settings.find((setting) => setting.key === "availability")?.value;

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image || null,
      avatarUrl: user.image || null,
      photoUrl: user.image || null,
      cover: user.cover || null,
      title: user.title || null,
      bio: user.bio || null,
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : null,
      about,
      location: user.location || null,
      website: user.website || null,
      company: user.company || null,
      sector: user.sector || null,
      skills,
      experience,
      status: ["open", "mentoring", "unavailable"].includes(availability) ? availability : "open",
      plan: user.plan || null,
      isPremium: access.isPremium,
      isPlatformAdmin: user.role === "admin" || Boolean(adminEmail && user.email?.toLowerCase() === adminEmail),
    },
  });
}
