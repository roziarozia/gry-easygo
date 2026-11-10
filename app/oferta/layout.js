import { DEFAULT_OG } from '../../lib/site';

// Tytuł i opis strony oferty dla Google (page.js jest komponentem klienta, więc metadane są tutaj).
const OPIS = 'Plan indywidualny i konto lektora z miejscami dla uczniów. Ponad 500 interaktywnych ćwiczeń z angielskiego od A1 do C1. 14 dni za darmo, bez podawania karty.';

export const metadata = {
  title: 'Cennik i plany – 14 dni za darmo',
  description: OPIS,
  alternates: { canonical: '/oferta' },
  openGraph: { ...DEFAULT_OG, title: 'Cennik i plany – EasyWonders', description: OPIS, url: '/oferta' },
};

export default function OfertaLayout({ children }) {
  return children;
}
