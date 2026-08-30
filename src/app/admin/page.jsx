import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LynoraAdmin from "@/components/admin";

const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || "";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return redirect("/login");
  }

  if (adminEmail && session.user.email.toLowerCase() !== adminEmail) {
    return redirect("/feed");
  }

  return <LynoraAdmin adminEmail={adminEmail} />;
}
