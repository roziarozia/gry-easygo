// /llms.txt — krótka "ściągawka" o EasyWonders dla asystentów AI (ChatGPT, Claude, Perplexity, Gemini).
// Standard llmstxt.org: zwykły tekst w Markdownie z opisem serwisu i linkami do najważniejszych stron.
// Lista artykułów i ćwiczeń buduje się sama z bazy (nowe treści dopisują się automatycznie).
import { SUPA_URL, SUPA_KEY } from '../../lib/supabase';
import { SITE } from '../../lib/site';

export const revalidate = 3600; // odświeżanie co godzinę

const CAT_LABEL = {
  gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', reading: 'Czytanki (reading)',
  listening: 'Słuchanie (listening)', speaking: 'Konwersacje (speaking)', kultura: 'Wiedza o krajach anglojęzycznych',
};
const CAT_ORDER = ['gramatyka', 'slownictwo', 'reading', 'listening', 'speaking', 'kultura'];
const ART_LABEL = { gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', porady: 'Porady', inne: 'Inne' };

async function rest(path) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

// jedna linijka opisu: bez znaków nowej linii, przycięta na granicy słowa
function line(s, max) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > 60 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, '') + '…';
}

export async function GET() {
  const [games, articles] = await Promise.all([
    rest('games?select=slug,title,level,category,learn_text,description,sort_order&published=eq.true&order=sort_order.asc'),
    rest('articles?select=slug,title,excerpt,category,level&published=eq.true&order=sort_order.desc'),
  ]);

  const out = [];
  out.push('# EasyWonders');
  out.push('');
  out.push('> EasyWonders (easywonders.pl) to polska platforma z interaktywnymi ćwiczeniami do nauki języka angielskiego online, na poziomach od A1 do C2. Uczniowie od razu widzą wynik i wyjaśnienie każdej odpowiedzi. Do ćwiczeń są darmowe artykuły z wyjaśnieniami gramatyki i słownictwa po polsku. Serwis prowadzi szkoła językowa EasyGo English (easygo-english.pl).');
  out.push('');
  out.push(`Liczba ćwiczeń: ${games.length}. Liczba artykułów: ${articles.length}. Część ćwiczeń jest darmowa, pełny dostęp daje subskrypcja dla uczniów albo konto dla lektorów (z zadawaniem prac domowych i śledzeniem postępów uczniów). Materiały przydają się do samodzielnej nauki, przygotowania do matury i egzaminu ósmoklasisty oraz na lekcjach z lektorem.`);
  out.push('');
  out.push('## Najważniejsze strony');
  out.push('');
  out.push(`- [Katalog ćwiczeń](${SITE}/): wszystkie ćwiczenia z filtrami poziomu (A1–C2) i rodzaju (gramatyka, słownictwo, czytanki, słuchanie, konwersacje)`);
  out.push(`- [Nauka – artykuły](${SITE}/nauka): wyjaśnienia gramatyki i słownictwa po polsku, z przykładami i tabelami`);
  out.push(`- [Oferta](${SITE}/oferta): plany dla uczniów i lektorów`);
  out.push(`- [Opinie](${SITE}/opinie): opinie użytkowników`);
  out.push('');

  if (articles.length) {
    out.push('## Artykuły (wyjaśnienia po polsku)');
    out.push('');
    for (const a of articles) {
      const meta = [ART_LABEL[a.category] || '', a.level || ''].filter(Boolean).join(', ');
      out.push(`- [${line(a.title, 120)}](${SITE}/nauka/${encodeURIComponent(a.slug)})${meta ? ' (' + meta + ')' : ''}: ${line(a.excerpt, 220)}`);
    }
    out.push('');
  }

  const groups = [...CAT_ORDER, 'inne'].map((cat) => ({
    cat,
    label: cat === 'inne' ? 'Inne ćwiczenia' : CAT_LABEL[cat],
    items: games.filter((g) => (CAT_ORDER.includes(g.category) ? g.category : 'inne') === cat),
  })).filter((g) => g.items.length);

  for (const g of groups) {
    out.push(`## Ćwiczenia: ${g.label}`);
    out.push('');
    for (const x of g.items) {
      const opis = line(x.learn_text || x.description, 200);
      out.push(`- [${line(x.title, 120)}](${SITE}/cwiczenie/${encodeURIComponent(x.slug)})${x.level ? ' (' + x.level + ')' : ''}${opis ? ': ' + opis : ''}`);
    }
    out.push('');
  }

  return new Response(out.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
