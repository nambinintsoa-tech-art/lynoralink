import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, SESSION_TTL_SECONDS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COUNTRY_CODES = "AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(" ");

const CITY_COUNTRIES = {
  antananarivo: "MG", paris: "FR", lyon: "FR", marseille: "FR", londres: "GB", london: "GB",
  newyork: "US", newyorkcity: "US", losangeles: "US", sanfrancisco: "US", washington: "US",
  montreal: "CA", toronto: "CA", mexico: "MX", mexicocity: "MX", saopaulo: "BR", riodejaneiro: "BR",
  buenosaires: "AR", bogota: "CO", lima: "PE", quito: "EC", santiago: "CL", casablanca: "MA", rabat: "MA",
  algiers: "DZ", tunis: "TN", tripoli: "LY", cairo: "EG", lagos: "NG", abuja: "NG", accra: "GH", dakar: "SN",
  abidjan: "CI", bamako: "ML", niamey: "NE", ouagadougou: "BF", lome: "TG", conakry: "GN", kinshasa: "CD",
  brazzaville: "CG", kampala: "UG", nairobi: "KE", kigali: "RW", addisababa: "ET", pretoria: "ZA",
  johannesburg: "ZA", capetown: "ZA", maputo: "MZ", harare: "ZW", lusaka: "ZM", windhoek: "NA", dubai: "AE",
  doha: "QA", riyadh: "SA", istanbul: "TR", telaviv: "IL", mumbai: "IN", delhi: "IN", newdelhi: "IN",
  bangkok: "TH", singapour: "SG", singapore: "SG", jakarta: "ID", manila: "PH", tokyo: "JP", seoul: "KR",
  beijing: "CN", shanghai: "CN", hongkong: "HK", sydney: "AU", melbourne: "AU", auckland: "NZ", moscou: "RU",
  moscow: "RU", berlin: "DE", munich: "DE", madrid: "ES", barcelone: "ES", barcelona: "ES", rome: "IT",
  milan: "IT", amsterdam: "NL", bruxelles: "BE", brussels: "BE", zurich: "CH", geneve: "CH",
};

const COUNTRY_ALIASES = {
  usa: "US", etatsunis: "US", unitedstates: "US", uk: "GB", royaumeuni: "GB", angleterre: "GB",
  emiratsarabesunis: "AE", emiratsarabes: "AE", russie: "RU", coreedusud: "KR", japon: "JP", chine: "CN",
  inde: "IN", allemagne: "DE", espagne: "ES", italie: "IT", bresil: "BR", madagascar: "MG", maroc: "MA",
  senegal: "SN", cotedivoire: "CI", nigeria: "NG", afriquedusud: "ZA", canada: "CA", australie: "AU",
  nouvellezelande: "NZ", suisse: "CH", belgique: "BE",
};

function normalizeLocation(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function buildCountryNames() {
  const names = new Map();
  const frenchNames = new Intl.DisplayNames(["fr"], { type: "region" });
  const englishNames = new Intl.DisplayNames(["en"], { type: "region" });
  COUNTRY_CODES.forEach((code) => [frenchNames.of(code), englishNames.of(code)].forEach((name) => {
    if (name) names.set(normalizeLocation(name), code);
  }));
  Object.entries(COUNTRY_ALIASES).forEach(([name, code]) => names.set(normalizeLocation(name), code));
  return names;
}

const COUNTRY_NAMES = buildCountryNames();

function detectCountry(location) {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;
  if (CITY_COUNTRIES[normalized]) return CITY_COUNTRIES[normalized];
  if (COUNTRY_NAMES.has(normalized)) return COUNTRY_NAMES.get(normalized);
  const matchingCountry = [...COUNTRY_NAMES.entries()]
    .filter(([name]) => name.length > 2 && normalized.includes(name))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return matchingCountry?.[1] || null;
}

function countryLabel(code) {
  if (code === "UNKNOWN") return "Non renseigné";
  return new Intl.DisplayNames(["fr"], { type: "region" }).of(code) || code;
}

function normalizeCategory(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function categoryLabel(category) {
  if (category === "") return "Non renseigné";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatDurationFromMs(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}j ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [users, posts, groups, groupsCount, comments, messages, presenceRows, userGeoRows] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: { in: ["user", "moderator"] },
          status: { in: ["active", "suspended"] },
        },
        select: { id: true, createdAt: true, location: true, sector: true, status: true, role: true },
      }),
      prisma.post.findMany({
        where: { status: { in: ["published", "pending_review", "rejected"] } },
        select: { id: true, createdAt: true, authorId: true, status: true },
      }),
      prisma.group.findMany({
        select: { id: true, posts: true, createdAt: true },
      }),
      prisma.group.count({
        where: { status: "active" },
      }),
      prisma.comment.findMany({
        where: { author: { role: { in: ["user", "moderator"] } } },
        select: { id: true, createdAt: true, authorId: true },
      }),
      prisma.message.findMany({
        where: { sender: { role: { in: ["user", "moderator"] } }, text: { not: "" } },
        select: { id: true, createdAt: true, senderId: true, text: true },
      }),
      prisma.userSetting.findMany({
        where: { key: "presenceLastSeen" },
        select: { userId: true, value: true },
      }),
      prisma.userSetting.findMany({
        where: { key: "geo_country_code" },
        select: { userId: true, value: true },
      }),
    ]);

    const legacyGroupPosts = groups.flatMap((group) => {
      if (!group?.posts) return [];
      try {
        const parsed = JSON.parse(group.posts);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter((post) => post && (post.status === undefined || ["published", "pending_review", "rejected"].includes(post.status)))
          .map((post, index) => ({
            id: post.id || `group-${group.id}-${index}`,
            createdAt: toDate(post.createdAt) || toDate(group.createdAt) || new Date(),
            authorId: post.authorId || group.ownerId || null,
            status: post.status || "published",
          }));
      } catch {
        return [];
      }
    });

    const normalizedPosts = [...posts, ...legacyGroupPosts].map((post) => ({
      ...post,
      createdAt: toDate(post.createdAt) || new Date(0),
    }));

    const normalizedUsers = users.map((user) => ({
      ...user,
      createdAt: toDate(user.createdAt) || new Date(0),
    }));

    const normalizedComments = comments.map((comment) => ({
      ...comment,
      createdAt: toDate(comment.createdAt) || new Date(0),
    }));

    const normalizedMessages = messages.map((message) => ({
      ...message,
      createdAt: toDate(message.createdAt) || new Date(0),
    }));

    const allPosts = normalizedPosts;
    const usersCount = normalizedUsers.length;
    const totalPosts = allPosts.length;
    const totalMessages = normalizedMessages.length;
    const postsThisMonth = allPosts.filter((post) => post.createdAt >= last30Days).length;
    const messagesThisMonth = normalizedMessages.filter((message) => message.createdAt >= last30Days).length;
    const recentEventsCount = postsThisMonth + messagesThisMonth;
    const newUsersThisMonth = normalizedUsers.filter((user) => user.createdAt >= monthStart).length;

    const recentUserIds = new Set(
      normalizedUsers.filter((user) => user.createdAt >= last30Days).map((user) => user.id)
    );
    allPosts.filter((post) => post.createdAt >= last30Days && post.authorId).forEach((post) => recentUserIds.add(post.authorId));
    normalizedComments.filter((comment) => comment.createdAt >= last30Days && comment.authorId).forEach((comment) => recentUserIds.add(comment.authorId));
    normalizedMessages.filter((message) => message.createdAt >= last30Days && message.senderId).forEach((message) => recentUserIds.add(message.senderId));
    const activeUsersMonth = recentUserIds.size;

    const monthLabels = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
      };
    });

    const userGrowth = monthLabels.map(({ key, label }) => {
      const monthDate = new Date(`${key}-01T00:00:00`);
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      const value = normalizedUsers.filter((user) => user.createdAt >= monthDate && user.createdAt < nextMonth).length;
      return { month: label, value };
    });

    const postGrowth = monthLabels.map(({ key, label }) => {
      const monthDate = new Date(`${key}-01T00:00:00`);
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      const value = allPosts.filter((post) => post.createdAt >= monthDate && post.createdAt < nextMonth).length;
      return { month: label, value };
    });

    const dailyActive = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const dayKey = start.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
      const activeIds = new Set();

      normalizedUsers.forEach((user) => {
        if (user.createdAt >= start && user.createdAt < end) activeIds.add(user.id);
      });
      allPosts.forEach((post) => {
        if (post.createdAt >= start && post.createdAt < end && post.authorId) activeIds.add(post.authorId);
      });
      normalizedComments.forEach((comment) => {
        if (comment.createdAt >= start && comment.createdAt < end && comment.authorId) activeIds.add(comment.authorId);
      });
      normalizedMessages.forEach((message) => {
        if (message.createdAt >= start && message.createdAt < end && message.senderId) activeIds.add(message.senderId);
      });

      return { day: dayKey, value: activeIds.size };
    });

    const geographicMap = new Map();
    normalizedUsers.forEach(({ location }) => {
      const code = detectCountry(location) || "UNKNOWN";
      geographicMap.set(code, (geographicMap.get(code) || 0) + 1);
    });
    const geographicDistribution = [...geographicMap.entries()]
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([code, count]) => ({
        code,
        country: countryLabel(code),
        count,
        percentage: usersCount ? Math.round((count / usersCount) * 1000) / 10 : 0,
      }));
    const identifiedUsers = usersCount - (geographicMap.get("UNKNOWN") || 0);

    const categoryMap = new Map();
    normalizedUsers.forEach(({ sector }) => {
      const category = normalizeCategory(sector);
      if (!category) return;
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    const topCategories = [...categoryMap.entries()]
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 6)
      .map(([name, count]) => ({
        name: categoryLabel(name),
        count,
        pct: usersCount ? Math.round((count / usersCount) * 1000) / 10 : 0,
      }));

    const sessionLifetimeMs = Number(SESSION_TTL_SECONDS || 0) * 1000;
    const activePresenceWindowMs = 2 * 60 * 1000;
    const validPresenceDurations = presenceRows
      .map((row) => {
        const lastSeen = Number(row.value);
        if (!Number.isFinite(lastSeen)) return null;
        const elapsedMs = now.getTime() - lastSeen;
        if (elapsedMs < 0 || elapsedMs > sessionLifetimeMs) return null;
        return Math.max(activePresenceWindowMs, Math.min(sessionLifetimeMs, elapsedMs + activePresenceWindowMs));
      })
      .filter((value) => value !== null && Number.isFinite(value));

    const estimatedAvgSessionMs = validPresenceDurations.length
      ? validPresenceDurations.reduce((sum, value) => sum + value, 0) / validPresenceDurations.length
      : sessionLifetimeMs;

    const analytics = {
      totalUsers: usersCount,
      activeUsersMonth,
      totalPosts,
      postsThisMonth,
      totalGroups: groupsCount,
      totalMessages,
      messagesThisMonth,
      newUsersThisMonth,
      avgSessionDuration: formatDurationFromMs(estimatedAvgSessionMs),
      userGrowth,
      postGrowth,
      topCategories,
      geographicDistribution,
      geographicCoverage: usersCount ? Math.round((identifiedUsers / usersCount) * 1000) / 10 : 0,
      dailyActive,
      recentEventsCount,
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("Erreur analytics:", error);
    return NextResponse.json({ analytics: {} }, { status: 500 });
  }
}
