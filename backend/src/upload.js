import { v2 as cloudinary } from "cloudinary";
import { getSessionUserId } from "./auth.js";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

async function uploadUnsigned({ buffer, fileName, mimeType, cloudName, preset, resourceType }) {
  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: mimeType || "application/octet-stream" }), fileName || "upload");
  formData.append("upload_preset", preset);
  formData.append("folder", "lynoralink");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: "POST", body: formData });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message || `Cloudinary unsigned upload failed (${response.status})`);
  return result;
}

export async function registerUploadRoutes(app) {
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
  app.post("/v1/upload", async (request, reply) => {
    if (!await getSessionUserId(request)) return reply.code(401).send({ error: "Non authentifié" });
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const hasSignedConfig = Boolean(cloudName && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    if (!cloudName || (!hasSignedConfig && !preset)) {
      return reply.code(503).send({ error: "Configuration Cloudinary backend manquante" });
    }
    const part = await request.file({ limits: { fileSize: MAX_UPLOAD_BYTES } });
    if (!part) return reply.code(400).send({ error: "Aucun fichier fourni" });
    if (part.mimetype && !ALLOWED_MIME_TYPES.has(part.mimetype)) return reply.code(415).send({ error: "Type de fichier non autorisé" });
    if (part.file.truncated) return reply.code(413).send({ error: "Fichier trop volumineux. Taille maximale: 25 Mo." });
    const formType = part.fields?.type?.value;
    const type = String(request.query?.type || formType || (part.mimetype?.startsWith("video/") ? "video" : "image"));
    const resourceType = type === "video" ? "video" : type === "image" ? "image" : "raw";
    try {
      const buffer = await part.toBuffer();
      const result = preset
        ? await uploadUnsigned({ buffer, fileName: part.filename, mimeType: part.mimetype, cloudName, preset, resourceType })
        : await new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ folder: "lynoralink", resource_type: resourceType }, (error, value) => error ? reject(error) : resolve(value)); stream.end(buffer); });
      const deliveryUrl = resourceType === "raw" && result.public_id && process.env.CLOUDINARY_API_SECRET
        ? cloudinary.url(result.public_id, { resource_type: "raw", type: "upload", secure: true, sign_url: true })
        : result.secure_url;
      return reply.send({ url: deliveryUrl, type, publicId: result.public_id, fallback: false });
    } catch (error) {
      request.log.error({ err: error, type, resourceType }, "Cloudinary upload failed");
      return reply.code(502).send({
        error: "Cloudinary a refusé l'upload. Vérifiez les identifiants Cloudinary.",
      });
    }
  });
}