'use client';
import { useEffect, useRef } from 'react';

// Osadza Twój oryginalny katalog 1:1 przez iframe o pełnej szerokości,
// który sam raportuje wysokość (bez wewnętrznego paska). Linki ĆWICZ
// w katalogu prowadzą do /cwiczenie/slug — otwieramy je w oknie nadrzędnym.
export default function CatalogEmbed() {
  const ref = useRef(null);

  useEffect(() => {
    function onMsg(e) {
      if (e.data && typeof e.data.egCatalogHeight === 'number' && ref.current) {
        ref.current.style.height = Math.max(600, e.data.egCatalogHeight) + 'px';
      }
      // przejście z kafelka: katalog prosi rodzica o nawigację
      if (e.data && e.data.egNavigate) {
        window.location.href = e.data.egNavigate;
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <iframe
      ref={ref}
      src="/katalog-embed.html"
      title="Katalog ćwiczeń"
      style={{ width: '100%', height: 900, border: 'none', display: 'block' }}
    />
  );
}
