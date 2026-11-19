import { getGameBySlug, getPublishedGames, supabase } from '../../../lib/supabase';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import GameEmbed from './GameEmbed';
import ExerciseMeta from './ExerciseMeta';
import PlanBar from './PlanBar';
import ExerciseNav from './ExerciseNav';
import { NAV_CSS } from './exerciseNavCss';
import { SITE, ORGANIZATION } from '../../../lib/site';

// Odświeżaj stronę ćwiczenia co 5 min i pozwól dogenerować nowe ćwiczenia on-demand
// (bez tego nowo opublikowane ćwiczenia dawały 404 do następnego pełnego buildu).
export const revalidate = 300;
export const dynamicParams = true;

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
  const staryOpis = [bazowy, game.level ? `Poziom ${game.level}.` : '', kw ? `Słówka: ${kw}.` : '']
    .filter(Boolean).join(' ').slice(0, 160);
  // Jeśli ćwiczenie ma własny opis „Czego się nauczysz” (kolumna learn_text), to on idzie
  // do Google — unikalny dla każdego ćwiczenia. Przycinamy na granicy słowa do ~160 znaków.
  const opis = game.learn_text ? przytnij(game.learn_text, 160) : staryOpis;
  // Tytuł dla Google (kolumna seo_title) — po polsku, pod to, czego ludzie szukają.
  // Na stronie i kafelkach dalej widać zwykły tytuł ćwiczenia.
  const tytulGoogle = game.seo_title || game.title;
  return {
    title: tytulGoogle,
    description: opis,
    alternates: { canonical: `/cwiczenie/${game.slug}` },
    openGraph: {
      title: tytulGoogle, description: opis,
      url: `/cwiczenie/${game.slug}`,
      images: game.cover_url ? [game.cover_url] : [], type: 'article',
    },
  };
}

// Przycina tekst do max znaków na granicy słowa (dla meta description).
function przytnij(tekst, max) {
  const t = (tekst || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > 80 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, '') + '…';
}

// Artykuł z bloga polecany pod ćwiczeniem: najpierw games.article_slug,
// a gdy go brak — artykuł, który sam linkuje to ćwiczenie (articles.exercise_slug).
// Pokazujemy tylko opublikowane artykuły.
async function getArticleForGame(game) {
  const cols = 'slug,title,excerpt,cover_url';
  // "-" w article_slug = celowo bez artykułu (np. czytanki dla dzieci podlinkowane z artykułu dla rodziców)
  if (game.article_slug === '-') return null;
  try {
    if (game.article_slug) {
      const { data } = await supabase.from('articles').select(cols)
        .eq('slug', game.article_slug).eq('published', true).maybeSingle();
      if (data) return data;
    }
    const { data } = await supabase.from('articles').select(cols)
      .eq('exercise_slug', game.slug).eq('published', true)
      .order('sort_order', { ascending: false }).limit(1);
    if (data && data[0]) return data[0];
    // Inne części tej samej serii: jeśli któraś ma artykuł, pasuje też do tej części.
    if (game.series) {
      const { data: sib } = await supabase.from('games').select('slug,article_slug')
        .eq('series', game.series).eq('published', true).neq('slug', game.slug);
      const list = sib || [];
      const artSlug = (list.find((g) => g.article_slug && g.article_slug !== '-') || {}).article_slug;
      if (artSlug) {
        const { data: a } = await supabase.from('articles').select(cols)
          .eq('slug', artSlug).eq('published', true).maybeSingle();
        if (a) return a;
      }
      const slugs = list.map((g) => g.slug);
      if (slugs.length) {
        const { data: a2 } = await supabase.from('articles').select(cols)
          .in('exercise_slug', slugs).eq('published', true)
          .order('sort_order', { ascending: false }).limit(1);
        if (a2 && a2[0]) return a2[0];
      }
    }
    return null;
  } catch (e) { return null; }
}

// Inne ćwiczenia do panelu obok: najpierw pozostałe części tej samej serii,
// potem ćwiczenia z tej samej kategorii i poziomu. Bez matury i bez ćwiczeń dla dzieci.
async function getRelatedGames(game, limit = 4) {
  const cols = 'slug,title,level,category,cover_url,is_premium,matura,for_kids';
  const out = [];
  const seen = new Set([game.slug]);
  function add(rows) {
    (rows || []).forEach((g) => {
      if (g.matura || g.for_kids) return;
      if (out.length < limit && !seen.has(g.slug)) { seen.add(g.slug); out.push(g); }
    });
  }
  try {
    if (game.series) {
      const { data } = await supabase.from('games').select(cols)
        .eq('published', true).eq('series', game.series).neq('slug', game.slug)
        .order('exercise_no', { ascending: true }).limit(limit);
      add(data);
    }
    if (out.length < limit && game.category) {
      let q = supabase.from('games').select(cols).eq('published', true).eq('category', game.category)
        .neq('slug', game.slug);
      if (game.level) q = q.eq('level', game.level);
      const { data } = await q.order('created_at', { ascending: false }).limit(12);
      add(data);
    }
  } catch (e) {}
  return out;
}

// Mniejsza miniaturka z magazynu Supabase (jak na blogu); gdy adres jest inny, zostaje oryginał.
function thumb(url, w) {
  if (!url || url.indexOf('/storage/v1/object/public/') === -1) return url;
  return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=' + w + '&quality=72&resize=contain';
}

const RAIL_CSS = `
.ex-layout{ max-width:1120px; margin:0 auto; }
/* ramka z ćwiczeniem zawsze na całą szerokość swojej kolumny (bez tego w siatce kurczyła się do wąskiego paska) */
.ex-layout > div:first-child{ width:100%; min-width:0; }
.ex-rail, .ex-theory{ display:none; }
.ex-theory{ max-width:1088px; margin:14px auto 0; padding:0 16px; }
.ex-theory a{ display:flex; align-items:center; gap:10px; text-decoration:none; background:#f6f1ae; color:#2e2a33; border-radius:14px; padding:10px 14px; font-family:'Outfit','Nunito',sans-serif; font-size:14px; line-height:1.35; }
.ex-theory b{ color:var(--eg-magenta,#ca4490); white-space:nowrap; }
.ex-theory span.t{ font-weight:600; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.ex-theory .arr{ margin-left:auto; color:var(--eg-magenta,#ca4490); font-weight:700; }
@media (max-width:1199px){ .ex-theory{ display:block; } }
@media (min-width:1200px){
  .ex-layout{ max-width:1240px; display:grid; grid-template-columns:minmax(0,1fr) 270px; gap:8px; padding-right:20px; align-items:start; }
  .ex-rail{ display:flex; flex-direction:column; position:sticky; top:20px; margin-top:20px; background:#f6f1ae; border-radius:20px; padding:18px 14px 14px; font-family:'Outfit','Nunito',sans-serif; text-align:center; }
}
.ex-rail-head{ font-weight:800; font-size:18px; line-height:1.2; color:#2e2a33; }
.ex-rail-head span{ color:var(--eg-magenta,#ca4490); display:block; }
.ex-rail-sub{ font-size:12.5px; color:#5c5340; margin-top:4px; line-height:1.45; }
.ex-rail-feat{ display:block; margin-top:12px; text-decoration:none; color:inherit; background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 6px 16px rgba(160,130,40,.18); text-align:left; transition:transform .2s; }
.ex-rail-feat:hover{ transform:translateY(-2px); }
.ex-rail-feat img{ width:100%; height:auto; display:block; background:#efe9f8; }
.ex-rail-feat .b{ padding:10px 12px 12px; }
.ex-rail-k{ font-size:10.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--eg-magenta,#ca4490); }
.ex-rail-title{ font-weight:600; font-size:14.5px; line-height:1.3; color:#2a2730; margin-top:3px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.ex-rail-go{ display:inline-block; margin-top:8px; font-size:13px; font-weight:700; color:var(--eg-magenta,#ca4490); }
.ex-rail-more{ font-weight:700; font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:#7a6d3a; margin:14px 2px 6px; text-align:left; }
.ex-rail-list{ display:flex; flex-direction:column; gap:7px; text-align:left; }
.ex-rail-row{ display:flex; gap:10px; align-items:center; text-decoration:none; color:inherit; background:#fff; border-radius:12px; padding:6px; box-shadow:0 3px 10px rgba(160,130,40,.13); transition:transform .2s; }
.ex-rail-row:hover{ transform:translateX(2px); }
.ex-rail-row img, .ex-rail-row .ph{ flex:0 0 66px; width:66px; height:44px; object-fit:cover; border-radius:8px; background:#efe9f8; }
.ex-rail-row .lv{ font-size:9.5px; font-weight:800; color:var(--eg-magenta,#ca4490); }
.ex-rail-row .ex-rail-title{ font-size:13px; line-height:1.25; margin-top:1px; -webkit-line-clamp:2; }
.ex-rail-btn{ display:block; margin-top:12px; background:var(--eg-magenta,#ca4490); color:#fff !important; font-weight:700; font-size:14.5px; padding:10px; border-radius:999px; text-decoration:none; }
.ex-rail-btn:hover{ background:#b33a7e; }
html.eg-dark .ex-rail, html.eg-dark .ex-theory a{ background:#34301c; }
html.eg-dark .ex-rail-head, html.eg-dark .ex-theory a{ color:#f6f1ae; }
html.eg-dark .ex-rail-sub, html.eg-dark .ex-rail-more{ color:#e9e2c2; }
html.eg-dark .ex-rail-feat, html.eg-dark .ex-rail-row{ background:#24263a; }
html.eg-dark .ex-rail-title{ color:#e8e6ef; }
`;

const CAT_LABEL = { gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', speaking: 'Speaking', reading: 'Reading', listening: 'Listening', kultura: 'Wiedza o krajach' };

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
  // Ćwiczenia maturalne mają jeden adres: /matura/… (tam jest ich gazetowa oprawa).
  if (game.matura) permanentRedirect(`/matura/${game.slug}`);
  const catLabel = CAT_LABEL[game.category] || game.category || '';
  const [artykul, related] = await Promise.all([getArticleForGame(game), getRelatedGames(game)]);

  // Tytuł na białej plakietce: część po dwukropku w magencie ("Open Cloze: New York").
  const dwukropek = (game.title || '').indexOf(':');
  const tytulPrzed = dwukropek > -1 ? game.title.slice(0, dwukropek + 1) : game.title;
  const tytulPo = dwukropek > -1 ? game.title.slice(dwukropek + 1) : '';

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'LearningResource',
    name: game.title, description: game.learn_text || game.description || '',
    educationalLevel: game.level || '', inLanguage: 'en', teaches: 'English',
    learningResourceType: 'Interactive exercise', isAccessibleForFree: !game.is_premium,
    provider: ORGANIZATION,
    url: `${SITE}/cwiczenie/${game.slug}`,
  };

  return (
    <div className="eg-games">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <style dangerouslySetInnerHTML={{ __html: NAV_CSS + RAIL_CSS }} />
      <ExerciseNav />

      {/* Na węższych ekranach (bez panelu bocznego) — krótka informacja, że jest artykuł z teorią */}
      {artykul && (
        <div className="ex-theory">
          <a href={`/nauka/${artykul.slug}`}>
            <b>Teoria na blogu:</b>
            <span className="t">{artykul.title}</span>
            <span className="arr" aria-hidden="true">&rarr;</span>
          </a>
        </div>
      )}

      {/* GÓRA: gra osadzona w formie i wielkości jak teraz (okładka + granie po kliknięciu),
          a na szerokich ekranach obok niej panel: artykuł do ćwiczenia i inne ćwiczenia */}
      <div className="ex-layout">
        <GameEmbed slug={game.slug} />
        {(artykul || related.length > 0) && (
          <aside className="ex-rail" aria-label={artykul ? 'Teoria i inne ćwiczenia' : 'Inne ćwiczenia'}>
            {artykul ? (
              <>
                <p className="ex-rail-head">Najpierw teoria?<span>Mamy artykuł!</span></p>
                <p className="ex-rail-sub">Przeczytaj wyjaśnienie z przykładami i wróć do ćwiczenia</p>
                <a className="ex-rail-feat" href={`/nauka/${artykul.slug}`}>
                  {artykul.cover_url && <img src={thumb(artykul.cover_url, 520)} alt="" loading="lazy" />}
                  <div className="b">
                    <span className="ex-rail-k">Blog EasyWonders</span>
                    <p className="ex-rail-title">{artykul.title}</p>
                    <span className="ex-rail-go">Czytaj artykuł &rarr;</span>
                  </div>
                </a>
              </>
            ) : (
              <>
                <p className="ex-rail-head">Ćwicz dalej!<span>Mamy więcej.</span></p>
                <p className="ex-rail-sub">Ćwiczenia z wyjaśnieniem po każdej odpowiedzi</p>
              </>
            )}
            {related.length > 0 && (
              <>
                <p className="ex-rail-more">{artykul ? 'Więcej ćwiczeń' : 'Podobne ćwiczenia'}</p>
                <div className="ex-rail-list">
                  {related.map((g) => (
                    <a key={g.slug} className="ex-rail-row" href={`/cwiczenie/${g.slug}`}>
                      {g.cover_url ? <img src={thumb(g.cover_url, 200)} alt="" loading="lazy" /> : <span className="ph" />}
                      <span style={{ minWidth: 0 }}>
                        {g.level && <span className="lv">{g.level}</span>}
                        <p className="ex-rail-title">{g.title}</p>
                      </span>
                    </a>
                  ))}
                </div>
              </>
            )}
            <a className="ex-rail-btn" href="/">Wszystkie ćwiczenia</a>
          </aside>
        )}
      </div>

      {/* „← Mój plan nauki” — tylko gdy uczeń przyszedł z planu. Celowo POD grą: nad grą przesuwał
          ramkę w dół i na telefonie (iOS) nie dało się przewinąć strony z powrotem do góry. */}
      <PlanBar />

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

        {/* Opis „Czego się nauczysz” — pisany osobno dla każdego ćwiczenia (kolumna learn_text).
            Gdy go brak (np. nowe ćwiczenie), zostaje dawny opis składany automatycznie. */}
        {game.learn_text ? (
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--eg-muted)', margin: '0 0 18px' }}>
            <strong style={{ color: 'var(--eg-ink)' }}>Czego się nauczysz:</strong> {game.learn_text}
          </p>
        ) : (() => {
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

      {/* Artykuł z bloga do tematu ćwiczenia (blog linkuje ćwiczenie, a ćwiczenie — blog) */}
      {artykul && (
        <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px 48px' }}>
          <p style={{ textAlign: 'center', fontFamily: "'Quicksand',sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--eg-ink)', margin: '0 0 12px' }}>
            Zapoznaj się z tematem na blogu!
          </p>
          <a href={`/nauka/${artykul.slug}`} style={{
            display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit',
            background: 'var(--eg-card, #fff)', border: '1.5px solid var(--eg-line, #eceaf2)',
            borderRadius: 18, overflow: 'hidden', boxShadow: '0 6px 18px rgba(167,141,217,.22)',
          }}>
            {/* Okładka artykułu jest szeroka (baner) - pokazujemy ją w CAŁOŚCI na górze karty,
                z naturalną wysokością, zamiast przycinać do kwadratowego pola z boku. */}
            {artykul.cover_url ? (
              <img src={artykul.cover_url} alt={artykul.title} loading="lazy"
                style={{ width: '100%', height: 'auto', display: 'block', background: '#efe9f8' }} />
            ) : (
              <div style={{ minHeight: 120, background: '#efe9f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Quicksand',sans-serif", fontWeight: 700, fontSize: 20 }}>
                <span style={{ color: '#ca4490' }}>Easy</span><span style={{ color: '#f4c94c' }}>Wonders</span>
              </div>
            )}
            <div style={{ padding: '18px 22px 20px', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--eg-magenta, #ca4490)' }}>Blog EasyWonders</span>
              <span style={{ fontFamily: "'Quicksand',sans-serif", fontWeight: 700, fontSize: 18, lineHeight: 1.3, color: 'var(--eg-ink)' }}>{artykul.title}</span>
              {artykul.excerpt && (
                <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--eg-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{artykul.excerpt}</span>
              )}
              <span style={{ alignSelf: 'flex-start', marginTop: 4, background: 'var(--eg-magenta, #ca4490)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '9px 20px', borderRadius: 999 }}>
                Czytaj artykuł &rarr;
              </span>
            </div>
          </a>
        </section>
      )}
    </div>
  );
}
