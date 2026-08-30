import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const parseBirthDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("La date de naissance doit être au format YYYY-MM-DD.");
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  if (Number.isNaN(date.getTime())) {
    throw new Error("La date de naissance est invalide.");
  }

  return date;
};

const DEFAULTS = {
  profileVisibility: "public",
  showConnections: "true",
  showActivity: "true",
  availability: "open",
  searchable: "true",
  email_messages: "true",
  email_connectionRequests: "true",
  email_endorsements: "false",
  email_newsletter: "true",
  push_messages: "true",
  push_connectionRequests: "true",
  push_mentions: "true",
  push_endorsements: "false",
  showOnlineStatus: "true",
  theme: "system",
  density: "comfortable",
  fontScale: "medium",
  language: "fr",
  timezone: "Africa/Nairobi",
};

function pickSetting(rows, key, fallback) {
  const row = rows.find((r) => r.key === key);
  return row ? row.value : fallback;
}

function pickOption(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      birthDate: true,
      location: true,
      company: true,
      title: true,
      website: true,
      cover: true,
      skills: true,
    },
  });

  if (!user) {
    return NextResponse.json({
      profile: {
        name: "",
        headline: "",
        location: "",
        company: "",
        website: "",
        about: "",
        bio: "",
        initials: "U",
        avatarSrc: null,
        coverSrc: null,
        experience: [],
        skills: [],
      },
      privacy: {
        profileVisibility: DEFAULTS.profileVisibility,
        showConnections: true,
        showActivity: true,
        availability: DEFAULTS.availability,
        searchable: true,
      },
      notifications: {
        email: {
          messages: true,
          connectionRequests: true,
          endorsements: false,
          newsletter: true,
        },
        push: {
          messages: true,
          connectionRequests: true,
          mentions: true,
          endorsements: false,
        },
        showOnlineStatus: true,
      },
      groupNotifications: {},
      appearance: {
        theme: DEFAULTS.theme,
        density: DEFAULTS.density,
        fontScale: DEFAULTS.fontScale,
      },
      account: {
        email: "",
        language: DEFAULTS.language,
        timezone: DEFAULTS.timezone,
        twoFactor: false,
      },
      removedConnections: [],
    });
  }

  const settings = await prisma.userSetting.findMany({
    where: { userId: user.id },
  });
  const removedConnections = await prisma.removedConnection.findMany({
    where: { userId: user.id },
    select: {
      target: { select: { id: true, name: true, title: true, image: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  let experience = [];
  try {
    experience = JSON.parse(pickSetting(settings, "profile_experience", "[]"));
    if (!Array.isArray(experience)) experience = [];
  } catch {
    experience = [];
  }
  const about = pickSetting(settings, "profile_about", user.bio || "");
  let skills = [];
  try {
    skills = user.skills ? JSON.parse(user.skills) : [];
    if (!Array.isArray(skills)) skills = [];
  } catch {
    skills = [];
  }

  const initials = (user.name || user.email || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "U";

  const groupNotifications = Object.fromEntries(
    settings
      .filter((row) => row.key.startsWith("groupNotification:"))
      .map((row) => [row.key.replace(/^groupNotification:/, ""), row.value === "true"])
  );
  const networkNotifications = {
    activity: pickSetting(settings, "network_activity", "true") === "true",
    requests: pickSetting(settings, "network_requests", "true") === "true",
    suggestions: pickSetting(settings, "network_suggestions", "true") === "true",
    email: pickSetting(settings, "network_email", "false") === "true",
  };

  return NextResponse.json({
    profile: {
      name: user.name || "",
      headline: user.title || "",
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : "",
      location: user.location || "",
      company: user.company || "",
      website: user.website || "",
      about,
      bio: user.bio || "",
      initials,
      avatarSrc: user.image || null,
      coverSrc: user.cover || null,
      experience,
      skills,
    },
    privacy: {
      profileVisibility: pickSetting(settings, "profileVisibility", DEFAULTS.profileVisibility),
      showConnections: pickSetting(settings, "showConnections", DEFAULTS.showConnections) === "true",
      showActivity: pickSetting(settings, "showActivity", DEFAULTS.showActivity) === "true",
      availability: pickSetting(settings, "availability", DEFAULTS.availability),
      searchable: pickSetting(settings, "searchable", DEFAULTS.searchable) === "true",
    },
    notifications: {
      email: {
        messages: pickSetting(settings, "email_messages", DEFAULTS.email_messages) === "true",
        connectionRequests: pickSetting(settings, "email_connectionRequests", DEFAULTS.email_connectionRequests) === "true",
        endorsements: pickSetting(settings, "email_endorsements", DEFAULTS.email_endorsements) === "true",
        newsletter: pickSetting(settings, "email_newsletter", DEFAULTS.email_newsletter) === "true",
      },
      push: {
        messages: pickSetting(settings, "push_messages", DEFAULTS.push_messages) === "true",
        connectionRequests: pickSetting(settings, "push_connectionRequests", DEFAULTS.push_connectionRequests) === "true",
        mentions: pickSetting(settings, "push_mentions", DEFAULTS.push_mentions) === "true",
        endorsements: pickSetting(settings, "push_endorsements", DEFAULTS.push_endorsements) === "true",
      },
      showOnlineStatus: pickSetting(settings, "showOnlineStatus", DEFAULTS.showOnlineStatus) === "true",
      network: networkNotifications,
    },
    groupNotifications,
    appearance: {
      theme: pickOption(pickSetting(settings, "theme", DEFAULTS.theme), ["light", "dark", "system"], DEFAULTS.theme),
      density: pickOption(pickSetting(settings, "density", DEFAULTS.density), ["comfortable", "compact"], DEFAULTS.density),
      fontScale: pickOption(pickSetting(settings, "fontScale", DEFAULTS.fontScale), ["small", "medium", "large"], DEFAULTS.fontScale),
    },
    account: {
      email: user.email || "",
      language: pickSetting(settings, "language", DEFAULTS.language),
      timezone: pickSetting(settings, "timezone", DEFAULTS.timezone),
      twoFactor: pickSetting(settings, "twoFactor", "false") === "true",
    },
    removedConnections: removedConnections.map(({ target, createdAt }) => ({
      id: target.id,
      name: target.name || "Utilisateur",
      title: target.title || "Membre LynoraLink",
      image: target.image || null,
      createdAt,
    })),
  });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!currentUser) {
    return NextResponse.json({ error: "Session utilisateur invalide" }, { status: 401 });
  }

  const body = await req.json();
  const { profile, privacy, notifications, appearance, account } = body || {};

  const userUpdate = {};
  if (profile) {
    if (profile.name !== undefined) userUpdate.name = profile.name;
    if (profile.headline !== undefined) userUpdate.title = profile.headline;
    if (profile.birthDate !== undefined) {
      const birthDate = profile.birthDate ? parseBirthDate(profile.birthDate) : null;
      userUpdate.birthDate = birthDate;
    }
    if (profile.location !== undefined) userUpdate.location = profile.location;
    if (profile.company !== undefined) userUpdate.company = profile.company;
    if (profile.website !== undefined) userUpdate.website = profile.website;
    if (profile.bio !== undefined) userUpdate.bio = profile.bio;
    if (profile.avatarSrc !== undefined) userUpdate.image = profile.avatarSrc;
    if (profile.coverSrc !== undefined) userUpdate.cover = profile.coverSrc;
    if (profile.skills !== undefined) userUpdate.skills = JSON.stringify(Array.isArray(profile.skills) ? profile.skills : []);
  }

  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({
      where: { id: currentUser.id },
      data: userUpdate,
    });
  }

  const settingsToUpsert = [];
  if (privacy) {
    settingsToUpsert.push(
      { userId: currentUser.id, key: "profileVisibility", value: String(privacy.profileVisibility ?? DEFAULTS.profileVisibility) },
      { userId: currentUser.id, key: "showConnections", value: String(Boolean(privacy.showConnections)) },
      { userId: currentUser.id, key: "showActivity", value: String(Boolean(privacy.showActivity)) },
      { userId: currentUser.id, key: "availability", value: String(privacy.availability ?? DEFAULTS.availability) },
      { userId: currentUser.id, key: "searchable", value: String(Boolean(privacy.searchable)) }
    );
  }
  if (profile?.experience !== undefined) {
    settingsToUpsert.push({
      userId: currentUser.id,
      key: "profile_experience",
      value: JSON.stringify(Array.isArray(profile.experience) ? profile.experience : []),
    });
  }
  if (profile?.about !== undefined) {
    settingsToUpsert.push({
      userId: currentUser.id,
      key: "profile_about",
      value: String(profile.about || ""),
    });
  }
  if (notifications) {
    const em = notifications.email || {};
    const pu = notifications.push || {};
    const net = notifications.network || {};
    settingsToUpsert.push(
      { userId: currentUser.id, key: "email_messages", value: String(Boolean(em.messages)) },
      { userId: currentUser.id, key: "email_connectionRequests", value: String(Boolean(em.connectionRequests)) },
      { userId: currentUser.id, key: "email_endorsements", value: String(Boolean(em.endorsements)) },
      { userId: currentUser.id, key: "email_newsletter", value: String(Boolean(em.newsletter)) },
      { userId: currentUser.id, key: "push_messages", value: String(Boolean(pu.messages)) },
      { userId: currentUser.id, key: "push_connectionRequests", value: String(Boolean(pu.connectionRequests)) },
      { userId: currentUser.id, key: "push_mentions", value: String(Boolean(pu.mentions)) },
      { userId: currentUser.id, key: "push_endorsements", value: String(Boolean(pu.endorsements)) },
      { userId: currentUser.id, key: "network_activity", value: String(Boolean(net.activity)) },
      { userId: currentUser.id, key: "network_requests", value: String(Boolean(net.requests)) },
      { userId: currentUser.id, key: "network_suggestions", value: String(Boolean(net.suggestions)) },
      { userId: currentUser.id, key: "network_email", value: String(Boolean(net.email)) }
    );
    if (notifications.showOnlineStatus !== undefined) {
      settingsToUpsert.push({ userId: currentUser.id, key: "showOnlineStatus", value: String(Boolean(notifications.showOnlineStatus)) });
    }
  }
  if (body?.groupNotifications && typeof body.groupNotifications === "object") {
    Object.entries(body.groupNotifications).forEach(([groupId, enabled]) => {
      if (!groupId) return;
      settingsToUpsert.push({ userId: currentUser.id, key: `groupNotification:${groupId}`, value: String(Boolean(enabled)) });
    });
  }
  if (appearance) {
    settingsToUpsert.push(
      { userId: currentUser.id, key: "theme", value: pickOption(appearance.theme, ["light", "dark", "system"], DEFAULTS.theme) },
      { userId: currentUser.id, key: "density", value: pickOption(appearance.density, ["comfortable", "compact"], DEFAULTS.density) },
      { userId: currentUser.id, key: "fontScale", value: pickOption(appearance.fontScale, ["small", "medium", "large"], DEFAULTS.fontScale) }
    );
  }
  if (account) {
    if (account.language !== undefined) {
      settingsToUpsert.push({ userId: currentUser.id, key: "language", value: String(account.language) });
    }
    if (account.timezone !== undefined) {
      settingsToUpsert.push({ userId: currentUser.id, key: "timezone", value: String(account.timezone) });
    }
    if (account.twoFactor !== undefined) {
      settingsToUpsert.push({ userId: currentUser.id, key: "twoFactor", value: String(Boolean(account.twoFactor)) });
      if (!account.twoFactor) {
        await prisma.userSetting.deleteMany({ where: { userId: currentUser.id, key: "twoFactorChallenge" } });
      }
    }
  }

  for (const s of settingsToUpsert) {
    await prisma.userSetting.upsert({
      where: { userId_key: { userId: s.userId, key: s.key } },
      update: { value: s.value },
      create: s,
    });
  }

  return NextResponse.json({ ok: true });
}
