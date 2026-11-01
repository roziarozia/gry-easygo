'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SECTIONS, TASKS, daysToExam, MT_FONTS } from './maturaData';
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
  const [done, setDone] = useState({}); // slug -> {score, max, at}
  const [level, setLevel] = useState('basic');
  const [drawer, setDrawer] = useState(null); // {section, task}
  const [filter, setFilter] = useState('all');
  const [paywall, setPaywall] = useState(false);
  const [now, setNow] = useState(null);

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
            <a href="/">Ćwiczenia</a>
            <a href="/nauka">Blog</a>
            {user ? <a href="/konto">Moje konto</a> : <a href="/logowanie?powrot=matura">Zaloguj się</a>}
            <ThemeToggle />
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
              <div><strong>{now === null ? '…' : daysToExam(now, level)}</strong><span>dni do matury ({level === 'ext' ? 'rozszerzenie, 7 maja' : 'podstawa, 6 maja'})</span></div>
              <div><strong>{doneCount}<small>/{mat.length}</small></strong><span>zrobione ćwiczenia ({level === 'ext' ? 'rozszerzenie' : 'podstawa'})</span></div>
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
          {SECTIONS.map((s, si) => {
            const types = (TASKS[level][s.id] || []).filter(([t]) => ((grouped[s.id] || {})[t] || []).length);
            const all = types.flatMap(([t]) => grouped[s.id][t]);
            const d = all.filter((g) => done[g.slug]).length;
            return (
              <section className={'mt-box mt-box-' + s.id} key={s.id}>
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
.mt-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap:20px; align-items:start; }
.mt-box{ position:relative; background:#fff; border:1px solid #ebe6dc; border-radius:20px; padding:24px 24px 10px; min-width:0; overflow:hidden; }
.mt-box::before{ content:''; position:absolute; left:0; right:0; top:0; height:5px; background:#ca4490; }
.mt-box-reading::before{ background:#a78dd9; }
.mt-box-use::before{ background:#e0a91c; }
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
.mt-legend{ display:flex; flex-wrap:wrap; gap:16px; font-size:13.5px; color:#5b5566; }
.mt-legend span{ display:inline-flex; align-items:center; gap:6px; }
.mt-legend i{ display:inline-block; width:14px; height:14px; border:1px solid #ddd6ca; border-radius:4px; background:#fff; }
.mt-legend .lg-done{ background:#ca4490; border-color:#ca4490; }
.mt-legend .lg-draft{ border-style:dashed; border-color:#ca4490; }
.mt-modal{ width:520px; max-width:100%; background:#fff; border-radius:22px; padding:28px; box-shadow:0 20px 50px rgba(29,26,34,.18); }
.mt-modal h3{ margin:0 0 10px; font-family:'Playfair Display',Georgia,serif; font-weight:800; font-size:28px; line-height:1.15; }
.mt-modal p{ margin:0 0 18px; font-size:16.5px; line-height:1.6; color:#4f4959; }
.mt-close{ margin-top:12px; }
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
