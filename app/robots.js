const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gry.easygo-english.pl';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Panel właścicielki – wyszukiwarki nie mają go indeksować ani pokazywać.
      disallow: ['/panel-wlascicielki', '/panel-lektora'],
    },
    sitemap: SITE + '/sitemap.xml',
  };
}
