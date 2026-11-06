import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import Providers from "@/components/Providers";
import "./globals.css";

const body = DM_Sans({ variable: "--font-body", subsets: ["latin"] });
const heading = Fraunces({ variable: "--font-heading", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Belle · Conseillère beauté",
  description: "Trouvez le maquillage qui vous va vraiment, au meilleur prix.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#973131",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${body.variable} ${heading.variable} font-sans antialiased`}>
        <Providers>
          <main className="mx-auto min-h-dvh max-w-2xl px-4 pb-32 pt-6 sm:px-6">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
