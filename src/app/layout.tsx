import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "space.z.ai - AI Website Generator",
  description: "Buat website otomatis dengan AI. Tulis judul, AI buatkan website profesional.",
  keywords: ["space.z.ai", "AI", "website generator", "Next.js", "TypeScript"],
  authors: [{ name: "space.z.ai" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "space.z.ai - AI Website Generator",
    description: "Buat website otomatis dengan AI",
    url: "https://space.z.ai",
    siteName: "space.z.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "space.z.ai - AI Website Generator",
    description: "Buat website otomatis dengan AI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
