const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const DEFAULT_GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-maverick-17b-128e-instruct";
const DEFAULT_CLOUDFLARE_MODEL = process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.1-8b-instruct";
const DEFAULT_CLOUDFLARE_IMAGE_MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";

function normalizeContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          if (typeof part.text === "string") return part.text;
          if (typeof part.content === "string") return part.content;
          if (Array.isArray(part.content)) return normalizeContent(part.content);
        }
        return "";
      })
      .join("");
  }
  if (content && typeof content === "object") {
    if (typeof content.text === "string") return content.text;
    if (typeof content.content === "string") return content.content;
    if (Array.isArray(content.content)) return normalizeContent(content.content);
  }
  return "";
}

function getActiveProvider() {
  return String(process.env.AI_PROVIDER || process.env.LLM_PROVIDER || "auto").toLowerCase();
}

function shouldUseCloudflareForImage() {
  const configuredProvider = String(process.env.IMAGE_PROVIDER || process.env.AI_PROVIDER || process.env.LLM_PROVIDER || "auto").toLowerCase();
  const hasCreds = Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);

  if (!hasCreds) return false;
  if (["disable", "none", "off"].includes(configuredProvider)) return false;
  return ["auto", "cloudflare", "groq", "llm", "mixed"].includes(configuredProvider);
}

function getCloudflareUrl(model) {
  const base = process.env.CLOUDFLARE_API_BASE || "https://api.cloudflare.com/client/v4/accounts";
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID est manquant.");
  }
  return `${base}/${accountId}/ai/run/${model}`;
}

function parseCloudflareTextResult(payload) {
  const result = payload?.result ?? payload;
  const direct = result?.response || result?.output || result?.text || result?.content || result?.answer;
  if (typeof direct === "string") return direct;
  if (Array.isArray(direct)) return normalizeContent(direct);
  if (direct && typeof direct === "object") {
    if (typeof direct.text === "string") return direct.text;
    if (Array.isArray(direct.content)) return normalizeContent(direct.content);
    if (typeof direct.content === "string") return direct.content;
  }
  if (Array.isArray(result?.messages)) {
    return normalizeContent(result.messages.map((entry) => entry?.content || entry?.text || ""));
  }
  return "";
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callCloudflareText(messages, options = {}) {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    throw new Error("CLOUDFLARE_API_TOKEN est manquant.");
  }

  const model = options.model || process.env.CLOUDFLARE_MODEL || DEFAULT_CLOUDFLARE_MODEL;
  const response = await fetch(getCloudflareUrl(model), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      max_tokens: options.max_tokens ?? 700,
      temperature: options.temperature ?? 0.7,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.errors?.[0]?.message || data?.error || data?.message || "Erreur de requête Cloudflare";
    throw new Error(msg);
  }

  const content = parseCloudflareTextResult(data);
  if (!content) {
    throw new Error("Cloudflare n’a pas renvoyé de contenu exploitable.");
  }

  return content;
}

export async function generateCloudflareImage({ prompt, style, aspect, count }) {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    throw new Error("CLOUDFLARE_API_TOKEN est manquant.");
  }

  const model = process.env.CLOUDFLARE_IMAGE_MODEL || DEFAULT_CLOUDFLARE_IMAGE_MODEL;
  const safeCount = Math.min(Math.max(Number(count) || 1, 1), 4);
  const results = [];

  for (let index = 0; index < safeCount; index += 1) {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(getCloudflareUrl(model), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: `${prompt} ${style ? `style ${style}` : ""} ${aspect ? `aspect ${aspect}` : ""}`.trim(),
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const msg = data?.errors?.[0]?.message || data?.error || data?.message || "Erreur d’image Cloudflare";
          lastError = new Error(msg);
          const isCapacity = /capacity|temporarily exceeded|rate limit|429|too many requests/i.test(msg);
          if (isCapacity && attempt < 3) {
            await sleep(1000 * attempt);
            continue;
          }
          throw lastError;
        }

        const contentType = response.headers.get("content-type") || "";
        let imageData;

        if (contentType.startsWith("image/")) {
          const buffer = Buffer.from(await response.arrayBuffer());
          imageData = `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`;
        } else {
          const data = await response.json().catch(() => ({}));
          const result = data?.result ?? data;
          imageData = result?.image || result?.output || result?.url || result?.b64 || result?.base64;
          if (Array.isArray(result)) {
            imageData = result[0]?.image || result[0]?.url || result[0]?.base64 || result[0]?.b64;
          }
        }

        if (!imageData) {
          throw new Error("Cloudflare n’a pas renvoyé d’image exploitable.");
        }

        let imageUrl = imageData;
        if (typeof imageData === "string") {
          if (/^data:image\//i.test(imageData)) {
            imageUrl = imageData;
          } else if (/^https?:\/\//i.test(imageData)) {
            imageUrl = imageData;
          } else if (/^[A-Za-z0-9+/=]+$/.test(imageData) && imageData.length > 100) {
            imageUrl = `data:image/png;base64,${imageData}`;
          }
        }

        results.push({
          id: `cloudflare-${Date.now()}-${index}`,
          url: imageUrl,
          prompt,
          style,
          aspect,
        });
        break;
      } catch (error) {
        lastError = error;
        const isCapacity = /capacity|temporarily exceeded|rate limit|429|too many requests/i.test(String(error?.message || ""));
        if (isCapacity && attempt < 3) {
          await sleep(1200 * attempt);
          continue;
        }
        throw error;
      }
    }

    if (results.length <= index) {
      throw lastError || new Error("Cloudflare n’a pas pu générer l’image.");
    }
  }

  return results;
}

export async function callGroq(messages, options = {}) {
  const provider = getActiveProvider();

  if (provider === "cloudflare") {
    return callCloudflareText(messages, options);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY est manquante. Ajoute-la dans le fichier .env.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 700,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || "Erreur de requête Groq";
    throw new Error(msg);
  }

  const content = normalizeContent(data?.choices?.[0]?.message?.content);
  if (!content) {
    throw new Error("Groq n’a pas renvoyé de contenu exploitable.");
  }

  return content;
}

export async function callGroqVision(messages, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY est manquante. Ajoute-la dans le fichier .env.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_GROQ_VISION_MODEL,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 1200,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || "Erreur de requête Groq Vision";
    throw new Error(msg);
  }

  const content = normalizeContent(data?.choices?.[0]?.message?.content);
  if (!content) {
    throw new Error("Groq Vision n'a pas renvoyé de contenu exploitable.");
  }

  return content;
}

export async function generateImageFromPrompt({ prompt, style, aspect, count }) {
  const provider = getActiveProvider();

  if (shouldUseCloudflareForImage() || provider === "auto" || provider === "cloudflare") {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (token && accountId) {
      try {
        return await generateCloudflareImage({ prompt, style, aspect, count });
      } catch (error) {
        console.warn("Cloudflare image generation failed, falling back to SVG mock:", error.message);
      }
    }
  }

  const safeCount = Math.min(Math.max(Number(count) || 2, 1), 4);
  const styleLabel = style || "Réaliste";
  const aspectValue = aspect || "1:1";
  return Array.from({ length: safeCount }, (_, index) => ({
    id: `fallback-${Date.now()}-${index}`,
    url: buildSvgImageDataUrl({
      prompt: String(prompt || "Lynora AI concept"),
      styleLabel,
      aspect: aspectValue,
      idx: index,
      total: safeCount,
      theme: "lynora",
    }),
    prompt: String(prompt || "Lynora AI concept"),
    style,
    aspect,
  }));
}

export function extractStructuredJson(text) {
  if (!text) return null;

  const cleaned = String(text)
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = 0; index < cleaned.length; index += 1) {
      const character = cleaned[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }

      if (character === '"') {
        inString = true;
      } else if (character === "{" && depth === 0) {
        start = index;
        depth = 1;
      } else if (character === "{" && depth > 0) {
        depth += 1;
      } else if (character === "}" && depth > 0) {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          try {
            return JSON.parse(cleaned.slice(start, index + 1));
          } catch {
            start = -1;
          }
        }
      }
    }

    return null;
  }
}

export function buildSvgImageDataUrl({ prompt, styleLabel, aspect, idx, total, theme }) {
  const [w, h] = String(aspect || "1:1").split(":").map(Number);
  const ratio = Number.isFinite(w) && Number.isFinite(h) && h ? w / h : 1;
  const W = 1200;
  const H = Math.max(600, Math.round(W / ratio));
  const palettes = [
    ["#1A253A", "#C5984B"],
    ["#3D5068", "#D9A536"],
    ["#0F1A2A", "#E8C785"],
    ["#243349", "#C5984B"],
    ["#1A253A", "#D1D5DB"],
  ];
  const palette = palettes[(idx + String(prompt || "Lynora AI").length + (theme || "lynora").length) % palettes.length];
  const safePrompt = String(prompt || "Lynora AI concept").slice(0, 90).replace(/[<>&]/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="bg-${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="100%" stop-color="${palette[1]}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-${idx})"/>
      <circle cx="${180 + idx * 110}" cy="${150 + idx * 70}" r="${110 + idx * 26}" fill="white" opacity="0.08"/>
      <circle cx="${W - 220 - idx * 80}" cy="${H - 180 - idx * 60}" r="${140 + idx * 20}" fill="white" opacity="0.06"/>
      <rect x="64" y="64" width="${W - 128}" height="${H - 128}" rx="30" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.20)"/>
      <text x="50%" y="${H / 2 - 14}" fill="white" font-size="28" font-family="'Segoe UI', sans-serif" font-weight="700" text-anchor="middle" opacity="0.96">${safePrompt}</text>
      <text x="50%" y="${H / 2 + 34}" fill="white" font-size="17" font-family="'Segoe UI', sans-serif" text-anchor="middle" opacity="0.82">${styleLabel} · ${aspect}</text>
      <text x="50%" y="${H - 32}" fill="white" font-size="13" font-family="'Segoe UI', sans-serif" text-anchor="middle" opacity="0.58">Lynora AI · variation ${idx + 1}/${total}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
