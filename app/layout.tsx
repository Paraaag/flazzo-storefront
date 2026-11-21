import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "700", "800"] });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "FLAZZO | Fresh Atta Your Way",
  description:
    "Freshly ground wheat flour, milled when you order and delivered to your door in Mahalunge, Pune. Choose your wheat, pack size and grind.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#291047" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
