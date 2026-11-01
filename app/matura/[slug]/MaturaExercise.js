'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import GameEmbed from '../../cwiczenie/[slug]/GameEmbed';
import WritingTask from './WritingTask';
import { sectionOf, taskName, MT_FONTS } from '../maturaData';
import ThemeToggle, { THEME_CSS, MaturaFooter, FOOTER_CSS } from '../ThemeToggle';

// Ćwiczenie maturalne: gazetowy nagłówek ze ścieżką, odtwarzacz (sam przełącza się
// na skórkę maturalną) i przejście do następnego ćwiczenia tego samego typu.
export default function MaturaExercise({ slug, initial }) {
  const [game, setGame] = useState(initial);
  const [next, setNext] = useState(null);
  const [tried, setTried] = useState(!!initial); // szkic dociągamy w przeglądarce — do tego czasu nie wiemy, jaki to typ

  useEffect(() => {
    (async () => {
      let g = initial;
      if (!g) {
        const r = await supabase.from('games')
          .select('slug,title,learn_text,description,matura_level,matura_section,matura_task,exercise_no,is_premium')
          .eq('slug', slug).eq('matura', true).maybeSingle();
        g = r.data || null;
        setGame(g);
        setTried(true);
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
      <style dangerouslySetInnerHTML={{ __html: MT_FONTS + CSS + THEME_CSS + FOOTER_CSS }} />
      <div className="mx-wrap">
        {game && <h1 className="mx-sr">{game.title}</h1>}
        <nav className="mx-crumbs" aria-label="Ścieżka">
          <a href="/matura" className="mx-home">Matura</a>
          {sec && <><span aria-hidden="true">/</span><a href="/matura">{sec.en}</a></>}
          {task && <><span aria-hidden="true">/</span><span>{task}{game.exercise_no ? `, nr ${game.exercise_no}` : ''}</span></>}
          <span className="mx-level">{game && game.matura_level === 'ext' ? 'Poziom rozszerzony' : 'Poziom podstawowy'}</span>
          <ThemeToggle />
        </nav>
      </div>

      {game && game.matura_section === 'writing'
        ? <WritingTask slug={slug} level={game.matura_level} isPremium={!!game.is_premium} />
        : tried ? <GameEmbed slug={slug} /> : null}

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
      <MaturaFooter />
    </div>
  );
}

const CSS = `
.mx-sr{ position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
body{ margin:0; background:#fbfaf6; }
.mx{ min-height:100vh; background:#fbfaf6; color:#1d1a22; font-family:'Outfit',system-ui,sans-serif; }
.mx a{ color:#1d1a22; }
.mx a:hover{ color:#ca4490; }
.mx-wrap{ max-width:1120px; margin:0 auto; padding:0 16px; }
.mx-crumbs{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:18px 0 14px; border-bottom:1px solid #1d1a22; font-size:15px; color:#5b5566; }
.mx-crumbs a{ text-decoration:none; color:#5b5566; }
.mx-home{ font-family:'Playfair Display',Georgia,serif; font-weight:900; font-size:26px; color:#1d1a22 !important; letter-spacing:-.5px; }
.mx-crumbs span[aria-hidden]{ color:#c3bccb; }
.mx-level{ margin-left:auto; font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; color:#ca4490; background:#fdf1f7; padding:6px 12px; border-radius:999px; }
.mx-foot{ display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; margin-top:18px; font-size:16px; font-weight:500; }
.mx-next{ font-weight:600; text-decoration:none; display:inline-flex; align-items:center; min-height:46px; padding:0 20px; border-radius:12px; background:#ca4490; color:#fff !important; }
.mx-next:hover{ background:#b13a7e; }
.mx-learn{ margin-top:22px; background:#fff; border:1px solid #ebe6dc; border-radius:20px; padding:18px 22px; font-size:16px; line-height:1.6; color:#4f4959; }
.mx-learn-k{ font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:18px; color:#1d1a22; }
html.eg-dark body{ background:#1a1b26; }
html.eg-dark .mx{ background:#1a1b26; color:#e8e6ef; }
html.eg-dark .mx a, html.eg-dark .mx-home{ color:#e8e6ef !important; }
html.eg-dark .mx-crumbs{ border-color:#e8e6ef; color:#a29caf; }
html.eg-dark .mx-crumbs a{ color:#a29caf !important; }
html.eg-dark .mx-level{ background:#3a2034; color:#f08cc4; }
html.eg-dark .mx-next{ color:#fff !important; }
html.eg-dark .mx-learn{ background:#24263a; border-color:#363850; color:#c4bfcf; }
html.eg-dark .mx-learn-k{ color:#e8e6ef; }
@media (max-width:600px){ .mx-level{ margin-left:0; } }
`;
