// Podstrona artykułu bloga: /nauka/nazwa-artykulu
//
// Bierze gotową stronę bloga (public/nauka.html) i od razu, po stronie serwera, wstawia do niej
// treść artykułu oraz jego tytuł, opis i okładkę dla Google i podglądów linków (Facebook, Instagram).
// Wygląd, menu i skrypty zostają te same co na /nauka - jeden plik do edycji.
import { SUPA_URL, SUPA_KEY } from '../../../lib/supabase';
import { SITE } from '../../../lib/site';

export const dynamic = 'force-dynamic';

const CAT_LABEL = { gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', porady: 'Porady', inne: 'Inne' };

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function plain(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
// tekst do wstawienia w <script> (bez możliwości zamknięcia tagu)
function safeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
// podmiana dokładnie jednego fragmentu; gdy go nie ma, strona i tak działa (skrypt dorysuje artykuł)
function swap(html, from, to) {
  const i = html.indexOf(from);
  return i === -1 ? html : html.slice(0, i) + to + html.slice(i + from.length);
}
function swapRe(html, re, to) {
  return re.test(html) ? html.replace(re, to) : html;
}

async function getArticle(slug) {
  const cols = 'slug,title,excerpt,body,cover_url,level,category,keywords,cta_link,cta_label,exercise_slug,published_at,updated_at';
  const url = `${SUPA_URL}/rest/v1/articles?select=${cols}&published=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows && rows[0] ? rows[0] : null;
}

export async function GET(request, { params }) {
  const slug = decodeURIComponent(params.slug || '');
  const origin = new URL(request.url).origin;

  const [article, tplRes] = await Promise.all([
    getArticle(slug),
    fetch(`${origin}/nauka.html`, { next: { revalidate: 300 } }),
  ]);

  // nie ma takiego artykułu -> lista artykułów
  if (!article) return Response.redirect(`${origin}/nauka`, 302);
  if (!tplRes.ok) return Response.redirect(`${origin}/nauka`, 302);
  let html = await tplRes.text();

  const url = `${SITE}/nauka/${encodeURIComponent(article.slug)}`;
  const title = article.title || 'Artykuł';
  const desc = (article.excerpt || plain(article.body)).slice(0, 160);
  const image = article.cover_url || `${SITE}/nauka-og.jpg.png`;

  // 1) tytuł, opis, kanoniczny adres, podgląd linku
  html = swapRe(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)} | EasyWonders</title>`);
  html = swapRe(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}">`);
  html = swapRe(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}">`);
  html = swapRe(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(desc)}">`);
  html = swapRe(html, /<meta property="og:type"[^>]*>/, `<meta property="og:type" content="article">`);
  html = swapRe(html, /<meta property="og:image" [^>]*>/, `<meta property="og:image" content="${esc(image)}">`);
  html = swapRe(html, /<meta property="og:image:width"[^>]*>\s*<meta property="og:image:height"[^>]*>/, '');
  html = swapRe(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(url)}">`);
  html = swapRe(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}">`);
  html = swapRe(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(desc)}">`);
  html = swapRe(html, /<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(image)}">`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: desc,
    image: [image],
    inLanguage: 'pl',
    mainEntityOfPage: url,
    datePublished: article.published_at || undefined,
    dateModified: article.updated_at || article.published_at || undefined,
    author: { '@type': 'Person', name: 'Rozalia Lakhwani', alternateName: 'Rózia' },
    publisher: { '@type': 'Organization', name: 'EasyWonders', logo: { '@type': 'ImageObject', url: `${SITE}/easywonders.png` } },
  };
  html = swap(html, '</head>',
    `<link rel="canonical" href="${esc(url)}">\n` +
    `<script type="application/ld+json">${safeJson(jsonLd)}</script>\n` +
    `<script>window.__EW_SSR__=${safeJson(article.slug)};window.__EW_ARTICLE__=${safeJson(article)};</script>\n</head>`);

  // 2) od razu widok artykułu (lista schowana - wróci po kliknięciu "Wszystkie artykuły")
  html = swap(html, '<div id="listView">', '<div id="listView" class="hidden">');
  html = swap(html, '<footer class="foot" id="listFoot">', '<footer class="foot hidden" id="listFoot">');
  html = swap(html, '<article id="articleView" class="article hidden">', '<article id="articleView" class="article">');

  // 3) treść artykułu
  const cover = article.cover_url
    ? `<img class="art-cover" src="${esc(article.cover_url)}" alt="${esc(title)}">`
    : '<div class="art-cover-ph">EasyWonders</div>';
  html = swap(html, '<div id="artCoverSlot"></div>', `<div id="artCoverSlot">${cover}</div>`);
  const badge = article.category ? `<span class="badge-cat">${esc(CAT_LABEL[article.category] || article.category)}</span>` : '';
  html = swap(html, '<div class="art-badges" id="artBadges"></div>', `<div class="art-badges" id="artBadges">${badge}</div>`);
  const dash = title.indexOf(' — ');
  const h1 = dash > -1
    ? `${esc(title.slice(0, dash))}<span class="art-subtitle">— ${esc(title.slice(dash + 3))}</span>`
    : esc(title);
  html = swap(html, '<h1 id="artTitle"></h1>', `<h1 id="artTitle">${h1}</h1>`);
  html = swap(html, '<div class="art-content" id="artContent"></div>', `<div class="art-content" id="artContent">${article.body || ''}</div>`);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Vercel trzyma gotową stronę 5 min, potem odświeża w tle (nowe zmiany w artykule widać szybko)
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
