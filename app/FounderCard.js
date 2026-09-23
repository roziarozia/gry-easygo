'use client';
import { useEffect, useState } from 'react';

// ───────────────────────────────────────────────────────────────────────────
// Sekcja "Poznaj mnie" — Rózia jako założycielka i lektorka.
// Pokazuje się gościom; chowa się, gdy uda się potwierdzić, że ktoś jest zalogowany.
// Domyślnie WIDOCZNA (strona jest dla nowych gości) — chowamy tylko przy pewności.
//
// Sprawdzenie logowania: token sesji Supabase trzymany jest w localStorage
// przeglądarki pod kluczem zaczynającym się od "sb-...-auth-token". Jeśli taki
// klucz istnieje i ma w środku dane sesji — użytkownik jest zalogowany.
// ───────────────────────────────────────────────────────────────────────────

function isUserLoggedIn() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const val = localStorage.getItem(key);
        if (val && val.length > 20 && val.indexOf('access_token') !== -1) {
          return true;
        }
      }
    }
  } catch (e) {}
  return false;
}

export default function FounderCard() {
  // domyślnie pokazujemy (false = niezalogowany-gość); chowamy tylko gdy wykryjemy sesję
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // krótkie opóźnienie, aż przeglądarka wczyta localStorage/sesję
    const t = setTimeout(() => {
      setHidden(isUserLoggedIn());
      setReady(true);
    }, 150);
    return () => clearTimeout(t);
  }, []);

  if (ready && hidden) return null;

  return (
    <section
      style={{
        maxWidth: 820,
        margin: '40px auto',
        padding: '4px',
        borderRadius: 22,
        background: 'linear-gradient(135deg, #a78dd9 0%, #ca4490 100%)',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 19,
          padding: '26px 30px',
          display: 'flex',
          alignItems: 'center',
          gap: 26,
          flexWrap: 'wrap',
        }}
      >
        {/* ZDJĘCIE — okrągłe okienko pokazuje sam środek zdjęcia (osobę) */}
        <div
          style={{
            flex: '0 0 auto',
            width: 122,
            height: 122,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #f2eef9',
            boxShadow: '0 6px 18px rgba(202,68,144,0.18)',
          }}
        >
          <img
            src="/rozia.png"
            alt="Rózia, założycielka EasyWonders"
            style={{
              width: '148%',
              height: '148%',
              objectFit: 'cover',
              objectPosition: '50% 42%',
              transform: 'translate(-16%, -14%)',
              display: 'block',
            }}
          />
        </div>

        {/* TEKST */}
        <div style={{ flex: '1 1 320px', minWidth: 260 }}>
          <div
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#a78dd9',
              marginBottom: 4,
            }}
          >
            Poznaj mnie
          </div>

          <h3
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              margin: '0 0 2px',
              color: '#2e2a33',
            }}
          >
            Rózia
          </h3>

          <div style={{ fontSize: 14.5, fontWeight: 800, color: '#ca4490', marginBottom: 12 }}>
            Założycielka i lektorka
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.65, color: '#4a4458', margin: 0 }}>
            Hej! Angielskiego uczę od ponad 10 lat i wiem, jak trudno znaleźć
            ćwiczenia, które są jednocześnie skuteczne i przyjemne. Dlatego
            powstało EasyWonders. Sama układam i sprawdzam każdą czytankę,
            słuchankę i ćwiczenie — tak, żeby naprawdę pomagały w nauce,
            a nie tylko wypełniały czas. Chcemy dać Ci materiały, które
            pokochasz, więc zostań z nami na dłużej{' '}
            <span style={{ color: '#ff5fa2' }}>♥</span>
          </p>
        </div>
      </div>
    </section>
  );
}
