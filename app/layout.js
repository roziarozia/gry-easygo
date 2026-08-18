import './globals.css';
import Script from 'next/script';
import ConsentPixel from './ConsentPixel';
// Adres serwisu. Zmiana domeny = jedna zmienna NEXT_PUBLIC_SITE_URL w Vercel.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gry.easygo-english.pl';

export const metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'EasyWonders — miejsce, które otwiera drzwi',
    template: '%s | EasyWonders',
  },
  description: 'EasyWonders — miejsce, które otwiera drzwi. To co, zaczynamy wspólną przygodę z językiem angielskim? Interaktywne gry i ćwiczenia: gramatyka, słownictwo, quizy, uzupełnianie luk, słuchanie i konwersacje. Poziomy od A1 do C2.',
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: 'EasyWonders',
    title: 'EasyWonders — miejsce, które otwiera drzwi',
    description: 'To co, zaczynamy wspólną przygodę z językiem angielskim? Interaktywne gry i ćwiczenia do nauki angielskiego, poziomy A1–C2.',
    images: [
      {
        url: '/og-easywonders.png',
        width: 1200,
        height: 630,
        alt: 'EasyWonders — miejsce, które otwiera drzwi',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EasyWonders — miejsce, które otwiera drzwi',
    description: 'To co, zaczynamy wspólną przygodę z językiem angielskim?',
    images: ['/og-easywonders.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Quicksand:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Tryb ciemny wspólny dla całej witryny — ustaw klasę na <html> zanim strona się wyrenderuje (bez mignięcia). Wspólny klucz z odtwarzaczem i katalogiem: localStorage 'easygo_tryb'. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('easygo_tryb')==='dark'){document.documentElement.classList.add('eg-dark');}}catch(e){}",
          }}
        />
      </head>
      <body>
        {children}
        <ConsentPixel />

        {/* Google Analytics (GA4) — mierzy ruch na stronie */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-KWQVZY8YED"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-KWQVZY8YED');
          `}
        </Script>
      </body>
    </html>
  );
}
