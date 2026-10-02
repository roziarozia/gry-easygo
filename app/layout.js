import './globals.css';
import ConsentPixel from './ConsentPixel';
import PostHogInit from './PostHogInit';
import { SITE, DEFAULT_OG } from '../lib/site';

export const metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'EasyWonders — miejsce, które otwiera drzwi',
    template: '%s | EasyWonders',
  },
  description: 'Interaktywne ćwiczenia do nauki angielskiego online: gramatyka, słownictwo, quizy, słuchanie i konwersacje. Poziomy A1–C2. Zaczynamy wspólną przygodę?',
  openGraph: DEFAULT_OG,
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
        <PostHogInit />
        {children}
        {/* Zgoda na cookies (RODO) — Google Analytics, Meta Pixel i PostHog działają DOPIERO po zgodzie użytkownika z banera w ConsentPixel */}
        <ConsentPixel />
      </body>
    </html>
  );
}
