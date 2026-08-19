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
  // meta-description: opis + poziom + kilka słów kluczowych (to widać w wynikach Google)
  const kw = (game.keywords || '').split(',').map(s => s.trim())
    .filter(s => s && !/^[a-c][12]$/i.test(s)).slice(0, 4).join(', ');
  const bazowy = game.description || `Ćwiczenie do nauki angielskiego${game.level ? ', poziom ' + game.level : ''}.`;
  const opis = [bazowy, game.level ? `Poziom ${game.level}.` : '', kw ? `Słówka: ${kw}.` : '']
    .filter(Boolean).join(' ').slice(0, 160);
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

const CAT_LABEL = { gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', speaking: 'Speaking', reading: 'Reading', listening: 'Listening' };

// Buduje ciepły, naturalny akapit z danych ćwiczenia (dla ucznia i dla Google).
// Nie wymyśla treści — składa zdania z tego, co jest w bazie: kategoria, poziom, liczba, słowa kluczowe.
function budujOpis(game) {
  const poziom = game.level ? `na poziomie ${game.level}` : '';
  const liczbaLabel = game.slide_count_label || '';
  const kw = (game.keywords || '')
    .split(',').map(s => s.trim())
    .filter(s => s && !/^[a-c][12]$/i.test(s));
  const kwPolskie = kw.slice(0, 6).join(', ');
  // temat = pierwsze słowo kluczowe (Ty je wpisałaś świadomie, więc jest trafne)
  const temat = kw[0] || '';

  let zdanie1 = '';
  if (game.category === 'slownictwo') {
    zdanie1 = temat
      ? `W tym ćwiczeniu poznasz i utrwalisz angielskie słówka na temat: ${temat}${liczbaLabel ? ` — ${liczbaLabel}` : ''} ${poziom}.`
      : `W tym ćwiczeniu poznasz i utrwalisz angielskie słówka${liczbaLabel ? ` — ${liczbaLabel}` : ''} ${poziom}.`;
  } else if (game.category === 'gramatyka') {
    zdanie1 = temat
      ? `To ćwiczenie pomoże Ci opanować w praktyce zagadnienie: ${temat}${liczbaLabel ? ` — ${liczbaLabel}` : ''} ${poziom}.`
      : `To ćwiczenie pomoże Ci opanować gramatykę angielską w praktyce${liczbaLabel ? ` — ${liczbaLabel}` : ''} ${poziom}.`;
  } else if (game.category === 'reading') {
    zdanie1 = `To ćwiczenie na czytanie ze zrozumieniem po angielsku${temat ? ` (${temat})` : ''}${poziom ? `, ${poziom}` : ''}. Poćwiczysz rozumienie tekstu i nowe słownictwo.`;
  } else if (game.category === 'listening') {
    zdanie1 = `To ćwiczenie na słuchanie ze zrozumieniem po angielsku${temat ? ` (${temat})` : ''}${poziom ? `, ${poziom}` : ''}. Osłuchasz się z językiem i wyłapiesz nowe słówka.`;
  } else if (game.category === 'speaking') {
    zdanie1 = `To ćwiczenie na mówienie po angielsku${temat ? ` (${temat})` : ''}${poziom ? `, ${poziom}` : ''}. Poćwiczysz wypowiedzi i przełamiesz barierę w mówieniu.`;
  } else {
    zdanie1 = `Interaktywne ćwiczenie do nauki angielskiego${poziom ? `, ${poziom}` : ''}.`;
  }
  zdanie1 = zdanie1.replace(/\s+/g, ' ').trim();

  const zacheta = (game.level === 'A1' || game.level === 'A2')
    ? ' Świetnie sprawdzi się na początku przygody z angielskim.'
    : '';

  return { zdanie1: zdanie1 + zacheta, kwPolskie };
}

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
            : <Link href="/?kategoria=darmowe" className="eg-tag eg-tag-free eg-tag-link">Darmowe</Link>}
        </div>

        <h1 style={{ fontFamily: "'Quicksand',sans-serif", fontSize: 23, fontWeight: 700, color: 'var(--eg-ink)', margin: '0 0 10px', lineHeight: 1.25 }}>
          {game.title}
        </h1>

        {game.description && (
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--eg-ink)', margin: '0 0 14px', fontWeight: 600 }}>
            {game.description}
          </p>
        )}

        {/* Wzbogacony opis — generowany z danych ćwiczenia, dla ucznia i dla Google */}
        {(() => {
          const { zdanie1, kwPolskie } = budujOpis(game);
          return (
            <>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--eg-ink)', margin: '0 0 14px' }}>
                {zdanie1}
              </p>
              {kwPolskie && (
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--eg-muted)', margin: '0 0 16px' }}>
                  <strong style={{ color: 'var(--eg-ink)' }}>Czego się nauczysz:</strong> {kwPolskie}.
                </p>
              )}
              <p style={{ fontSize: 13.5, color: 'var(--eg-muted)', margin: '0 0 20px', letterSpacing: '.2px' }}>
                {[game.slide_count_label, game.level ? `poziom ${game.level}` : '', catLabel]
                  .filter(Boolean).join(' · ')}
              </p>
            </>
          );
        })()}

        <Link href="/" style={{ color: 'var(--eg-magenta)', fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>
          ← Zobacz wszystkie ćwiczenia
        </Link>
      </section>
    </div>
  );
}
