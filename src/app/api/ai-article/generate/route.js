import { NextResponse } from "next/server";
import { callGroq, callGroqVision, extractStructuredJson } from "@/lib/groq";

function buildTopicBoundArticle(topic, tone, length, format) {
  const safeTopic = String(topic || "Votre sujet").trim();
  const toneText = {
    pro: "approche professionnelle, claire et orientée résultats",
    info: "explication concrète, utile et structurée",
    conv: "ton naturel, accessible et engageant",
    insp: "ton inspirant et motivant",
    persu: "ton persuasif et orienté action",
    analyt: "analyse rigoureuse et argumentée",
  };
  const lengthMap = { short: 3, medium: 5, long: 7 };
  const sectionCount = lengthMap[length] || lengthMap.medium;
  const formatLabel = format === "list" ? "liste de conseils" : format === "post" ? "post de réseau social" : format === "newsletter" ? "newsletter" : "article de fond";

  const intro = `${safeTopic} mérite une attention particulière. Pour traiter ce sujet avec sérieux, il faut partir de faits, d’éléments concrets et d’une logique claire. Ici, l’objectif est de rester centré sur ${safeTopic}, sans généralités ni hors-sujet.`;

  const bodyParts = [intro];
  bodyParts.push(`${safeTopic} influence directement les décisions, les priorités et les résultats. Quand on traite ce sujet de façon précise, on évite les approximations et on gagne en efficacité. L’essentiel est d’identifier le vrai enjeu autour de ${safeTopic} puis d’agir avec méthode.`);

  for (let i = 1; i <= sectionCount; i += 1) {
    bodyParts.push(`Pour avancer sur ${safeTopic}, il faut d’abord clarifier l’objectif, mesurer les éléments qui comptent et choisir les actions les plus efficaces. Ensuite, il faut appliquer une logique simple : observer, ajuster, vérifier, réitérer. Cette manière de faire permet de rester fidèle à ${safeTopic} sans perdre de vue les résultats attendus.`);
  }

  bodyParts.push(`En résumé, ${safeTopic} gagne à être traité de manière précise, concrète et orientée action. La bonne approche est de garder le sujet au centre, d’évaluer les éléments utiles et de construire une stratégie qui soutient la décision. Avec une méthode claire, ${safeTopic} devient un levier de progression plutôt qu’un simple thème générique.`);

  const body = bodyParts.join("\n\n");
  const excerpt = `${safeTopic} demande une approche claire et concrète. Ce ${formatLabel} reste centré sur le sujet exact, avec un ton ${toneText[tone] || toneText.pro}.`;

  return {
    headline: safeTopic,
    excerpt,
    body,
    wordCount: body.split(/\s+/).filter(Boolean).length,
    readingTime: Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220)),
  };
}

function cleanArticleText(value) {
  return String(value || "")
    .replace(/^```(?:json|markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^\s*(?:headline|title|excerpt|summary|body|content)\s*:\s*/gim, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*{2,3}([^*\n]+)\*{2,3}/g, "$1")
    .replace(/(^|\n)\s*\*([^*\n]+)\*(?=\s*(?:\n|$))/g, "$1$2")
    .replace(/(^|\n)\s*[-*+]\s+/g, "$1")
    .replace(/^\s*(?:conclusion|introduction|corps de l'article|article)\s*:?\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeArticle(rawArticle, fallbackTopic, tone, length, format) {
  const safeTopic = String(fallbackTopic || "").trim();
  const generated = buildTopicBoundArticle(safeTopic, tone, length, format);

  const headline = cleanArticleText(rawArticle?.headline || rawArticle?.title || safeTopic || generated.headline);
  let body = cleanArticleText(rawArticle?.body || rawArticle?.content || rawArticle?.text || "");
  let excerpt = cleanArticleText(rawArticle?.excerpt || rawArticle?.summary || generated.excerpt);

  if (!body) {
    throw new Error("La réponse IA ne contient pas de corps d'article exploitable.");
  }

  const readingTime = Number(rawArticle?.readingTime || Math.max(1, Math.round((body.split(/\s+/).length || 1) / 220)));
  const wordCount = Number(rawArticle?.wordCount || body.split(/\s+/).filter(Boolean).length || 0);

  return {
    headline: headline || generated.headline,
    excerpt: excerpt || generated.excerpt,
    body,
    wordCount,
    readingTime,
  };
}

function parseArticleResponse(response, topic) {
  const parsed = extractStructuredJson(response);
  if (parsed && typeof parsed === "object") {
    return parsed;
  }

  const text = String(response || "").trim();
  if (!text) return {};

  const headlineMatch = text.match(/"(?:headline|title)"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  const excerptMatch = text.match(/"(?:excerpt|summary)"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  const bodyMarker = text.search(/"(?:body|content|text)"\s*:\s*/i);

  if (bodyMarker >= 0) {
    const bodyStart = text.slice(bodyMarker).replace(/^"(?:body|content|text)"\s*:\s*/i, "");
    const recoveredBody = bodyStart
      .replace(/^"/, "")
      .replace(/"\s*}\s*$/s, "")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .trim();

    if (recoveredBody) {
      return {
        headline: headlineMatch ? headlineMatch[1].replace(/\\"/g, '"') : topic,
        excerpt: excerptMatch ? excerptMatch[1].replace(/\\"/g, '"') : "",
        body: recoveredBody,
      };
    }
  }

  const withoutJsonFence = text
    .replace(/^```(?:json|markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const firstParagraph = withoutJsonFence.split(/\n\s*\n/)[0].replace(/^#+\s*/, "").trim();

  return {
    headline: topic,
    excerpt: firstParagraph.slice(0, 180),
    body: withoutJsonFence,
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const topic = String(body?.topic || "").trim();
    const tone = String(body?.tone || "pro").trim();
    const length = String(body?.length || "medium").trim();
    const format = String(body?.format || "article").trim();
    const images = Array.isArray(body?.images) ? body.images : [];

    if (!topic) {
      return NextResponse.json({ error: "Le sujet est requis." }, { status: 400 });
    }

    const imageContext = images.length > 0
      ? `\nImages jointes : ${images.length}. Analyse les images et utilise uniquement les éléments visuels pertinents.`
      : "";
      const content = `Sujet exact à traiter : ${topic}\nTon: ${tone}\nLongueur: ${length}\nFormat: ${format}${imageContext}\nInstruction cruciale : rédige un contenu professionnel, fluide et directement publiable. N'utilise aucun symbole Markdown (#, *, -), aucun nom de champ technique (body, excerpt, headline), aucune mention de prompt et aucun titre artificiel comme « Conclusion » ou « Point clé ». Retourne uniquement JSON strict : {"headline":"...","excerpt":"...","body":"..."}`;

    const systemMessage =
      "Tu es un rédacteur senior pour LynoraLink. Ta priorité absolue : rester strictement centré sur le sujet exact demandé. N'écris pas un article générique. Le titre doit contenir le sujet exact, et le corps doit traiter ce sujet de façon concrète, utile et spécifique. Si des images sont fournies, analyse-les et utilise uniquement les éléments visuels pertinents. Le contenu doit être directement publiable, sans Markdown, sans dièses, sans noms de champs techniques, sans mention du prompt et sans titre artificiel comme « Conclusion ». Réponds uniquement en JSON valide, sans texte libre, avec les clés : headline, excerpt, body.";
    const userContent = images.length > 0 && process.env.GROQ_API_KEY
      ? [
          { type: "text", text: content },
          ...images.map((image) => ({
            type: "image_url",
            image_url: { url: image.src },
          })),
        ]
      : content;

    let provider = "groq";
    let response;

    const visionEnabled = String(process.env.GROQ_ENABLE_VISION || "false").toLowerCase() === "true";

    if (images.length > 0 && process.env.GROQ_API_KEY && visionEnabled) {
      try {
        response = await callGroqVision(
          [
            { role: "system", content: systemMessage },
            { role: "user", content: userContent },
          ],
          { temperature: 0.3, max_tokens: 1200 }
        );
        provider = "groq-vision";
      } catch (visionError) {
        response = await callGroq(
          [
            { role: "system", content: systemMessage },
            {
              role: "user",
              content: `${content}\nLes images sont jointes à la publication, mais leur analyse visuelle n'est pas disponible avec le modèle actif. Ne prétends pas avoir identifié des éléments précis dans les images.`,
            },
          ],
          { temperature: 0.2, max_tokens: 1200 }
        );
        provider = "groq-text-fallback";
      }
    } else {
      response = await callGroq(
        [
          { role: "system", content: systemMessage },
          { role: "user", content: userContent },
        ],
        { temperature: 0.2, max_tokens: 1200 }
      );
    }

    const parsed = parseArticleResponse(response, topic);
    const article = normalizeArticle(parsed, topic, tone, length, format);

    return NextResponse.json({
      provider,
      article,
      imagesCount: images.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || "Impossible de générer l'article via Groq.",
        provider: "groq",
      },
      { status: 500 }
    );
  }
}
