import { headers } from "next/headers";
import FeedShell from "@/components/FeedShell";

export default async function FeedPage() {
  const cookie = headers().get("cookie");
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:4001";
  let data = { posts: [] };
  try {
    const response = await fetch(`${backendUrl}/v1/posts?feedOnly=true&limit=50`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (response.ok) data = await response.json();
  } catch {
    // Le feed client peut récupérer les données lorsque le backend redevient disponible.
  }
  return <FeedShell initialPosts={data.posts || []} />;
}
