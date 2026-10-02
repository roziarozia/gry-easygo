// Adres serwisu. Zmiana domeny = jedna zmienna NEXT_PUBLIC_SITE_URL w Vercel.
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gry.easygo-english.pl';

// Domyślne Open Graph całej witryny. Strona główna dokłada do niego og:url,
// bo Next podmienia cały obiekt openGraph, a nie pojedyncze pola.
export const DEFAULT_OG = {
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
};

// Szkoła, która prowadzi EasyWonders (te same dane co w katalogach firm).
export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': 'https://easygo-english.pl/#organization',
  name: 'EasyGo English',
  url: 'https://easygo-english.pl',
  email: 'info@easygo-english.pl',
  founder: { '@type': 'Person', name: 'Rozalia Lakhwani' },
};
