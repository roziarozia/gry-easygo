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
    .select('slug,title,description,category,level,cover_url,slide_count_label,sort_order,exercise_no,keywords,series,is_premium,template,for_kids,created_at')
    .eq('published', true)
    .not('matura', 'is', true) // ćwiczenia maturalne mają własną stronę /matura (bez okładek w katalogu)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getPublishedGames', error); return []; }
  return data || [];
}

// Opublikowane ćwiczenia maturalne (strona /matura, mapa strony, llms.txt).
// Dopóki żadne nie jest opublikowane, część maturalna jest ukryta przed Google i AI.
export async function getPublishedMatura() {
  const { data, error } = await supabase
    .from('games')
    .select('slug,title,description,learn_text,seo_title,matura_level,matura_section,matura_task,exercise_no,is_premium,created_at,published_at')
    .eq('published', true)
    .eq('matura', true)
    .order('exercise_no', { ascending: true });
  if (error) { console.error('getPublishedMatura', error); return []; }
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
