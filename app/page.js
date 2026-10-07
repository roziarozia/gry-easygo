import { getPublishedGames } from '../lib/supabase';
import { SITE, DEFAULT_OG, ORGANIZATION } from '../lib/site';
import CatalogEmbed from './CatalogEmbed';
export const revalidate = 300; // odśwież listę z bazy co 5 min

export const metadata = {
  alternates: { canonical: '/' },
  openGraph: { ...DEFAULT_OG, url: '/' },
};

const CAT_LABEL = { gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', speaking: 'Speaking', reading: 'Reading', listening: 'Listening', kultura: 'Wiedza o krajach' };
// Kolejność sekcji na liście dla robotów; kategorie spoza tej listy trafiają do "Inne ćwiczenia".
const CAT_ORDER = ['gramatyka', 'slownictwo', 'reading', 'listening', 'speaking', 'kultura'];
// Liczba ćwiczeń w ItemList (numberOfItems musi się zgadzać z tym, co jest na liście).
const ITEM_LIST_SIZE = 60;

export default async function HomePage() {
  const games = await getPublishedGames();
  const listed = games.slice(0, ITEM_LIST_SIZE);
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: 'EasyWonders', url: SITE, inLanguage: 'pl',
      publisher: { '@id': ORGANIZATION['@id'] },
    },
    { '@context': 'https://schema.org', ...ORGANIZATION },
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'Ćwiczenia interaktywne do angielskiego – EasyWonders',
      numberOfItems: listed.length,
      itemListElement: listed.map((g, i) => ({
        '@type': 'ListItem', position: i + 1,
        url: `${SITE}/cwiczenie/${g.slug}`, name: g.title,
      })),
    },
  ];

  // Ćwiczenia pogrupowane w sekcje z nagłówkami H2 (czytelniejsza struktura dla Google i AI).
  const sections = [...CAT_ORDER, 'inne']
    .map((cat) => ({
      cat,
      label: cat === 'inne' ? 'Inne ćwiczenia' : CAT_LABEL[cat],
      items: games.filter((g) => (CAT_ORDER.includes(g.category) ? g.category : 'inne') === cat),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Lista dla robotów (Google/AI): prawdziwe linki + teksty z bazy w HTML serwera.
          Wizualnie ukryta — wygląd zapewnia osadzony katalog poniżej. */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }} aria-hidden="false">
        <h1>Interaktywne ćwiczenia do nauki angielskiego online</h1>
        <p>Ćwicz angielski online: gramatyka, słownictwo, quizy, uzupełnianie luk i konwersacje. Poziomy A1–C2.</p>
        <p>
          EasyWonders prowadzi szkoła <a href="https://easygo-english.pl">EasyGo English</a> z Warszawy.
        </p>
        {sections.map((s) => (
          <section key={s.cat}>
            <h2>{s.label}: ćwiczenia z angielskiego</h2>
            <ul>
              {s.items.map((g) => (
                <li key={g.slug}>
                  <a href={`/cwiczenie/${g.slug}`}>{g.title}</a>
                  {' – '}{g.description}
                  {g.level ? ` (poziom ${g.level}${CAT_LABEL[g.category] ? ', ' + CAT_LABEL[g.category] : ''})` : ''}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {/* Twój katalog 1:1 (wygląd, filtry, serie, ulubione, tryb ciemny, pyłek) */}
      <CatalogEmbed />
    </>
  );
}
