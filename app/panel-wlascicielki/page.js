'use client';
import { useState, useMemo } from 'react';

// ───────────────────────────────────────────────────────────────────────────
// Panel właścicielki EasyWonders (jeden plik, klient)
// Łączy się WYŁĄCZNIE z bezpieczną funkcją owner-dashboard (mail+hasło = sekret
// serwera). Żadne dane nie idą przez publiczny klucz strony. Hasło nie jest
// zapisywane — znika po zalogowaniu / zamknięciu karty.
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
  const [rankTab, setRankTab] = useState('access');
  const [query, setQuery] = useState('');

  async function login(e) {
    if (e) e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const res = await fetch(FN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 401) { setErr('Błędny mail lub hasło.'); setLoading(false); return; }
      if (!res.ok) { setErr('Coś poszło nie tak (' + res.status + '). Spróbuj ponownie.'); setLoading(false); return; }
      setData(await res.json());
      setPassword('');
    } catch (e2) { setErr('Brak połączenia z serwerem.'); }
    setLoading(false);
  }

  const found = useMemo(() => {
    if (!data || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return data.directory
      .filter((d) => (d.email || '').toLowerCase().includes(q) || (d.name || '').toLowerCase().includes(q))
      .slice(0, 12);
  }, [data, query]);

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
  const st = data.stats || {};
  const hl = data.health || {};
  const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '—');
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
                        <td style={td}>{st.exercises}</td><td style={td}>{st.self}</td><td style={td}>{st.assigned}</td>
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

        {/* WYSZUKIWARKA */}
        <div style={{ background: C.card, border: '1.5px solid ' + C.line, borderRadius: 14, padding: '14px 16px', marginBottom: 26 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 wpisz mail lub imię, aby sprawdzić konto…" autoComplete="off"
            style={{ ...inputStyle, marginBottom: found.length || query ? 12 : 0 }} />
          {query && found.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Nie znaleziono takiego konta.</div>}
          {found.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ textAlign: 'left', color: C.muted }}>
                  <th style={th}>Mail</th><th style={th}>Rola</th><th style={th}>Dostęp</th><th style={th}>Lektor</th><th style={th}>Ćwiczeń</th><th style={th}>Dołączył</th><th style={th}>Ostatnio</th>
                </tr></thead>
                <tbody>
                  {found.map((d, i) => (
                    <tr key={i} style={{ borderTop: '1px solid ' + C.line }}>
                      <td style={td}>{d.email}</td>
                      <td style={td}>{d.role === 'teacher' ? 'lektor' : d.role === 'student' ? 'uczeń' : d.role}</td>
                      <td style={td}>{d.accessSource === 'teacher' ? 'przez lektora' : d.access === 'full' ? 'pełny' : 'free'}</td>
                      <td style={{ ...td, color: C.muted }}>{d.teacherEmail || '—'}</td>
                      <td style={td}>{d.exercises}</td>
                      <td style={{ ...td, color: C.muted }}>{fmtDate(d.createdAt)}</td>
                      <td style={{ ...td, color: C.muted }}>{fmtDate(d.lastActive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PODSUMOWANIE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 26 }}>
          <Stat label="Lektorzy" value={s.teachers} hint="konta nauczycieli" color={C.law} />
          <Stat label="Uczniowie" value={s.students} hint="wszyscy uczniowie" color={C.magenta} />
          <Stat label="Płacący lektorzy" value={s.paying} hint="aktywna subskrypcja" color={C.green} />
          <Stat label="Ćwiczenia (7 dni)" value={s.exercisesThisWeek} hint={'łącznie ' + s.exercisesTotal} color={C.gold} />
          <Stat label="Nowi dziś" value={s.newAccountsToday} hint="nowe konta" color={C.law} />
        </div>

        {/* WYKRESY */}
        <SectionTitle>Nowe konta (30 dni)</SectionTitle>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>Ile kont dziennie. <b style={{ color: C.law }}>Lawendowy</b> = lektorzy, <b style={{ color: C.magenta }}>różowy</b> = uczniowie. Widać, jak dowozi reklama.</p>
        <BarChart data={data.signupsByDay} stacked />
        <Trend avg={st.avgAcctPerDay30} unit="kont/dzień" last={st.acctLast7} prev={st.acctPrev7} what="nowych kont" />

        <SectionTitle>Aktywność (30 dni)</SectionTitle>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>Ile ćwiczeń dziennie ukończono na całej platformie.</p>
        <BarChart data={data.activityByDay.map((d) => ({ date: d.date, teachers: d.n, students: 0 }))} color={C.gold} />
        <Trend avg={st.avgExPerDay30} unit="ćwiczeń/dzień" last={st.exLast7} prev={st.exPrev7} what="ćwiczeń" />

        {/* ZDROWIE PLATFORMY */}
        <SectionTitle>Zdrowie platformy</SectionTitle>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>Nie „ilu jest", tylko „ilu naprawdę korzysta" — to mówi, czy platforma żyje, czy tylko ma konta.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 14 }}>
          <Health big={hl.studentsWhoPractice + ' z ' + hl.studentsTotal} label="uczniów w ogóle ćwiczy" hint={pct(hl.studentsWhoPractice, hl.studentsTotal) + ' zrobiło choć jedno ćwiczenie'} color={C.magenta} />
          <Health big={hl.activeStudents7} label="uczniów aktywnych w 7 dni" hint={pct(hl.activeStudents7, hl.studentsTotal) + ' wszystkich uczniów'} color={C.green} />
          <Health big={hl.avgExPerActiveStudent} label="ćwiczeń na aktywnego ucznia" hint={'czy wciąga, czy tylko zajrzeli'} color={C.gold} />
          <Health big={hl.teachersWithStudents + ' z ' + hl.teachersTotal} label="lektorów ma uczniów" hint={hl.teachersWhoAssign + ' zadaje prace domowe'} color={C.law} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
          <TopList title="Najczęstsze poziomy (płacący)" items={hl.topLevels} />
          <TopList title="Najczęstsze kategorie (płacący)" items={hl.topCategories} label={(k) => ({ gramatyka: 'Gramatyka', slownictwo: 'Słownictwo', reading: 'Reading', listening: 'Listening', speaking: 'Speaking' }[k] || k)} />
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 6px' }}>Liczone tylko dla osób z dostępem (płacący i uczniowie lektorów) — w to warto inwestować przy tworzeniu nowych ćwiczeń.</p>

        {/* AKTYWNI LEKTORZY */}
        <SectionTitle>Aktywni lektorzy ({active.length})</SectionTitle>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>Ktoś z ich uczniów ćwiczył w ostatnim tygodniu. Kliknij, aby zobaczyć uczniów.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {active.length === 0 ? <Empty>Nikt nie był aktywny w tym tygodniu.</Empty> : active.map((t, i) => renderTeacher(t, i, 'a'))}
        </div>

        {/* UŚPIENI */}
        <div style={{ marginTop: 24 }}>
          <div onClick={() => setShowSleeping(!showSleeping)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontWeight: 800, fontFamily: "'Quicksand',sans-serif", fontSize: 15 }}>
            <span style={{ transform: showSleeping ? 'rotate(90deg)' : 'none', transition: '.15s' }}>›</span>
            Uśpione konta ({sleeping.length}) — cisza od tygodnia
          </div>
          {showSleeping && (
            <>
              <p style={{ fontSize: 13, color: C.muted, margin: '8px 0 12px' }}>Konta bez aktywności w ostatnim tygodniu — kandydaci do „dogrzania".</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{sleeping.map((t, i) => renderTeacher(t, i, 's'))}</div>
            </>
          )}
        </div>

        {/* ŚWIEŻE KONTA */}
        <SectionTitle>Świeże konta z zewnątrz (14 dni)</SectionTitle>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>Konta bez lektora — lektorki z reklamy albo samodzielni uczniowie.</p>
        <TableCard empty={data.outsiders.length === 0} emptyText="Brak nowych kont z zewnątrz.">
          <thead><tr style={{ textAlign: 'left', color: C.muted, background: C.lawSoft }}>
            <th style={th}>Mail</th><th style={th}>Rola</th><th style={th}>Dostęp</th><th style={th}>Ćwiczeń</th><th style={th}>Kiedy</th>
          </tr></thead>
          <tbody>
            {data.outsiders.map((o, i) => (
              <tr key={i} style={{ borderTop: '1px solid ' + C.line }}>
                <td style={td}>{o.email}</td>
                <td style={td}>{o.role === 'teacher' ? 'lektor' : o.role === 'student' ? 'uczeń' : o.role}</td>
                <td style={td}>{o.access === 'full' ? 'pełny' : 'free'}</td>
                <td style={td}>{o.exercises}</td>
                <td style={{ ...td, color: C.muted }}>{fmtDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>

        {/* RANKING */}
        <SectionTitle>Najczęściej robione ćwiczenia</SectionTitle>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>Rozdzielone wg tego, KTO ćwiczy — żeby darmowy ruch nie zagłuszał realnych uczniów.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Tab active={rankTab === 'access'} onClick={() => setRankTab('access')}>Uczniowie z dostępem</Tab>
          <Tab active={rankTab === 'outside'} onClick={() => setRankTab('outside')}>Konta free (bez dostępu)</Tab>
        </div>
        <TableCard empty={ranking.length === 0} emptyText="Brak danych w tej grupie.">
          <thead><tr style={{ textAlign: 'left', color: C.muted, background: C.lawSoft }}>
            <th style={th}>Ćwiczenie</th><th style={th}>Poz.</th><th style={th}>Typ</th><th style={th}>Zrobień</th>
          </tr></thead>
          <tbody>
            {ranking.map((g, i) => (
              <tr key={i} style={{ borderTop: '1px solid ' + C.line }}>
                <td style={td}>{g.title}</td><td style={td}>{g.level}</td>
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

// Wykres słupkowy bez bibliotek. Liczba nad słupkiem + oś z wartościami po lewej.
function BarChart({ data, stacked, color }) {
  const max = Math.max(1, ...data.map((d) => (d.teachers || 0) + (d.students || 0)));
  const total = data.reduce((acc, d) => acc + (d.teachers || 0) + (d.students || 0), 0);
  const H = 150;
  // Wartości na osi pionowej (0, połowa, maks)
  const axis = max <= 2 ? [max, 0] : [max, Math.round(max / 2), 0];
  return (
    <div style={{ background: C.card, border: '1.5px solid ' + C.line, borderRadius: 14, padding: '16px 14px 10px' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {/* oś pionowa z liczbami */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: H + 18, fontSize: 10.5, color: C.muted, textAlign: 'right', minWidth: 16, paddingBottom: 18 }}>
          {axis.map((v, i) => <span key={i}>{v}</span>)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H, borderBottom: '1px solid ' + C.line, borderLeft: '1px solid ' + C.line, paddingLeft: 2 }}>
            {data.map((d, i) => {
              const t = d.teachers || 0, st = d.students || 0, sum = t + st;
              const title = new Date(d.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) + ': ' + sum;
              return (
                <div key={i} title={title} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%', cursor: 'default', position: 'relative' }}>
                  {sum > 0 && (
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: C.ink, marginBottom: 1, lineHeight: 1 }}>{sum}</span>
                  )}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 'calc(100% - 12px)' }}>
                    {stacked ? (
                      <>
                        <div style={{ height: (st / max * 100) + '%', background: C.magenta, borderRadius: '3px 3px 0 0' }} />
                        <div style={{ height: (t / max * 100) + '%', background: C.law, borderRadius: st ? 0 : '3px 3px 0 0' }} />
                      </>
                    ) : (
                      <div style={{ height: (sum / max * 100) + '%', background: color || C.law, borderRadius: '3px 3px 0 0' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: C.muted }}>
            <span>{new Date(data[0].date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}</span>
            <span style={{ fontWeight: 700, color: C.ink }}>razem w 30 dni: {total}</span>
            <span>{new Date(data[data.length - 1].date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pasek pod wykresem: średnia dzienna + trend 7 vs poprzednie 7 dni
function Trend({ avg, unit, last, prev, what }) {
  let arrow = '→', color = C.muted, txt = 'bez zmian';
  if (prev === 0 && last > 0) { arrow = '↑'; color = C.green; txt = 'start od zera'; }
  else if (prev > 0) {
    const ch = Math.round((last - prev) / prev * 100);
    if (ch > 5) { arrow = '↑'; color = C.green; txt = '+' + ch + '%'; }
    else if (ch < -5) { arrow = '↓'; color = C.red; txt = ch + '%'; }
  }
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '8px 0 4px' }}>
      <span style={{ background: C.card, border: '1.5px solid ' + C.line, borderRadius: 999, padding: '6px 14px', fontSize: 12.5, fontWeight: 800 }}>
        średnio <b style={{ color: C.ink }}>{avg}</b> {unit}
      </span>
      <span style={{ background: C.card, border: '1.5px solid ' + C.line, borderRadius: 999, padding: '6px 14px', fontSize: 12.5, fontWeight: 800, color }}>
        {arrow} {txt} <span style={{ color: C.muted, fontWeight: 700 }}>· ostatnie 7 dni: {last} {what} vs {prev} wcześniej</span>
      </span>
    </div>
  );
}
function Health({ big, label, hint, color }) {
  return (
    <div style={{ background: C.card, border: '1.5px solid ' + C.line, borderLeft: '5px solid ' + color, borderRadius: 14, padding: '13px 15px' }}>
      <div style={{ fontFamily: "'Quicksand',sans-serif", fontSize: 22, fontWeight: 700 }}>{big}</div>
      <div style={{ fontSize: 13, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: C.muted }}>{hint}</div>
    </div>
  );
}
function TopList({ title, items, label }) {
  const max = Math.max(1, ...(items || []).map((i) => i.n));
  return (
    <div style={{ background: C.card, border: '1.5px solid ' + C.line, borderRadius: 14, padding: '13px 15px' }}>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {(items || []).length === 0 ? <div style={{ fontSize: 12.5, color: C.muted }}>brak danych</div> : (items || []).map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12.5 }}>
          <span style={{ minWidth: 78, fontWeight: 700 }}>{label ? label(it.k) : it.k}</span>
          <div style={{ flex: 1, height: 7, background: C.line, borderRadius: 999, overflow: 'hidden' }}><div style={{ width: (it.n / max * 100) + '%', height: '100%', background: C.law }} /></div>
          <span style={{ color: C.muted, minWidth: 28, textAlign: 'right' }}>{it.n}</span>
        </div>
      ))}
    </div>
  );
}

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
function SectionTitle({ children }) { return <h2 style={{ fontFamily: "'Quicksand',sans-serif", fontSize: 18, color: C.ink, margin: '30px 0 4px' }}>{children}</h2>; }
function Empty({ children }) { return <div style={{ background: C.card, border: '1.5px solid ' + C.line, borderRadius: 14, padding: 16, fontSize: 13, color: C.muted }}>{children}</div>; }
function TableCard({ children, empty, emptyText }) {
  if (empty) return <Empty>{emptyText}</Empty>;
  return <div style={{ background: C.card, border: '1.5px solid ' + C.line, borderRadius: 14, overflow: 'hidden' }}><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>{children}</table></div></div>;
}
function Tab({ active, onClick, children }) {
  return <button onClick={onClick} style={{ border: '1.5px solid ' + (active ? C.magenta : C.line), background: active ? C.magenta : '#fff', color: active ? '#fff' : C.muted, borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 800, fontFamily: "'Nunito',sans-serif", cursor: 'pointer' }}>{children}</button>;
}
function SubBadge({ status }) {
  const map = { active: { t: 'aktywna', c: C.green }, trialing: { t: 'trial', c: C.law }, past_due: { t: 'zaległość', c: C.gold }, canceled: { t: 'anulowana', c: C.red } };
  const m = map[status] || { t: 'brak', c: '#c9c3d6' };
  return <span style={{ background: m.c, color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>{m.t}</span>;
}
