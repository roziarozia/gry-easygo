'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import GameEmbed from '../../cwiczenie/[slug]/GameEmbed';
import { sectionOf, taskName, MT_FONTS } from '../maturaData';

// Ćwiczenie maturalne: gazetowy nagłówek ze ścieżką, odtwarzacz (sam przełącza się
// na skórkę maturalną) i przejście do następnego ćwiczenia tego samego typu.
export default function MaturaExercise({ slug, initial }) {
  const [game, setGame] = useState(initial);
  const [next, setNext] = useState(null);

  useEffect(() => {
    (async () => {
      let g = initial;
      if (!g) {
        const r = await supabase.from('games')
          .select('slug,title,learn_text,description,matura_level,matura_section,matura_task,exercise_no')
          .eq('slug', slug).eq('matura', true).maybeSingle();
        g = r.data || null;
        setGame(g);
      }
      if (!g) return;
      const sib = await supabase.from('games')
        .select('slug,exercise_no')
        .eq('matura', true).eq('matura_level', g.matura_level).eq('matura_task', g.matura_task)
        .gt('exercise_no', g.exercise_no || 0).order('exercise_no', { ascending: true }).limit(1);
      setNext(sib.data && sib.data[0] ? sib.data[0] : null);
    })();
  }, [slug]);

  const sec = game ? sectionOf(game.matura_section) : null;
  const task = game ? taskName(game.matura_level, game.matura_section, game.matura_task) : '';

  return (
    <div className="mx">
      <style dangerouslySetInnerHTML={{ __html: MT_FONTS + CSS }} />
      <div className="mx-wrap">
        <nav className="mx-crumbs" aria-label="Ścieżka">
          <a href="/matura" className="mx-home">Matura</a>
          {sec && <><span aria-hidden="true">/</span><a href="/matura">{sec.en}</a></>}
          {task && <><span aria-hidden="true">/</span><span>{task}{game.exercise_no ? `, nr ${game.exercise_no}` : ''}</span></>}
          <span className="mx-level">{game && game.matura_level === 'ext' ? 'Poziom rozszerzony' : 'Poziom podstawowy'}</span>
        </nav>
      </div>

      <GameEmbed slug={slug} />

      <div className="mx-wrap">
        <div className="mx-foot">
          <a href="/matura">← Wróć do działów</a>
          {next && <a className="mx-next" href={`/matura/${next.slug}`}>Następne ćwiczenie, nr {next.exercise_no} →</a>}
        </div>
        {game && game.learn_text && (
          <div className="mx-learn">
            <span className="mx-learn-k">Od redakcji:</span> {game.learn_text}
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
body{ margin:0; background:#f5f1e8; }
.mx{ min-height:100vh; background:#f5f1e8; color:#1a1a1a; font-family:'Source Serif 4',Georgia,serif; padding-bottom:56px; }
.mx a{ color:#1a1a1a; }
.mx a:hover{ color:#ca4490; }
.mx-wrap{ max-width:1120px; margin:0 auto; padding:0 16px; }
.mx-crumbs{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:16px 0 12px; border-bottom:4px double #1a1a1a; font-size:16px; color:#3a362f; }
.mx-crumbs a{ text-decoration:none; color:#3a362f; }
.mx-home{ font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:24px; color:#1a1a1a !important; }
.mx-crumbs span[aria-hidden]{ color:#8a8478; }
.mx-level{ margin-left:auto; font-style:italic; }
.mx-foot{ display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; margin-top:18px; font-size:17px; }
.mx-next{ font-weight:700; text-decoration:none; display:inline-flex; align-items:center; min-height:46px; padding:0 18px; border:1.5px solid #1a1a1a; }
.mx-next:hover{ background:#1a1a1a; color:#f5f1e8 !important; }
.mx-learn{ margin-top:22px; border-top:1px solid #1a1a1a; border-bottom:1px solid #1a1a1a; padding:16px 0; font-size:17px; line-height:1.6; color:#3a362f; }
.mx-learn-k{ font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:18px; color:#1a1a1a; }
@media (max-width:600px){ .mx-level{ margin-left:0; width:100%; } }
`;
