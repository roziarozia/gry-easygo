'use client';
import { useState, useEffect } from 'react';

// Osadza istniejący, dopracowany odtwarzacz (graj-player.html) 1:1 — nietknięty.
// Okładka z przyciskami trybu ładuje się od razu; granie startuje po kliknięciu.
export default function GameEmbed({ slug }) {
  const [height, setHeight] = useState(780);

  useEffect(() => {
    function onMsg(e) {
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
  }, []);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '20px 16px 0' }}>
      <iframe
        src={`/graj-player.html?g=${encodeURIComponent(slug)}`}
        title="Ćwiczenie"
        style={{ width: '100%', height, border: 'none', borderRadius: 20, display: 'block' }}
        loading="eager"
      />
    </div>
  );
}
