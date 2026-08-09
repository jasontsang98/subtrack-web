import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppFooter } from "@/app/components/AppFooter";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Subtrack Web", template: "%s | Subtrack Web" },
  description: "A private-by-default, self-hosted subscription manager backed by PostgreSQL.",
  icons: { icon: "/subtrack-icon.png", shortcut: "/subtrack-icon.png", apple: "/subtrack-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en">
    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {children}
      <AppFooter />
    </body>
  </html>;
}
