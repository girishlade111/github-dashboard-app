import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Ledger — GitHub Personal Dashboard",
  description: "Private dashboard for the owner's GitHub universe. Data cached from GitHub.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-canvas font-body text-body antialiased">
        <main className="mx-auto max-w-[1200px] px-6">{children}</main>
        <footer className="mt-24 bg-surface-dark text-on-dark-soft">
          <div className="mx-auto max-w-[1200px] px-6 py-16">
            <p className="text-sm">Private dashboard · data cached from GitHub</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
