'use client';
import { useEffect, useState } from 'react';

// Pasek „← Mój plan nauki” pod ćwiczeniem (nie nad nim — patrz komentarz w page.js). Pokazuje się tylko wtedy, gdy uczeń przyszedł z planu
// (link z planu ma ?plan=a1/a2/b1/b2/c1) albo wcześniej w tej samej sesji wszedł z planu
// (sessionStorage „ew_from_plan” — ten sam klucz co pasek na blogu w nauka.html).
// Zrobione ćwiczenie plan odhacza sam (game_completions), więc tu wystarczy droga powrotu.
const LV = ['a1', 'a2', 'b1', 'b2', 'c1'];

export default function PlanBar() {
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    let p = null;
    try {
      const q = new URLSearchParams(window.location.search).get('plan');
      if (q && LV.includes(q.toLowerCase())) {
        p = q.toLowerCase();
        sessionStorage.setItem('ew_from_plan', p);
      }
    } catch (e) {}
    if (!p) {
      try {
        const s = sessionStorage.getItem('ew_from_plan');
        if (s && LV.includes(s)) p = s;
      } catch (e) {}
    }
    setPlan(p);
  }, []);

  if (!plan) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 16px 6px' }}>
      <a
        href={`/plan?poziom=${plan}#plan`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--eg-card, #fff)', color: 'var(--eg-ink, #2e2a33)',
          border: '1.5px solid var(--eg-line, #eceaf2)', borderRadius: 999,
          padding: '9px 18px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14,
          textDecoration: 'none', boxShadow: '0 6px 18px rgba(42,39,48,.08)',
        }}
      >
        <span aria-hidden="true">&larr;</span>
        Mój plan nauki
        <span style={{ background: 'var(--eg-magenta, #ca4490)', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 12, letterSpacing: '.03em' }}>
          {plan.toUpperCase()}
        </span>
      </a>
    </div>
  );
}
