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
            ['poziom', 'kategoria', 'status', 'sort', 'szukaj'].forEach(function (k) {
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
      // zmiana strony w katalogu: przewiń okno główne na górę katalogu
      if (e.data && e.data.egScrollTop && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    <iframe
      ref={ref}
      src={src}
      title="Katalog ćwiczeń"
      style={{ width: '100%', height: 900, border: 'none', display: 'block' }}
    />
  );
}
