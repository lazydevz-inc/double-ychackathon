import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Serif, Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const serif = Instrument_Serif({ variable: "--nf-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const display = Anton({ variable: "--nf-display", subsets: ["latin"], weight: "400" });
const sans = Inter({ variable: "--nf-sans", subsets: ["latin"] });
// people still write a word of Korean now and then
const ko = Noto_Sans_KR({ variable: "--nf-ko", weight: ["400", "700", "900"], preload: false });

export const metadata: Metadata = {
  title: "DOUBLE — Meet your other self.",
  description: "What if your social life continued while you were offline? Your Double lives on in a shared world with everyone else's.",
};

export const viewport: Viewport = { themeColor: "#0a0a0a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${display.variable} ${sans.variable} ${ko.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-ink text-paper font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
