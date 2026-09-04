import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

const getPreset = (type) => {
  if (type === "video") return process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_PRESET || "";
  if (type === "image") return process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
  return process.env.NEXT_PUBLIC_CLOUDINARY_DOCUMENT_PRESET || "";
};

async function uploadUnsigned({ bytes, file, cloudName, preset, resourceType }) {
  if (!cloudName || !preset) return null;
  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: file.type || "application/octet-stream" }), file.name || "upload");
  formData.append("upload_preset", preset);
  formData.append("folder", "lynoralink");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: formData,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.secure_url) {
    const error = new Error(result.error?.message || `Cloudinary unsigned upload failed (${response.status})`);
    error.http_code = response.status;
    throw error;
  }
  return result;
}

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const type = formData.get("type") || (file?.type?.startsWith("video") ? "video" : "image");
    const preset = formData.get("preset") || getPreset(type);

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`;
    const hasPreset = !!preset;

    // Vérifier si Cloudinary est correctement configuré
    const hasCloudinaryConfig = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      (hasPreset || (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));

    // Si Cloudinary n'est pas configuré ou pas de preset, utiliser le fallback base64
    if (!hasCloudinaryConfig || !hasPreset) {
      console.log("Cloudinary not fully configured, using base64 fallback", {
        hasCloud: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasSecret: !!process.env.CLOUDINARY_API_SECRET,
        hasPreset,
      });
      return NextResponse.json({ url: dataUrl, type, fallback: true });
    }

    const resourceType = type === "video" ? "video" : type === "image" ? "image" : "raw";

    let uploadResult;
    const uploadOptions = {
      folder: "lynoralink",
      resource_type: resourceType,
    };

    try {
      if (preset) {
        // Upload presets are unsigned, so use the unsigned endpoint directly.
        uploadResult = await uploadUnsigned({
          bytes,
          file,
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          preset,
          resourceType,
        });
      } else {
        uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          uploadStream.end(bytes);
        });
      }
    } catch (error) {
      console.error("Cloudinary upload failed", {
        message: error?.message,
        httpCode: error?.http_code,
        type,
        resourceType,
        hasPreset: !!preset,
      });
      const httpCode = error?.http_code || 502;
      return NextResponse.json({
        error: "Cloudinary a refusé l'upload. Vérifiez le cloud name et le preset.",
        cloudinaryError: error?.message,
        httpCode,
      }, { status: httpCode === 401 || httpCode === 403 ? httpCode : 502 });
    }

    return NextResponse.json({
      url: uploadResult.secure_url,
      type,
      publicId: uploadResult.public_id,
      fallback: false,
    });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({
      error: "Échec de l'upload Cloudinary",
      details: error?.message,
    }, { status: 502 });
  }
}
