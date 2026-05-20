import type { Metadata, Viewport } from "next";
import { Geist, PT_Serif } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const ptSerif = PT_Serif({
  variable: "--font-pt-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});

export const metadata: Metadata = {
  title: "WorkCafeSeeker",
  description: "Find work-friendly cafes in the SF Bay Area.",
};

export const viewport: Viewport = {
  themeColor: "#f5efe6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${geist.variable} ${ptSerif.variable}`}
    >
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground">
        <main className="flex-1 flex flex-col pb-16">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
