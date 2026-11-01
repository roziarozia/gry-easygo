import { getGameBySlug } from '../../../lib/supabase';
import { SITE, ORGANIZATION } from '../../../lib/site';
import { sectionOf, taskName } from '../maturaData';
import MaturaExercise from './MaturaExercise';

// Podstrona ćwiczenia maturalnego. Ćwiczenie ma JEDEN adres (/matura/…);
// stary adres /cwiczenie/… przekierowuje tutaj, więc Google widzi jedną stronę.
// Opublikowane ćwiczenie jest widoczne dla Google i AI; szkic (podgląd właścicielki) ma „noindex”.
export const revalidate = 300;
export const dynamicParams = true;

function przytnij(tekst, max) {
  const t = (tekst || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > 80 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, '') + '…';
}

export async function generateMetadata({ params }) {
  const game = await getGameBySlug(params.slug);
  if (!game) {
    return { title: 'Matura z angielskiego', alternates: { canonical: `/matura/${params.slug}` }, robots: { index: false, follow: false } };
  }
  const tytul = game.seo_title || game.title;
  const opis = przytnij(game.learn_text || game.description || '', 160);
  return {
    title: tytul,
    description: opis,
    alternates: { canonical: `/matura/${game.slug}` },
    openGraph: { title: tytul, description: opis, url: `/matura/${game.slug}`, type: 'article' },
    robots: { index: true, follow: true },
  };
}

export default async function MaturaExercisePage({ params }) {
  // Opublikowane ćwiczenie przychodzi z serwera; szkic (podgląd właścicielki)
  // komponent dociąga sam w przeglądarce, z jej sesją.
  const game = await getGameBySlug(params.slug);

  let jsonLd = null;
  if (game && game.matura) {
    const sec = sectionOf(game.matura_section);
    const poziom = game.matura_level === 'ext' ? 'matura, poziom rozszerzony' : 'matura, poziom podstawowy';
    jsonLd = [
      {
        '@context': 'https://schema.org', '@type': 'LearningResource',
        name: game.title, description: game.learn_text || game.description || '',
        educationalLevel: poziom, inLanguage: 'en', teaches: 'English',
        learningResourceType: 'Interactive exercise',
        about: [sec ? sec.en : '', taskName(game.matura_level, game.matura_section, game.matura_task)].filter(Boolean).join(': '),
        isAccessibleForFree: !game.is_premium,
        provider: ORGANIZATION,
        url: `${SITE}/matura/${game.slug}`,
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'EasyWonders', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Matura z angielskiego', item: `${SITE}/matura` },
          { '@type': 'ListItem', position: 3, name: game.title, item: `${SITE}/matura/${game.slug}` },
        ],
      },
    ];
  }

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <MaturaExercise slug={params.slug} initial={game ? {
        slug: game.slug, title: game.title, learn_text: game.learn_text || '', description: game.description || '',
        matura_level: game.matura_level, matura_section: game.matura_section, matura_task: game.matura_task, exercise_no: game.exercise_no,
      } : null} />
    </>
  );
}
