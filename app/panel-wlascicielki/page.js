'use client';
import { useState } from 'react';

// ───────────────────────────────────────────────────────────────────────────
// Panel właścicielki EasyWonders (jeden plik, wersja klient)
// Łączy się WYŁĄCZNIE z bezpieczną funkcją owner-dashboard (mail+hasło jako sekret
// po stronie serwera). Żadne dane nie przechodzą przez publiczny klucz strony.
// Hasło nie jest nigdzie zapisywane — znika po zalogowaniu / zamknięciu karty.
// ───────────────────────────────────────────────────────────────────────────

const FN_URL = 'https://svjrdyxwqznbzxqeytdn.supabase.co/functions/v1/owner-dashboard';

const C = {
  magenta: '#ca4490', law: '#a78dd9', gold: '#f4c94c', ink: '#2e2a33',
  muted: '#7a7484', card: '#ffffff', bg: '#faf9fc', line: '#eae6f2',
  green: '#5fbf9f', red: '#e0736f', lawSoft: '#f6f3fc',
};

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'dziś';
  if (days === 1) return 'wczoraj';
  if (days < 7) return days + ' dni temu';
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

export default function PanelWlascicielki() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [openTeacher, setOpenTeacher] = useState(null);
  const [showSleeping, setShowSleeping] = useState(false);
  const [rankTab, setRankTab] = useState('access'); // 'access' | 'outside'

  async function login(e) {
    if (e) e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 401) { setErr('Błędny mail lub hasło.'); setLoading(false); return; }
      if (!res.ok) { setErr('Coś poszło nie tak (' + res.status + '). Spróbuj ponownie.'); setLoading(false); return; }
      const json = await res.json();
      setData(json);
      setPassword('');
    } catch (e2) {
      setErr('Brak połączenia z serwerem.');
    }
    setLoading(false);
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito',sans-serif", padding: 20 }}>
        <div style={{ background: C.card, borderRadius: 22, border: '2px solid ' + C.law, boxShadow: '0 10px 30px rgba(167,141,217,.18)', padding: '34px 30px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>🤍</div>
          <h1 style={{ fontFamily: "'Quicksand',sans-serif", fontSize: 22, color: C.ink, margin: '0 0 4px' }}>Panel właścicielki</h1>
          <p style={{ fontSize: 13.5, color: C.muted, margin: '0 0 22px' }}>EasyWonders — dostęp tylko dla Ciebie</p>
          <form onSubmit={login}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mail" autoComplete="off" style={inputStyle} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="hasło" autoComplete="off" style={{ ...inputStyle, marginTop: 10 }} />
            {err && <div style={{ color: C.red, fontSize: 13, marginTop: 12, fontWeight: 700 }}>{err}</div>}
            <button type="submit" disabled={loading} style={{ marginTop: 18, width: '100%', background: C.magenta, color: '#fff', border: 'none', borderRadius: 999, padding: '12px', fontSize: 15, fontWeight: 800, fontFamily: "'Nunito',sans-serif", cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Sprawdzam…' : 'Wejdź'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const s = data.summary;
  const active = data.teachers.filter((t) => t.activeThisWeek > 0);
  const sleeping = data.teachers.filter((t) => t.activeThisWeek === 0);
  const ranking = rankTab === 'access' ? data.rankingWithAccess : data.rankingOutside;

  const renderTeacher = (t, i, keyPrefix) => {
    const warm = t.activeThisWeek > 0;
    const key = keyPrefix + i;
    const open = openTeacher === key;
    return (
      <div key={key} style={{ background: C.card, border: '1.5px solid ' + C.line, borderLeft: '5px solid ' + (warm ? C.green : C.gold), borderRadius: 14, overflow: 'hidden' }}>
        <div onClick={() => setOpenTeacher(open ? null : key)} style={{ padding: '13px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 170px', minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "'Quicksand',sans-serif" }}>{t.name}</div>
            <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.email}</div>
          </div>
          <Mini label="uczniów" value={t.studentsCount} />
          <Mini label="aktywni 7dni" value={t.activeThisWeek} strong={warm} />
          <Mini label="ćwiczeń" value={t.exercisesTotal} />
          <Mini label="ostatnio" value={fmtDate(t.lastActive)} text />
          <SubBadge status={t.subscription} />
          <span style={{ color: C.muted, fontSize: 18, transform: open ? 'rotate(90deg)' : 'none', transition: '.15s' }}>›</span>
        </div>
        {open && (
          <div style={{ borderTop: '1px solid ' + C.line, background: C.lawSoft, padding: '12px 16px' }}>
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
              Zadane przez lektora: <b style={{ color: C.ink }}>{t.exercisesAssigned}</b> · samodzielnie: <b style={{ color: C.ink }}>{t.exercisesSelf}</b> · zadania domowe: <b style={{ color: C.ink }}>{t.homeworkDone}/{t.homeworkAssigned}</b> odrobione
            </div>
            {t.students.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>Ten lektor nie dodał jeszcze żadnego ucznia.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ textAlign: 'left', color: C.muted }}>
                    <th style={th}>Uczeń</th><th style={th}>Ćwiczeń</th><th style={th}>Samodz.</th><th style={th}>Zadane</th><th style={th}>Ostatnio</th>
                  </tr></thead>
                  <tbody>
                    {t.students.map((st, j) => (
                      <tr key={j} style={{ borderTop: '1px solid ' + C.line }}>
                        <td style={td}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: st.activeThisWeek ? C.green : '#d8d2e4', marginRight: 7 }} />{st.name}</td>
                        <td style={td}>{st.exercises}</td>
                        <td style={td}>{st.self}</td>
                        <td style={td}>{st.assigned}</td>
                        <td style={{ ...td, color: C.muted }}>{fmtDate(st.lastActive)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Nunito',sans-serif", color: C.ink, padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <h1 style={{ fontFamily: "'Quicksand',sans-serif", fontSize: 24, margin: 0 }}>Panel właścicielki 🤍</h1>
          <button onClick={() => setData(null)} style={{ background: 'transparent', border: '2px solid ' + C.magenta, color: C.magenta, borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Wyloguj</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 26 }}>
          <Stat label="Lektorzy" value={s.teachers} hint="konta nauczycieli" color={C.law} />
          <Stat label="Uczniowie" value={s.students} hint="wszyscy uczniowie" color={C.magenta} />
          <Stat label="Płacący lektorzy" value={s.paying} hint="aktywna subskrypcja" color={C.green} />
          <Stat label="Ćwiczenia (7 dni)" value={s.exercisesThisWeek} hint={'łącznie ' + s.exercisesTotal} color={C.gold} />
          <Stat label="Nowi dziś" value={s.newAccountsToday} hint="nowe konta" color={C.law} />
        </div>

        {/* Aktywni lektorzy */}
        <SectionTitle>Aktywni lektorzy ({active.length})</SectionTitle>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>Ktoś z ich uczniów ćwiczył w ostatnim tygodniu. Kliknij, aby zobaczyć uczniów.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {active.length === 0 ? <Empty>Nikt nie był aktywny w tym tygodniu.</Empty> : active.map((t, i) => renderTeacher(t, i, 'a'))}
        </div>

        {/* Uśpieni lektorzy — zwinięci */}
        <div style={{ marginTop: 24 }}>
          <div onClick={() => setShowSleeping(!showSleeping)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontWeight: 800, fontFamily: "'Quicksand',sans-serif", fontSize: 15 }}>
            <span style={{ transform: showSleeping ? 'rotate(90deg)' : 'none', transition: '.15s' }}>›</span>
            Uśpione konta ({sleeping.length}) — cisza od tygodnia
          </div>
          {showSleeping && (
            <>
              <p style={{ fontSize: 13, color: C.muted, margin: '8px 0 12px' }}>Konta bez aktywności w ostatnim tygodniu — kandydaci do „dogrzania", zanim odejdą.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sleeping.map((t, i) => renderTeacher(t, i, 's'))}
              </div>
            </>
          )}
        </div>

        {/* Świeże konta z zewnątrz */}
        <SectionTitle>Świeże konta z zewnątrz (14 dni)</SectionTitle>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>Konta bez lektora — lektorki z reklamy, które się rozglądają, albo samodzielni uczniowie.</p>
        <TableCard empty={data.outsiders.length === 0} emptyText="Brak nowych kont z zewnątrz.">
          <thead><tr style={{ textAlign: 'left', color: C.muted, background: C.lawSoft }}>
            <th style={th}>Mail</th><th style={th}>Rola</th><th style={th}>Dostęp</th><th style={th}>Ćwiczeń</th><th style={th}>Kiedy</th>
          </tr></thead>
          <tbody>
            {data.outsiders.map((o, i) => (
              <tr key={i} style={{ borderTop: '1px solid ' + C.line }}>
                <td style={td}>{o.email}</td>
                <td style={td}>{o.role === 'teacher' ? 'lektor' : o.role === 'student' ? 'uczeń' : o.role}</td>
                <td style={td}>{o.access === 'full' ? 'pełny' : o.access === 'free' ? 'free' : o.access}</td>
                <td style={td}>{o.exercises}</td>
                <td style={{ ...td, color: C.muted }}>{fmtDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>

        {/* Ranking ćwiczeń — dwie zakładki */}
        <SectionTitle>Najczęściej robione ćwiczenia</SectionTitle>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>Rozdzielone wg tego, KTO ćwiczy — żeby darmowy ruch z zewnątrz nie zagłuszał tego, co robią realni uczniowie.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Tab active={rankTab === 'access'} onClick={() => setRankTab('access')}>Uczniowie z dostępem</Tab>
          <Tab active={rankTab === 'outside'} onClick={() => setRankTab('outside')}>Ruch z zewnątrz (free)</Tab>
        </div>
        <TableCard empty={ranking.length === 0} emptyText="Brak danych w tej grupie.">
          <thead><tr style={{ textAlign: 'left', color: C.muted, background: C.lawSoft }}>
            <th style={th}>Ćwiczenie</th><th style={th}>Poz.</th><th style={th}>Typ</th><th style={th}>Zrobień</th>
          </tr></thead>
          <tbody>
            {ranking.map((g, i) => (
              <tr key={i} style={{ borderTop: '1px solid ' + C.line }}>
                <td style={td}>{g.title}</td>
                <td style={td}>{g.level}</td>
                <td style={td}>{g.premium ? <span style={{ color: C.magenta, fontWeight: 700 }}>premium</span> : <span style={{ color: C.muted }}>darmowe</span>}</td>
                <td style={{ ...td, fontWeight: 800 }}>{g.n}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>

        <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 24 }}>
          Dane pobrane {new Date(s.generatedAt).toLocaleString('pl-PL')} · odśwież stronę, aby zaktualizować
        </p>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1.5px solid ' + C.line, borderRadius: 12, padding: '11px 14px', fontSize: 15, fontFamily: "'Nunito',sans-serif", outline: 'none', background: '#fff', color: C.ink };
const th = { padding: '9px 12px', fontWeight: 700, whiteSpace: 'nowrap' };
const td = { padding: '9px 12px', whiteSpace: 'nowrap' };

function Stat({ label, value, hint, color }) {
  return (
    <div style={{ background: C.card, border: '1.5px solid ' + C.line, borderTop: '4px solid ' + color, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontFamily: "'Quicksand',sans-serif", fontSize: 26, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: C.muted }}>{hint}</div>
    </div>
  );
}
function Mini({ label, value, strong, text }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 66 }}>
      <div style={{ fontFamily: "'Quicksand',sans-serif", fontSize: text ? 13 : 17, fontWeight: 700, color: strong ? C.green : C.ink }}>{value}</div>
      <div style={{ fontSize: 10.5, color: C.muted }}>{label}</div>
    </div>
  );
}
function SectionTitle({ children }) {
  return <h2 style={{ fontFamily: "'Quicksand',sans-serif", fontSize: 18, color: C.ink, margin: '30px 0 4px' }}>{children}</h2>;
}
function Empty({ children }) {
  return <div style={{ background: C.card, border: '1.5px solid ' + C.line, borderRadius: 14, padding: 16, fontSize: 13, color: C.muted }}>{children}</div>;
}
function TableCard({ children, empty, emptyText }) {
  if (empty) return <Empty>{emptyText}</Empty>;
  return (
    <div style={{ background: C.card, border: '1.5px solid ' + C.line, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>{children}</table>
      </div>
    </div>
  );
}
function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      border: '1.5px solid ' + (active ? C.magenta : C.line), background: active ? C.magenta : '#fff',
      color: active ? '#fff' : C.muted, borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 800,
      fontFamily: "'Nunito',sans-serif", cursor: 'pointer',
    }}>{children}</button>
  );
}
function SubBadge({ status }) {
  const map = { active: { t: 'aktywna', c: C.green }, trialing: { t: 'trial', c: C.law }, past_due: { t: 'zaległość', c: C.gold }, canceled: { t: 'anulowana', c: C.red } };
  const m = map[status] || { t: 'brak', c: '#c9c3d6' };
  return <span style={{ background: m.c, color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>{m.t}</span>;
}
