'use client';
import { useState, useEffect } from 'react';
import posthog from 'posthog-js';

const analyticsEnabled = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST
);

// Osadza istniejący, dopracowany odtwarzacz (graj-player.html) 1:1 — nietknięty.
// Okładka z przyciskami trybu ładuje się od razu; granie startuje po kliknięciu.
export default function GameEmbed({ slug }) {
  const [height, setHeight] = useState(780);

  useEffect(() => {
    // Przywróć zapisany tryb przy każdym wejściu na stronę. Skrypt w <head>
    // (layout.js) działa tylko przy pełnym przeładowaniu; przy nawigacji
    // po stronie klienta (Next.js) już się nie wykonuje, więc bez tego
    // strona potrafiła zostać jasna mimo wybranego trybu ciemnego.
    try {
      const zapisany = localStorage.getItem('easygo_tryb');
      const html = document.documentElement;
      if (zapisany === 'dark') html.classList.add('eg-dark');
      else if (zapisany === 'light') html.classList.remove('eg-dark');
    } catch (err) {}

    function onMsg(e) {
      if (e.origin !== window.location.origin) return;
      if (analyticsEnabled && e.data && e.data.egExerciseStarted) {
        const modes = {
          startShowBtn: 'show_answers',
          startTypeBtn: 'type_answers',
          startQuizBtn: 'quiz',
          startGapPlBtn: 'translation_hint',
          startGapBaseBtn: 'base_form_hint',
          startSpeakBtn: 'single_mode',
        };
        posthog.capture('exercise_started', {
          exercise_slug: slug,
          exercise_mode: modes[e.data.egExerciseStarted.mode] || 'unknown',
        });
      }
      if (analyticsEnabled && e.data && e.data.egExerciseCompleted) {
        const result = e.data.egExerciseCompleted;
        posthog.capture('exercise_completed', {
          exercise_slug: slug,
          score: result.score,
          score_max: result.scoreMax,
          score_percent: result.scoreMax ? Math.round((result.score / result.scoreMax) * 100) : null,
        });
      }
      if (e.data && typeof e.data.egPlayerHeight === 'number') {
        setHeight(Math.max(520, e.data.egPlayerHeight));
      }
      // odtwarzacz (w iframe) przełączył tryb → przełącz całą stronę na żywo
      if (e.data && e.data.egTheme) {
        try {
          const html = document.documentElement;
          if (e.data.egTheme === 'dark') html.classList.add('eg-dark');
          else html.classList.remove('eg-dark');
          localStorage.setItem('easygo_tryb', e.data.egTheme);
        } catch (err) {}
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [slug]);

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 16px 0' }}>
      <iframe
        src={`/graj-player.html?g=${encodeURIComponent(slug)}`}
        title="Ćwiczenie"
        // minHeight = ćwiczenie ma zajmować większość ekranu; height (z postMessage)
        // pozwala ramce UROSNĄĆ ponad to dla długich treści (np. tekst z lukami)
        // i skurczyć się z powrotem do minHeight na ekranie końcowym.
        style={{ width: '100%', height, minHeight: '86vh', border: 'none', borderRadius: 20, display: 'block' }}
        loading="eager"
      />
    </div>
  );
}
