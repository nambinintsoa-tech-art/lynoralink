import { NextResponse } from "next/server";
import { generateImageFromPrompt } from "@/lib/groq";

const STYLE_LABELS = {
  realistic: "Réaliste",
  anime: "Anime",
  "digital-art": "Art Digital",
  "oil-painting": "Peinture",
  watercolor: "Aquarelle",
  cyberpunk: "Cyberpunk",
  minimal: "Minimaliste",
  fantasy: "Fantasy",
};

const ASPECTS = {
  "1:1": "1:1",
  "16:9": "16:9",
  "9:16": "9:16",
  "4:3": "4:3",
};

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = String(body?.prompt || "").trim();
    const style = body?.style || "realistic";
    const aspect = body?.aspect || "1:1";
    const count = Number(body?.count || 2);

    if (!prompt) {
      return NextResponse.json({ error: "Le prompt est requis." }, { status: 400 });
    }

    // Cloudflare image endpoints can fail while the text model is unavailable or the account is not enabled.
    // To avoid a hard 500 on the image route, keep the original prompt and rely on the provider fallback logic.
    const finalPrompt = prompt.trim();

    const images = await generateImageFromPrompt({
      prompt: finalPrompt,
      style: STYLE_LABELS[style] || "Réaliste",
      aspect: ASPECTS[aspect] || "1:1",
      count,
    });

    return NextResponse.json({
      provider: "cloudflare",
      images,
      prompt: finalPrompt,
      style,
      aspect,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || "Impossible de générer l’image via l’IA du fournisseur actif.",
        images: [],
        provider: "cloudflare",
      },
      { status: 500 }
    );
  }
}
