import { getPublishedGames } from '../lib/supabase';
import CatalogEmbed from './CatalogEmbed';

export const revalidate = 300; // odśwież listę z bazy co 5 min

const CAT_LABEL = { gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', speaking: 'Speaking', reading: 'Reading' };

export default async function HomePage() {
  const games = await getPublishedGames();

  const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gry.easygo-english.pl';
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'Ćwiczenia interaktywne do angielskiego – EasyGo English',
    numberOfItems: games.length,
    itemListElement: games.slice(0, 60).map((g, i) => ({
      '@type': 'ListItem', position: i + 1,
      url: `${SITE}/cwiczenie/${g.slug}`, name: g.title,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Lista dla robotów (Google/AI): prawdziwe linki + teksty z bazy w HTML serwera.
          Wizualnie ukryta — wygląd zapewnia osadzony katalog poniżej. */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }} aria-hidden="false">
        <h1>Interaktywne ćwiczenia do nauki angielskiego online</h1>
        <p>Ćwicz angielski online: gramatyka, słownictwo, quizy, uzupełnianie luk i konwersacje. Poziomy A1–C2.</p>
        <ul>
          {games.map((g) => (
            <li key={g.slug}>
              <a href={`/cwiczenie/${g.slug}`}>{g.title}</a>
              {' – '}{g.description}
              {g.level ? ` (poziom ${g.level}${CAT_LABEL[g.category] ? ', ' + CAT_LABEL[g.category] : ''})` : ''}
            </li>
          ))}
        </ul>
      </div>

      {/* Twój katalog 1:1 (wygląd, filtry, serie, ulubione, tryb ciemny, pyłek) */}
      <CatalogEmbed />
    </>
  );
}
