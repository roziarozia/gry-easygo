'use client';
import { useEffect, useState } from 'react';

// Górny pasek nawigacji na stronie ćwiczenia: logo, główne działy, Oferta, Opinie i tryb jasny/ciemny.
// Na telefonie: logo, „Oferta” i menu w szufladzie. Pasek jest zwykłym (nieprzyklejonym) elementem
// renderowanym od razu z serwerem, więc nie przesuwa ramki z ćwiczeniem po załadowaniu strony.
// Tryb ciemny: ten sam zapis co na reszcie strony (localStorage 'easygo_tryb' + klasa eg-dark),
// a odtwarzacz w ramce dostaje informację i przełącza się od razu.
export default function ExerciseNav() {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    setDark(html.classList.contains('eg-dark'));
    const obs = new MutationObserver(() => setDark(html.classList.contains('eg-dark')));
    obs.observe(html, { attributes: true, attributeFilter: ['class'] });
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => { obs.disconnect(); window.removeEventListener('keydown', onKey); };
  }, []);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains('eg-dark');
    document.documentElement.classList.toggle('eg-dark', next);
    try { localStorage.setItem('easygo_tryb', next ? 'dark' : 'light'); } catch (e) {}
    document.querySelectorAll('iframe').forEach((f) => {
      try { f.contentWindow.postMessage({ egSetTheme: next ? 'dark' : 'light' }, window.location.origin); } catch (e) {}
    });
    setDark(next);
  }

  const themeIcon = dark ? (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A8.5 8.5 0 1111.2 3a6.6 6.6 0 009.8 9.8z" />
    </svg>
  );

  return (
    <>
      <nav className="exn" aria-label="Nawigacja">
        <a className="exn-brand" href="/" title="Strona główna"><span className="e">Easy</span><span className="w">Wonders</span></a>
        <div className="exn-links">
          <a className="exn-txt" href="/">Ćwiczenia</a>
          <a className="exn-txt" href="/plan">Plan nauki</a>
          <a className="exn-txt" href="/nauka">Blog</a>
          <a className="exn-pill exn-oferta" href="/oferta">Oferta</a>
          <a className="exn-pill exn-opinie" href="/opinie">Opinie</a>
          <button type="button" className="exn-theme" onClick={toggleTheme}
            aria-label={dark ? 'Włącz tryb jasny' : 'Włącz tryb ciemny'} title="Jasny / ciemny">{themeIcon}</button>
        </div>
        <div className="exn-mobile">
          <a className="exn-pill exn-oferta" href="/oferta">Oferta</a>
          <button type="button" className="exn-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div className={'exn-overlay' + (open ? ' open' : '')} onClick={() => setOpen(false)} />
      <nav className={'exn-menu' + (open ? ' open' : '')} aria-label="Menu" aria-hidden={!open}>
        <button type="button" className="exn-close" aria-label="Zamknij" onClick={() => setOpen(false)}>&times;</button>
        <a className="exn-mbrand" href="/"><span className="e">Easy</span><span className="w">Wonders</span></a>
        <a className="exn-item" href="/"><b>Ćwiczenia</b><small>Wszystkie ćwiczenia i kategorie</small></a>
        <a className="exn-item" href="/plan"><b>Plan nauki</b><small>Lekcja po lekcji, od A1 do C1</small></a>
        <a className="exn-item" href="/nauka"><b>Blog</b><small>Wyjaśnienia gramatyki i słownictwa</small></a>
        <a className="exn-item" href="/oferta"><b>Oferta</b><small>Subskrypcja i cennik</small></a>
        <a className="exn-item" href="/opinie"><b>Opinie</b><small>Co mówią uczniowie</small></a>
        <button type="button" className="exn-mtheme" onClick={toggleTheme}>{themeIcon}<span>Zmień motyw</span></button>
      </nav>
    </>
  );
}
