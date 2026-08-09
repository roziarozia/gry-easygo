import { getGameBySlug, getPublishedGames } from '../../../lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import GameEmbed from './GameEmbed';

export async function generateStaticParams() {
  const games = await getPublishedGames();
  return games.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }) {
  const game = await getGameBySlug(params.slug);
  if (!game) return { title: 'Nie znaleziono ćwiczenia' };
  const opis = game.description || `Ćwiczenie do nauki angielskiego${game.level ? ', poziom ' + game.level : ''}.`;
  return {
    title: game.title,
    description: opis,
    alternates: { canonical: `/cwiczenie/${game.slug}` },
    openGraph: {
      title: game.title, description: opis,
      images: game.cover_url ? [game.cover_url] : [], type: 'article',
    },
  };
}

const CAT_LABEL = { gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', speaking: 'Speaking', reading: 'Reading' };

export default async function CwiczeniePage({ params }) {
  const game = await getGameBySlug(params.slug);
  if (!game) notFound();
  const catLabel = CAT_LABEL[game.category] || game.category || '';

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'LearningResource',
    name: game.title, description: game.description || '',
    educationalLevel: game.level || '', inLanguage: 'en', teaches: 'English',
    learningResourceType: 'Interactive exercise', isAccessibleForFree: !game.is_premium,
    provider: { '@type': 'Organization', name: 'EasyGo English', url: 'https://easygo-english.pl' },
    url: `https://gry.easygo-english.pl/cwiczenie/${game.slug}`,
  };

  return (
    <div className="eg-games">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* GÓRA: gra osadzona w formie i wielkości jak teraz (okładka + granie po kliknięciu) */}
      <GameEmbed slug={game.slug} />

      {/* DÓŁ: opis czytelny dla Google/AI — Twój tekst z bazy, wyśrodkowany, zwięzły */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '6px 20px 40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
          {game.level && (
            <Link href={`/?poziom=${encodeURIComponent(game.level)}`} className="eg-tag eg-tag-level eg-tag-link">
              {game.level}
            </Link>
          )}
          {catLabel && (
            <Link href={`/?kategoria=${encodeURIComponent(game.category)}`} className="eg-tag eg-tag-link">
              {catLabel}
            </Link>
          )}
          {game.is_premium
            ? <span className="eg-tag eg-tag-premium">Dla subskrybentów</span>
            : <span className="eg-tag eg-tag-free">Darmowe</span>}
        </div>

        <h1 style={{ fontFamily: "'Quicksand',sans-serif", fontSize: 23, fontWeight: 700, color: 'var(--eg-ink)', margin: '0 0 10px', lineHeight: 1.25 }}>
          {game.title}
        </h1>

        {game.description && (
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--eg-ink)', margin: '0 0 18px' }}>
            {game.description}
          </p>
        )}

        <Link href="/" style={{ color: 'var(--eg-magenta)', fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>
          ← Zobacz wszystkie ćwiczenia
        </Link>
      </section>
    </div>
  );
}
