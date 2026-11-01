import { getGameBySlug } from '../../../lib/supabase';
import MaturaExercise from './MaturaExercise';

// Podstrona ćwiczenia maturalnego. Ćwiczenie ma JEDEN adres (/matura/…);
// stary adres /cwiczenie/… przekierowuje tutaj, więc Google widzi jedną stronę.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateMetadata({ params }) {
  const game = await getGameBySlug(params.slug);
  const tytul = game ? (game.seo_title || game.title) : 'Matura z angielskiego';
  return {
    title: tytul,
    description: game ? (game.learn_text || game.description || '') : '',
    alternates: { canonical: `/matura/${params.slug}` },
    // Ukryte do publicznego startu części maturalnej.
    robots: { index: false, follow: false },
  };
}

export default async function MaturaExercisePage({ params }) {
  // Opublikowane ćwiczenie przychodzi z serwera; szkic (podgląd właścicielki)
  // komponent dociąga sam w przeglądarce, z jej sesją.
  const game = await getGameBySlug(params.slug);
  return <MaturaExercise slug={params.slug} initial={game ? {
    slug: game.slug, title: game.title, learn_text: game.learn_text || '', description: game.description || '',
    matura_level: game.matura_level, matura_section: game.matura_section, matura_task: game.matura_task, exercise_no: game.exercise_no,
  } : null} />;
}
