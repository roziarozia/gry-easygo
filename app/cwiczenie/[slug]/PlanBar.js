'use client';
import { useEffect, useState } from 'react';

// Przycisk „← Mój plan nauki” przy ćwiczeniu.
// Pokazuje się TYLKO, gdy:
//   1) uczeń naprawdę wybrał plan („Wybieram ten plan” → localStorage „ew_plan_level”), oraz
//   2) przyszedł do ćwiczenia z planu (link z planu ma ?plan=…) albo wcześniej w tej samej sesji
//      wszedł z planu (sessionStorage „ew_from_plan” — ten sam klucz co pasek na blogu).
// Samo oglądanie planu bez wybrania go nie włącza przycisku. Link prowadzi do WYBRANEGO planu.
// Wygląd: na szerokim ekranie przyklejony po lewej, w pustym polu obok ćwiczenia (widać go cały
// czas, także przy przewijaniu); na węższych ekranach (telefon, tablet) — pod ćwiczeniem.
// Nigdy NAD ćwiczeniem: przesuwał ramkę w dół i na iPhonie nie dało się przewinąć do góry.
const LV = ['a1', 'a2', 'b1', 'b2', 'c1'];

const CSS = `
.ew-planbar{ display:flex; justify-content:center; padding:18px 16px 6px; }
.ew-planbar a{ display:inline-flex; align-items:center; gap:8px; background:var(--eg-card,#fff); color:var(--eg-ink,#2e2a33);
  border:1.5px solid var(--eg-line,#eceaf2); border-radius:999px; padding:10px 18px; font-family:'Outfit',sans-serif;
  font-weight:700; font-size:14px; text-decoration:none; box-shadow:0 6px 18px rgba(42,39,48,.10); }
.ew-planbar a:hover{ border-color:var(--eg-magenta,#ca4490); }
.ew-planbar .ew-pb-arrow{ color:var(--eg-magenta,#ca4490); font-size:16px; line-height:1; }
.ew-planbar .ew-pb-lv{ background:var(--eg-magenta,#ca4490); color:#fff; border-radius:999px; padding:2px 8px; font-size:12px; letter-spacing:.03em; }
@media (min-width:1280px){
  .ew-planbar{ position:fixed; left:18px; top:140px; z-index:50; padding:0; display:block; }
  .ew-planbar a{ box-sizing:border-box; flex-direction:column; gap:6px; width:112px; padding:14px 10px; border-radius:20px; text-align:center; line-height:1.25; }
  .ew-planbar .ew-pb-arrow{ font-size:20px; }
}
`;

export default function PlanBar() {
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    let chosen = null;
    try {
      const v = JSON.parse(localStorage.getItem('ew_plan_level') || 'null');
      if (v && LV.includes(v)) chosen = v;
    } catch (e) {}
    if (!chosen) return; // plan nie został wybrany — nie pokazujemy przycisku

    let fromPlan = false;
    try {
      const q = new URLSearchParams(window.location.search).get('plan');
      if (q && LV.includes(q.toLowerCase())) {
        fromPlan = true;
        sessionStorage.setItem('ew_from_plan', q.toLowerCase());
      }
    } catch (e) {}
    if (!fromPlan) {
      try {
        const s = sessionStorage.getItem('ew_from_plan');
        if (s && LV.includes(s)) fromPlan = true;
      } catch (e) {}
    }
    if (fromPlan) setPlan(chosen);
  }, []);

  if (!plan) return null;

  return (
    <div className="ew-planbar">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a href={`/plan?poziom=${plan}#plan`}>
        <span className="ew-pb-arrow" aria-hidden="true">&larr;</span>
        <span>Mój plan nauki</span>
        <span className="ew-pb-lv">{plan.toUpperCase()}</span>
      </a>
    </div>
  );
}
