import { createClient } from '@supabase/supabase-js';

// Publiczny klucz (tylko odczyt opublikowanych danych — ten sam, co w katalogu).
// Bezpieczny do umieszczenia w kodzie strony.
const SUPA_URL = 'https://svjrdyxwqznbzxqeytdn.supabase.co';
const SUPA_KEY = 'sb_publishable_TNCq1UAMAvLO0Z5Mt8QOig_OvsxhhyJ';

export const supabase = createClient(SUPA_URL, SUPA_KEY);
export { SUPA_URL, SUPA_KEY };

// Pobiera wszystkie opublikowane gry (do katalogu + generowania podstron)
export async function getPublishedGames() {
  const { data, error } = await supabase
    .from('games')
    .select('slug,title,description,category,level,cover_url,slide_count_label,sort_order,exercise_no,keywords,series,is_premium,template,created_at')
    .eq('published', true)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getPublishedGames', error); return []; }
  return data || [];
}

// Pobiera jedną grę po slug (do podstrony ćwiczenia)
export async function getGameBySlug(slug) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error) { console.error('getGameBySlug', error); return null; }
  return data;
}
