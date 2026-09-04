import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const STYLE_LABELS = { realistic: "Réaliste", anime: "Anime", "digital-art": "Art Digital", "oil-painting": "Peinture", watercolor: "Aquarelle", cyberpunk: "Cyberpunk", minimal: "Minimaliste", fantasy: "Fantasy" };
const ASPECTS = { "1:1": "1:1", "16:9": "16:9", "9:16": "9:16", "4:3": "4:3" };
const TOOLS = new Set(["get_context", "get_notifications", "get_connections", "search_network", "navigate", "create_post", "send_connection_request", "remove_connection", "follow_page", "edit_profile_headline", "mark_notifications_read", "open_company_monetization"]);

function normalizeContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => typeof part === "string" ? part : part?.text || part?.content || "").join("");
  return content?.text || content?.content || "";
}

function extractJson(text) {
  const cleaned = String(text || "").replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  return null;
}

function recoverArticleJson(text, topic) {
  const value = String(text || "");
  const bodyMarker = value.search(/"(?:body|content|text)"\s*:\s*/i);
  if (bodyMarker < 0) return null;

  const bodyStart = value.slice(bodyMarker).replace(/^"(?:body|content|text)"\s*:\s*/i, "");
  const body = bodyStart
    .replace(/^"/, "")
    .replace(/"\s*}\s*$/s, "")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .trim();
  if (!body) return null;

  const headline = value.match(/"(?:headline|title)"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  const excerpt = value.match(/"(?:excerpt|summary)"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  return {
    headline: headline ? headline[1].replace(/\\"/g, '"') : topic,
    excerpt: excerpt ? excerpt[1].replace(/\\"/g, '"') : "",
    body,
  };
}

async function callProvider(messages, options = {}) {
  const provider = String(process.env.AI_PROVIDER || process.env.LLM_PROVIDER || "auto").toLowerCase();
  if (provider === "cloudflare") {
    if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) throw new Error("Les identifiants Cloudflare sont manquants.");
    const model = process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.1-8b-instruct";
    const response = await fetch(`${process.env.CLOUDFLARE_API_BASE || "https://api.cloudflare.com/client/v4/accounts"}/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`, { method: "POST", headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ messages, temperature: options.temperature ?? 0.7, max_tokens: options.max_tokens ?? 700 }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.errors?.[0]?.message || data?.error || "Erreur Cloudflare");
    const content = normalizeContent(data?.result?.response || data?.result?.output || data?.result?.text || data?.result?.content);
    if (!content) throw new Error("Cloudflare n’a pas renvoyé de contenu exploitable.");
    return content;
  }
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY est manquante.");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: options.model || process.env.GROQ_MODEL || "openai/gpt-oss-120b", messages, temperature: options.temperature ?? 0.7, max_tokens: options.max_tokens ?? 700 }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Erreur de requête Groq");
  const content = normalizeContent(data?.choices?.[0]?.message?.content);
  if (!content) throw new Error("Groq n’a pas renvoyé de contenu exploitable.");
  return content;
}

async function generateImages({ prompt, style, aspect, count }) {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) throw new Error("La génération d’image nécessite CLOUDFLARE_API_TOKEN et CLOUDFLARE_ACCOUNT_ID.");
  const model = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
  const url = `${process.env.CLOUDFLARE_API_BASE || "https://api.cloudflare.com/client/v4/accounts"}/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
  const images = []; const safeCount = Math.min(Math.max(Number(count) || 1, 1), 4);
  for (let index = 0; index < safeCount; index += 1) {
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: `${prompt} style ${style} aspect ${aspect}` }) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data?.errors?.[0]?.message || data?.error || "Erreur d’image Cloudflare"); }
    const type = response.headers.get("content-type") || ""; let image;
    if (type.startsWith("image/")) image = `data:${type.split(";")[0]};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
    else { const data = await response.json().catch(() => ({})); const result = data?.result ?? data; image = result?.image || result?.output || result?.url || result?.b64 || result?.base64 || result?.[0]?.image || result?.[0]?.url; }
    if (!image) throw new Error("Cloudflare n’a pas renvoyé d’image exploitable.");
    images.push({ id: `cloudflare-${Date.now()}-${index}`, url: /^data:image\//i.test(image) || /^https?:\/\//i.test(image) ? image : `data:image/png;base64,${image}`, prompt, style, aspect });
  }
  return images;
}

function premium(user) {
  const adminEmails = [process.env.NEXT_PUBLIC_ADMIN_EMAIL, process.env.ADMIN_EMAIL]
    .map((email) => String(email || "").trim().toLowerCase())
    .filter(Boolean);
  const userEmail = String(user?.email || "").trim().toLowerCase();
  return String(user?.role || "").toLowerCase() === "admin" || adminEmails.includes(userEmail) || (["ACTIVE", "TRIALING"].includes(user?.subscription?.status) && (!user.subscription.currentPeriodEnd || user.subscription.currentPeriodEnd > new Date()));
}

function article(raw, topic) {
  const parsed = extractJson(raw) || recoverArticleJson(raw, topic) || { headline: topic, excerpt: String(raw || "").split(/\n\s*\n/)[0], body: raw };
  const body = String(parsed.body || parsed.content || parsed.text || "")
    .replace(/^```(?:json|markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^\s*(?:headline|title|excerpt|summary|body|content)\s*:\s*/gim, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*{2,3}([^*\n]+)\*{2,3}/g, "$1")
    .replace(/(^|\n)\s*\*([^*\n]+)\*(?=\s*(?:\n|$))/g, "$1$2")
    .replace(/(^|\n)\s*[-*+]\s+/g, "$1• ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!body) throw new Error("La réponse IA ne contient pas de corps d'article exploitable.");
  const words = body.split(/\s+/).filter(Boolean).length;
  return { headline: String(parsed.headline || parsed.title || topic).trim(), excerpt: String(parsed.excerpt || parsed.summary || "").trim(), body, wordCount: Number(parsed.wordCount) || words, readingTime: Number(parsed.readingTime) || Math.max(1, Math.round(words / 220)) };
}

export async function registerAiRoutes(app) {
  app.post("/v1/assistant", async (request, reply) => {
    if (!await getSessionUserId(request)) return reply.code(401).send({ detail: "Non authentifié" });
    const messages = request.body?.messages;
    if (!Array.isArray(messages)) return reply.code(400).send({ detail: "Le champ messages doit être un tableau." });
    const hasToolResult = messages.some((message) => Array.isArray(message?.content) && message.content.some((item) => item?.type === "tool_result"));
    const instruction = hasToolResult ? `${request.body?.system || ""}\nRéponds en français avec une réponse claire et utile, sans Markdown. Le résultat d’outil est déjà disponible et tu ne dois rien inventer.` : `${request.body?.system || ""}\nRéponds uniquement avec un JSON valide : {"action":"nom_outil","args":{...}} ou {"action":null,"result":"réponse en français"}. Outils autorisés : ${[...TOOLS].join(", ")}. N’invente aucune donnée.`;
    try {
      const raw = await callProvider([{ role: "system", content: instruction }, ...messages.map((message) => ({ role: message?.role === "assistant" ? "assistant" : "user", content: typeof message?.content === "string" ? message.content : JSON.stringify(message?.content || "") }))], { temperature: hasToolResult ? 0.5 : 0.2 });
      if (hasToolResult) return reply.send({ status: "ok", blocks: [{ type: "text", text: raw }], derived: true, provider: "configured" });
      const parsed = extractJson(raw);
      if (!parsed?.action) return reply.send({ status: "ok", blocks: [{ type: "text", text: parsed?.result || raw }], provider: "configured" });
      if (!TOOLS.has(parsed.action)) throw new Error(`Outil IA non autorisé : ${parsed.action}`);
      return reply.send({ status: "ok", blocks: [{ type: "tool_use", id: `provider-${Date.now()}`, name: parsed.action, input: parsed.args && typeof parsed.args === "object" ? parsed.args : {} }], provider: "configured" });
    } catch (error) { return reply.code(502).send({ detail: error.message || "Le fournisseur IA est indisponible." }); }
  });

  app.post("/v1/ai-image/generate", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true, subscription: { select: { status: true, currentPeriodEnd: true } } } });
    if (!premium(user)) return reply.code(403).send({ error: "Le VisuelFocus est réservé au plan Premium." });
    const prompt = String(request.body?.prompt || "").trim(); if (!prompt) return reply.code(400).send({ error: "Le prompt est requis." });
    try { const style = request.body?.style || "realistic"; const aspect = request.body?.aspect || "1:1"; const images = await generateImages({ prompt, style: STYLE_LABELS[style] || "Réaliste", aspect: ASPECTS[aspect] || "1:1", count: request.body?.count || 2 }); return reply.send({ provider: "cloudflare", images, prompt, style, aspect }); } catch (error) { return reply.code(502).send({ error: error.message, images: [], provider: "cloudflare" }); }
  });

  app.post("/v1/ai-article/generate", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true, subscription: { select: { status: true, currentPeriodEnd: true } } } });
    if (!premium(user)) return reply.code(403).send({ error: "Le VisuelFocus est réservé au plan Premium." });
    const topic = String(request.body?.topic || "").trim(); if (!topic) return reply.code(400).send({ error: "Le sujet est requis." });
    const tone = String(request.body?.tone || "pro"); const length = String(request.body?.length || "medium"); const format = String(request.body?.format || "article"); const images = Array.isArray(request.body?.images) ? request.body.images : [];
    const text = `Sujet exact à traiter : ${topic}\nTon: ${tone}\nLongueur: ${length}\nFormat: ${format}${images.length ? `\nImages jointes : ${images.length}.` : ""}\nRetourne uniquement JSON strict : {"headline":"...","excerpt":"...","body":"..."}`;
    try {
      const userContent = images.length && process.env.GROQ_ENABLE_VISION === "true" && process.env.GROQ_API_KEY
        ? [{ type: "text", text }, ...images.map((image) => ({ type: "image_url", image_url: { url: image.src } }))]
        : text;
      const options = images.length && process.env.GROQ_ENABLE_VISION === "true" ? { model: process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-maverick-17b-128e-instruct", temperature: 0.3, max_tokens: 2400 } : { temperature: 0.2, max_tokens: 2400 };
      const raw = await callProvider([{ role: "system", content: "Tu es un rédacteur senior pour LynoraLink. Reste strictement centré sur le sujet exact, rédige un contenu professionnel directement publiable, sans Markdown et uniquement en JSON valide." }, { role: "user", content: userContent }], options);
      return reply.send({ provider: images.length && process.env.GROQ_ENABLE_VISION === "true" ? "groq-vision" : "groq", article: article(raw, topic), imagesCount: images.length });
    } catch (error) { return reply.code(502).send({ error: error.message || "Impossible de générer l'article via le fournisseur IA.", provider: "groq" }); }
  });
}