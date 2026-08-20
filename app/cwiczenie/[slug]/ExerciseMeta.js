'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Drobne etykiety pod ćwiczeniem (liczba slajdów · poziom · kategoria) + link "wszystkie
// ćwiczenia". Kliencki komponent, bo język (EG_LANG) trzyma przeglądarka w localStorage,
// a strona page.js jest serwerowa. Akapity opisowe (SEO) zostają po polsku w page.js —
// tu tłumaczymy TYLKO etykiety systemowe, nie treść.
export default function ExerciseMeta({ slideCountLabel, level, category }) {
  const [lang, setLang] = useState('pl');

  useEffect(() => {
    try {
      if (localStorage.getItem('easygo_lang') === 'en') setLang('en');
    } catch (err) {}
  }, []);

  const en = lang === 'en';

  // "15 zdań" → "15 sentences", "10 pytań" → "10 questions", "4 slajdy"/"20 slajdów" → "... slides"
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
      .replace(/slajd/g, 'slide');
  }

  const CAT_PL = { gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', speaking: 'Speaking', reading: 'Reading', listening: 'Listening' };
  const CAT_EN = { gramatyka: 'Grammar', slownictwo: 'Vocabulary', speaking: 'Speaking', reading: 'Reading', listening: 'Listening' };
  const catLabel = (en ? CAT_EN : CAT_PL)[category] || '';

  const poziomTxt = level ? (en ? `level ${level}` : `poziom ${level}`) : '';
  const metaLinia = [tłumaczLicznik(slideCountLabel), poziomTxt, catLabel].filter(Boolean).join(' · ');

  return (
    <>
      <p style={{ fontSize: 13.5, color: 'var(--eg-muted)', margin: '0 0 20px', letterSpacing: '.2px' }}>
        {metaLinia}
      </p>
      <Link href="/" style={{ color: 'var(--eg-magenta)', fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>
        ← {en ? 'See all exercises' : 'Zobacz wszystkie ćwiczenia'}
      </Link>
    </>
  );
}
