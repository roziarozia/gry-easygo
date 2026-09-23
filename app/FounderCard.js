'use client';
import { useEffect, useState } from 'react';

// ───────────────────────────────────────────────────────────────────────────
// Sekcja "Poznaj mnie" — Rózia jako założycielka i lektorka.
// Pokazuje się TYLKO NIEZALOGOWANYM odwiedzającym (nowym gościom).
// Zalogowany uczeń już Cię zna, więc karta się dla niego nie renderuje.
//
// Sprawdzenie logowania: ta sama sesja Supabase, z której korzysta katalog.
// ZDJĘCIE: wrzuć plik rozia.png do folderu public/ na GitHubie.
// ───────────────────────────────────────────────────────────────────────────

const SUPA_URL = 'https://svjrdyxwqznbzxqeytdn.supabase.co';
const SUPA_KEY = 'sb_publishable_TNCq1UAMAvLO0Z5Mt8QOig_OvsxhhyJ';

export default function FounderCard() {
  // stan: null = jeszcze nie wiadomo, true = zalogowany, false = gość
  const [loggedIn, setLoggedIn] = useState(null);

  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        // użyj klienta katalogu jeśli już jest, inaczej stwórz własny
        let sb = (typeof window !== 'undefined' && window._egSb) ? window._egSb : null;
        if (!sb && typeof window !== 'undefined' && window.supabase) {
          sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
        }
        if (!sb) {
          // katalog jeszcze nie załadował klienta — spróbuj ponownie za chwilę
          setTimeout(check, 600);
          return;
        }
        const { data } = await sb.auth.getSession();
        if (alive) setLoggedIn(!!(data && data.session));
      } catch (e) {
        if (alive) setLoggedIn(false); // w razie błędu pokaż (bezpieczniej dla nowych gości)
      }
    }
    check();
    return () => { alive = false; };
  }, []);

  // dopóki nie wiadomo, albo gdy zalogowany — nic nie pokazuj
  if (loggedIn === null || loggedIn === true) return null;

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
        {/* ZDJĘCIE — okrągłe okienko pokazuje sam środek zdjęcia (osobę),
            różowe tło i biała obwódka wypadają poza kołem dzięki powiększeniu. */}
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
