import { v2 as cloudinary } from "cloudinary";

export async function registerUploadRoutes(app) {
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
  app.post("/v1/upload", async (request, reply) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return reply.code(503).send({ error: "Configuration Cloudinary backend manquante" });
    }
    const part = await request.file();
    if (!part) return reply.code(400).send({ error: "Aucun fichier fourni" });
    const type = String(request.query?.type || (part.mimetype?.startsWith("video/") ? "video" : "image"));
    const resourceType = type === "video" ? "video" : type === "image" ? "image" : "raw";
    try {
      const result = await new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ folder: "lynoralink", resource_type: resourceType }, (error, value) => error ? reject(error) : resolve(value)); part.file.pipe(stream); });
      return reply.send({ url: result.secure_url, type, publicId: result.public_id, fallback: false });
    } catch (error) {
      request.log.error({ err: error, type, resourceType }, "Cloudinary upload failed");
      return reply.code(502).send({ error: "Cloudinary a refusé l'upload. Vérifiez les identifiants Cloudinary." });
    }
  });
}