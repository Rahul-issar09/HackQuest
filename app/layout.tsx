import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "HackQuest Prep", template: "%s | HackQuest Prep" },
  description: "Private cybersecurity preparation tracker. Independent tool, not affiliated with TCS.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1020" };

const themeScript = `try{if(localStorage.getItem('hq-theme')==='light')document.documentElement.classList.add('light')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster theme="system" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
