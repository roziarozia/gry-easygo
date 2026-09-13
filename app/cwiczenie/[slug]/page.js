import { getGameBySlug, getPublishedGames } from '../../../lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import GameEmbed from './GameEmbed';
import ExerciseMeta from './ExerciseMeta';

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

// Pigułki kategorii w pełnych kolorach (opcja 2): poziom lawenda, kategoria magenta,
// subskrypcja złoto, darmowe mięta. Wspólna baza stylu + kolor.
const PILL_BASE = {
  display: 'inline-flex', alignItems: 'center', borderRadius: 999,
  padding: '5px 14px', fontSize: 12.5, fontWeight: 800,
  letterSpacing: '.2px', textDecoration: 'none',
};
const PILL = {
  level: { ...PILL_BASE, background: '#a78dd9', color: '#fff' },
  cat: { ...PILL_BASE, background: 'var(--eg-magenta, #ca4490)', color: '#fff' },
  premium: { ...PILL_BASE, background: '#f4c94c', color: '#6b5417' },
  free: { ...PILL_BASE, background: '#5fbf9f', color: '#fff' },
};

export default async function CwiczeniePage({ params }) {
  const game = await getGameBySlug(params.slug);
  if (!game) notFound();
  const catLabel = CAT_LABEL[game.category] || game.category || '';

  // Tytuł na białej plakietce: część po dwukropku w magencie ("Open Cloze: New York").
  const dwukropek = (game.title || '').indexOf(':');
  const tytulPrzed = dwukropek > -1 ? game.title.slice(0, dwukropek + 1) : game.title;
  const tytulPo = dwukropek > -1 ? game.title.slice(dwukropek + 1) : '';

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

      {/* DÓŁ: opis w stylu "opcja 2 na białym tle" — pełnokolorowe pigułki,
          tytuł na plakietce z cieniem, mini-karty meta w ExerciseMeta */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '10px 20px 40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
          {game.level && (
            <Link href={`/?poziom=${encodeURIComponent(game.level)}`} style={PILL.level}>
              {game.level}
            </Link>
          )}
          {catLabel && (
            <Link href={`/?kategoria=${encodeURIComponent(game.category)}`} style={PILL.cat}>
              {catLabel}
            </Link>
          )}
          {game.is_premium
            ? <span style={PILL.premium}>Dla subskrybentów</span>
            : <Link href="/?kategoria=darmowe" style={PILL.free}>Darmowe</Link>}
        </div>

        <div style={{
          display: 'inline-block', background: 'var(--eg-card, #fff)', borderRadius: 16,
          border: '1.5px solid var(--eg-line, #eceaf2)',
          padding: '14px 26px', boxShadow: '0 6px 18px rgba(167,141,217,.28)', marginBottom: 16,
        }}>
          <h1 style={{ fontFamily: "'Quicksand',sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--eg-ink)', margin: 0, lineHeight: 1.25 }}>
            {tytulPrzed}
            {tytulPo && <span style={{ color: 'var(--eg-magenta, #ca4490)' }}>{tytulPo}</span>}
          </h1>
        </div>

        {game.description && (
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--eg-ink)', margin: '0 0 12px', fontWeight: 600 }}>
            {game.description}
          </p>
        )}

        {/* Wzbogacony opis — generowany z danych ćwiczenia, dla ucznia i dla Google */}
        {(() => {
          const { zdanie1, kwPolskie } = budujOpis(game);
          return (
            <>
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--eg-muted)', margin: '0 0 12px' }}>
                {zdanie1}
              </p>
              {kwPolskie && (
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--eg-muted)', margin: '0 0 18px' }}>
                  <strong style={{ color: 'var(--eg-ink)' }}>Czego się nauczysz:</strong> {kwPolskie}.
                </p>
              )}
            </>
          );
        })()}

        <ExerciseMeta
          slideCountLabel={game.slide_count_label}
          level={game.level}
          category={game.category}
        />
      </section>
    </div>
  );
}
