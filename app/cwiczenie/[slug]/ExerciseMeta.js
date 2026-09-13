'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Meta ćwiczenia w formie mini-kart (liczba · poziom · kategoria) + przycisk "Wszystkie
// ćwiczenia". Kliencki komponent, bo język (EG_LANG) trzyma przeglądarka w localStorage,
// a strona page.js jest serwerowa. Akapity opisowe (SEO) zostają po polsku w page.js —
// tu tłumaczymy TYLKO etykiety systemowe, nie treść.
export default function ExerciseMeta({ slideCountLabel, level, category }) {
  const [lang, setLang] = useState('pl');

  useEffect(() => {
    // Język na starcie z localStorage.
    try {
      if (localStorage.getItem('easygo_lang') === 'en') setLang('en');
    } catch (err) {}

    // Gracz (w iframe) po przełączeniu języka wysyła postMessage({egLang}) — przełącz
    // etykiety na żywo, bo strona-rodzic się nie przeładowuje (jak przy motywie w GameEmbed).
    function onMsg(e) {
      if (e.data && (e.data.egLang === 'en' || e.data.egLang === 'pl')) {
        setLang(e.data.egLang);
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const en = lang === 'en';

  // "15 zdań" → "15 sentences", "18 luk" → "18 gaps", "4 slajdy"/"20 slajdów" → "... slides"
  // Bez \b — granica słowa w JS nie działa poprawnie z polskimi znakami (ń, ó); te słowa
  // są jednoznaczne, więc prosta zamiana wystarcza.
  function tłumaczLicznik(label) {
    if (!label) return '';
    if (!en) return label;
    return label
      .replace(/zdań/g, 'sentences')
      .replace(/pytań/g, 'questions')
      .replace(/slajdów/g, 'slides')
      .replace(/slajdy/g, 'slides')
      .replace(/slajd/g, 'slide')
      .replace(/luk/g, 'gaps');
  }

  const CAT_PL = { gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', speaking: 'Speaking', reading: 'Reading', listening: 'Listening' };
  const CAT_EN = { gramatyka: 'Grammar', slownictwo: 'Vocabulary', speaking: 'Speaking', reading: 'Reading', listening: 'Listening' };
  const catLabel = (en ? CAT_EN : CAT_PL)[category] || '';

  // Mini-karta: duża wartość + mała etykieta, kolorowa górna krawędź (opcja 2).
  const licznik = tłumaczLicznik(slideCountLabel);
  const czesci = licznik.split(' ');
  const liczba = /^\d+$/.test(czesci[0] || '') ? czesci[0] : '';
  const jednostka = liczba ? czesci.slice(1).join(' ') : licznik;

  const mc = (kolor) => ({
    background: 'var(--eg-card, #fff)', borderRadius: 14, padding: '10px 18px',
    minWidth: 96, boxShadow: '0 4px 14px rgba(46,42,51,.10)',
    border: '1.5px solid var(--eg-line, #eceaf2)', borderTop: `4px solid ${kolor}`,
  });
  const duzy = { display: 'block', fontFamily: "'Quicksand',sans-serif", fontSize: 17, fontWeight: 700, color: 'var(--eg-ink)' };
  const maly = { fontSize: 12, color: 'var(--eg-muted)', fontWeight: 700 };

  const karty = [];
  if (licznik) karty.push(
    <div key="n" style={mc('#a78dd9')}>
      <b style={duzy}>{liczba || licznik}</b>
      <span style={maly}>{liczba ? jednostka : (en ? 'in total' : 'łącznie')}</span>
    </div>
  );
  if (level) karty.push(
    <div key="lvl" style={mc('var(--eg-magenta, #ca4490)')}>
      <b style={duzy}>{level}</b>
      <span style={maly}>{en ? 'level' : 'poziom'}</span>
    </div>
  );
  if (catLabel) karty.push(
    <div key="cat" style={mc('#f4c94c')}>
      <b style={duzy}>{catLabel}</b>
      <span style={maly}>{en ? 'category' : 'kategoria'}</span>
    </div>
  );

  return (
    <>
      {karty.length > 0 && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', margin: '0 0 20px' }}>
          {karty}
        </div>
      )}
      <Link href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent',
        border: '2px solid var(--eg-magenta, #ca4490)', color: 'var(--eg-magenta, #ca4490)',
        borderRadius: 999, padding: '9px 20px', fontSize: 14, fontWeight: 800, textDecoration: 'none',
      }}>
        ← {en ? 'All exercises' : 'Wszystkie ćwiczenia'}
      </Link>
    </>
  );
}
