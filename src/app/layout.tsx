import type { Metadata, Viewport } from "next";
import { Anton, Black_Han_Sans, Gowun_Batang, Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

const serif = Instrument_Serif({ variable: "--nf-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const display = Anton({ variable: "--nf-display", subsets: ["latin"], weight: "400" });
const sans = Inter({ variable: "--nf-sans", subsets: ["latin"] });
// Korean fallbacks for shows generated in 한국어
const displayKo = Black_Han_Sans({ variable: "--nf-display-ko", weight: "400", preload: false });
const serifKo = Gowun_Batang({ variable: "--nf-serif-ko", weight: "400", preload: false });

export const metadata: Metadata = {
  title: "DOUBLE — your feed, cast in a reality show",
  description: "Your Instagram becomes an AI Double. Your friends bring theirs. Watch what happens.",
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${display.variable} ${sans.variable} ${displayKo.variable} ${serifKo.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-ink text-paper font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
