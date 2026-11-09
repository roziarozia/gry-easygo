import MaturaHub from './MaturaHub';
import { getPublishedMatura } from '../../lib/supabase';
import { SITE, ORGANIZATION } from '../../lib/site';
import { SECTIONS, taskName } from './maturaData';

// Strona /matura startuje SAMA: dopóki w bazie nie ma żadnego OPUBLIKOWANEGO ćwiczenia
// maturalnego, Google i AI dostają „noindex”, a strony nie ma w mapie strony ani w llms.txt.
// Po opublikowaniu pierwszych ćwiczeń (w panelu) strona otwiera się dla wyszukiwarek
// w ciągu kilku minut, a na stronie głównej pojawia się napis „Matura”.
export const revalidate = 300;

const OPIS = 'Ćwiczenia z angielskiego jak na maturze: Listening, Reading, Use of English, Writing i matura ustna. Poziom podstawowy i rozszerzony, polecenia jak w arkuszu.';

export async function generateMetadata() {
  const live = (await getPublishedMatura()).length > 0;
  return {
    title: 'Matura z angielskiego 2027 – ćwiczenia online',
    description: OPIS,
    alternates: { canonical: '/matura' },
    openGraph: { title: 'Matura z angielskiego – ćwiczenia online | EasyWonders', description: OPIS, url: '/matura', type: 'website' },
    robots: live ? { index: true, follow: true } : { index: false, follow: false },
  };
}

const LEVELS = [['basic', 'Poziom podstawowy'], ['ext', 'Poziom rozszerzony']];

export default async function MaturaPage() {
  const games = await getPublishedMatura();

  const jsonLd = games.length ? [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: 'Matura z angielskiego – ćwiczenia online', description: OPIS,
      url: `${SITE}/matura`, inLanguage: 'pl', publisher: { '@id': ORGANIZATION['@id'] },
    },
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'Ćwiczenia maturalne z angielskiego – EasyWonders',
      numberOfItems: games.length,
      itemListElement: games.map((g, i) => ({
        '@type': 'ListItem', position: i + 1, url: `${SITE}/matura/${g.slug}`, name: g.title,
      })),
    },
  ] : null;

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      {/* Spis ćwiczeń dla robotów (Google/AI): prawdziwe linki i opisy w HTML z serwera.
          Wizualnie ukryty — uczniowie widzą gazetowy spis treści poniżej (tam jest nagłówek H1). */}
      {games.length > 0 && (
        <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          <h2>Matura z angielskiego: ćwiczenia online</h2>
          <p>{OPIS}</p>
          {LEVELS.map(([lv, lvName]) => {
            const lvGames = games.filter((g) => g.matura_level === lv);
            if (!lvGames.length) return null;
            return (
              <section key={lv}>
                <h3>Matura z angielskiego – {lvName.toLowerCase()}</h3>
                {SECTIONS.map((s) => {
                  const items = lvGames.filter((g) => g.matura_section === s.id);
                  if (!items.length) return null;
                  return (
                    <section key={s.id}>
                      <h4>{s.en} ({s.pl})</h4>
                      <ul>
                        {items.map((g) => (
                          <li key={g.slug}>
                            <a href={`/matura/${g.slug}`}>{g.title}</a>
                            {' – '}{taskName(lv, s.id, g.matura_task)}{'. '}{g.learn_text || g.description}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
      <MaturaHub />
    </>
  );
}
