import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RepoLens | Next-Gen Codebase Intelligence Engine",
  description:
    "RepoLens automatically parses GitHub repositories into interactive AST graphs, cross-module symbol maps, and architectural health scores.",
  icons: {
    icon: "/repolens-icon.png",
    shortcut: "/repolens-icon.png",
    apple: "/repolens-icon.png",
  },
  keywords: [
    "RepoLens",
    "Codebase Intelligence",
    "GitHub Analysis",
    "Software Architecture",
    "AST Parser",
    "Dependency Graph",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}
