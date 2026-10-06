import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fontOutfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const fontInter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://runova.vercel.app"
  ),
  title: {
    default: "RUNOVA — Running Intelligence Platform",
    template: "%s | RUNOVA",
  },
  description:
    "RUNOVA es la plataforma de running de alto rendimiento para atletas, entrenadores y clubes. Planificación, análisis biomecánico, IA entrenadora y seguimiento en vivo.",
  keywords: [
    "running",
    "atletismo",
    "entrenamiento",
    "running tracker",
    "coach running",
    "VO2 max",
    "ACWR",
    "plan de entrenamiento",
    "rendimiento deportivo",
    "smartwatch running",
  ],
  authors: [{ name: "RUNOVA Team" }],
  creator: "RUNOVA",
  publisher: "RUNOVA",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    title: "RUNOVA — Running Intelligence Platform",
    description:
      "Tu entrenamiento. Tus datos. Tu evolución. Plataforma de running de alto rendimiento con IA, análisis en vivo y gestión de club.",
    siteName: "RUNOVA",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RUNOVA — Running Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RUNOVA — Running Intelligence Platform",
    description:
      "Tu entrenamiento. Tus datos. Tu evolución.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="scroll-smooth light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FAFAFA" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('runova_theme')||'light';document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('light');}})();`,
          }}
        />
      </head>
      <body
        className={`${fontOutfit.variable} ${fontInter.variable} ${fontMono.variable} min-h-screen antialiased selection:bg-[#C1F429] selection:text-black font-sans`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
