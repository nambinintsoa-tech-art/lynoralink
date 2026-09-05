import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Providers from "@/components/Providers";
import Script from "next/script";

export const metadata = {
  title: "LynoraLink",
  description:
    "LynoraLink connecte les professionnels, fait grandir votre réseau et fait avancer votre carrière.",
  icons: {
    icon: "/logo_lynora.svg",
    shortcut: "/logo_lynora.svg",
    apple: "/logo_lynora.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#EFF4F9",
};

export default async function RootLayout({ children }) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error("NextAuth server session unavailable:", error);
  }

  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Script id="lynoralink-appearance" strategy="beforeInteractive">
          {`try {
            const appearance = JSON.parse(localStorage.getItem("lynoralink:appearance") || "null") || {};
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const theme = appearance.theme || "system";
            document.documentElement.dataset.theme = theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme;
            document.documentElement.dataset.density = appearance.density || "comfortable";
            document.documentElement.dataset.fontScale = appearance.fontScale || "medium";
          } catch {}`}
        </Script>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
