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
  title: "Take — Food, fast",
  description: "Order from the neighbourhood's best kitchen. Hot, fresh & on time with real-time order tracking.",
  keywords: ["Take", "food delivery", "order online", "real-time tracking", "Next.js", "restaurant"],
  authors: [{ name: "Take" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Take — Food, fast",
    description: "Hot, fresh & on time. Order with real-time tracking.",
    siteName: "Take",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Take — Food, fast",
    description: "Hot, fresh & on time. Order with real-time tracking.",
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
