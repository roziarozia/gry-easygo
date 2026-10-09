import { getPublishedGames, supabase } from '../lib/supabase';
import { SITE } from '../lib/site';

// Mapa strony dla Google - automatycznie z bazy (nowe ćwiczenia i artykuły same się dopiszą)
export const revalidate = 3600;

async function getPublishedArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('slug,published_at,updated_at')
    .eq('published', true);
  if (error) { console.error('sitemap articles', error); return []; }
  return data || [];
}

export default async function sitemap() {
  const base = SITE;
  const [games, articles] = await Promise.all([getPublishedGames(), getPublishedArticles()]);
  const exercisePages = games.map((g) => ({
    url: `${base}/cwiczenie/${g.slug}`,
    lastModified: g.created_at ? new Date(g.created_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));
  const articlePages = articles.map((a) => ({
    url: `${base}/nauka/${a.slug}`,
    lastModified: new Date(a.updated_at || a.published_at || Date.now()),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/nauka`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/opinie`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...articlePages,
    ...exercisePages,
  ];
}
