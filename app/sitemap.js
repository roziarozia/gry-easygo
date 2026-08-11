import { getPublishedGames } from '../lib/supabase';

// Mapa strony dla Google — automatycznie z bazy (nowe ćwiczenia same się dopiszą)
export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://gry.easygo-english.pl';
  const games = await getPublishedGames();
  const exercisePages = games.map((g) => ({
    url: `${base}/cwiczenie/${g.slug}`,
    lastModified: g.created_at ? new Date(g.created_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    ...exercisePages,
  ];
}
