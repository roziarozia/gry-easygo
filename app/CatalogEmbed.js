'use client';
import { useEffect, useRef, useState } from 'react';

// Osadza Twój oryginalny katalog 1:1 przez iframe o pełnej szerokości,
// który sam raportuje wysokość (bez wewnętrznego paska). Linki ĆWICZ
// w katalogu prowadzą do /cwiczenie/slug — otwieramy je w oknie nadrzędnym.
export default function CatalogEmbed() {
  const ref = useRef(null);

  // Przekaż parametry filtra (?poziom=, ?kategoria=) ze strony głównej do iframe,
  // żeby katalog w środce mógł je odczytać (window.location.search iframe'a
  // jest inny niż rodzica). Tag "A1"/"Gramatyka" pod ćwiczeniem prowadzi na
  // gry.easygo-english.pl/?poziom=A1 — te parametry muszą trafić do src iframe.
  const [src, setSrc] = useState('/katalog-embed.html');
  useEffect(() => {
    try {
      const parent = new URLSearchParams(window.location.search);
      const pass = new URLSearchParams();
      const poziom = parent.get('poziom');
      const kategoria = parent.get('kategoria');
      if (poziom) pass.set('poziom', poziom);
      if (kategoria) pass.set('kategoria', kategoria);
      const qs = pass.toString();
      setSrc('/katalog-embed.html' + (qs ? '?' + qs : ''));
    } catch (e) {}
  }, []);

  useEffect(() => {
    function onMsg(e) {
      if (e.data && typeof e.data.egCatalogHeight === 'number' && ref.current) {
        ref.current.style.height = Math.max(600, e.data.egCatalogHeight) + 'px';
      }
      // przejście z kafelka lub linku: katalog prosi rodzica o nawigację
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

  return (
    <iframe
      ref={ref}
      src={src}
      title="Katalog ćwiczeń"
      style={{ width: '100%', height: 900, border: 'none', display: 'block' }}
    />
  );
}
