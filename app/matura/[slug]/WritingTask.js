'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { WRITING_CRITERIA } from '../maturaData';

// Wypowiedź pisemna (Writing). Uczeń pisze tekst, który zapisuje się sam (autozapis).
// Gdy ma lektora, oddaje tekst do sprawdzenia; bez lektora tekst po prostu zostaje na jego koncie.
// Dopóki lektor nie oceni, uczeń może poprawiać. Lektor ocenia w podglądzie ucznia (teczka),
// wpisując punkty w 4 kryteriach maturalnych i komentarz. Zapis i ocena idą tylko przez funkcje w bazie.

function countWords(t) {
  const s = (t || '').trim();
  return s ? s.split(/\s+/).length : 0;
}

function fmtTime(iso) {
  try { return new Date(iso).toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
}

export default function WritingTask({ slug, level, isPremium }) {
  const [ready, setReady] = useState(false);
  const [task, setTask] = useState(null); // dane tematu (task_content.data) albo null
  const [noAccess, setNoAccess] = useState(false);
  const [user, setUser] = useState(null);
  const [hasTeacher, setHasTeacher] = useState(false);
  const [viewing, setViewing] = useState(null); // lektor ogląda ucznia: {id, name}
  const [sub, setSub] = useState(null); // wypracowanie (własne albo oglądanego ucznia)
  const [body, setBody] = useState('');
  const [saveState, setSaveState] = useState(''); // '', 'saving', 'saved', 'error'
  const [savedAt, setSavedAt] = useState(null);
  const [msg, setMsg] = useState('');
  const [pasteTip, setPasteTip] = useState(false); // dymek „wklejanie wyłączone”
  const pasteTimer = useRef(null);
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [gradeMsg, setGradeMsg] = useState('');
  const timer = useRef(null);
  const lastSaved = useRef('');

  const crit = WRITING_CRITERIA[level === 'ext' ? 'ext' : 'basic'];
  const localKey = 'eg_writing_' + slug;

  useEffect(() => {
    (async () => {
      let session = null;
      try { const r = await supabase.auth.getSession(); session = r.data.session; } catch (e) {}
      const g = await supabase.from('games').select('id').eq('slug', slug).maybeSingle();
      const gid = g.data && g.data.id;
      if (gid) {
        const tc = await supabase.from('task_content').select('data').eq('game_id', gid).maybeSingle();
        if (tc.data && tc.data.data) setTask(tc.data.data); else setNoAccess(true);
      } else {
        setNoAccess(true);
      }
      if (session) {
        setUser(session.user);
        const pr = await supabase.from('profiles').select('role,teacher_id').eq('id', session.user.id).maybeSingle();
        const role = pr.data && pr.data.role;
        setHasTeacher(!!(pr.data && pr.data.teacher_id));
        // lektor w podglądzie ucznia (ten sam klucz co teczka na /matura i katalog)
        let sv = null;
        try { sv = JSON.parse(sessionStorage.getItem('egSvViewing') || 'null'); } catch (e) {}
        if (role === 'teacher' && sv && sv.id && sv.id !== session.user.id) {
          const w = await supabase.from('writing_submissions').select('*').eq('user_id', sv.id).eq('game_slug', slug).maybeSingle();
          if (!w.error) {
            setViewing({ id: sv.id, name: sv.name || 'Uczeń' });
            setSub(w.data || null);
            if (w.data) {
              setScores(w.data.scores || {});
              setFeedback(w.data.feedback || '');
            }
          }
        } else {
          const w = await supabase.from('writing_submissions').select('*').eq('user_id', session.user.id).eq('game_slug', slug).maybeSingle();
          if (w.data) {
            setSub(w.data); setBody(w.data.body || ''); lastSaved.current = w.data.body || ''; setSavedAt(w.data.updated_at);
          } else {
            try { const l = localStorage.getItem(localKey); if (l) setBody(l); } catch (e) {}
          }
        }
      } else {
        try { const l = localStorage.getItem(localKey); if (l) setBody(l); } catch (e) {}
      }
      setReady(true);
    })();
    return () => { clearTimeout(timer.current); clearTimeout(pasteTimer.current); };
  }, [slug]);

  const graded = sub && sub.status === 'graded';
  const submitted = sub && sub.status === 'submitted';
  const canEdit = !viewing && !graded && !noAccess;

  async function save(final) {
    if (!user) return { ok: false, error: 'not_logged_in' };
    setSaveState('saving');
    const r = await supabase.rpc('writing_save', { p_slug: slug, p_body: body, p_final: !!final });
    const d = r.data || {};
    if (r.error || !d.ok) {
      setSaveState('error');
      return { ok: false, error: d.error || 'error' };
    }
    lastSaved.current = body;
    setSaveState('saved'); setSavedAt(d.updated_at);
    setSub((prev) => ({ ...(prev || {}), status: d.status, body, word_count: d.word_count, updated_at: d.updated_at }));
    return d;
  }

  function onChange(v) {
    setBody(v); setMsg('');
    try { localStorage.setItem(localKey, v); } catch (e) {}
    if (!user) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (v !== lastSaved.current) save(false); }, 1500);
  }

  // Wklejanie z zewnątrz jest wyłączone – tekst ma powstać tutaj, przy poleceniu i liczniku słów.
  // Przenoszenie fragmentów WŁASNEGO tekstu (wytnij/wklej w obrębie pola) dalej działa.
  function blokujWklejanie(e, dane) {
    const txt = (dane || '').trim();
    if (txt && body.indexOf(txt) !== -1) return;
    e.preventDefault();
    setPasteTip(true);
    clearTimeout(pasteTimer.current);
    pasteTimer.current = setTimeout(() => setPasteTip(false), 2600);
  }

  async function onFinal() {
    clearTimeout(timer.current);
    if (!countWords(body)) { setMsg('Najpierw napisz tekst.'); return; }
    setBusy(true);
    const d = await save(true);
    setBusy(false);
    if (!d.ok) {
      setMsg(d.error === 'graded' ? 'Lektor już ocenił ten tekst, więc nie można go zmienić.'
        : d.error === 'no_access' ? 'Ten temat jest w pełnej wersji EasyWonders.'
          : 'Nie udało się zapisać. Spróbuj ponownie.');
      return;
    }
    try { localStorage.removeItem(localKey); } catch (e) {}
    setMsg(hasTeacher ? 'Oddane! Lektor zobaczy Twój tekst w teczce. Do czasu oceny możesz go jeszcze poprawiać.' : 'Zapisane na Twoim koncie. Możesz do niego wrócić w każdej chwili.');
  }

  async function onGrade() {
    setGradeMsg('');
    for (const [k, label, max] of crit) {
      const v = scores[k];
      if (v === undefined || v === null || v === '' || Number(v) < 0 || Number(v) > max) { setGradeMsg('Wybierz punkty w każdym kryterium (' + label + ').'); return; }
    }
    setBusy(true);
    const clean = {};
    crit.forEach(([k]) => { clean[k] = Number(scores[k]); });
    const r = await supabase.rpc('writing_grade', { p_student: viewing.id, p_slug: slug, p_scores: clean, p_feedback: feedback });
    setBusy(false);
    const d = r.data || {};
    if (r.error || !d.ok) { setGradeMsg('Nie udało się zapisać oceny. Spróbuj ponownie.'); return; }
    setSub((prev) => ({ ...prev, status: 'graded', scores: clean, score: d.score, score_max: d.score_max, feedback, graded_at: new Date().toISOString() }));
    setGradeMsg('Ocena zapisana. Uczeń zobaczy punkty i komentarz pod swoim tekstem.');
  }

  function exitView() {
    try { sessionStorage.removeItem('egSvViewing'); } catch (e) {}
    window.location.reload();
  }

  const words = countWords(viewing ? (sub && sub.body) : body);
  const range = (task && task.words) || (level === 'ext' ? [200, 250] : [100, 150]);
  // Limit to wskazówka: liczymy słowa, ale dłuższego tekstu nie blokujemy ani nie oznaczamy jako błąd.
  // Słowa podane na początku wypowiedzi (task.start) nie wliczają się do limitu — jak na maturze.
  const wState = words === 0 ? '' : words < range[0] ? 'low' : 'ok';
  const maxTotal = crit.reduce((a, c) => a + c[2], 0);

  if (!ready) return <div className="wt"><style dangerouslySetInnerHTML={{ __html: CSS }} /><p className="wt-muted">Wczytujemy temat…</p></div>;

  return (
    <div className="wt">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className={'wt-tip' + (pasteTip ? ' on' : '')} role="status" aria-live="polite">
        Wklejanie jest wyłączone – napisz tekst samodzielnie, tutaj pod poleceniem.
      </div>

      {viewing && (
        <div className="wt-view" role="status">
          <span className="wt-view-k">Podgląd ucznia</span>
          <span className="wt-view-t">Widzisz wypracowanie ucznia: <strong>{viewing.name}</strong></span>
          <button type="button" className="wt-view-x" onClick={exitView}>Zamknij podgląd <span aria-hidden="true">×</span></button>
        </div>
      )}

      {noAccess || !task ? (
        <section className="wt-card wt-lock">
          <div className="wt-k">Od redakcji</div>
          <h2>Ten temat jest w pełnej wersji</h2>
          <p>Pierwszy temat w każdym typie wypowiedzi jest darmowy, a resztę odblokujesz w pełnej wersji EasyWonders. {user ? 'Wybierz plan, żeby mieć dostęp do wszystkich.' : 'Załóż konto, a przez 14 dni masz pełną wersję za darmo, bez podpinania karty.'}</p>
          <div className="wt-btns">
            <a className="wt-btn" href={user ? '/oferta?powrot=matura' : '/logowanie?rejestracja&powrot=matura'}>{user ? 'Zobacz ofertę' : 'Załóż konto za darmo'}</a>
            {!user && <a className="wt-btn wt-ghost" href={'/logowanie?powrot=' + encodeURIComponent('matura/' + slug)}>Mam konto, zaloguj się</a>}
          </div>
        </section>
      ) : (
        <>
          <section className="wt-card wt-task">
            <div className="wt-k">Polecenie</div>
            {task.situation && <p className="wt-sit">{task.situation}</p>}
            {task.lead && <p className="wt-lead">{task.lead}</p>}
            {Array.isArray(task.bullets) && task.bullets.length > 0 && (
              <ul className="wt-bul">{task.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
            )}
            {task.task && <p className="wt-lead">{task.task}</p>}
            {task.start && <p className="wt-note">Początek wypowiedzi jest już napisany. Kontynuuj go w polu poniżej.</p>}
            {task.sign && <p className="wt-note">Podpisz się jako <strong>{task.sign}</strong>.</p>}
            <p className="wt-note">
              {level === 'ext'
                ? <>Wypowiedź powinna zawierać <strong>{range[0]}–{range[1]} wyrazów</strong> i spełniać wszystkie wymogi typowe dla formy wskazanej w poleceniu.</>
                : <>Pamiętaj, że długość wypowiedzi powinna wynosić <strong>od {range[0]} do {range[1]} wyrazów</strong>{task.start ? ' (nie licząc wyrazów podanych na początku wypowiedzi)' : ''}.</>}
            </p>
            {(task.tip || (Array.isArray(task.phrases) && task.phrases.length > 0)) && (
              <details className="wt-help">
                <summary>Wskazówka i przydatne zwroty</summary>
                {task.tip && <p className="wt-tip">{task.tip}</p>}
                {Array.isArray(task.phrases) && task.phrases.length > 0 && (
                  <ul className="wt-phr">{task.phrases.map((p, i) => <li key={i}><span lang="en">{p[0]}</span><span>{p[1]}</span></li>)}</ul>
                )}
              </details>
            )}
          </section>

          <section className="wt-card">
            <div className="wt-head">
              <div className="wt-k">{viewing ? 'Tekst ucznia' : 'Twój tekst'}</div>
              <div className={'wt-count ' + wState}>{words} {words === 1 ? 'wyraz' : 'wyrazów'} <span>/ {range[0]}–{range[1]}</span></div>
            </div>

            {viewing ? (
              sub && sub.body ? <div className="wt-read">{task.start && <span className="wt-given">{task.start}{'\n'}</span>}{sub.body}</div> : <p className="wt-muted">Uczeń jeszcze nie zaczął pisać tego tekstu.</p>
            ) : (
              <>
                {task.start && <div className="wt-start" lang="en" aria-label="Początek wypowiedzi">{task.start}</div>}
                <textarea className={'wt-area' + (task.start ? ' wt-area-cont' : '')} lang="en" spellCheck={false} value={body} readOnly={!canEdit}
                  onChange={(e) => onChange(e.target.value)} placeholder={task.start ? 'Pisz dalej…' : 'Zacznij pisać tutaj…'} aria-label="Twój tekst"
                  onPaste={(e) => blokujWklejanie(e, e.clipboardData && e.clipboardData.getData('text'))}
                  onDrop={(e) => blokujWklejanie(e, e.dataTransfer && e.dataTransfer.getData('text'))} />
                <div className="wt-status">
                  {!user ? <span>Tekst zapisuje się tylko w tej przeglądarce. <a href={'/logowanie?powrot=' + encodeURIComponent('matura/' + slug)}>Zaloguj się</a>, żeby zapisać go na swoim koncie.</span>
                    : graded ? <span>Lektor ocenił ten tekst {sub.graded_at ? fmtTime(sub.graded_at) : ''}. Nie można go już zmieniać.</span>
                      : saveState === 'saving' ? <span>Zapisuję…</span>
                        : saveState === 'error' ? <span className="wt-err">Nie udało się zapisać. Sprawdź połączenie.</span>
                          : savedAt ? <span>Zapisano {fmtTime(savedAt)}</span> : <span>Tekst zapisuje się sam podczas pisania.</span>}
                </div>
                {user && !graded && (
                  <div className="wt-actions">
                    {submitted && <span className="wt-pill">{hasTeacher ? 'Oddane do sprawdzenia' : 'Zapisane jako gotowe'}</span>}
                    <button type="button" className="wt-btn" disabled={busy} onClick={onFinal}>
                      {hasTeacher ? (submitted ? 'Oddaj poprawioną wersję' : 'Oddaj do sprawdzenia') : (submitted ? 'Zapisz zmiany' : 'Zapisz jako gotowe')}
                    </button>
                  </div>
                )}
                {submitted && hasTeacher && <p className="wt-muted">Dopóki lektor nie oceni tekstu, możesz go poprawiać. Zmiany zapisują się same.</p>}
                {msg && <p className="wt-msg">{msg}</p>}
              </>
            )}
          </section>

          {/* Ocena: uczeń widzi ją po sprawdzeniu, lektor wystawia ją w podglądzie */}
          {graded && !viewing && (
            <section className="wt-card wt-grade">
              <div className="wt-head">
                <div className="wt-k">Ocena lektora</div>
                <div className="wt-total">{sub.score}<small>/{sub.score_max}</small></div>
              </div>
              <table className="wt-crit"><tbody>
                {crit.map(([k, label, max]) => <tr key={k}><td>{label}</td><td>{(sub.scores || {})[k] ?? '–'} / {max}</td></tr>)}
              </tbody></table>
              {sub.feedback && <div className="wt-fb"><div className="wt-k">Komentarz</div><p>{sub.feedback}</p></div>}
            </section>
          )}

          {viewing && (
            <section className="wt-card wt-grade">
              <div className="wt-head">
                <div className="wt-k">{graded ? 'Ocena (możesz ją zmienić)' : 'Oceń wypracowanie'}</div>
                <div className="wt-total">{crit.reduce((a, [k]) => a + (Number(scores[k]) || 0), 0)}<small>/{maxTotal}</small></div>
              </div>
              {!sub || sub.status === 'draft' ? (
                <p className="wt-muted">{sub ? 'Uczeń jeszcze nie oddał tego tekstu. Ocenić można dopiero oddane wypracowanie.' : 'Uczeń jeszcze nie napisał tego tekstu.'}</p>
              ) : (
                <>
                  <div className="wt-crit-form">
                    {crit.map(([k, label, max]) => (
                      <div className="wt-crit-row" key={k}>
                        <span>{label}</span>
                        <div className="wt-pts" role="group" aria-label={label}>
                          {Array.from({ length: max + 1 }, (_, i) => (
                            <button type="button" key={i} className={Number(scores[k]) === i && scores[k] !== undefined && scores[k] !== '' ? 'on' : ''}
                              onClick={() => setScores((p) => ({ ...p, [k]: i }))}>{i}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <label className="wt-k" htmlFor="wtFb">Komentarz dla ucznia</label>
                  <textarea id="wtFb" className="wt-area wt-fb-area" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Co poszło dobrze, co poprawić następnym razem…" />
                  <div className="wt-actions">
                    <button type="button" className="wt-btn" disabled={busy} onClick={onGrade}>{graded ? 'Zapisz zmiany w ocenie' : 'Zapisz ocenę'}</button>
                  </div>
                  <p className="wt-muted">Po zapisaniu oceny uczeń nie może już zmieniać tekstu. Punkty pojawią się też w Panelu lektora.</p>
                  {gradeMsg && <p className="wt-msg">{gradeMsg}</p>}
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

const CSS = `
.wt{ max-width:1120px; margin:18px auto 0; padding:0 16px; display:grid; gap:18px; }
.wt-card{ background:#fff; border:1px solid #ebe6dc; border-radius:20px; padding:22px 24px; }
.wt-k{ display:block; font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; color:#ca4490; margin-bottom:10px; }
.wt-sit{ font-size:17px; line-height:1.6; margin:0 0 10px; }
.wt-lead{ font-size:17px; line-height:1.6; margin:0 0 8px; font-weight:600; }
.wt-bul{ margin:0 0 12px; padding-left:22px; font-size:16.5px; line-height:1.6; }
.wt-bul li{ margin:4px 0; }
.wt-note{ font-size:15.5px; line-height:1.55; color:#4f4959; margin:6px 0 0; }
.wt-help{ margin-top:14px; border-top:1px solid #efeae1; padding-top:12px; }
.wt-help summary{ cursor:pointer; font-weight:600; font-size:15.5px; }
.wt-tip{ font-size:15px; line-height:1.55; color:#4f4959; background:#fbfaf6; border-radius:12px; padding:10px 14px; }
.wt-phr{ list-style:none; padding:0; margin:8px 0 0; display:grid; gap:6px; }
.wt-phr li{ display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:15px; padding:6px 0; border-bottom:1px dashed #ebe6dc; }
.wt-phr li span:first-child{ font-weight:600; }
.wt-phr li span:last-child{ color:#7a7385; }
.wt-head{ display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap; }
.wt-count{ font-size:15px; font-weight:700; color:#7a7385; }
.wt-count span{ font-weight:500; }
.wt-count.ok{ color:#1e7e50; } .wt-count.low, .wt-count.high{ color:#b4662a; }
.wt-area{ width:100%; box-sizing:border-box; min-height:320px; resize:vertical; border:1.5px solid #ddd6e6; border-radius:14px; padding:14px 16px; font-family:'Outfit',system-ui,sans-serif; font-size:17px; line-height:1.65; color:#1d1a22; background:#fffdf8; }
.wt-start{ white-space:pre-wrap; font-size:17px; line-height:1.65; color:#4f4959; background:#f6f3ee; border:1.5px solid #ddd6e6; border-bottom:none; border-radius:14px 14px 0 0; padding:14px 16px 10px; font-style:italic; }
.wt-area-cont{ border-radius:0 0 14px 14px; border-top-style:dashed; }
.wt-given{ color:#7a7385; font-style:italic; }
html.eg-dark .wt-start{ background:#1a1b26; border-color:#41435c; color:#a29caf; }
.wt-area:focus{ outline:none; border-color:#ca4490; box-shadow:0 0 0 3px rgba(202,68,144,.14); }
.wt-area[readonly]{ background:#f6f3ee; }
.wt-fb-area{ min-height:120px; font-size:16px; }
.wt-read{ white-space:pre-wrap; font-size:17px; line-height:1.7; background:#fffdf8; border:1px solid #ebe6dc; border-radius:14px; padding:14px 16px; }
.wt-status{ margin-top:8px; font-size:14px; color:#7a7385; }
.wt-status a{ color:#ca4490; font-weight:600; }
.wt-err{ color:#b4342a; }
.wt-actions{ display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:10px; margin-top:12px; }
.wt-btn{ display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:0 22px; border-radius:12px; border:none; background:#ca4490; color:#fff !important; font-family:'Outfit',sans-serif; font-size:16px; font-weight:600; cursor:pointer; text-decoration:none; }
.wt-btn:hover{ background:#b13a7e; }
.wt-btn:disabled{ opacity:.6; cursor:default; }
.wt-ghost{ background:transparent; color:#1d1a22 !important; border:1.5px solid #1d1a22; }
.wt-ghost:hover{ background:#1d1a22; color:#fff !important; }
.wt-btns{ display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
.wt-pill{ font-size:13px; font-weight:700; color:#1e7e50; background:#eaf7f0; padding:5px 12px; border-radius:999px; }
.wt-msg{ margin:10px 0 0; font-size:15px; font-weight:600; color:#1e7e50; }
.wt-tip{ position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:9999; background:#2c2540; color:#fff; font-family:'Outfit',sans-serif; font-weight:600; font-size:14px; padding:10px 18px; border-radius:999px; box-shadow:0 6px 18px rgba(0,0,0,.18); opacity:0; transition:opacity .2s; pointer-events:none; max-width:90vw; text-align:center; }
.wt-tip.on{ opacity:1; }
.wt-muted{ font-size:14.5px; color:#7a7385; margin:8px 0 0; }
.wt-lock h2{ font-family:'Playfair Display',Georgia,serif; font-size:28px; margin:0 0 8px; }
.wt-total{ font-family:'Playfair Display',Georgia,serif; font-size:34px; font-weight:800; }
.wt-total small{ font-size:18px; color:#7a7385; }
.wt-crit{ width:100%; border-collapse:collapse; font-size:16px; margin-top:6px; }
.wt-crit td{ padding:8px 0; border-bottom:1px solid #efeae1; }
.wt-crit td:last-child{ text-align:right; font-weight:700; }
.wt-fb{ margin-top:14px; } .wt-fb p{ white-space:pre-wrap; font-size:16px; line-height:1.6; margin:0; }
.wt-crit-form{ display:grid; gap:10px; margin:6px 0 16px; }
.wt-crit-row{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; font-size:16px; }
.wt-pts{ display:inline-flex; gap:6px; }
.wt-pts button{ min-width:40px; min-height:40px; border-radius:10px; border:1.5px solid #ddd6e6; background:#fff; font-family:'Outfit',sans-serif; font-size:16px; font-weight:600; cursor:pointer; color:#1d1a22; }
.wt-pts button.on{ background:#ca4490; border-color:#ca4490; color:#fff; }
.wt-view{ position:sticky; top:0; z-index:45; display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; padding:12px 14px 12px 18px; background:#1d1a22; color:#fff; border-radius:14px; box-shadow:0 10px 24px rgba(29,26,34,.18); }
.wt-view-k{ font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; color:#1d1a22; background:#f6f1ae; padding:4px 10px; border-radius:999px; }
.wt-view-t{ font-size:15.5px; flex:1 1 220px; }
.wt-view-t strong{ font-family:'Playfair Display',Georgia,serif; font-size:19px; font-weight:800; }
.wt-view-x{ min-height:40px; padding:0 14px; border:1.5px solid #fff; border-radius:999px; background:transparent; color:#fff; font-family:'Outfit',sans-serif; font-size:14.5px; font-weight:600; cursor:pointer; }
.wt-view-x:hover{ background:#fff; color:#1d1a22; }
html.eg-dark .wt-card{ background:#24263a; border-color:#363850; color:#e8e6ef; }
html.eg-dark .wt-note, html.eg-dark .wt-tip, html.eg-dark .wt-muted, html.eg-dark .wt-status, html.eg-dark .wt-phr li span:last-child{ color:#a29caf; }
html.eg-dark .wt-tip{ background:#1f2132; }
html.eg-dark .wt-area, html.eg-dark .wt-read{ background:#1f2132; color:#e8e6ef; border-color:#41435c; }
html.eg-dark .wt-area[readonly]{ background:#1a1b26; }
html.eg-dark .wt-pts button{ background:#1f2132; color:#e8e6ef; border-color:#41435c; }
html.eg-dark .wt-pts button.on{ background:#ca4490; border-color:#ca4490; color:#fff; }
html.eg-dark .wt-ghost{ color:#e8e6ef !important; border-color:#e8e6ef; }
html.eg-dark .wt-view{ background:#e8e6ef; color:#1a1b26; }
html.eg-dark .wt-view-x{ border-color:#1a1b26; color:#1a1b26; }
html.eg-dark .wt-crit td, html.eg-dark .wt-help, html.eg-dark .wt-phr li{ border-color:#363850; }
@media (max-width:600px){ .wt-card{ padding:18px 16px; } .wt-phr li{ grid-template-columns:1fr; gap:2px; } .wt-view{ border-radius:0 0 14px 14px; margin:0 -16px; } }
`;
