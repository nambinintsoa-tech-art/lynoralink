import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/emailVerification";

export async function POST(req) {
  const token = new URL(req.url).searchParams.get("token") || (await req.json().catch(() => ({}))).token;
  if (!token) return NextResponse.json({ error: "Lien de confirmation invalide." }, { status: 400 });

  try {
    const verified = await verifyEmailToken(token);
    if (!verified) return NextResponse.json({ error: "Lien expiré ou déjà utilisé." }, { status: 400 });
    return NextResponse.json({ verified: true, message: "Adresse email confirmée. Vous pouvez vous connecter." });
  } catch (error) {
    console.error("Erreur confirmation email:", error);
    return NextResponse.json({ error: "Impossible de confirmer cette adresse email." }, { status: 500 });
  }
}