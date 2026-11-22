'use client';
import { useEffect, useRef, useState } from 'react';

// Osadza Twój oryginalny katalog 1:1 przez iframe o pełnej szerokości,
// który sam raportuje wysokość (bez wewnętrznego paska). Linki ĆWICZ
// w katalogu prowadzą do /cwiczenie/slug — otwieramy je w oknie nadrzędnym.
export default function CatalogEmbed() {
  const ref = useRef(null);

  // Montujemy iframe dopiero po stronie klienta. Serwer i pierwszy render klienta
  // zwracają to samo (placeholder), więc nie ma rozbieżności hydration (React #418/#423),
  // która wcześniej wywracała stronę i blokowała inicjalizację Pixela oraz Analytics.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Pop-up z demo panelu lektora — renderowany TUTAJ (u rodzica), żeby był
  // przypięty do ekranu, a nie rozciągnięty na całą wysokość iframe katalogu.
  const [demoUrl, setDemoUrl] = useState(null);

  // Teczka lektora: gdy katalog (iframe) jest w trybie „oczami ucznia”, pokazujemy TU (u rodzica)
  // przyklejony pasek. Iframe ma wysokość całego katalogu, więc pasek w jego środku nie mógłby
  // zostać na ekranie przy przewijaniu. null = brak podglądu, tekst = imię oglądanego ucznia.
  const [svName, setSvName] = useState(null);
  // Pływająca plakietka filtrów: katalog (iframe) przysyła listę włączonych filtrów i pozycje
  // (dół paska „Aktywne filtry” i dół listy ćwiczeń, liczone od góry katalogu). Plakietkę pokazujemy,
  // gdy pasek zniknął już nad ekranem, a użytkownik nadal przegląda listę ćwiczeń.
  const [pill, setPill] = useState(null);
  const [pillOn, setPillOn] = useState(false);
  useEffect(() => {
    if (!pill) { setPillOn(false); return; }
    function check() {
      if (!ref.current) return;
      const top = ref.current.getBoundingClientRect().top;
      const barGone = top + pill.barBottom < 0;
      const stillInList = top + pill.endBottom > window.innerHeight * 0.35;
      setPillOn(barGone && stillInList);
    }
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [pill]);
  function pillClear() {
    try { ref.current && ref.current.contentWindow.postMessage({ egClearFilters: true }, window.location.origin); } catch (e) {}
  }
  function svExit() {
    try { ref.current && ref.current.contentWindow.postMessage({ egExitStudentView: true }, window.location.origin); } catch (e) {}
  }
  useEffect(() => {
    if (!demoUrl) return;
    const onKey = (e) => { if (e.key === 'Escape') setDemoUrl(null); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [demoUrl]);

  // Przekaż parametry filtra (?poziom=, ?kategoria=) ze strony głównej do iframe,
  // żeby katalog w środce mógł je odczytać (window.location.search iframe'a
  // jest inny niż rodzica). Tag "A1"/"Gramatyka" pod ćwiczeniem prowadzi na
  // gry.easygo-english.pl/?poziom=A1 — te parametry muszą trafić do src iframe.
  // Po potwierdzeniu maila Supabase wraca na stronę główną z tokenem sesji w adresie
  // (#access_token=…&type=signup). Iframe z katalogiem ma własny URL, więc sam tego tokenu
  // nie zobaczy — to RODZIC musi go przetworzyć: tworzymy klienta Supabase, który przy starcie
  // wykrywa token w URL i zapisuje sesję do localStorage (współdzielonego z iframe na tej samej
  // domenie), po czym czyścimy adres. Nasłuch onAuthStateChange w katalogu podchwyci zapisaną sesję.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.hash || window.location.hash.indexOf('access_token') === -1) return;
    const SUPA_URL = 'https://svjrdyxwqznbzxqeytdn.supabase.co';
    const SUPA_KEY = 'sb_publishable_TNCq1UAMAvLO0Z5Mt8QOig_OvsxhhyJ';
    function processToken() {
      try {
        const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
        // getSession() wymusza przetworzenie tokenu z URL i zapis sesji do localStorage
        sb.auth.getSession().finally(function () {
          try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
        });
      } catch (e) {}
    }
    if (window.supabase) {
      processToken();
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = processToken;
      document.head.appendChild(s);
    }
  }, []);

  const [src, setSrc] = useState('/katalog-embed.html');
  useEffect(() => {
    try {
      const parent = new URLSearchParams(window.location.search);
      const pass = new URLSearchParams();
      // 1) Filtry z adresu strony (np. wejście z linku ?poziom=A1) mają priorytet.
      const poziom = parent.get('poziom');
      const kategoria = parent.get('kategoria');
      if (poziom) pass.set('poziom', poziom);
      if (kategoria) pass.set('kategoria', kategoria);
      // 2) Jeśli adres nie niesie filtrów, odtwórz ostatni wybór zapisany przez katalog
      //    (katalog wysyła go do rodzica przez postMessage — patrz onMsg niżej).
      //    Rodzic musi je wstawić do src iframe, bo po odświeżeniu iframe startuje od zera.
      if (!poziom && !kategoria) {
        try {
          const saved = JSON.parse(localStorage.getItem('easygo_filtry_url') || 'null');
          if (saved && typeof saved === 'object') {
            ['poziom', 'kategoria', 'status', 'sort'].forEach(function (k) {
              if (saved[k]) pass.set(k, saved[k]);
            });
          }
        } catch (e) {}
      }
      const qs = pass.toString();
      setSrc('/katalog-embed.html' + (qs ? '?' + qs : ''));
    } catch (e) {}
  }, []);

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
      // podgląd ucznia włączony/wyłączony w katalogu (tylko wiadomości z naszej domeny)
      if (e.origin === window.location.origin && e.data && 'egStudentView' in e.data) {
        const sv = e.data.egStudentView;
        setSvName(sv && sv.name ? String(sv.name) : null);
        // potwierdź katalogowi, że pasek jest u rodzica (wtedy chowa swój baner)
        try { e.source && e.source.postMessage({ egSvBarShown: !!(sv && sv.name) }, window.location.origin); } catch (err) {}
      }
      // katalog zgłasza włączone filtry (albo null = brak filtrów) → pływająca plakietka
      if (e.origin === window.location.origin && e.data && 'egFilterPill' in e.data) {
        setPill(e.data.egFilterPill || null);
      }
      if (e.data && typeof e.data.egCatalogHeight === 'number' && ref.current) {
        ref.current.style.height = Math.max(600, e.data.egCatalogHeight) + 'px';
      }
      // katalog (iframe) zmienił filtry → zapisz je u rodzica, żeby przetrwały odświeżenie
      // (iframe po odświeżeniu startuje od zera; rodzic wstawi je z powrotem do src).
      if (e.data && e.data.egFilters) {
        try { localStorage.setItem('easygo_filtry_url', JSON.stringify(e.data.egFilters)); } catch (err) {}
      }
      // przejście z kafelka lub linku: katalog prosi rodzica o nawigację
      // katalog (w iframe) przełączył tryb → przełącz całą stronę
      if (e.data && e.data.egTheme) {
        try {
          const html = document.documentElement;
          if (e.data.egTheme === 'dark') html.classList.add('eg-dark');
          else html.classList.remove('eg-dark');
          localStorage.setItem('easygo_tryb', e.data.egTheme);
        } catch (err) {}
      }
      // katalog (iframe) zgłasza zdarzenie do analityki → przekaż do GA4 (gtag jest u rodzica)
      if (e.data && e.data.egTrack) {
        try {
          if (typeof window.gtag === 'function') {
            window.gtag('event', e.data.egTrack, { event_category: 'nawigacja' });
          }
        } catch (err) {}
      }
      if (e.data && e.data.egNavigate) {
        if (e.data.egExternal) {
          // link zewnętrzny (Kontakt, mailto) — nowa karta, żeby uczeń nie tracił ćwiczeń
          window.open(e.data.egNavigate, '_blank', 'noopener');
        } else {
          window.location.href = e.data.egNavigate;
        }
      }
      // katalog prosi o otwarcie demo panelu lektora w pop-upie
      if (e.data && e.data.egOpenDemo) {
        setDemoUrl(String(e.data.egOpenDemo));
      }
      // zmiana strony w katalogu: przewiń okno główne na górę katalogu
      if (e.data && e.data.egScrollTop && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // katalog prosi o przewinięcie do miejsca w środku (np. "Jak to działa", filtry):
      // egScrollY = pozycja elementu liczona od góry katalogu
      if (e.data && typeof e.data.egScrollY === 'number' && ref.current) {
        const top = ref.current.getBoundingClientRect().top + window.scrollY + e.data.egScrollY - 80;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Przed zamontowaniem po stronie klienta pokazujemy pusty blok o tej samej
  // wysokości — dzięki temu serwer i klient renderują identycznie (brak mismatchu),
  // a strona nie „przeskakuje" po pojawieniu się iframe.
  if (!mounted) {
    return <div style={{ width: '100%', height: 900 }} aria-hidden="true" />;
  }

  return (
    <>
    <div style={{ position: 'relative' }}>
    {svName && (
      <div className="egsv-stick">
        <div className="egsv-bar" role="status">
          <span className="egsv-k">Podgląd ucznia</span>
          <span className="egsv-t">Widzisz stronę oczami: <strong>{svName}</strong></span>
          <span className="egsv-legend"><i className="egsv-done" />zrobione<i className="egsv-prog" />w trakcie</span>
          <button type="button" className="egsv-x" onClick={svExit}>Zamknij podgląd <span aria-hidden="true">×</span></button>
        </div>
      </div>
    )}
    <style>{`
.egsv-stick{ position:sticky; top:0; z-index:50; padding:10px 16px 0; }
.egsv-bar{ margin:0 auto; max-width:1180px; box-sizing:border-box;
  display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; padding:12px 14px 12px 18px;
  background:#ca4490; color:#fff; border-radius:14px; box-shadow:0 10px 24px rgba(202,68,144,.28); font-family:'Outfit','Segoe UI',Arial,sans-serif; }
.egsv-k{ font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; color:#ca4490; background:#fff; padding:4px 10px; border-radius:999px; }
.egsv-t{ font-size:15.5px; flex:1 1 220px; color:#fff; }
.egsv-t strong{ font-size:19px; font-weight:800; }
.egsv-legend{ display:inline-flex; align-items:center; gap:6px; font-size:13px; color:#fff; }
.egsv-legend i{ display:inline-block; width:12px; height:12px; border-radius:3px; margin-left:6px; border:1.5px solid #fff; }
.egsv-done{ background:#1e7e50; }
.egsv-prog{ background:#a78dd9; }
.egsv-x{ min-height:40px; padding:0 14px; border:1.5px solid #fff; border-radius:999px; background:transparent; color:#fff; font-family:inherit; font-size:14.5px; font-weight:600; cursor:pointer; }
.egsv-x:hover{ background:#fff; color:#ca4490; }
@media (max-width:640px){ .egsv-stick{ padding:0; } .egsv-bar{ border-radius:0 0 14px 14px; } .egsv-legend{ display:none; } }
.egfp{ position:fixed; left:50%; bottom:18px; transform:translate(-50%, 20px); opacity:0; pointer-events:none; z-index:60;
  display:flex; align-items:center; gap:10px; max-width:calc(100vw - 24px); box-sizing:border-box;
  padding:8px 8px 8px 16px; background:#ca4490; color:#fff; border-radius:999px; box-shadow:0 10px 26px rgba(202,68,144,.35);
  font-family:'Outfit','Segoe UI',Arial,sans-serif; font-size:14px; transition:opacity .2s, transform .2s; }
.egfp.egfp-on{ opacity:1; transform:translate(-50%, 0); pointer-events:auto; }
.egfp-t{ font-weight:700; white-space:nowrap; }
.egfp-l{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.egfp-c{ white-space:nowrap; opacity:.9; }
.egfp-x{ flex:none; min-height:32px; padding:0 14px; border:none; border-radius:999px; background:#fff; color:#ca4490;
  font-family:inherit; font-size:13.5px; font-weight:700; cursor:pointer; }
.egfp-x:hover{ background:#f6f1ae; }
@media (max-width:640px){ .egfp{ font-size:13px; gap:8px; bottom:12px; } .egfp-t{ display:none; } }
`}</style>
    {pill && (
      <div className={'egfp' + (pillOn ? ' egfp-on' : '')} role="status" aria-hidden={!pillOn}>
        <span className="egfp-t">{pill.title}</span>
        <span className="egfp-l">{(pill.labels || []).join(' · ')}</span>
        <span className="egfp-c">· {pill.count}</span>
        <button type="button" className="egfp-x" onClick={pillClear} tabIndex={pillOn ? 0 : -1}>{pill.clear} ✕</button>
      </div>
    )}
    <iframe
      ref={ref}
      src={src}
      title="Katalog ćwiczeń"
      scrolling="no"
      style={{ width: '100%', height: 900, border: 'none', display: 'block', overflow: 'hidden' }}
    />
    </div>
      {demoUrl && (
        <div onClick={() => setDemoUrl(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(46,42,51,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: 18, width: '100%', maxWidth: 960, height: '86vh', overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
            <button type="button" onClick={() => setDemoUrl(null)} aria-label="Zamknij" style={{ position: 'absolute', top: 10, right: 12, zIndex: 2, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.92)', color: '#2e2a33', fontSize: 22, lineHeight: 1, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>×</button>
            <iframe src={demoUrl} title="Podgląd panelu lektora" style={{ width: '100%', height: '100%', border: 0 }} />
          </div>
        </div>
      )}
    </>
  );
}
