import { NextResponse } from "next/server";
import { verifyEmailToken, verifyRegistrationCode } from "@/lib/emailVerification";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const token = new URL(req.url).searchParams.get("token") || body.token;
  const email = body.email;
  const code = body.code;
  if (email && code) {
    try {
      const verified = await verifyRegistrationCode(email, code);
      if (!verified) return NextResponse.json({ error: "Code expiré, invalide ou déjà utilisé." }, { status: 400 });
      return NextResponse.json({ verified: true, message: "Adresse email confirmée. Vous pouvez vous connecter." });
    } catch (error) {
      console.error("Erreur confirmation par code:", error);
      return NextResponse.json({ error: "Impossible de confirmer cette adresse email." }, { status: 500 });
    }
  }
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