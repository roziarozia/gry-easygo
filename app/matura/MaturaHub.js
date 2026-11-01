'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SECTIONS, TASKS, daysToExam, MT_FONTS } from './maturaData';

// Strona /matura — gazetowy „spis treści” ćwiczeń maturalnych.
// Ćwiczenia, postępy i dostęp są czytane z tej samej bazy co reszta EasyWonders,
// więc wyniki zapisują się razem z innymi ćwiczeniami ucznia.
export default function MaturaHub() {
  const [ready, setReady] = useState(false);
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState('guest'); // guest | free | full
  const [isAdmin, setIsAdmin] = useState(false);
  const [done, setDone] = useState({}); // slug -> {score, max, at}
  const [level, setLevel] = useState('basic');
  const [drawer, setDrawer] = useState(null); // {section, task}
  const [filter, setFilter] = useState('all');
  const [paywall, setPaywall] = useState(false);
  const [days, setDays] = useState(null);

  useEffect(() => {
    try { const l = localStorage.getItem('eg_matura_level'); if (l === 'basic' || l === 'ext') setLevel(l); } catch (e) {}
    setDays(daysToExam(Date.now()));
    (async () => {
      let session = null;
      try { const r = await supabase.auth.getSession(); session = r.data.session; } catch (e) {}
      const g = await supabase.from('games')
        .select('slug,title,matura_level,matura_section,matura_task,exercise_no,is_premium,published,slide_count_label')
        .eq('matura', true).order('exercise_no', { ascending: true });
      setGames(g.data || []);
      if (session) {
        setUser(session.user);
        const [fa, ad, gc] = await Promise.all([
          supabase.rpc('has_full_access'),
          supabase.rpc('is_admin'),
          supabase.from('game_completions').select('game_slug,score,score_max,completed_at').eq('user_id', session.user.id),
        ]);
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

  function chooseLevel(l) {
    setLevel(l); setDrawer(null);
    try { localStorage.setItem('eg_matura_level', l); } catch (e) {}
  }

  const locked = (g) => g.is_premium && access !== 'full';

  // Ćwiczenia pogrupowane: dział -> typ zadania -> lista (wg numeru)
  const grouped = useMemo(() => {
    const out = {};
    games.filter((g) => g.matura_level === level).forEach((g) => {
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
    const mine = games.filter((g) => g.matura_level === level && done[g.slug])
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

  const mat = games.filter((g) => g.matura_level === level);
  const points = mat.reduce((s, g) => s + (done[g.slug] && done[g.slug].score ? done[g.slug].score : 0), 0);
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
      <style dangerouslySetInnerHTML={{ __html: MT_FONTS + CSS }} />
      <div className="mt-wrap">
        <div className="mt-top">
          <a href="/" className="mt-logo"><span style={{ color: '#ca4490' }}>Easy</span><span style={{ color: '#c8930f' }}>Wonders</span></a>
          <nav className="mt-nav">
            <a href="/">Ćwiczenia</a>
            <a href="/nauka">Blog</a>
            {user ? <a href="/konto">Moje konto</a> : <a href="/logowanie?powrot=matura">Zaloguj się</a>}
          </nav>
        </div>

        <header className="mt-mast">
          <h1>Matura</h1>
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
            <div className="mt-next-k">{nextUp && nextUp.cont ? 'Twoje następne ćwiczenie' : 'Zacznij tutaj'}</div>
            {nextUp ? (
              <>
                <div className="mt-next-t">{sectionName(nextUp.g.matura_section)}: {taskLabel(nextUp.g.matura_section, nextUp.g.matura_task).toLowerCase()}, nr {nextUp.g.exercise_no}</div>
                <button type="button" className="mt-btn mt-btn-big" onClick={() => open(nextUp.g)}>{nextUp.cont ? 'Kontynuuj' : 'Zacznij'}</button>
              </>
            ) : (
              <div className="mt-next-t">{ready ? 'Ćwiczenia na tym poziomie są w przygotowaniu.' : 'Wczytujemy ćwiczenia…'}</div>
            )}
            <div className="mt-next-stats">
              <span>Punkty: <strong>{points}</strong></span>
              <span>Do matury: <strong>{days === null ? '…' : days + ' dni'}</strong></span>
            </div>
          </div>
        </section>

        {ready && access !== 'full' && (
          <section className="mt-access">
            <div className="mt-access-k">Od redakcji: o dostępie</div>
            <p>
              Pierwsze ćwiczenie w każdym typie zadania jest darmowe. Wszystkie zadania maturalne odblokujesz w pełnej wersji EasyWonders.
              {' '}<strong>Przez 14 dni możesz ją sprawdzić za darmo, bez podpinania karty.</strong>
            </p>
            <div className="mt-access-btns">
              {access === 'guest' ? (
                <>
                  <a className="mt-btn" href="/oferta">Wypróbuj za darmo</a>
                  <a className="mt-btn mt-btn-ghost" href="/logowanie?powrot=matura">Mam konto, zaloguj się</a>
                </>
              ) : (
                <a className="mt-btn" href="/oferta">Rozpocznij 14 dni za darmo</a>
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
          {SECTIONS.map((s) => {
            const types = (TASKS[level][s.id] || []).filter(([t]) => ((grouped[s.id] || {})[t] || []).length);
            const all = types.flatMap(([t]) => grouped[s.id][t]);
            const d = all.filter((g) => done[g.slug]).length;
            return (
              <section className="mt-box" key={s.id}>
                <div className="mt-box-head">
                  <div>
                    <h3><span className="mt-roman">{s.roman}.</span> {s.en}</h3>
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
                  return (
                    <div className="mt-row" key={task}>
                      <div className="mt-row-main">
                        <div className="mt-row-name">{label}</div>
                        <div className="mt-row-meta">
                          <span className="mt-bar"><span style={{ width: Math.round((100 * dd) / list.length) + '%' }} /></span>
                          <span>{dd} z {list.length}</span>
                          <button type="button" className="mt-link" onClick={() => { setDrawer({ section: s.id, task }); setFilter('all'); }}>lista</button>
                        </div>
                      </div>
                      <button type="button" className={'mt-btn ' + (started ? '' : 'mt-btn-ghost')} onClick={() => open(nx)}>
                        {lockedNext && <Lock />}{dd >= list.length ? 'Powtórz' : started ? 'Ćwicz' : 'Zacznij'}
                      </button>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>

        <div className="mt-tip">
          <span className="mt-tip-k">Z naszej redakcji:</span>
          <span>w słuchaniu i czytaniu poprawna odpowiedź zwykle mówi to samo co tekst, ale innymi słowami.</span>
          <a href="/nauka">Więcej na blogu</a>
        </div>
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
            <div className="mt-tiles">
              {drawerShown.map((g) => (
                <button key={g.slug} type="button" title={g.title} className={'mt-tile' + (done[g.slug] ? ' done' : '') + (!g.published ? ' draft' : '')} onClick={() => open(g)}>
                  {locked(g) ? <Lock /> : null}{g.exercise_no}
                </button>
              ))}
              {drawerShown.length === 0 && <p className="mt-soon">Brak ćwiczeń w tym widoku.</p>}
            </div>
            <div className="mt-legend">
              <span><i className="lg-done" />zrobione</span>
              <span><i className="lg-new" />nowe</span>
              {access !== 'full' && <span><Lock />dla subskrybentów</span>}
              {isAdmin && <span><i className="lg-draft" />szkic</span>}
            </div>
          </div>
        </div>
      )}

      {paywall && (
        <div className="mt-overlay mt-center" onClick={() => setPaywall(false)}>
          <div className="mt-modal" role="dialog" aria-label="Dostęp do ćwiczenia" onClick={(e) => e.stopPropagation()}>
            <div className="mt-kicker">Od redakcji</div>
            <h3>To ćwiczenie jest w pełnej wersji</h3>
            <p>Pierwsze ćwiczenie w każdym typie zadania jest darmowe, a resztę odblokujesz w pełnej wersji EasyWonders. Przez 14 dni możesz ją sprawdzić za darmo, bez podpinania karty.</p>
            <div className="mt-access-btns">
              {access === 'guest' ? (
                <>
                  <a className="mt-btn" href="/oferta">Wypróbuj za darmo</a>
                  <a className="mt-btn mt-btn-ghost" href="/logowanie?powrot=matura">Mam konto, zaloguj się</a>
                </>
              ) : (
                <a className="mt-btn" href="/oferta">Rozpocznij 14 dni za darmo</a>
              )}
            </div>
            <button type="button" className="mt-link mt-close" onClick={() => setPaywall(false)}>Wróć do listy</button>
          </div>
        </div>
      )}
    </div>
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
body{ margin:0; background:#f5f1e8; }
.mt{ min-height:100vh; background:#f5f1e8; color:#1a1a1a; font-family:'Source Serif 4',Georgia,serif; }
.mt *{ box-sizing:border-box; }
.mt a{ color:#1a1a1a; }
.mt a:hover{ color:#ca4490; }
.mt-wrap{ max-width:1080px; margin:0 auto; padding:0 24px 72px; }
.mt-top{ display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; padding:14px 0; font-size:15px; }
.mt-logo{ text-decoration:none; font-family:'Outfit',sans-serif; font-weight:700; font-size:20px; letter-spacing:-.5px; }
.mt-nav{ display:flex; flex-wrap:wrap; gap:22px; }
.mt-nav a{ text-decoration:none; color:#3a362f; }
.mt-mast{ border-top:1px solid #1a1a1a; border-bottom:4px double #1a1a1a; padding:18px 0 14px; text-align:center; }
.mt-mast h1{ margin:0; font-family:'Playfair Display',Georgia,serif; font-weight:900; font-size:clamp(52px,9vw,76px); line-height:1; letter-spacing:-1px; }
.mt-mast-sub{ margin-top:6px; font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:clamp(15px,2.2vw,19px); color:#3a362f; }
.mt-admin{ margin-top:14px; padding:10px 14px; border:1.5px dashed #ca4490; font-size:15px; color:#3a362f; background:#fffdf8; }
.mt-lead{ display:flex; flex-wrap:wrap; gap:28px; align-items:stretch; padding:34px 0 30px; border-bottom:1px solid #1a1a1a; }
.mt-lead-text{ flex:999 1 440px; min-width:0; }
.mt-kicker{ font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:18px; color:#ca4490; margin-bottom:8px; }
.mt-lead h2{ margin:0 0 14px; font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:clamp(32px,5vw,46px); line-height:1.08; letter-spacing:-1px; }
.mt-lead p{ margin:0; font-size:19px; line-height:1.6; color:#3a362f; max-width:540px; }
.mt-sign{ margin-top:14px; font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:17px; color:#3a362f; }
.mt-next{ flex:1 1 300px; border:2px solid #1a1a1a; background:#fffdf8; padding:22px 24px; display:flex; flex-direction:column; gap:10px; }
.mt-next-k{ font-size:13px; text-transform:uppercase; letter-spacing:1.6px; font-weight:700; color:#ca4490; }
.mt-next-t{ font-family:'Playfair Display',Georgia,serif; font-weight:700; font-size:24px; line-height:1.2; }
.mt-next-stats{ display:flex; justify-content:space-between; gap:10px; padding-top:8px; border-top:1px solid #cfc8ba; font-size:15px; color:#3a362f; margin-top:auto; }
.mt-next-stats strong{ color:#1a1a1a; }
.mt-btn{ display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:46px; padding:0 18px; font-family:'Source Serif 4',Georgia,serif; font-size:16px; font-weight:700; text-decoration:none; cursor:pointer; background:#1a1a1a; color:#f5f1e8 !important; border:1.5px solid #1a1a1a; }
.mt-btn:hover{ background:#ca4490; border-color:#ca4490; color:#fff !important; }
.mt-btn-ghost{ background:transparent; color:#1a1a1a !important; }
.mt-btn-ghost:hover{ background:#1a1a1a; border-color:#1a1a1a; color:#f5f1e8 !important; }
.mt-btn-big{ min-height:52px; font-size:18px; margin-top:6px; }
.mt-access{ margin-top:26px; border:1.5px solid #1a1a1a; background:#fffdf8; padding:20px 24px; }
.mt-access-k{ font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:18px; margin-bottom:6px; }
.mt-access p{ margin:0 0 14px; font-size:17px; line-height:1.6; color:#3a362f; }
.mt-access-btns{ display:flex; flex-wrap:wrap; gap:10px; }
.mt-sechead{ display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px; padding:28px 0 18px; }
.mt-sechead h2{ margin:0; font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:30px; }
.mt-level{ display:flex; align-items:center; gap:12px; font-size:16px; color:#3a362f; }
.mt-toggle{ display:flex; border:1.5px solid #1a1a1a; }
.mt-toggle button{ border:none; cursor:pointer; padding:0 18px; min-height:44px; font-family:'Source Serif 4',Georgia,serif; font-size:16px; background:transparent; color:#1a1a1a; }
.mt-toggle button.on{ background:#1a1a1a; color:#f5f1e8; font-weight:700; }
.mt-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap:22px; align-items:start; }
.mt-box{ background:#fffdf8; border:1.5px solid #1a1a1a; padding:22px 24px 8px; min-width:0; }
.mt-box-head{ display:flex; align-items:baseline; justify-content:space-between; gap:12px; border-bottom:3px double #1a1a1a; padding-bottom:12px; }
.mt-box-head h3{ margin:0; font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:30px; line-height:1.05; }
.mt-roman{ font-weight:400; font-style:italic; color:#6b665d; }
.mt-box-pl{ margin-top:4px; font-size:16px; color:#3a362f; }
.mt-box-count{ font-size:15px; color:#3a362f; white-space:nowrap; }
.mt-soon{ margin:14px 0; font-size:16px; font-style:italic; color:#4a463f; }
.mt-row{ display:flex; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid #e2dccf; }
.mt-row:last-child{ border-bottom:none; }
.mt-row-main{ flex:1 1 auto; min-width:0; }
.mt-row-name{ font-family:'Playfair Display',Georgia,serif; font-weight:700; font-size:20px; line-height:1.2; }
.mt-row-meta{ display:flex; align-items:center; gap:10px; white-space:nowrap; margin-top:8px; font-size:14px; color:#3a362f; }
.mt-bar{ flex:0 1 120px; height:4px; background:#e2dccf; display:block; }
.mt-bar span{ display:block; height:100%; background:#ca4490; }
.mt-link{ background:none; border:none; padding:0 4px; min-height:32px; cursor:pointer; font-family:'Source Serif 4',Georgia,serif; font-size:14px; color:#3a362f; text-decoration:underline; text-underline-offset:3px; }
.mt-row .mt-btn{ flex:0 0 auto; min-width:104px; }
.mt-lock{ flex:none; }
.mt-tip{ margin-top:26px; border-top:1px solid #1a1a1a; border-bottom:1px solid #1a1a1a; padding:16px 0; display:flex; flex-wrap:wrap; align-items:baseline; gap:10px 18px; font-size:17px; color:#3a362f; }
.mt-tip-k{ font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:18px; color:#1a1a1a; }
.mt-tip span:nth-child(2){ flex:1 1 380px; line-height:1.55; }
.mt-overlay{ position:fixed; inset:0; background:rgba(26,26,26,.4); display:flex; justify-content:flex-end; z-index:50; }
.mt-center{ justify-content:center; align-items:center; padding:16px; }
.mt-drawer{ width:430px; max-width:100%; height:100%; background:#f5f1e8; border-left:1.5px solid #1a1a1a; padding:26px; display:flex; flex-direction:column; gap:16px; overflow-y:auto; }
.mt-drawer-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; border-bottom:4px double #1a1a1a; padding-bottom:14px; }
.mt-drawer-sec{ font-size:15px; color:#3a362f; }
.mt-drawer-t{ font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:26px; line-height:1.1; }
.mt-x{ width:44px; height:44px; border:1.5px solid #1a1a1a; background:transparent; cursor:pointer; font-size:24px; line-height:1; color:#1a1a1a; }
.mt-filters{ display:flex; flex-wrap:wrap; gap:6px; }
.mt-filters button{ min-height:44px; padding:0 14px; cursor:pointer; font-family:'Source Serif 4',Georgia,serif; font-size:15px; border:1.5px solid #1a1a1a; background:transparent; color:#1a1a1a; }
.mt-filters button.on{ background:#1a1a1a; color:#f5f1e8; font-weight:700; }
.mt-tiles{ display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); gap:6px; }
.mt-tile{ display:flex; align-items:center; justify-content:center; gap:3px; aspect-ratio:1; min-height:44px; cursor:pointer; font-family:'Playfair Display',Georgia,serif; font-size:17px; font-weight:700; background:#fffdf8; color:#1a1a1a; border:1.5px solid #1a1a1a; }
.mt-tile.done{ background:#1a1a1a; color:#f5f1e8; }
.mt-tile.draft{ border-style:dashed; border-color:#ca4490; }
.mt-tile:hover{ border-color:#ca4490; }
.mt-legend{ display:flex; flex-wrap:wrap; gap:16px; font-size:14px; color:#3a362f; }
.mt-legend span{ display:inline-flex; align-items:center; gap:6px; }
.mt-legend i{ display:inline-block; width:14px; height:14px; border:1.5px solid #1a1a1a; }
.mt-legend .lg-done{ background:#1a1a1a; }
.mt-legend .lg-draft{ border-style:dashed; border-color:#ca4490; }
.mt-modal{ width:520px; max-width:100%; background:#fffdf8; border:2px solid #1a1a1a; padding:26px 28px; }
.mt-modal h3{ margin:0 0 10px; font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:28px; line-height:1.15; }
.mt-modal p{ margin:0 0 16px; font-size:17px; line-height:1.6; color:#3a362f; }
.mt-close{ margin-top:12px; }
@media (max-width:600px){
  .mt-wrap{ padding:0 16px 56px; }
  .mt-box{ padding:18px 16px 6px; }
  .mt-box-head h3{ font-size:26px; }
  .mt-row .mt-btn{ min-width:88px; padding:0 12px; }
  .mt-next-stats{ flex-direction:column; gap:4px; }
}
`;
