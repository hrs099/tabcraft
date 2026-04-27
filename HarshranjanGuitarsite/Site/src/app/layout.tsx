import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Harsh Ranjan | Guitarist, Composer & Storyteller",
  description: "Official portfolio of Harsh Ranjan — India's most immersive fingerstyle guitarist. Explore music, performances, techniques and collaborations in 3D.",
  openGraph: {
    title: "Harsh Ranjan | Guitarist, Composer & Storyteller",
    description: "Official portfolio of Harsh Ranjan — India's most immersive fingerstyle guitarist. Explore music, performances, techniques and collaborations in 3D.",
    url: "https://harshranjanmusic.com",
    siteName: "Harsh Ranjan Portfolio",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body
        className={`${playfair.variable} ${inter.variable} font-sans bg-[#0A0A0F] text-[#F5F0E8] antialiased selection:bg-[#D4AF37] selection:text-[#0A0A0F]`}
      >
        {children}
      </body>
    </html>
  );
}
