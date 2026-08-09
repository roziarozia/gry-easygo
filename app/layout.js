import './globals.css';
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
      </head>
      <body>{children}</body>
    </html>
  );
}
