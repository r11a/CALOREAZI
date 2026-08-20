import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./logo-fix.css";
import "./product.css";

export const metadata: Metadata = {
  title: "CALOREAZI — המאמן התזונתי האישי שלך",
  description: "מעקב תזונה חכם, פשוט ואישי עם AI Coach שמכיר אותך.",
  applicationName: "CALOREAZI",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F26A3D" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="he" dir="rtl"><body>{children}</body></html>;
}
