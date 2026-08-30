import { NextResponse } from "next/server";
import { callGroq, extractStructuredJson } from "@/lib/groq";

const SUPPORTED_TOOLS = new Set([
  "get_context", "get_notifications", "get_connections", "search_network", "navigate",
  "create_post", "send_connection_request", "remove_connection", "follow_page",
  "edit_profile_headline", "mark_notifications_read", "open_company_monetization",
]);

function latestUserText(messages) {
  const latest = [...messages].reverse().find((message) => String(message?.role || "").toLowerCase() === "user")
    || messages[messages.length - 1];
  if (!latest) return "";
  if (typeof latest.content === "string") return latest.content;
  if (typeof latest === "string") return latest;
  return JSON.stringify(latest.content || latest || "");
}

function latestToolResult(messages) {
  for (const message of [...messages].reverse()) {
    const block = Array.isArray(message?.content)
      ? [...message.content].reverse().find((item) => item?.type === "tool_result")
      : null;
    if (block) return block;
  }
  return null;
}

function toolNameForResult(messages, toolResult) {
  if (!toolResult?.tool_use_id) return "";
  for (const message of [...messages].reverse()) {
    const block = Array.isArray(message?.content)
      ? message.content.find((item) => item?.type === "tool_use" && item.id === toolResult.tool_use_id)
      : null;
    if (block) return block.name || "";
  }
  return "";
}

function localAgentBlocks(messages) {
  const text = latestUserText(messages).toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const toolResult = latestToolResult(messages);
  if (toolResult) {
    const summary = typeof toolResult.content === "string"
      ? toolResult.content
      : JSON.stringify(toolResult.content || "");
    const toolName = toolNameForResult(messages, toolResult);

    if ((text.includes("marque") || text.includes("lue")) && toolName === "get_notifications") {
      return [{ type: "tool_use", id: `local-${Date.now()}`, name: "mark_notifications_read", input: {} }];
    }

    const responseByTool = {
      get_context: `Voici le résumé de votre activité : ${summary}`,
      get_notifications: `Voici vos notifications : ${summary}`,
      get_connections: `Voici l'état de votre réseau : ${summary}`,
      search_network: `Résultat de la recherche : ${summary}`,
    };
    return [{ type: "text", text: responseByTool[toolName] || `C'est fait : ${summary}` }];
  }

  const isQuestion = text.includes("comment") || text.includes("qu'est") || text.includes("c'est quoi")
    || text.includes("pourquoi") || text.includes("est-ce") || text.includes("peux-tu")
    || text.includes("ou trouver") || text.includes("a quoi sert") || text.includes("aide-moi");
  if (isQuestion) {
    if (text.includes("creer un compte") || text.includes("inscrire") || text.includes("inscription") || text.includes("register")) {
      return [{ type: "text", text: "Pour créer un compte, ouvrez la page d'inscription depuis l'écran de connexion, renseignez votre nom, votre adresse e-mail et un mot de passe, puis validez le formulaire. Vérifiez ensuite votre adresse e-mail si une confirmation vous est demandée avant de vous connecter." }];
    }
    if (text.includes("publ") || text.includes("post")) {
      return [{ type: "text", text: "Pour publier, restez sur le Fil d'actualité puis utilisez le composer de publication. Vous pouvez créer un post texte ou un article et ajouter des médias avant de publier." }];
    }
    if (text.includes("profil")) {
      return [{ type: "text", text: "Le Profil regroupe vos informations publiques et votre titre professionnel. Vous pouvez y consulter votre présentation et modifier les éléments de profil disponibles." }];
    }
    if (text.includes("visibilite") || text.includes("visible") || text.includes("trouver mon compte") || text.includes("profil public")) {
      return [{ type: "text", text: "Pour améliorer la visibilité de votre compte, ouvrez Paramètres puis Confidentialité. Choisissez un profil public, activez Profil répertoriable et vérifiez que l'affichage de vos relations et de votre activité est activé. Complétez aussi votre titre, votre présentation, votre secteur et vos compétences depuis votre profil." }];
    }
    if (text.includes("reseau") || text.includes("connexion")) {
      return [{ type: "text", text: "Le Réseau regroupe vos connexions et les suggestions de personnes. Vous pouvez rechercher quelqu'un par nom, poste ou entreprise et envoyer une invitation." }];
    }
    if (text.includes("notification")) {
      return [{ type: "text", text: "Les Notifications regroupent les alertes liées à votre activité, comme les réactions, commentaires et suggestions de mise en relation." }];
    }
    if (text.includes("message") || text.includes("conversation") || text.includes("chat")) {
      return [{ type: "text", text: "Pour échanger, ouvrez Messages depuis la barre de navigation. Le bouton + permet de choisir un contact et d'ouvrir une conversation; les réglages de la messagerie permettent notamment de gérer votre statut en ligne et les notifications." }];
    }
    if (text.includes("groupe")) {
      return [{ type: "text", text: "Les groupes se trouvent dans la section Groupes. Vous pouvez y découvrir des communautés, consulter leurs informations et rejoindre celles qui correspondent à vos centres d'intérêt." }];
    }
    if (text.includes("parametre") || text.includes("reglage") || text.includes("confidentialite") || text.includes("statut en ligne")) {
      return [{ type: "text", text: "Ouvrez Paramètres pour gérer votre confidentialité, votre statut en ligne, les préférences de messagerie, les notifications et la sécurité du compte." }];
    }
    if (text.includes("abonnement") || text.includes("premium") || text.includes("facturation")) {
      return [{ type: "text", text: "La section Abonnement présente votre offre Premium et les options de facturation disponibles pour votre compte." }];
    }
    if (text.includes("entreprise") || text.includes("monetisation")) {
      return [{ type: "text", text: "La section Mon entreprise permet de gérer l'espace entreprise, notamment la monétisation, les abonnements, les publicités, les offres d'emploi et la facturation." }];
    }
    return [{ type: "text", text: "LynoraLink comprend le Fil d'actualité, le Profil, le Réseau, les Messages, les Notifications, les Groupes, les Pages suivies, les éléments enregistrés, Mon entreprise, les Paramètres et l'Abonnement." }];
  }

  if (/^(bonjour|bonsoir|salut|hello|merci|coucou)\b/.test(text)) {
    return [{ type: "text", text: "Bonjour. Je peux vous guider dans LynoraLink, retrouver une fonctionnalité ou vous aider à comprendre vos notifications, votre réseau et vos paramètres." }];
  }

  if (text.includes("message") || text.includes("conversation") || text.includes("chat")) {
    return [{ type: "text", text: "La messagerie permet d'ouvrir une conversation avec un contact, de consulter vos échanges et de gérer les préférences de chaque conversation." }];
  }
  if (text.includes("creer un compte") || text.includes("inscrire") || text.includes("inscription") || text.includes("register")) {
    return [{ type: "text", text: "Pour créer un compte, ouvrez la page d'inscription depuis l'écran de connexion, renseignez votre nom, votre adresse e-mail et un mot de passe, puis validez le formulaire. Vérifiez ensuite votre adresse e-mail si nécessaire." }];
  }
  if (text.includes("profil")) {
    return [{ type: "text", text: "Votre profil rassemble votre identité professionnelle, votre présentation, votre titre et vos informations visibles par les autres membres." }];
  }
  if (text.includes("visibilite") || text.includes("visible") || text.includes("trouver mon compte") || text.includes("profil public")) {
    return [{ type: "text", text: "Pour améliorer la visibilité de votre compte, ouvrez Paramètres puis Confidentialité. Choisissez un profil public, activez Profil répertoriable et complétez votre titre, votre présentation, votre secteur et vos compétences depuis votre profil." }];
  }
  if (text.includes("reseau") || text.includes("connexion")) {
    return [{ type: "text", text: "Le Réseau vous permet de consulter vos relations, les invitations et les suggestions de personnes à contacter." }];
  }
  if (text.includes("parametre") || text.includes("reglage") || text.includes("statut en ligne")) {
    return [{ type: "text", text: "Les Paramètres regroupent la confidentialité, le statut en ligne, la messagerie, les notifications et la sécurité de votre compte." }];
  }
  if (text.includes("groupe")) {
    return [{ type: "text", text: "La section Groupes permet de découvrir et de rejoindre des communautés professionnelles selon vos centres d'intérêt." }];
  }

  let toolUse;
  if (text.includes("notification")) {
    toolUse = { name: text.includes("marque") || text.includes("lue") ? "get_notifications" : "get_context", input: {} };
  } else if (text.includes("résumé") || text.includes("resume") || text.includes("activité")) {
    toolUse = { name: "get_context", input: {} };
  } else if (text.includes("cherche") || text.includes("recherche") || text.includes("design")) {
    toolUse = { name: "search_network", input: { query: text.includes("design") ? "design" : text } };
  } else if (text.includes("monétisation") || text.includes("monetisation") || text.includes("entreprise")) {
    toolUse = { name: "open_company_monetization", input: {} };
  } else if (text.includes("post") || text.includes("publication")) {
    toolUse = { name: "create_post", input: { text: "Je recherche de nouvelles opportunités professionnelles et de belles collaborations." } };
  } else {
    return [{ type: "text", text: "Je peux consulter vos notifications, explorer votre réseau, naviguer dans l'application ou publier pour vous. Que souhaitez-vous faire ?" }];
  }

  const id = `local-${Date.now()}`;
  return [{ type: "tool_use", id, input: toolUse.input, name: toolUse.name }];
}

function normalizeBackendBlocks(data, messages) {
  if (!Array.isArray(data?.blocks)) throw new Error("Réponse du fournisseur IA invalide : blocs manquants.");

  const aliases = {
    creer_post: "create_post",
    repondre_message: null,
    ameliorer_brouillon: null,
  };
  const blocks = data.blocks.map((block) => {
    if (block?.type !== "tool_use" || !(block.name in aliases)) return block;
    const name = aliases[block.name];
    if (!name) return null;
    return {
      ...block,
      name,
      input: { text: block.input?.contenu || "Publication créée par LynoraLink." },
    };
  }).filter(Boolean);

  const hasUnsupportedTool = data.blocks.some((block) => block?.type === "tool_use"
    && !(block.name in aliases)
    && !["get_context", "get_notifications", "get_connections", "search_network", "navigate", "create_post", "send_connection_request", "remove_connection", "follow_page", "edit_profile_headline", "mark_notifications_read", "open_company_monetization"].includes(block.name));
  if (hasUnsupportedTool) throw new Error("Le fournisseur IA a demandé un outil non autorisé.");

  // The Python service may execute legacy tools before returning its blocks.
  // Keep only the plan so the React app remains the single action executor.
  const toolUseBlocks = blocks.filter((block) => block.type === "tool_use");
  return toolUseBlocks.length ? toolUseBlocks : blocks;
}

function buildProviderMessages(messages, system, finalAnswer = false) {
  const instruction = finalAnswer
    ? `${system}\n\nRéponds en français avec une réponse approfondie, claire et directement utile. Structure toujours la réponse en texte brut avec un court titre, puis des paragraphes et, si nécessaire, des étapes numérotées. N'utilise aucun Markdown : pas de caractères #, *, _, **, de backticks, de liens Markdown, ni de puces. N'écris pas de JSON. Explique le pourquoi et le comment, donne les chemins de navigation exacts dans LynoraLink et précise les limites ou conditions importantes. Le dernier résultat d'outil est déjà disponible dans l'historique et tu ne dois rien inventer.`
    : `${system}\n\nRéponds uniquement avec un JSON valide : {"action":"nom_outil","args":{...}} pour une action, ou {"action":null,"result":"réponse en français"} pour une réponse textuelle. Utilise uniquement les outils suivants : ${[...SUPPORTED_TOOLS].join(", ")}. N'invente jamais de donnée ni de résultat.`;
  const conversation = messages.map((message) => ({
    role: message?.role === "assistant" ? "assistant" : "user",
    content: typeof message?.content === "string" ? message.content : JSON.stringify(message?.content || ""),
  }));
  return [{ role: "system", content: instruction }, ...conversation];
}

async function providerBlocks(messages, system, finalAnswer = false) {
  const raw = await callGroq(buildProviderMessages(messages, system, finalAnswer), {
    temperature: finalAnswer ? 0.5 : 0.2,
    max_tokens: 700,
  });

  if (finalAnswer) return [{ type: "text", text: raw }];

  const parsed = extractStructuredJson(raw);
  if (!parsed) return [{ type: "text", text: raw }];
  if (!parsed.action) return [{ type: "text", text: parsed.result || raw }];
  if (!SUPPORTED_TOOLS.has(parsed.action)) {
    throw new Error(`Outil IA non autorisé : ${parsed.action}`);
  }
  return [{
    type: "tool_use",
    id: `provider-${Date.now()}`,
    name: parsed.action,
    input: parsed.args && typeof parsed.args === "object" ? parsed.args : {},
  }];
}

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Corps de requête JSON invalide." }, { status: 400 });
  }

  if (!Array.isArray(payload?.messages)) {
    return NextResponse.json({ detail: "Le champ messages doit être un tableau." }, { status: 400 });
  }

  // Ask the configured provider to turn live tool data into a contextual answer.
  if (latestToolResult(payload.messages)) {
    try {
      const blocks = await providerBlocks(payload.messages, payload.system || "", true);
      return NextResponse.json({ status: "ok", blocks, derived: true, provider: "configured" });
    } catch (error) {
      return NextResponse.json({ detail: error?.message || "Le fournisseur IA est indisponible." }, { status: 502 });
    }
  }

  try {
    const blocks = await providerBlocks(payload.messages, payload.system || "");
    return NextResponse.json({ status: "ok", blocks, provider: "configured" });
  } catch (error) {
    return NextResponse.json({ detail: error?.message || "Le fournisseur IA est indisponible." }, { status: 502 });
  }
}