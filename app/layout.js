import './globals.css';
import Script from 'next/script';
import ConsentPixel from './ConsentPixel';
export const metadata = {
  metadataBase: new URL('https://gry.easygo-english.pl'),
  title: {
    default: 'Gry i ćwiczenia interaktywne do angielskiego | EasyGo English',
    template: '%s | EasyGo English',
  },
  description: 'Interaktywne ćwiczenia do nauki angielskiego: gramatyka, słownictwo, quizy, uzupełnianie luk i konwersacje. Poziomy od A1 do C2. Ćwicz online za darmo.',
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: 'EasyGo English',
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

        {/* Google Analytics (GA4) — mierzy ruch na gry.easygo-english.pl */}
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
