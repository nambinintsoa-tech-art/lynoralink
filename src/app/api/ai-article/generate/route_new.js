import { NextResponse } from "next/server";
import { callGroq, extractStructuredJson } from "@/lib/groq";

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

  const intro = `## ${safeTopic}\n\n${safeTopic} mérite une attention particulière. Pour traiter ce sujet avec sérieux, il faut partir de faits, d'éléments concrets et d'une logique claire. Ici, l'objectif est de rester centré sur ${safeTopic}, sans généralités ni hors-sujet.`;

  const bodyParts = [intro];
  bodyParts.push(`### Pourquoi ${safeTopic} est important\n\n${safeTopic} influence directement les décisions, les priorités et les résultats. Quand on traite ce sujet de façon précise, on évite les approximations et on gagne en efficacité. L'essentiel est d'identifier le vrai enjeu autour de ${safeTopic} puis d'agir avec méthode.`);

  for (let i = 1; i <= sectionCount; i += 1) {
    bodyParts.push(`### Point clé ${i} : ${safeTopic} et action pratique\n\nPour avancer sur ${safeTopic}, il faut d'abord clarifier l'objectif, mesurer les éléments qui comptent et choisir les actions les plus efficaces. Ensuite, il faut appliquer une logique simple : observer, ajuster, vérifier, réitérer. Cette manière de faire permet de rester fidèle à ${safeTopic} sans perdre de vue les résultats attendus.`);
  }

  bodyParts.push(`### Conclusion\n\nEn résumé, ${safeTopic} gagne à être traité de manière précise, concrète et orientée action. La bonne approche est de garder le sujet au centre, d'évaluer les éléments utiles et de construire une stratégie qui soutient la décision. Avec une méthode claire, ${safeTopic} devient un levier de progression plutôt qu'un simple thème générique.`);

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

function cleanGeneratedText(value) {
  return String(value || "")
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*{2,3}([^*\n]+)\*{2,3}/g, "$1")
    .replace(/(^|\n)\s*\*([^*\n]+)\*(?=\s*(?:\n|$))/g, "$1$2")
    .replace(/(^|\n)\s*[-*+]\s+/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeArticle(rawArticle, fallbackTopic, tone, length, format) {
  const safeTopic = String(fallbackTopic || "").trim();
  const generated = buildTopicBoundArticle(safeTopic, tone, length, format);

  const headline = cleanGeneratedText(rawArticle?.headline || rawArticle?.title || safeTopic || generated.headline);
  let body = cleanGeneratedText(rawArticle?.body || rawArticle?.content || rawArticle?.text || "");
  let excerpt = cleanGeneratedText(rawArticle?.excerpt || rawArticle?.summary || generated.excerpt);

  const lowerTopic = safeTopic.toLowerCase();
  const containsTopic = (value) => value && value.toLowerCase().includes(lowerTopic);

  if (!containsTopic(headline) || !containsTopic(body) || !containsTopic(excerpt)) {
    return {
      ...generated,
      headline: headline || generated.headline,
      excerpt: excerpt || generated.excerpt,
    };
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

    // Construire le message utilisateur
    let userMessage = {
      type: "text",
      text: `Sujet exact à traiter : ${topic}\nTon: ${tone}\nLongueur: ${length}\nFormat: ${format}\nInstruction cruciale : ne pas parler d'un autre sujet ni d'un thème générique. Reprends exactement le sujet demandé dans le titre, l'excerpt et le corps. Retourne uniquement JSON strict : {"headline":"...","excerpt":"...","body":"..."}`,
    };

    // Si des images sont fournies, les ajouter au message
    let content = [userMessage];
    if (images.length > 0) {
      const imageContext = `Images jointes pour contexte : ${images.length} image(s) fournie(s) pour enrichir la rédaction. Utilise ces visuels pour adapter le contenu et le rendre plus pertinent par rapport aux images.`;
      content = [
        { type: "text", text: imageContext },
        ...images.map((img) => {
          const base64Data = img.src && typeof img.src === "string" && img.src.includes("base64") ? img.src.split(",")[1] : img.src;
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: img.type || "image/jpeg",
              data: base64Data,
            },
          };
        }),
        userMessage,
      ];
    }

    const response = await callGroq(
      [
        {
          role: "system",
          content:
            "Tu es un rédacteur senior pour LynoraLink. Ta priorité absolue : rester strictement centré sur le sujet exact demandé. N'écris pas un article générique. Le titre doit contenir le sujet exact, et le corps doit traiter ce sujet de façon concrète, utile et spécifique. Si des images sont fournies, utilise-les comme contexte pour enrichir le contenu. Réponds uniquement en JSON valide, sans texte libre, avec les clés : headline, excerpt, body.",
        },
        {
          role: "user",
          content: content,
        },
      ],
      { temperature: 0.2, max_tokens: 1200 }
    );

    const parsed = extractStructuredJson(response) || {};
    const article = normalizeArticle(parsed, topic, tone, length, format);

    return NextResponse.json({
      provider: "groq",
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
