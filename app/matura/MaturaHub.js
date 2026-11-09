'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SECTIONS, TASKS, BOTH_LEVELS, daysToExam, MT_FONTS, taskName } from './maturaData';
import ThemeToggle, { THEME_CSS, MaturaFooter, FOOTER_CSS } from './ThemeToggle';

// Strona /matura — gazetowy „spis treści” ćwiczeń maturalnych.
// Ćwiczenia, postępy i dostęp są czytane z tej samej bazy co reszta EasyWonders,
// więc wyniki zapisują się razem z innymi ćwiczeniami ucznia.
export default function MaturaHub() {
  const [ready, setReady] = useState(false);
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState('guest'); // guest | free | full
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [myDone, setDone] = useState({}); // slug -> {score, max, at} — wyniki zalogowanej osoby
  const [myHw, setMyHw] = useState({}); // slug -> data ukończenia albo true — praca domowa zalogowanego ucznia
  // TECZKA LEKTORA — podgląd strony oczami ucznia (jak w katalogu na stronie głównej)
  const [teacherId, setTeacherId] = useState(null);
  const [students, setStudents] = useState([]); // [{id, name, groupId}]
  const [groups, setGroups] = useState([]); // [{id, name}]
  const [viewing, setViewing] = useState(null); // {id, name} albo null
  const [vDone, setVDone] = useState({});
  const [vHw, setVHw] = useState({});
  const [vWr, setVWr] = useState({}); // slug -> {status, score, max} — wypracowania oglądanego ucznia
  const [pending, setPending] = useState({}); // studentId -> liczba wypracowań do sprawdzenia
  const [tkOpen, setTkOpen] = useState(false);
  const [hwOpen, setHwOpen] = useState(false); // teczka „Praca domowa” ucznia lektora
  const [hwAt, setHwAt] = useState({}); // slug -> kiedy lektor zadał
  const [hwPage, setHwPage] = useState({ todo: 0 }); // strona listy w teczce (po 5 zadań)
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [level, setLevel] = useState('basic');
  const [drawer, setDrawer] = useState(null); // {section, task}
  const [filter, setFilter] = useState('all');
  const [paywall, setPaywall] = useState(false);
  const [now, setNow] = useState(null);

  // Teczki (lektora i „Praca domowa” ucznia) zamykają się po kliknięciu gdziekolwiek poza nimi i klawiszem Esc.
  useEffect(() => {
    if (!tkOpen && !hwOpen) return undefined;
    const poza = (e) => {
      if (e.target && e.target.closest && e.target.closest('.mt-tk')) return;
      setTkOpen(false); setHwOpen(false);
    };
    const esc = (e) => { if (e.key === 'Escape') { setTkOpen(false); setHwOpen(false); } };
    document.addEventListener('mousedown', poza);
    document.addEventListener('touchstart', poza, { passive: true });
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', poza);
      document.removeEventListener('touchstart', poza);
      document.removeEventListener('keydown', esc);
    };
  }, [tkOpen, hwOpen]);

  useEffect(() => {
    try { const l = localStorage.getItem('eg_matura_level'); if (l === 'basic' || l === 'ext') setLevel(l); } catch (e) {}
    setNow(Date.now());
    (async () => {
      let session = null;
      try { const r = await supabase.auth.getSession(); session = r.data.session; } catch (e) {}
      const g = await supabase.from('games')
        .select('slug,title,matura_level,matura_section,matura_task,exercise_no,is_premium,published,slide_count_label')
        .eq('matura', true).order('exercise_no', { ascending: true });
      setGames(g.data || []);
      if (session) {
        setUser(session.user);
        const [fa, ad, gc, pr, hw] = await Promise.all([
          supabase.rpc('has_full_access'),
          supabase.rpc('is_admin'),
          supabase.from('game_completions').select('game_slug,score,score_max,completed_at').eq('user_id', session.user.id),
          supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle(),
          supabase.from('homework').select('game_slug,completed_at,created_at').eq('student_id', session.user.id),
        ]);
        const h = {};
        const ha = {};
        (hw.data || []).forEach((r) => { h[r.game_slug] = r.completed_at || true; ha[r.game_slug] = r.created_at || ''; });
        setMyHw(h);
        setHwAt(ha);
        if (pr.data && pr.data.role === 'teacher') { setIsTeacher(true); loadTeczka(session.user.id); }
        const admin = !!ad.data;
        setIsAdmin(admin);
        setAccess(fa.data || admin ? 'full' : 'free');
        const m = {};
        (gc.data || []).forEach((c) => { m[c.game_slug] = { score: c.score, max: c.score_max, at: c.completed_at }; });
        setDone(m);
      }
      setReady(true);
    })();
  }, []);

  // Teczka: uczniowie i grupy lektora; podgląd przywracamy z sesji (ten sam klucz co w katalogu,
  // więc lektor, który oglądał ucznia na stronie głównej, ogląda go dalej tutaj).
  async function loadTeczka(tid) {
    setTeacherId(tid);
    const [pr, gr] = await Promise.all([
      supabase.from('profiles').select('id,student_name,email,group_id').eq('teacher_id', tid),
      supabase.from('student_groups').select('id,name').eq('teacher_id', tid),
    ]);
    const st = (pr.data || []).map((x) => ({ id: x.id, name: x.student_name || x.email || 'Uczeń', groupId: x.group_id || null }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const gs = (gr.data || []).map((x) => ({ id: x.id, name: x.name })).sort((a, b) => a.name.localeCompare(b.name));
    setStudents(st); setGroups(gs);
    // wypracowania oddane do sprawdzenia — liczymy TYLKO uczniów tego lektora
    // (bez własnych wypracowań lektora i bez cudzych uczniów, które widzi administrator)
    try {
      const ids = st.map((x) => x.id);
      const ws = ids.length
        ? await supabase.from('writing_submissions').select('user_id').eq('status', 'submitted').in('user_id', ids)
        : { data: [] };
      const pc = {};
      (ws.data || []).forEach((w) => { pc[w.user_id] = (pc[w.user_id] || 0) + 1; });
      setPending(pc);
    } catch (e) {}
    try {
      const sv = JSON.parse(sessionStorage.getItem('egSvViewing') || 'null');
      const s = sv && st.find((x) => x.id === sv.id);
      if (s) enterView(s);
    } catch (e) {}
  }

  async function enterView(s) {
    setTkOpen(false);
    const [gc, hw, wr] = await Promise.all([
      supabase.from('game_completions').select('game_slug,source,score,score_max,completed_at').eq('user_id', s.id),
      supabase.from('homework').select('game_slug,completed_at').eq('student_id', s.id),
      supabase.from('writing_submissions').select('game_slug,status,score,score_max').eq('user_id', s.id),
    ]);
    if (gc.error || hw.error) { showToast('Nie udało się wczytać postępów ucznia. Spróbuj ponownie.'); return; }
    const d = {};
    (gc.data || []).forEach((c) => { d[c.game_slug] = { score: c.score, max: c.score_max, at: c.completed_at, src: c.source || 'self' }; });
    const h = {};
    (hw.data || []).forEach((r) => { h[r.game_slug] = r.completed_at || true; });
    const w = {};
    (wr.data || []).forEach((r) => { w[r.game_slug] = { status: r.status, score: r.score, max: r.score_max }; });
    setVDone(d); setVHw(h); setVWr(w); setViewing({ id: s.id, name: s.name });
    try { sessionStorage.setItem('egSvViewing', JSON.stringify({ id: s.id, name: s.name })); } catch (e) {}
  }

  function exitView() {
    setViewing(null); setVDone({}); setVHw({}); setVWr({}); setTkOpen(false);
    try { sessionStorage.removeItem('egSvViewing'); } catch (e) {}
  }

  function showToast(m) {
    setToast(m);
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => setToast(''), 2600);
  }

  // Zadaj / usuń pracę domową oglądanemu uczniowi (ta sama tabela co panel lektora i katalog)
  async function toggleHw(g) {
    if (!viewing || !teacherId) return;
    const on = !!vHw[g.slug];
    if (on && vHw[g.slug] !== true && !window.confirm('Uczeń oznaczył już tę pracę domową jako zrobioną. Usunąć ją z jego pracy domowej?')) return;
    setBusy(g.slug);
    const r = on
      ? await supabase.from('homework').delete().eq('teacher_id', teacherId).eq('student_id', viewing.id).eq('game_slug', g.slug)
      : await supabase.from('homework').insert({ teacher_id: teacherId, student_id: viewing.id, game_slug: g.slug });
    setBusy('');
    if (r.error && !(!on && String(r.error.message || '').indexOf('duplicate') !== -1)) { showToast('Nie udało się zapisać. Spróbuj ponownie.'); return; }
    setVHw((prev) => { const n = { ...prev }; if (on) delete n[g.slug]; else n[g.slug] = true; return n; });
    showToast((on ? 'Usunięto z pracy domowej: ' : 'Zadano jako pracę domową: ') + g.title);
  }

  // Zalicz / cofnij zaliczenie oglądanemu uczniowi (np. zadanie zrobione razem na lekcji).
  // Ta sama funkcja co „zrobione” na kafelku na stronie głównej i w panelu lektora.
  // Cofnąć można tylko zaliczenie lektora — wyniku, który uczeń zdobył sam, nie usuwamy.
  async function toggleDone(g) {
    if (!viewing || !teacherId) return;
    const r = vDone[g.slug];
    if (r && r.src !== 'teacher') { showToast('Uczeń zrobił to ćwiczenie sam – jego wyniku nie cofamy.'); return; }
    const on = !!r;
    const studentId = viewing.id;
    setBusy(g.slug);
    try {
      const rr = await supabase.rpc('teacher_mark_completion', { p_student: studentId, p_slug: g.slug, p_done: !on });
      if (rr.error) throw rr.error;
      // postęp „na lekcji” w panelu lektora (student_progress) — tak samo jak na stronie głównej
      const up = await supabase.from('student_progress').update({ done: !on })
        .eq('teacher_id', teacherId).eq('student_id', studentId).eq('game_slug', g.slug).select('game_slug');
      if (!on && !up.error && !(up.data || []).length) {
        await supabase.from('student_progress').insert({ teacher_id: teacherId, student_id: studentId, game_slug: g.slug, done: true });
      }
    } catch (e) {
      setBusy('');
      showToast('Nie udało się zapisać. Spróbuj ponownie.');
      return;
    }
    setBusy('');
    if (!viewing || viewing.id !== studentId) return;
    setVDone((prev) => {
      const n = { ...prev };
      if (on) delete n[g.slug]; else n[g.slug] = { score: null, max: null, at: new Date().toISOString(), src: 'teacher' };
      return n;
    });
    showToast((on ? 'Cofnięto zaliczenie: ' : 'Zaliczono uczniowi: ') + g.title);
  }

  // W podglądzie cała strona liczy wyniki oglądanego ucznia
  const done = viewing ? vDone : myDone;
  const hwMap = viewing ? vHw : myHw;

  function chooseLevel(l) {
    setLevel(l); setDrawer(null);
    try { localStorage.setItem('eg_matura_level', l); } catch (e) {}
  }

  const locked = (g) => g.is_premium && access !== 'full';
  // Matura ustna nie ma poziomów — jej zadania widać przy podstawie i przy rozszerzeniu.
  const onLevel = (g) => g.matura_level === level || BOTH_LEVELS.includes(g.matura_section);

  // Ćwiczenia pogrupowane: dział -> typ zadania -> lista (wg numeru)
  const grouped = useMemo(() => {
    const out = {};
    games.filter(onLevel).forEach((g) => {
      out[g.matura_section] = out[g.matura_section] || {};
      (out[g.matura_section][g.matura_task] = out[g.matura_section][g.matura_task] || []).push(g);
    });
    Object.values(out).forEach((s) => Object.values(s).forEach((l) => l.sort((a, b) => (a.exercise_no || 0) - (b.exercise_no || 0))));
    return out;
  }, [games, level]);

  function nextOf(list) {
    return list.find((g) => !done[g.slug]) || list[0];
  }

  // „Twoje następne ćwiczenie”: kontynuacja typu, który uczeń robił ostatnio; inaczej pierwsze darmowe.
  const nextUp = useMemo(() => {
    const mine = games.filter((g) => onLevel(g) && done[g.slug])
      .sort((a, b) => String(done[b.slug].at).localeCompare(String(done[a.slug].at)));
    if (mine.length) {
      const last = mine[0];
      const list = ((grouped[last.matura_section] || {})[last.matura_task]) || [];
      const n = list.find((g) => !done[g.slug]);
      if (n) return { g: n, cont: true };
    }
    for (const s of SECTIONS) {
      for (const [task] of (TASKS[level][s.id] || [])) {
        const list = (grouped[s.id] || {})[task];
        if (list && list.length) {
          const n = list.find((g) => !done[g.slug] && !locked(g)) || list.find((g) => !done[g.slug]);
          if (n) return { g: n, cont: false };
        }
      }
    }
    return null;
  }, [games, grouped, done, level, access]);

  const mat = games.filter(onLevel);
  const doneCount = mat.filter((g) => done[g.slug]).length;
  const drafts = isAdmin ? games.filter((g) => !g.published).length : 0;

  function open(g) {
    if (locked(g)) { setPaywall(true); return; }
    window.location.href = '/matura/' + g.slug;
  }

  const sectionName = (id) => (SECTIONS.find((s) => s.id === id) || {}).en || '';
  const taskLabel = (sec, task) => ((TASKS[level][sec] || []).find((t) => t[0] === task) || [])[1] || '';

  const drawerList = drawer ? (((grouped[drawer.section] || {})[drawer.task]) || []) : [];
  const drawerShown = drawerList.filter((g) => filter === 'all' || (filter === 'new' ? !done[g.slug] : !!done[g.slug]));

  return (
    <div className="mt">
      <style dangerouslySetInnerHTML={{ __html: MT_FONTS + CSS + THEME_CSS + FOOTER_CSS }} />
      <div className="mt-wrap">
        <div className="mt-top">
          <a href="/" className="mt-logo"><span style={{ color: '#ca4490' }}>Easy</span><span style={{ color: '#c8930f' }}>Wonders</span></a>
          <nav className="mt-nav">
            <a href="/oferta?powrot=matura#jak-to-dziala-matura">Jak to działa</a>
            {ready && access !== 'full' && <a href="/oferta?powrot=matura">Oferta</a>}
            <a href="/nauka">Blog</a>
            {user && isTeacher && <a href="/panel-lektora">Panel lektora</a>}
            {user ? <a href="/konto?powrot=matura">Moje konto</a> : <a href="/logowanie?powrot=matura">Zaloguj się</a>}
            {!teacherId && (() => {
              // TECZKA UCZNIA: zadania maturalne, które lektor zadał jako pracę domową
              const list = games.filter((g) => myHw[g.slug]);
              if (!list.length) return null;
              const isDone = (g) => typeof myHw[g.slug] === 'string' || !!myDone[g.slug];
              // do zrobienia: najnowsze zadane na górze; zrobione: ostatnio zrobione na górze.
              // Pokazujemy kilka, resztę po kliknięciu — żeby długa lista nie rozciągała teczki.
              const todo = list.filter((g) => !isDone(g)).sort((a, b) => String(hwAt[b.slug] || '').localeCompare(String(hwAt[a.slug] || '')));
              // Zrobione zadania widać w Postępach na stronie głównej i jako oznaczone kwadraciki na liście zadań,
              // więc teczka pokazuje tylko to, co jest jeszcze do zrobienia.
              if (!todo.length) return null;
              // Listy dzielimy na strony: teczka zawsze ma podobną wysokość, nawet przy setkach zadań.
              const PER = { todo: 5 };
              const pageOf = (key, arr) => Math.min(hwPage[key] || 0, Math.max(0, Math.ceil(arr.length / PER[key]) - 1));
              const slice = (key, arr) => { const p0 = pageOf(key, arr); return arr.slice(p0 * PER[key], (p0 + 1) * PER[key]); };
              const pager = (key, arr) => {
                const pages = Math.ceil(arr.length / PER[key]);
                if (pages <= 1) return null;
                const p0 = pageOf(key, arr);
                const from = p0 * PER[key] + 1, to = Math.min(arr.length, (p0 + 1) * PER[key]);
                return (
                  <div className="mt-hw-pager">
                    <button type="button" disabled={p0 === 0} onClick={() => setHwPage({ ...hwPage, [key]: p0 - 1 })} aria-label="Nowsze">‹ Nowsze</button>
                    <span>{from}–{to} z {arr.length}</span>
                    <button type="button" disabled={p0 >= pages - 1} onClick={() => setHwPage({ ...hwPage, [key]: p0 + 1 })} aria-label="Starsze">Starsze ›</button>
                  </div>
                );
              };
              const item = (g) => {
                const sec = SECTIONS.find((x) => x.id === g.matura_section);
                const lvl = BOTH_LEVELS.includes(g.matura_section) ? 'matura ustna' : (g.matura_level === 'ext' ? 'rozszerzenie' : 'podstawa');
                return (
                  <a key={g.slug} className="mt-tk-item" href={'/matura/' + g.slug}>
                    <span className="mt-tk-av">{sec ? sec.roman : '•'}</span>
                    <span className="mt-hw-t">{g.title}<small>{(sec ? sec.en + ' · ' : '') + (taskName(g.matura_level, g.matura_section, g.matura_task) || '') + ' · ' + lvl}</small></span>
                  </a>
                );
              };
              return (
                <div className={'mt-tk' + (hwOpen ? ' open' : '')}>
                  <button type="button" className="mt-tk-btn" aria-expanded={hwOpen} onClick={() => setHwOpen(!hwOpen)}>
                    <TeczkaIcon />Praca domowa
                    {todo.length > 0 && <span className="mt-tk-dot" title="Do zrobienia">{todo.length}</span>}
                    <span className="mt-tk-caret" aria-hidden="true">▾</span>
                  </button>
                  {hwOpen && (
                    <div className="mt-tk-panel mt-hw-panel">
                      <div className="mt-tk-k">Praca domowa od lektora</div>
                      <div className="mt-tk-group">Do zrobienia · {todo.length}</div>
                      {slice('todo', todo).map(item)}
                      {pager('todo', todo)}
                    </div>
                  )}
                </div>
              );
            })()}
            {teacherId && (students.length > 0 || groups.length > 0) && (
              <div className={'mt-tk' + (tkOpen ? ' open' : '')}>
                <button type="button" className="mt-tk-btn" aria-expanded={tkOpen} onClick={() => setTkOpen(!tkOpen)}>
                  <TeczkaIcon />Teczka uczniów
                  {Object.values(pending).reduce((a, b) => a + b, 0) > 0 && <span className="mt-tk-dot" title="Wypracowania do sprawdzenia">{Object.values(pending).reduce((a, b) => a + b, 0)}</span>}
                  <span className="mt-tk-caret" aria-hidden="true">▾</span>
                </button>
                {tkOpen && (
                  <div className="mt-tk-panel">
                    <div className="mt-tk-k">Zobacz stronę oczami ucznia</div>
                    {viewing && <button type="button" className="mt-tk-item mt-tk-exit" onClick={exitView}><span className="mt-tk-av">×</span>Wróć do swojego widoku</button>}
                    {groups.map((gr) => {
                      const mem = students.filter((x) => x.groupId === gr.id);
                      return (
                        <div key={gr.id}>
                          <div className="mt-tk-group">{gr.name} · {mem.length} uczn.</div>
                          {mem.length === 0 && <div className="mt-tk-empty">Brak uczniów w grupie</div>}
                          {mem.map((x) => <StudentItem key={x.id} s={x} pending={pending[x.id]} active={viewing && viewing.id === x.id} onPick={enterView} />)}
                        </div>
                      );
                    })}
                    {(() => {
                      const rest = groups.length ? students.filter((x) => !x.groupId) : students;
                      if (!rest.length) return null;
                      return (
                        <div>
                          <div className="mt-tk-group">{groups.length ? 'Bez grupy' : 'Uczniowie'}</div>
                          {rest.map((x) => <StudentItem key={x.id} s={x} pending={pending[x.id]} active={viewing && viewing.id === x.id} onPick={enterView} />)}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            <ThemeToggle />
          </nav>
        </div>

        {viewing && (
          <div className="mt-view" role="status">
            <span className="mt-view-k">Podgląd ucznia</span>
            <span className="mt-view-t">Widzisz stronę oczami: <strong>{viewing.name}</strong></span>
            <span className="mt-view-legend"><i className="lg-done" />zrobione<i className="lg-hw" />praca domowa</span>
            <button type="button" className="mt-view-x" onClick={exitView}>Zamknij podgląd <span aria-hidden="true">×</span></button>
          </div>
        )}

        <header className="mt-mast">
          <h1>Matura<span className="mt-sr"> z angielskiego</span></h1>
          <div className="mt-mast-sub">z angielskiego · wydanie 2026/2027 · redakcja EasyWonders</div>
        </header>

        {isAdmin && (
          <div className="mt-admin">Podgląd właścicielki: widzisz też szkice ({drafts}). Uczniowie widzą tylko opublikowane ćwiczenia.</div>
        )}

        <section className="mt-lead">
          <div className="mt-lead-text">
            <div className="mt-kicker">Od redakcji</div>
            <h2>Najważniejszy egzamin roku?<br />Mamy na niego plan.</h2>
            <p>Przygotowaliśmy ćwiczenia wzorowane na arkuszach maturalnych. Wybierz dział i klikaj „Ćwicz”, a my za każdym razem podamy Ci kolejne zadanie. Trzymamy kciuki!</p>
            <div className="mt-sign">Redakcja EasyWonders</div>
          </div>
          <div className="mt-next">
            <div className="mt-next-k">{viewing ? 'Następne ćwiczenie ucznia' : nextUp && nextUp.cont ? 'Twoje następne ćwiczenie' : 'Zacznij tutaj'}</div>
            {nextUp ? (
              <>
                <div className="mt-next-t">{sectionName(nextUp.g.matura_section)}: {taskLabel(nextUp.g.matura_section, nextUp.g.matura_task).toLowerCase()}, nr {nextUp.g.exercise_no}</div>
                <button type="button" className="mt-btn mt-btn-big" onClick={() => open(nextUp.g)}>{nextUp.cont ? 'Kontynuuj' : 'Zacznij'}</button>
              </>
            ) : (
              <div className="mt-next-t">{ready ? 'Ćwiczenia na tym poziomie są w przygotowaniu.' : 'Wczytujemy ćwiczenia…'}</div>
            )}
            <div className="mt-next-stats">
              <div><strong>{now === null ? '…' : daysToExam(now, level)}</strong><span>dni do matury ({level === 'ext' ? 'rozszerzenie, 7 maja' : 'podstawa, 6 maja'})</span></div>
              <div><strong>{doneCount}<small>/{mat.length}</small></strong><span>zrobione ćwiczenia ({level === 'ext' ? 'rozszerzenie' : 'podstawa'})</span></div>
            </div>
          </div>
        </section>

        {ready && access !== 'full' && !viewing && (
          <section className="mt-access">
            <div className="mt-access-k">Od redakcji: o dostępie</div>
            <p>
              Pierwsze ćwiczenie w każdym typie zadania jest darmowe. Wszystkie zadania maturalne odblokujesz w pełnej wersji EasyWonders.
              {' '}<strong>{access === 'guest' ? 'Załóż konto, a przez 14 dni masz pełną wersję za darmo, bez podpinania karty.' : 'Wybierz plan, żeby mieć je wszystkie.'}</strong>
            </p>
            <div className="mt-access-btns">
              {access === 'guest' ? (
                <>
                  <a className="mt-btn" href="/logowanie?rejestracja&powrot=matura">Załóż konto za darmo</a>
                  <a className="mt-btn mt-btn-ghost" href="/logowanie?powrot=matura">Mam konto, zaloguj się</a>
                </>
              ) : (
                <a className="mt-btn" href="/oferta?powrot=matura">Zobacz ofertę</a>
              )}
            </div>
          </section>
        )}

        <div className="mt-sechead">
          <h2>Działy egzaminu</h2>
          <div className="mt-level">
            <span>Poziom:</span>
            <div role="group" aria-label="Poziom matury" className="mt-toggle">
              <button type="button" className={level === 'basic' ? 'on' : ''} onClick={() => chooseLevel('basic')}>Podstawa</button>
              <button type="button" className={level === 'ext' ? 'on' : ''} onClick={() => chooseLevel('ext')}>Rozszerzenie</button>
            </div>
          </div>
        </div>

        <div className="mt-grid">
          {[['listening', 'use'], ['reading', 'writing', 'speaking']].map((col, ci) => (
          <div className="mt-col" key={ci}>
          {SECTIONS.filter((s) => col.includes(s.id)).sort((a, b) => col.indexOf(a.id) - col.indexOf(b.id)).map((s) => {
            const si = SECTIONS.indexOf(s);
            const types = (TASKS[level][s.id] || []).filter(([t]) => ((grouped[s.id] || {})[t] || []).length);
            const all = types.flatMap(([t]) => grouped[s.id][t]);
            const d = all.filter((g) => done[g.slug]).length;
            return (
              <section className={'mt-box mt-box-' + s.id} key={s.id} style={{ order: si }}>
                <div className="mt-box-head">
                  <div>
                    <div className="mt-num">0{si + 1}</div>
                    <h3>{s.en}</h3>
                    <div className="mt-box-pl">{s.pl}</div>
                  </div>
                  {all.length > 0 && <div className="mt-box-count"><strong>{d}</strong> z {all.length}</div>}
                </div>
                {types.length === 0 && <p className="mt-soon">Ćwiczenia z tego działu są w przygotowaniu.</p>}
                {types.map(([task, label]) => {
                  const list = grouped[s.id][task];
                  const dd = list.filter((g) => done[g.slug]).length;
                  const nx = nextOf(list);
                  const started = dd > 0;
                  const lockedNext = locked(nx);
                  const allDone = dd >= list.length;
                  return (
                    <div className={'mt-row' + (allDone ? ' mt-row-done' : '')} key={task}>
                      <div className="mt-row-main">
                        <div className="mt-row-name">{label}</div>
                        <div className="mt-row-meta">
                          <span className="mt-bar"><span style={{ width: Math.round((100 * dd) / list.length) + '%' }} /></span>
                          <span>{dd} z {list.length}</span>
                          {list.some((g) => hwMap[g.slug]) && <span className="mt-hw-pill">praca domowa: {list.filter((g) => hwMap[g.slug]).length}</span>}
                          {viewing && list.some((g) => vWr[g.slug] && vWr[g.slug].status === 'submitted') && <span className="mt-due-pill">do sprawdzenia: {list.filter((g) => vWr[g.slug] && vWr[g.slug].status === 'submitted').length}</span>}
                          <button type="button" className="mt-link" onClick={() => { setDrawer({ section: s.id, task }); setFilter('all'); }}>lista</button>
                        </div>
                      </div>
                      <button type="button" className={'mt-btn ' + (allDone ? 'mt-btn-done' : started ? '' : 'mt-btn-ghost')} onClick={() => open(nx)}>
                        {lockedNext && <Lock />}{allDone ? 'Powtórz' : started ? 'Ćwicz' : 'Zacznij'}
                      </button>
                    </div>
                  );
                })}
              </section>
            );
          })}
          </div>
          ))}
        </div>

        <div className="mt-tip">
          <span className="mt-tip-k">Z naszej redakcji:</span>
          <span>w słuchaniu i czytaniu poprawna odpowiedź zwykle mówi to samo co tekst, ale innymi słowami.</span>
          <a href="/nauka">Więcej na blogu</a>
        </div>
      <MaturaFooter />
      </div>

      {drawer && (
        <div className="mt-overlay" onClick={() => setDrawer(null)}>
          <div className="mt-drawer" role="dialog" aria-label="Lista ćwiczeń" onClick={(e) => e.stopPropagation()}>
            <div className="mt-drawer-head">
              <div>
                <div className="mt-drawer-sec">{sectionName(drawer.section)}</div>
                <div className="mt-drawer-t">{taskLabel(drawer.section, drawer.task)}</div>
              </div>
              <button type="button" className="mt-x" aria-label="Zamknij" onClick={() => setDrawer(null)}>×</button>
            </div>
            <div className="mt-filters">
              {[['all', 'Wszystkie'], ['new', 'Nowe'], ['done', 'Zrobione']].map(([k, l]) => (
                <button key={k} type="button" className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
            {viewing ? (
              <div className="mt-vlist">
                {drawerShown.map((g) => {
                  const r = done[g.slug];
                  const pct = r && r.max ? Math.round((100 * r.score) / r.max) : null;
                  const hwv = vHw[g.slug];
                  return (
                    <div key={g.slug} className={'mt-vrow' + (r ? ' done' : '')}>
                      <button type="button" className="mt-vno" title="Otwórz ćwiczenie" onClick={() => open(g)}>{g.exercise_no}</button>
                      <div className="mt-vmain">
                        <div className="mt-vtitle">{g.title}</div>
                        <div className="mt-vmeta">
                          {vWr[g.slug] ? (
                            vWr[g.slug].status === 'graded' ? <span className="mt-vscore">oceniono: {vWr[g.slug].score}/{vWr[g.slug].max}</span>
                              : vWr[g.slug].status === 'submitted' ? <span className="mt-due-pill">do sprawdzenia</span>
                                : <span>uczeń jeszcze pisze (szkic)</span>
                          ) : r ? (r.max ? <span className="mt-vscore">{r.score}/{r.max} · {pct}%</span> : <span className="mt-vscore">{r.src === 'teacher' ? 'zaliczone przez lektora' : 'zrobione'}</span>) : <span>jeszcze nie zrobione</span>}
                          {hwv && hwv !== true && <span>· praca domowa zrobiona {new Date(hwv).toLocaleDateString('pl-PL')}</span>}
                          {!g.published && <span>· szkic</span>}
                        </div>
                      </div>
                      <div className="mt-vacts">
                        <button type="button" disabled={busy === g.slug} className={'mt-vhw' + (hwv ? ' on' : '')} title={hwv ? 'Kliknij, żeby usunąć z pracy domowej' : 'Zadaj jako pracę domową'} onClick={() => toggleHw(g)}>
                          {hwv ? 'Zadane' : '+ Zadaj'}
                        </button>
                        {(!r || r.src === 'teacher') && (
                          <button type="button" disabled={busy === g.slug} className={'mt-vok' + (r ? ' on' : '')} title={r ? 'Kliknij, żeby cofnąć zaliczenie' : 'Oznacz jako zrobione (np. na lekcji)'} onClick={() => toggleDone(g)}>
                            {r ? 'Zaliczone' : 'Zalicz'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {drawerShown.length === 0 && <p className="mt-soon">Brak ćwiczeń w tym widoku.</p>}
              </div>
            ) : (
            <>
            {teacherId && (students.length > 0 || groups.length > 0) && (
              <div className="mt-tk-hint">
                Chcesz zadać pracę domową albo zaliczyć zadanie uczniowi? Wybierz go w teczce, a przy każdym ćwiczeniu pojawią się przyciski „Zadaj” i „Zalicz”.
                <button type="button" className="mt-link" onClick={() => { setDrawer(null); window.scrollTo(0, 0); setTimeout(() => setTkOpen(true), 0); }}>Otwórz teczkę uczniów</button>
              </div>
            )}
            <div className="mt-list">
              {drawerShown.map((g) => {
                const r = done[g.slug];
                const hw = !!hwMap[g.slug];
                return (
                  <div key={g.slug} className={'mt-li' + (r ? ' done' : '') + (!g.published ? ' draft' : '') + (hw ? ' hw' : '')}>
                    <button type="button" className="mt-li-main" title={g.title} onClick={() => open(g)}>
                      <span className="mt-li-no">{g.exercise_no}</span>
                      <span className="mt-li-t">
                        {topicOf(g, drawerList)}
                        {(hw || !g.published) && <small>{[hw ? 'praca domowa' : '', !g.published ? 'szkic' : ''].filter(Boolean).join(' · ')}</small>}
                      </span>
                      {locked(g) && <span className="mt-li-lock" title="Dla subskrybentów"><Lock /></span>}
                    </button>
                    {/* wynik — kliknięcie otwiera ćwiczenie od razu ze szczegółami wyniku */}
                    {r && r.max ? (
                      <button type="button" className="mt-li-score" title="Zobacz szczegóły wyniku" onClick={() => { window.location.href = '/matura/' + g.slug + '?wynik=1'; }}>
                        {r.score}/{r.max}
                      </button>
                    ) : r ? <span className="mt-li-score mt-li-ok">zrobione</span> : null}
                  </div>
                );
              })}
              {drawerShown.length === 0 && <p className="mt-soon">Brak ćwiczeń w tym widoku.</p>}
            </div>
            </>
            )}
            <div className="mt-legend">
              <span><i className="lg-done" />zrobione</span>
              <span><i className="lg-new" />nowe</span>
              {Object.keys(hwMap).length > 0 && !viewing && <span><i className="lg-hw" />praca domowa</span>}
              {access !== 'full' && <span><Lock />dla subskrybentów</span>}
              {isAdmin && <span><i className="lg-draft" />szkic</span>}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="mt-toast" role="status">{toast}</div>}

      {paywall && (
        <div className="mt-overlay mt-center" onClick={() => setPaywall(false)}>
          <div className="mt-modal" role="dialog" aria-label="Dostęp do ćwiczenia" onClick={(e) => e.stopPropagation()}>
            <div className="mt-kicker">Od redakcji</div>
            <h3>To ćwiczenie jest w pełnej wersji</h3>
            <p>Pierwsze ćwiczenie w każdym typie zadania jest darmowe, a resztę odblokujesz w pełnej wersji EasyWonders. {access === 'guest' ? 'Załóż konto, a przez 14 dni masz pełną wersję za darmo, bez podpinania karty.' : 'Wybierz plan, żeby mieć dostęp do wszystkich zadań.'}</p>
            <div className="mt-access-btns">
              {access === 'guest' ? (
                <>
                  <a className="mt-btn" href="/logowanie?rejestracja&powrot=matura">Załóż konto za darmo</a>
                  <a className="mt-btn mt-btn-ghost" href="/logowanie?powrot=matura">Mam konto, zaloguj się</a>
                </>
              ) : (
                <a className="mt-btn" href="/oferta?powrot=matura">Zobacz ofertę</a>
              )}
            </div>
            <button type="button" className="mt-link mt-close" onClick={() => setPaywall(false)}>Wróć do listy</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Na liście pokazujemy sam temat ćwiczenia: „Finding Longitude – Missing Sentences (part 1)” → „Finding Longitude”,
// „Opinion Essay: Schools Without Homework” → „Schools Without Homework”. Typ zadania jest już w nagłówku listy.
// Gdy tytuły w danym typie nie mają tematu (np. „Minidialogi (part 2)”), pokazujemy „Zestaw 2”.
function bareTopic(title) {
  let t = String(title || '').replace(/\s*\(part\s*\d+\)\s*$/i, '').trim();
  if (t.indexOf(' – ') > -1) t = t.split(' – ')[0].trim();
  else if (t.indexOf(': ') > -1) t = t.slice(t.indexOf(': ') + 2).trim();
  return t;
}
function topicOf(g, list) {
  const t = bareTopic(g.title);
  const same = (list || []).filter((x) => x.slug !== g.slug && bareTopic(x.title) === t).length > 0;
  return !t || same ? 'Zestaw ' + g.exercise_no : t;
}

function StudentItem({ s, active, onPick, pending }) {
  const ini = (s.name || '?').trim().split(/\s+/).map((w) => w[0] || '').join('').slice(0, 2).toUpperCase();
  return (
    <button type="button" className={'mt-tk-item' + (active ? ' on' : '')} onClick={() => onPick(s)}>
      <span className="mt-tk-av">{ini}</span>{s.name}
      {pending > 0 && <span className="mt-tk-due" title="Wypracowania do sprawdzenia">{pending} do sprawdzenia</span>}
    </button>
  );
}

function TeczkaIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function Lock() {
  return (
    <svg className="mt-lock" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

const CSS = `
.mt-sr{ position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
body{ margin:0; background:#fbfaf6; }
.mt{ min-height:100vh; background:#fbfaf6; color:#1d1a22; font-family:'Outfit',system-ui,sans-serif; }
.mt *{ box-sizing:border-box; }
.mt a{ color:inherit; }
.mt-wrap{ max-width:1080px; margin:0 auto; padding:0 24px; }
.mt-top{ display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; padding:18px 0; font-size:15px; }
.mt-logo{ text-decoration:none; font-family:'Outfit',sans-serif; font-weight:700; font-size:21px; letter-spacing:-.5px; }
.mt-nav{ display:flex; flex-wrap:wrap; align-items:center; gap:22px; font-weight:500; }
.mt-nav a{ text-decoration:none; color:#5b5566; }
.mt-nav a:hover{ color:#ca4490; }
.mt-mast{ border-top:1px solid #1d1a22; padding:26px 0 6px; text-align:center; }
.mt-mast h1{ margin:0; font-family:'Playfair Display',Georgia,serif; font-weight:900; font-size:clamp(56px,10vw,96px); line-height:.95; letter-spacing:-2px; }
.mt-mast-sub{ margin-top:12px; font-size:12.5px; font-weight:600; text-transform:uppercase; letter-spacing:2.4px; color:#7a7385; }
.mt-admin{ margin-top:18px; padding:10px 16px; border-radius:12px; background:#fdf1f7; color:#8f2c66; font-size:14.5px; font-weight:500; }
.mt-lead{ display:flex; flex-wrap:wrap; gap:32px; align-items:stretch; padding:40px 0 36px; }
.mt-lead-text{ flex:999 1 440px; min-width:0; display:flex; flex-direction:column; justify-content:center; }
.mt-kicker{ display:inline-block; align-self:flex-start; font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.8px; color:#ca4490; background:#fdf1f7; padding:6px 12px; border-radius:999px; margin-bottom:16px; }
.mt-lead h2{ margin:0 0 16px; font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:clamp(34px,5.2vw,52px); line-height:1.05; letter-spacing:-1.2px; }
.mt-lead p{ margin:0; font-size:18px; line-height:1.65; color:#4f4959; max-width:540px; }
.mt-sign{ margin-top:16px; font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:17px; color:#4f4959; }
.mt-next{ flex:1 1 320px; background:#fff; border:1px solid #ebe6dc; border-radius:20px; padding:24px; display:flex; flex-direction:column; gap:12px; box-shadow:0 10px 30px rgba(29,26,34,.06); }
.mt-next-k{ font-size:12.5px; text-transform:uppercase; letter-spacing:1.8px; font-weight:700; color:#ca4490; }
.mt-next-t{ font-family:'Playfair Display',Georgia,serif; font-weight:700; font-size:25px; line-height:1.2; }
.mt-next-stats{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px; padding-top:16px; margin-top:auto; border-top:1px solid #efeae1; }
.mt-next-stats div{ display:flex; flex-direction:column; gap:2px; }
.mt-next-stats strong{ font-family:'Playfair Display',Georgia,serif; font-size:30px; font-weight:800; line-height:1; color:#1d1a22; }
.mt-next-stats small{ font-size:.6em; font-weight:700; color:#a49dad; }
.mt-next-stats span{ font-size:12.5px; color:#7a7385; line-height:1.3; }
.mt-btn{ display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:46px; padding:0 20px; font-family:'Outfit',sans-serif; font-size:15.5px; font-weight:600; text-decoration:none; cursor:pointer; background:#ca4490; color:#fff !important; border:1.5px solid #ca4490; border-radius:12px; transition:background .15s, transform .1s; }
.mt-btn:hover{ background:#b13a7e; border-color:#b13a7e; }
.mt-btn:active{ transform:translateY(1px); }
.mt-btn-ghost{ background:#fff; color:#1d1a22 !important; border-color:#ddd6ca; }
.mt-btn-ghost:hover{ background:#fbfaf6; border-color:#1d1a22; }
.mt-btn-big{ min-height:52px; font-size:17px; margin-top:4px; }
.mt-access{ margin-top:4px; background:#f6f1ae; border-radius:20px; padding:24px 26px; display:flex; flex-wrap:wrap; gap:16px 28px; align-items:center; }
.mt-access-k{ width:100%; font-size:12.5px; text-transform:uppercase; letter-spacing:1.8px; font-weight:700; color:#6b5a0b; }
.mt-access p{ flex:1 1 420px; margin:0; font-size:16.5px; line-height:1.6; color:#2e2a1c; }
.mt-access-btns{ display:flex; flex-wrap:wrap; gap:10px; }
.mt-sechead{ display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:14px; padding:44px 0 18px; }
.mt-sechead h2{ margin:0; font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:34px; letter-spacing:-.6px; }
.mt-level{ display:flex; align-items:center; gap:12px; font-size:15px; color:#5b5566; }
.mt-toggle{ display:flex; background:#f0ece4; border-radius:12px; padding:4px; gap:4px; }
.mt-toggle button{ border:none; cursor:pointer; padding:0 18px; min-height:40px; border-radius:9px; font-family:'Outfit',sans-serif; font-size:15px; font-weight:500; background:transparent; color:#5b5566; }
.mt-toggle button.on{ background:#fff; color:#1d1a22; font-weight:700; box-shadow:0 2px 8px rgba(29,26,34,.08); }
.mt-grid{ display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; }
.mt-col{ display:flex; flex-direction:column; gap:20px; min-width:0; }
@media (max-width:820px){ .mt-grid{ display:flex; flex-direction:column; } .mt-col{ display:contents; } }
.mt-due-pill{ font-size:12px; font-weight:700; color:#fff; background:#ca4490; padding:3px 9px; border-radius:999px; }
.mt-tk-due{ margin-left:auto; font-size:11.5px; font-weight:700; color:#fff; background:#ca4490; padding:2px 8px; border-radius:999px; white-space:nowrap; }
.mt-tk-dot{ display:inline-flex; align-items:center; justify-content:center; min-width:20px; height:20px; padding:0 6px; margin-left:4px; border-radius:999px; background:#ca4490; color:#fff; font-size:11.5px; font-weight:700; }
html.eg-dark .mt-box-speaking::before{ background:#e8e6ef; }
.mt-box{ position:relative; background:#fff; border:1px solid #ebe6dc; border-radius:20px; padding:24px 24px 10px; min-width:0; overflow:hidden; }
.mt-box::before{ content:''; position:absolute; left:0; right:0; top:0; height:5px; background:#ca4490; }
.mt-box-reading::before{ background:#a78dd9; }
.mt-box-use::before{ background:#e0a91c; }
.mt-box-writing::before{ background:#1e7e50; }
.mt-box-speaking::before{ background:#1d1a22; }
.mt-box-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; padding-bottom:14px; border-bottom:1px solid #efeae1; }
.mt-num{ font-size:13px; font-weight:700; letter-spacing:1.5px; color:#a49dad; margin-bottom:2px; }
.mt-box-head h3{ margin:0; font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:30px; line-height:1.05; letter-spacing:-.4px; }
.mt-box-pl{ margin-top:4px; font-size:14.5px; color:#7a7385; }
.mt-box-count{ font-size:14px; color:#7a7385; white-space:nowrap; }
.mt-box-count strong{ font-family:'Playfair Display',Georgia,serif; font-size:24px; color:#1d1a22; }
.mt-soon{ margin:16px 0; font-size:15px; color:#7a7385; }
.mt-row{ display:flex; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid #f3efe8; }
.mt-row:last-child{ border-bottom:none; }
.mt-row-main{ flex:1 1 auto; min-width:0; }
.mt-row-name{ font-size:17px; font-weight:600; line-height:1.25; }
.mt-row-meta{ display:flex; align-items:center; gap:10px; margin-top:8px; font-size:13.5px; color:#7a7385; white-space:nowrap; }
.mt-bar{ flex:0 1 120px; height:6px; background:#f0ece4; border-radius:99px; overflow:hidden; display:block; }
.mt-bar span{ display:block; height:100%; background:#ca4490; border-radius:99px; }
.mt-link{ background:none; border:none; padding:0 4px; min-height:32px; cursor:pointer; font-family:'Outfit',sans-serif; font-size:13.5px; font-weight:500; color:#5b5566; text-decoration:underline; text-underline-offset:3px; }
.mt-link:hover{ color:#ca4490; }
.mt-row .mt-btn{ flex:0 0 auto; min-width:100px; }
/* typ zadania ukończony w całości: biały przycisk ze złotą ramką */
.mt-btn-done{ background:#fff; color:#1d1a22 !important; border:2px solid #e0b43a; }
.mt-btn-done:hover{ background:#fdfbe8; border-color:#c99c22; }
/* pasek postępu w kolorze działu (jak pasek na górze ramki działu) */
.mt-box-reading .mt-bar span{ background:#a78dd9; }
.mt-box-use .mt-bar span{ background:#e0a91c; }
.mt-box-writing .mt-bar span{ background:#1e7e50; }
.mt-box-speaking .mt-bar span{ background:#1d1a22; }
html.eg-dark .mt-box-speaking .mt-bar span{ background:#e8e6ef; }
.mt-lock{ flex:none; }
.mt-tip{ margin-top:28px; background:#fff; border:1px solid #ebe6dc; border-radius:20px; padding:20px 24px; display:flex; flex-wrap:wrap; align-items:baseline; gap:8px 18px; font-size:16px; color:#4f4959; }
.mt-tip-k{ font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:18px; color:#1d1a22; }
.mt-tip span:nth-child(2){ flex:1 1 380px; line-height:1.55; }
.mt-tip a{ font-weight:600; color:#ca4490; }
.mt-overlay{ position:fixed; inset:0; background:rgba(29,26,34,.35); display:flex; justify-content:flex-end; z-index:50; }
.mt-center{ justify-content:center; align-items:center; padding:16px; }
.mt-drawer{ width:430px; max-width:100%; height:100%; background:#fbfaf6; padding:26px; display:flex; flex-direction:column; gap:16px; overflow-y:auto; box-shadow:-10px 0 30px rgba(29,26,34,.12); }
.mt-drawer-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; border-bottom:1px solid #ebe6dc; padding-bottom:14px; }
.mt-drawer-sec{ font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; color:#ca4490; }
.mt-drawer-t{ font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:26px; line-height:1.15; margin-top:4px; }
.mt-x{ width:44px; height:44px; border:1px solid #ddd6ca; border-radius:12px; background:#fff; cursor:pointer; font-size:22px; line-height:1; color:#1d1a22; }
.mt-filters{ display:flex; gap:4px; background:#f0ece4; border-radius:12px; padding:4px; align-self:flex-start; }
.mt-filters button{ min-height:38px; padding:0 14px; cursor:pointer; font-family:'Outfit',sans-serif; font-size:14px; font-weight:500; border:none; border-radius:9px; background:transparent; color:#5b5566; }
.mt-filters button.on{ background:#fff; color:#1d1a22; font-weight:700; box-shadow:0 2px 8px rgba(29,26,34,.08); }
.mt-tiles{ display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); gap:8px; }
.mt-tile{ display:flex; align-items:center; justify-content:center; gap:3px; aspect-ratio:1; min-height:44px; cursor:pointer; font-family:'Outfit',sans-serif; font-size:16px; font-weight:600; background:#fff; color:#1d1a22; border:1px solid #ddd6ca; border-radius:12px; }
.mt-tile.done{ background:#ca4490; border-color:#ca4490; color:#fff; }
.mt-tile.draft{ border-style:dashed; border-color:#ca4490; }
.mt-tile:hover{ border-color:#ca4490; }
.mt-tw{ display:flex; flex-direction:column; align-items:stretch; gap:3px; min-width:0; }
.mt-tscore{ background:none; border:none; padding:2px 0; cursor:pointer; font-family:'Outfit',sans-serif; font-size:12px; font-weight:600; color:#7a7385; text-decoration:underline dotted; text-underline-offset:3px; }
.mt-tscore:hover{ color:#ca4490; }
.mt-list{ display:flex; flex-direction:column; gap:8px; }
.mt-li{ display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #ebe6dc; border-radius:14px; padding:4px 10px 4px 4px; }
.mt-li:hover{ border-color:#ca4490; }
.mt-li.draft{ border-style:dashed; border-color:#ca4490; }
.mt-li.hw{ box-shadow:inset 5px 0 0 #f6f1ae; }
.mt-li-main{ flex:1 1 auto; min-width:0; display:flex; align-items:center; gap:12px; min-height:52px; padding:4px 6px; border:none; background:transparent; cursor:pointer; text-align:left; font-family:'Outfit',sans-serif; color:#1d1a22; }
.mt-li-no{ flex:none; width:40px; height:40px; border-radius:10px; border:1px solid #ddd6ca; background:#fbfaf6; display:inline-flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; }
.mt-li.done .mt-li-no{ background:#ca4490; border-color:#ca4490; color:#fff; }
.mt-li-t{ flex:1 1 auto; min-width:0; display:flex; flex-direction:column; font-size:15.5px; font-weight:600; line-height:1.3; }
.mt-li-t small{ font-size:12px; font-weight:600; color:#8a7a1a; margin-top:2px; }
.mt-li.draft .mt-li-t small{ color:#ca4490; }
.mt-li-lock{ flex:none; color:#7a7385; display:inline-flex; }
.mt-li-score{ flex:none; background:none; border:none; padding:4px 2px; cursor:pointer; font-family:'Outfit',sans-serif; font-size:13.5px; font-weight:700; color:#8f2c66; text-decoration:underline dotted; text-underline-offset:3px; }
.mt-li-score:hover{ color:#ca4490; }
.mt-li-ok{ cursor:default; text-decoration:none; font-weight:600; }
html.eg-dark .mt-li{ background:#24263a; border-color:#363850; }
html.eg-dark .mt-li-main{ color:#e8e6ef; }
html.eg-dark .mt-li-no{ background:#1a1b26; border-color:#4a4c66; color:#e8e6ef; }
html.eg-dark .mt-li.done .mt-li-no{ background:#ca4490; border-color:#ca4490; color:#fff; }
html.eg-dark .mt-li.hw{ box-shadow:inset 5px 0 0 #8a8240; }
html.eg-dark .mt-li-t small{ color:#e6dc7a; }
html.eg-dark .mt-li-lock{ color:#a29caf; }
html.eg-dark .mt-li-score{ color:#f08cc4; }
.mt-legend{ display:flex; flex-wrap:wrap; gap:16px; font-size:13.5px; color:#5b5566; }
.mt-legend span{ display:inline-flex; align-items:center; gap:6px; }
.mt-legend i{ display:inline-block; width:14px; height:14px; border:1px solid #ddd6ca; border-radius:4px; background:#fff; }
.mt-legend .lg-done{ background:#ca4490; border-color:#ca4490; }
.mt-legend .lg-draft{ border-style:dashed; border-color:#ca4490; }
.mt-modal{ width:520px; max-width:100%; background:#fff; border-radius:22px; padding:28px; box-shadow:0 20px 50px rgba(29,26,34,.18); }
.mt-modal h3{ margin:0 0 10px; font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:28px; line-height:1.15; }
.mt-modal p{ margin:0 0 18px; font-size:16.5px; line-height:1.6; color:#4f4959; }
.mt-close{ margin-top:12px; }

/* TECZKA LEKTORA i podgląd ucznia */
.mt-tk{ position:relative; }
.mt-tk-btn{ display:inline-flex; align-items:center; gap:8px; min-height:40px; padding:0 14px; border:1.5px solid #1d1a22; border-radius:999px; background:#fff; color:#1d1a22; font-family:'Outfit',sans-serif; font-size:14.5px; font-weight:600; cursor:pointer; }
.mt-tk-btn:hover, .mt-tk.open .mt-tk-btn{ background:#1d1a22; color:#fff; }
.mt-tk-caret{ font-size:11px; transition:transform .15s; }
.mt-tk.open .mt-tk-caret{ transform:rotate(180deg); }
.mt-tk-panel{ position:absolute; right:0; top:calc(100% + 8px); z-index:60; width:300px; max-width:calc(100vw - 32px); max-height:70vh; overflow-y:auto; background:#fbfaf6; border:1.5px solid #1d1a22; border-radius:16px; padding:14px; box-shadow:0 18px 40px rgba(29,26,34,.16); }
.mt-tk-k{ font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:19px; line-height:1.2; padding:2px 4px 10px; border-bottom:1px solid #ebe6dc; margin-bottom:6px; }
.mt-tk-group{ font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.4px; color:#ca4490; padding:12px 6px 4px; }
.mt-tk-empty{ font-size:13.5px; color:#7a7385; padding:4px 6px; }
.mt-tk-item{ display:flex; align-items:center; gap:10px; width:100%; min-height:44px; padding:6px 8px; border:none; border-radius:10px; background:transparent; cursor:pointer; text-align:left; font-family:'Outfit',sans-serif; font-size:15px; font-weight:500; color:#1d1a22; }
.mt-tk-item:hover{ background:#f0ece4; }
.mt-tk-item.on{ background:#fdf1f7; color:#8f2c66; font-weight:700; }
.mt-tk-av{ flex:none; width:30px; height:30px; border-radius:50%; background:#f6f1ae; color:#1d1a22; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; }
.mt-tk-exit{ color:#8f2c66; font-weight:600; }
a.mt-tk-item{ text-decoration:none; color:inherit; }
.mt-hw-t{ display:flex; flex-direction:column; min-width:0; text-align:left; line-height:1.3; }
.mt-hw-t small{ font-size:12px; font-weight:500; color:#7a7385; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mt-hw-t{ flex:1; }
.mt-hw-panel{ width:340px; }
.mt-hw-pager{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin:4px 0 6px; padding:0 4px; font-size:12.5px; color:#7a7385; }
.mt-hw-pager button{ border:none; background:transparent; color:#ca4490; font-family:'Outfit',sans-serif; font-size:13px; font-weight:600; padding:6px 8px; border-radius:8px; cursor:pointer; }
.mt-hw-pager button:hover:not(:disabled){ background:#fdf1f7; }
.mt-hw-pager button:disabled{ color:#c9c3cf; cursor:default; }
.mt-hw-ok{ margin-left:auto; flex:none; font-size:11.5px; font-weight:700; color:#1e7e50; background:#e3f3ea; padding:2px 8px; border-radius:999px; white-space:nowrap; }
.mt-tk-exit .mt-tk-av{ background:#fdf1f7; color:#ca4490; font-size:17px; }
.mt-view{ position:sticky; top:0; z-index:45; display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; margin:0 0 14px; padding:12px 14px 12px 18px; background:#1d1a22; color:#fff; border-radius:14px; box-shadow:0 10px 24px rgba(29,26,34,.18); }
.mt-view-k{ font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; color:#1d1a22; background:#f6f1ae; padding:4px 10px; border-radius:999px; }
.mt-view-t{ font-size:15.5px; flex:1 1 220px; }
.mt-view-t strong{ font-family:'Playfair Display',Georgia,serif; font-size:19px; font-weight:800; }
.mt-view-legend{ display:inline-flex; align-items:center; gap:6px; font-size:13px; color:#d9d4e2; }
.mt-view-legend i{ display:inline-block; width:12px; height:12px; border-radius:3px; margin-left:6px; }
.mt-view-legend .lg-done{ background:#ca4490; }
.mt-view-legend .lg-hw{ background:#f6f1ae; }
.mt-view-x{ min-height:40px; padding:0 14px; border:1.5px solid #fff; border-radius:999px; background:transparent; color:#fff; font-family:'Outfit',sans-serif; font-size:14.5px; font-weight:600; cursor:pointer; }
.mt-view-x:hover{ background:#fff; color:#1d1a22; }
.mt-hw-pill{ font-size:12px; font-weight:700; color:#6b5a0b; background:#f6f1ae; padding:3px 9px; border-radius:999px; }
.mt-tile.hw{ box-shadow:inset 0 -5px 0 #f6f1ae; }
.mt-tile.done.hw{ box-shadow:inset 0 -5px 0 #f6f1ae; }
.mt-legend .lg-hw{ background:#f6f1ae; border-color:#e6dc7a; }
.mt-vlist{ display:flex; flex-direction:column; gap:8px; }
.mt-vrow{ display:flex; align-items:center; gap:12px; background:#fff; border:1px solid #ebe6dc; border-radius:14px; padding:10px 10px 10px 12px; }
.mt-vrow.done{ border-left:4px solid #ca4490; }
.mt-vno{ flex:none; width:40px; height:40px; border-radius:10px; border:1px solid #ddd6ca; background:#fbfaf6; cursor:pointer; font-family:'Outfit',sans-serif; font-weight:700; font-size:15px; color:#1d1a22; }
.mt-vrow.done .mt-vno{ background:#ca4490; border-color:#ca4490; color:#fff; }
.mt-vmain{ flex:1 1 auto; min-width:0; }
.mt-vtitle{ font-size:14.5px; font-weight:600; line-height:1.3; }
.mt-vmeta{ display:flex; flex-wrap:wrap; gap:4px; margin-top:3px; font-size:12.5px; color:#7a7385; }
.mt-vscore{ font-weight:700; color:#8f2c66; }
.mt-vhw{ flex:none; min-height:40px; min-width:84px; padding:0 12px; border-radius:10px; border:1.5px solid #ca4490; background:#fff; color:#ca4490; font-family:'Outfit',sans-serif; font-size:14px; font-weight:700; cursor:pointer; }
.mt-vhw.on{ background:#f6f1ae; border-color:#e6dc7a; color:#5b4d10; }
.mt-vhw:disabled{ opacity:.5; cursor:wait; }
.mt-vacts{ flex:none; display:flex; flex-direction:column; gap:6px; }
.mt-vok{ min-height:40px; min-width:84px; padding:0 12px; border-radius:10px; border:1.5px solid #1e7e50; background:#fff; color:#1e7e50; font-family:'Outfit',sans-serif; font-size:14px; font-weight:700; cursor:pointer; }
.mt-vok.on{ background:#e3f3ea; border-color:#a9d9bf; color:#1e7e50; }
.mt-vok:disabled{ opacity:.5; cursor:wait; }
.mt-tk-hint{ background:#fff; border:1px solid #ebe6dc; border-radius:14px; padding:12px 14px; font-size:14px; line-height:1.5; color:#4f4959; }
.mt-tk-hint .mt-link{ display:block; padding:0; margin-top:4px; color:#ca4490; font-weight:600; }
.mt-toast{ position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:80; max-width:calc(100vw - 32px); background:#1d1a22; color:#fff; padding:12px 18px; border-radius:12px; font-size:14.5px; box-shadow:0 10px 30px rgba(0,0,0,.2); }
html.eg-dark .mt-tk-btn{ background:transparent; color:#e8e6ef; border-color:#e8e6ef; }
html.eg-dark .mt-tk-btn:hover, html.eg-dark .mt-tk.open .mt-tk-btn{ background:#e8e6ef; color:#1a1b26; }
html.eg-dark .mt-tk-panel{ background:#24263a; border-color:#4a4c66; }
html.eg-dark .mt-tk-k{ border-color:#363850; }
html.eg-dark .mt-tk-item{ color:#e8e6ef; }
html.eg-dark .mt-tk-item:hover{ background:#2c2e44; }
html.eg-dark .mt-tk-item.on{ background:#3a2034; color:#f08cc4; }
html.eg-dark .mt-tk-av{ background:#3b3820; color:#f6f1ae; }
html.eg-dark .mt-tk-exit{ color:#f08cc4; }
html.eg-dark .mt-hw-t small{ color:#a29caf; }
html.eg-dark .mt-hw-pager{ color:#a29caf; }
html.eg-dark .mt-hw-pager button{ color:#f08cc4; }
html.eg-dark .mt-hw-pager button:hover:not(:disabled){ background:#3a2034; }
html.eg-dark .mt-hw-pager button:disabled{ color:#55536a; }
html.eg-dark .mt-hw-ok{ background:#1f3a2c; color:#8fd3ae; }
html.eg-dark .mt-view{ background:#e8e6ef; color:#1a1b26; }
html.eg-dark .mt-view-legend{ color:#4f4959; }
html.eg-dark .mt-view-x{ border-color:#1a1b26; color:#1a1b26; }
html.eg-dark .mt-view-x:hover{ background:#1a1b26; color:#fff; }
html.eg-dark .mt-hw-pill{ background:#3b3820; color:#f6f1ae; }
html.eg-dark .mt-vrow{ background:#24263a; border-color:#363850; }
html.eg-dark .mt-vno{ background:#1a1b26; border-color:#4a4c66; color:#e8e6ef; }
html.eg-dark .mt-vscore{ color:#f08cc4; }
html.eg-dark .mt-vhw{ background:transparent; }
html.eg-dark .mt-vok{ background:transparent; color:#8fd3ae; border-color:#3a6d50; }
html.eg-dark .mt-vok.on{ background:#1f3a2c; color:#8fd3ae; border-color:#3a6d50; }
html.eg-dark .mt-tk-hint{ background:#24263a; border-color:#363850; color:#c4bfcf; }
html.eg-dark .mt-tk-hint .mt-link{ color:#f08cc4; }
html.eg-dark .mt-vhw.on{ background:#3b3820; color:#f6f1ae; border-color:#5c5630; }
@media (max-width:600px){
  .mt-tk-panel{ position:fixed; left:16px; right:16px; top:70px; width:auto; }
  .mt-view{ border-radius:0 0 14px 14px; margin:0 -16px 14px; }
}
/* wersja ciemna */
html.eg-dark body{ background:#1a1b26; }
html.eg-dark .mt{ background:#1a1b26; color:#e8e6ef; }
html.eg-dark .mt-nav a{ color:#a29caf; }
html.eg-dark .mt-mast{ border-top-color:#e8e6ef; }
html.eg-dark .mt-mast-sub, html.eg-dark .mt-num, html.eg-dark .mt-box-pl, html.eg-dark .mt-box-count, html.eg-dark .mt-row-meta, html.eg-dark .mt-soon, html.eg-dark .mt-next-stats span, html.eg-dark .mt-level, html.eg-dark .mt-legend{ color:#a29caf; }
html.eg-dark .mt-admin, html.eg-dark .mt-kicker{ background:#3a2034; color:#f08cc4; }
html.eg-dark .mt-lead p, html.eg-dark .mt-sign, html.eg-dark .mt-tip, html.eg-dark .mt-modal p, html.eg-dark .mt-link{ color:#c4bfcf; }
html.eg-dark .mt-next, html.eg-dark .mt-box, html.eg-dark .mt-tip, html.eg-dark .mt-modal{ background:#24263a; border-color:#363850; box-shadow:none; }
html.eg-dark .mt-next-stats, html.eg-dark .mt-box-head{ border-color:#363850; }
html.eg-dark .mt-row{ border-color:#2e3048; }
html.eg-dark .mt-next-stats strong, html.eg-dark .mt-box-count strong, html.eg-dark .mt-tip-k{ color:#e8e6ef; }
html.eg-dark .mt-btn-ghost{ background:transparent; color:#e8e6ef !important; border-color:#4a4c66; }
html.eg-dark .mt-btn-done{ background:transparent; color:#e8e6ef !important; border-color:#e0b43a; }
html.eg-dark .mt-btn-done:hover{ background:#2c2e44; border-color:#f4c94c; }
html.eg-dark .mt-btn-ghost:hover{ background:#2c2e44; border-color:#e8e6ef; }
html.eg-dark .mt-access{ background:#3b3820; }
html.eg-dark .mt-access p{ color:#ece6c0; }
html.eg-dark .mt-access-k{ color:#f4c94c; }
html.eg-dark .mt-toggle, html.eg-dark .mt-filters{ background:#2c2e44; }
html.eg-dark .mt-toggle button, html.eg-dark .mt-filters button{ color:#a29caf; }
html.eg-dark .mt-toggle button.on, html.eg-dark .mt-filters button.on{ background:#3a3d58; color:#fff; box-shadow:none; }
html.eg-dark .mt-bar{ background:#363850; }
html.eg-dark .mt-tip a{ color:#f08cc4; }
html.eg-dark .mt-overlay{ background:rgba(0,0,0,.55); }
html.eg-dark .mt-drawer{ background:#1a1b26; }
html.eg-dark .mt-drawer-head{ border-color:#363850; }
html.eg-dark .mt-x, html.eg-dark .mt-tile{ background:#24263a; color:#e8e6ef; border-color:#4a4c66; }
html.eg-dark .mt-tile.done{ background:#ca4490; border-color:#ca4490; color:#fff; }
html.eg-dark .mt-tscore{ color:#a29caf; }
html.eg-dark .mt-legend i{ background:#24263a; border-color:#4a4c66; }
html.eg-dark .mt-legend .lg-done{ background:#ca4490; border-color:#ca4490; }
@media (max-width:600px){
  .mt-wrap{ padding:0 16px; }
  .mt-box{ padding:20px 16px 8px; }
  .mt-box-head h3{ font-size:26px; }
  .mt-row .mt-btn{ min-width:88px; padding:0 14px; }
  .mt-access{ padding:20px; }
  .mt-next-stats strong{ font-size:26px; }
}
`;
