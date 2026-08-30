import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsLynora from "@/components/SettingsLynora";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FA" }}>
      <SettingsLynora initialSession={session} />
    </div>
  );
}
