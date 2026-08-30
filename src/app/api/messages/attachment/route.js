import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

const isAllowedCloudinaryHost = (hostname) => hostname === "res.cloudinary.com"
  || hostname === "media.cloudinary.com"
  || hostname.endsWith(".cloudinary.com");
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
]);

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getCloudinaryCandidates(sourceUrl) {
  const match = sourceUrl.pathname.match(/\/(image|raw|video)\/upload\/(.+)$/i);
  if (!match) return [];
  const versionMatch = match[2].match(/^v(\d+)\//i);
  const path = match[2].replace(/^v\d+\//i, "");
  const resourceType = match[1].toLowerCase();
  const pathParts = path.split("/");
  const transformationPrefixes = /^(?:a|b|c|d|e|f|fl|g|h|l|o|q|r|t|w|x|y|z)_/i;
  while (resourceType !== "raw" && pathParts.length > 1 && transformationPrefixes.test(pathParts[0])) {
    pathParts.shift();
  }
  const pathWithoutTransformations = pathParts.join("/");
  const extensionMatch = pathWithoutTransformations.match(/\.([a-z0-9]+)$/i);
  const extension = extensionMatch?.[1] || "";
  const publicId = extension
    ? pathWithoutTransformations.slice(0, -(extension.length + 1))
    : pathWithoutTransformations;
  const signedDeliveryUrl = cloudinary.url(extension ? `${publicId}.${extension}` : publicId, {
    secure: true,
    sign_url: true,
    type: "upload",
    resource_type: resourceType,
    ...(versionMatch ? { version: versionMatch[1] } : {}),
  });
  let privateDownloadUrl = null;
  try {
    privateDownloadUrl = cloudinary.utils.private_download_url(publicId, extension || undefined, {
      resource_type: resourceType,
      type: "upload",
      attachment: false,
    });
  } catch {}
  return [...new Set([signedDeliveryUrl, privateDownloadUrl].filter(Boolean))];
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const source = request.nextUrl.searchParams.get("url");
  if (!source) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });

  let sourceUrl;
  try {
    sourceUrl = new URL(source);
  } catch {
    return NextResponse.json({ error: "URL de fichier invalide." }, { status: 400 });
  }
  if (!["https:", "http:"].includes(sourceUrl.protocol) || !isAllowedCloudinaryHost(sourceUrl.hostname)) {
    return NextResponse.json({ error: "Source de fichier non autorisée." }, { status: 403 });
  }

  let response;
  try {
    const sourceHeaders = {};
    const range = request.headers.get("range");
    if (range) sourceHeaders.Range = range;
    response = await fetch(sourceUrl, { cache: "no-store", redirect: "follow", headers: sourceHeaders });
  } catch {
    return NextResponse.json({ error: "Impossible de contacter le stockage du fichier." }, { status: 502 });
  }
  if (!response.ok && [401, 403].includes(response.status)) {
    const rangeHeaders = request.headers.get("range") ? { Range: request.headers.get("range") } : {};
    for (const candidate of getCloudinaryCandidates(sourceUrl)) {
      try {
        const candidateResponse = await fetch(candidate, { cache: "no-store", redirect: "follow", headers: rangeHeaders });
        if (candidateResponse.ok && candidateResponse.body) {
          response = candidateResponse;
          break;
        }
      } catch {}
    }
  }

  if (response.url) {
    let finalUrl;
    try { finalUrl = new URL(response.url); } catch { finalUrl = null; }
    if (!finalUrl || !isAllowedCloudinaryHost(finalUrl.hostname)) {
      return NextResponse.json({ error: "Redirection de fichier non autorisée." }, { status: 403 });
    }
  }
  if (!response.ok || !response.body) {
    const status = response.status || 502;
    console.error("Cloudinary attachment fetch failed", {
      status,
      source: sourceUrl.toString().replace(/\/\/.*?@/, "//[redacted]@"),
      candidateCount: getCloudinaryCandidates(sourceUrl).length,
    });
    return NextResponse.json({ error: `Cloudinary a refusé le fichier (${status}). Vérifiez les droits de livraison Cloudinary.` }, { status });
  }

  const headers = new Headers();
  const requestedMime = request.nextUrl.searchParams.get("mime");
  const contentType = requestedMime && ALLOWED_MIME_TYPES.has(requestedMime)
    ? requestedMime
    : response.headers.get("content-type") || "application/octet-stream";
  headers.set("Content-Type", contentType);
  const filename = request.nextUrl.searchParams.get("name") || "piece-jointe";
  const safeFilename = filename.replace(/[\r\n"\\]/g, "_");
  headers.set("Content-Disposition", `inline; filename="${safeFilename}"`);
  headers.set("Cache-Control", "private, max-age=300");
  const acceptRanges = response.headers.get("accept-ranges");
  const contentRange = response.headers.get("content-range");
  if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);
  if (contentRange) headers.set("Content-Range", contentRange);
  const contentLength = response.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  return new NextResponse(response.body, { status: response.status === 206 ? 206 : 200, headers });
}
