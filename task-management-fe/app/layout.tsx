import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Task Management",
  description: "Create, edit and track tasks",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans dark:bg-black">
        <nav className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <Link href="/" className="mx-auto block max-w-2xl font-semibold">
            Task Management
          </Link>
        </nav>
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">{children}</main>
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
      </body>
    </html>
  );
}
