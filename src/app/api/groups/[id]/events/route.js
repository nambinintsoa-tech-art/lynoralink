import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const group = await prisma.group.findUnique({ where: { id: params.id } });
    if (!group) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });

    const members = normalizeJsonArray(group.members);
    const member = members.find((item) => item.id === session.user.id);
    const isOwner = group.ownerId === session.user.id;
    if (!isOwner && !member) return NextResponse.json({ error: "Vous devez être membre de ce groupe" }, { status: 403 });

    const body = await request.json();
    const title = String(body?.title || "").trim();
    const location = String(body?.location || "").trim();
    const date = String(body?.date || "").trim();
    if (title.length < 3 || !location || !date) {
      return NextResponse.json({ error: "Le titre, le lieu ou lien et la date sont requis" }, { status: 400 });
    }

    const event = {
      id: `ev_${Date.now()}_${session.user.id.slice(-6)}`,
      title,
      description: String(body?.description || "").trim(),
      type: body?.type === "online" ? "online" : "in-person",
      location,
      date,
      time: String(body?.time || "À définir"),
      duration: String(body?.duration || "1h"),
      attendees: 0,
      maxAttendees: Math.max(1, Number(body?.maxAttendees) || 50),
      createdBy: session.user.id,
      createdByName: session.user.name || member?.name || "Utilisateur",
      createdByAvatar: session.user.image || member?.image || member?.avatarUrl || null,
      createdAt: new Date().toISOString(),
    };

    const events = normalizeJsonArray(group.events);
    const posts = normalizeJsonArray(group.posts);
    const eventPost = {
      id: `event_post_${event.id}`,
      type: "event",
      isEvent: true,
      event,
      authorId: event.createdBy,
      author: event.createdByName,
      initials: member?.initials || "U",
      avatarUrl: event.createdByAvatar,
      authorTitle: "Membre",
      title: "Membre",
      role: "Membre",
      createdAt: event.createdAt,
      time: event.createdAt,
      text: "",
      media: [],
      images: [],
      visibility: group.privacy === "private" ? "Privé" : "Public",
      reactions: {},
      comments: [],
      shares: 0,
    };
    const updated = await prisma.group.update({
      where: { id: group.id },
      data: {
        events: JSON.stringify([event, ...events]),
        posts: JSON.stringify([eventPost, ...posts.filter((post) => post.id !== eventPost.id)]),
      },
    });

    return NextResponse.json({ event, eventPost, groupEvents: normalizeJsonArray(updated.events) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Impossible de créer l’événement" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const group = await prisma.group.findUnique({ where: { id: params.id } });
    if (!group) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
    const members = normalizeJsonArray(group.members);
    if (group.ownerId !== session.user.id && !members.some((member) => member.id === session.user.id)) {
      return NextResponse.json({ error: "Vous devez être membre de ce groupe" }, { status: 403 });
    }

    const body = await request.json();
    const events = normalizeJsonArray(group.events);
    const currentEvent = events.find((event) => event.id === body?.eventId);
    if (!currentEvent) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });

    const attendeeIds = Array.isArray(currentEvent.attendeeIds) ? currentEvent.attendeeIds : [];
    const alreadyJoined = attendeeIds.includes(session.user.id);
    const shouldJoin = body?.attending === undefined ? !alreadyJoined : Boolean(body.attending);
    const nextAttendeeIds = shouldJoin
      ? [...new Set([...attendeeIds, session.user.id])]
      : attendeeIds.filter((id) => id !== session.user.id);
    const updatedEvent = { ...currentEvent, attendeeIds: nextAttendeeIds, attendees: nextAttendeeIds.length };
    const updatedEvents = events.map((event) => event.id === updatedEvent.id ? updatedEvent : event);
    const posts = normalizeJsonArray(group.posts);
    const updatedPosts = posts.map((post) => post.event?.id === updatedEvent.id ? { ...post, event: updatedEvent } : post);
    await prisma.group.update({ where: { id: group.id }, data: { events: JSON.stringify(updatedEvents), posts: JSON.stringify(updatedPosts) } });

    return NextResponse.json({ event: updatedEvent, attending: shouldJoin });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Impossible de mettre à jour la participation" }, { status: 500 });
  }
}
