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

export async function registerUploadRoutes(app) {
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
  app.post("/v1/upload", async (request, reply) => {
    if (!await getSessionUserId(request)) return reply.code(401).send({ error: "Non authentifié" });
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return reply.code(503).send({ error: "Configuration Cloudinary backend manquante" });
    }
    const part = await request.file({ limits: { fileSize: MAX_UPLOAD_BYTES } });
    if (!part) return reply.code(400).send({ error: "Aucun fichier fourni" });
    if (part.mimetype && !ALLOWED_MIME_TYPES.has(part.mimetype)) return reply.code(415).send({ error: "Type de fichier non autorisé" });
    if (part.file.truncated) return reply.code(413).send({ error: "Fichier trop volumineux. Taille maximale: 25 Mo." });
    const type = String(request.query?.type || (part.mimetype?.startsWith("video/") ? "video" : "image"));
    const resourceType = type === "video" ? "video" : type === "image" ? "image" : "raw";
    try {
      const result = await new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ folder: "lynoralink", resource_type: resourceType }, (error, value) => error ? reject(error) : resolve(value)); part.file.pipe(stream); });
      return reply.send({ url: result.secure_url, type, publicId: result.public_id, fallback: false });
    } catch (error) {
      request.log.error({ err: error, type, resourceType }, "Cloudinary upload failed");
      return reply.code(502).send({
        error: "Cloudinary a refusé l'upload. Vérifiez les identifiants Cloudinary.",
      });
    }
  });
}