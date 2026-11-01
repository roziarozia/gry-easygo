'use client';
import { useEffect, useState } from 'react';

// Przełącznik trybu jasny/ciemny dla części maturalnej. Ten sam zapis co na reszcie
// EasyWonders (localStorage 'easygo_tryb' + klasa eg-dark na <html>), więc wybór
// obowiązuje wszędzie. Odtwarzacz w iframe dostaje informację i przełącza się od razu.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    try {
      const z = localStorage.getItem('easygo_tryb');
      if (z === 'dark') html.classList.add('eg-dark');
      else if (z === 'light') html.classList.remove('eg-dark');
    } catch (e) {}
    setDark(html.classList.contains('eg-dark'));
    // gdy tryb zmieni przycisk w odtwarzaczu, ikonka tutaj też się zaktualizuje
    const obs = new MutationObserver(() => setDark(html.classList.contains('eg-dark')));
    obs.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('eg-dark', next);
    try { localStorage.setItem('easygo_tryb', next ? 'dark' : 'light'); } catch (e) {}
    document.querySelectorAll('iframe').forEach((f) => {
      try { f.contentWindow.postMessage({ egSetTheme: next ? 'dark' : 'light' }, window.location.origin); } catch (e) {}
    });
    setDark(next);
  }

  return (
    <button type="button" className="mt-theme" onClick={toggle}
      aria-label={dark ? 'Włącz tryb jasny' : 'Włącz tryb ciemny'} title={dark ? 'Tryb jasny' : 'Tryb ciemny'}>
      {dark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
      <span>{dark ? 'Jasny' : 'Ciemny'}</span>
    </button>
  );
}

// Wspólny wygląd przycisku (dołączany do stylów obu stron maturalnych).
export const THEME_CSS = `
.mt-theme{ display:inline-flex; align-items:center; gap:7px; min-height:40px; padding:0 14px; border-radius:999px; border:1px solid #ddd6ca; background:#fff; color:#1d1a22; font-family:'Outfit',sans-serif; font-size:14px; font-weight:600; cursor:pointer; }
.mt-theme:hover{ border-color:#ca4490; color:#ca4490; }
html.eg-dark .mt-theme{ background:#24263a; border-color:#4a4c66; color:#e8e6ef; }
html.eg-dark .mt-theme:hover{ border-color:#f08cc4; color:#f08cc4; }
`;

// Stopka części maturalnej (ta sama na /matura i na stronach ćwiczeń).
export function MaturaFooter() {
  return (
    <footer className="mt-foot">
      <a href="/" className="mt-foot-logo"><span style={{ color: '#ca4490' }}>Easy</span><span style={{ color: '#c8930f' }}>Wonders</span></a>
      <nav className="mt-foot-links" aria-label="Stopka">
        <a href="/">Ćwiczenia</a>
        <a href="/nauka">Blog</a>
        <a href="/regulamin">Regulamin</a>
        <a href="/polityka-prywatnosci">Polityka prywatności</a>
        <a href="mailto:info@easygo-english.pl">Kontakt</a>
      </nav>
      <p className="mt-foot-note">Masz pytanie albo coś nie działa? Napisz do nas: <a href="mailto:info@easygo-english.pl">info@easygo-english.pl</a></p>
      <p className="mt-foot-copy">© {new Date().getFullYear()} EasyWonders</p>
    </footer>
  );
}

export const FOOTER_CSS = `
.mt-foot{ max-width:1080px; margin:48px auto 0; padding:28px 24px 36px; border-top:1px solid #e3ddd1; text-align:center; font-family:'Outfit',sans-serif; }
.mt-foot-logo{ display:inline-block; font-weight:700; font-size:20px; letter-spacing:-.5px; text-decoration:none; }
.mt-foot-links{ display:flex; flex-wrap:wrap; justify-content:center; gap:8px 22px; margin-top:14px; font-size:14.5px; font-weight:500; }
.mt-foot-links a{ color:#5b5566 !important; text-decoration:none; }
.mt-foot-links a:hover{ color:#ca4490 !important; }
.mt-foot-note{ margin:16px 0 0; font-size:13.5px; color:#7a7385; }
.mt-foot-note a{ color:#ca4490 !important; font-weight:600; text-decoration:none; }
.mt-foot-copy{ margin:8px 0 0; font-size:12.5px; color:#a49dad; }
html.eg-dark .mt-foot{ border-color:#363850; }
html.eg-dark .mt-foot-links a{ color:#a29caf !important; }
html.eg-dark .mt-foot-note{ color:#a29caf; }
html.eg-dark .mt-foot-note a{ color:#f08cc4 !important; }
html.eg-dark .mt-foot-copy{ color:#6f6a80; }
@media (max-width:600px){ .mt-foot{ padding:24px 16px 32px; } }
`;
