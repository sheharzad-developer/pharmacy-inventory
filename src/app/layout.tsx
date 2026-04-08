import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthNav } from "@/app/_components/AuthNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pharmacy Inventory System",
  description: "Simple Pharmacy Inventory System built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="appHeader">
          <div className="container headerInner">
            <div className="brand">
              <span className="brandMark" aria-hidden>
                Rx
              </span>
              <span className="brandName">Pharmacy Inventory</span>
            </div>
            <nav className="nav">
              <a className="navLink" href="/dashboard">
                Dashboard
              </a>
              <a className="navLink" href="/add-medicine">
                Add Medicine
              </a>
              <a className="navLink" href="/inventory">
                Inventory
              </a>
              <AuthNav />
            </nav>
          </div>
        </header>
        <main className="container appMain">{children}</main>
      </body>
    </html>
  );
}
