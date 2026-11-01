'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// Matura ustna (Oral exam). Bez nagrywania: uczeń ćwiczy na głos, sam albo z lektorem na lekcji.
// Cztery części egzaminu: rozmowa wstępna, rozmowa z odgrywaniem roli, opis ilustracji,
// wypowiedź na podstawie materiału stymulującego (wybór 1 z 3 ilustracji).
// Pytania egzaminującego są domyślnie zakryte — jak na egzaminie, uczeń poznaje je dopiero w trakcie.

const PARTS = {
  o_intro: {
    title: 'Rozmowa wstępna',
    lead: 'Egzaminujący zadaje Ci kilka pytań o Ciebie, Twoje życie i zainteresowania. Odpowiadaj pełnymi zdaniami i rozwijaj odpowiedzi: dodaj powód albo przykład.',
  },
  o_role: {
    title: 'Rozmowa z odgrywaniem roli',
    lead: 'Przeczytaj opis sytuacji. W rozmowie musisz omówić wszystkie cztery kwestie. Rozmowę rozpoczyna egzaminujący.',
  },
  o_picture: {
    title: 'Opis ilustracji',
    lead: 'Opisz ilustrację, a potem odpowiedz na trzy pytania egzaminującego.',
  },
  o_stimulus: {
    title: 'Wypowiedź na podstawie materiału stymulującego',
    lead: 'Przeczytaj opis sytuacji i obejrzyj ilustracje. Wybierz propozycję, która Twoim zdaniem jest najlepsza, i uzasadnij swój wybór. Wyjaśnij, dlaczego odrzucasz pozostałe. Potem odpowiedz na dwa pytania egzaminującego.',
  },
};

function fmt(s) {
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}

export default function OralTask({ slug, task: partKey }) {
  const [ready, setReady] = useState(false);
  const [d, setD] = useState(null);
  const [user, setUser] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [showQ, setShowQ] = useState(false);
  const [qi, setQi] = useState(0);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState('');
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);
  const tick = useRef(null);

  const part = PARTS[partKey] || PARTS.o_picture;

  useEffect(() => {
    (async () => {
      let session = null;
      try { const r = await supabase.auth.getSession(); session = r.data.session; } catch (e) {}
      const g = await supabase.from('games').select('id').eq('slug', slug).maybeSingle();
      if (g.data && g.data.id) {
        const tc = await supabase.from('task_content').select('data').eq('game_id', g.data.id).maybeSingle();
        if (tc.data && tc.data.data) setD(tc.data.data);
      }
      if (session) {
        setUser(session.user);
        let sv = null;
        try { sv = JSON.parse(sessionStorage.getItem('egSvViewing') || 'null'); } catch (e) {}
        const pr = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
        const isTeacher = pr.data && pr.data.role === 'teacher';
        const who = isTeacher && sv && sv.id && sv.id !== session.user.id ? sv.id : session.user.id;
        if (who !== session.user.id) setViewing({ id: sv.id, name: sv.name || 'Uczeń' });
        const c = await supabase.from('game_completions').select('game_slug').eq('user_id', who).eq('game_slug', slug).maybeSingle();
        setDone(!!c.data);
      }
      setReady(true);
    })();
    return () => clearInterval(tick.current);
  }, [slug]);

  function toggleTimer() {
    if (running) { clearInterval(tick.current); setRunning(false); return; }
    setRunning(true);
    tick.current = setInterval(() => setSec((s) => s + 1), 1000);
  }

  async function markDone() {
    if (!user) return;
    const r = await supabase.rpc('save_completion', { p_game_slug: slug });
    if (r.error) { setMsg('Nie udało się zapisać. Spróbuj ponownie.'); return; }
    setDone(true); setMsg('Zapisane jako zrobione.');
  }

  function exitView() {
    try { sessionStorage.removeItem('egSvViewing'); } catch (e) {}
    window.location.reload();
  }

  if (!ready) return <div className="ot"><style dangerouslySetInnerHTML={{ __html: CSS }} /><p className="ot-muted">Wczytujemy zestaw…</p></div>;

  const questions = (d && d.questions) || [];
  const images = (d && d.images) || [];

  return (
    <div className="ot">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {viewing && (
        <div className="ot-view" role="status">
          <span className="ot-view-k">Podgląd ucznia</span>
          <span className="ot-view-t">Widzisz stronę oczami: <strong>{viewing.name}</strong>{done ? ' · zrobione' : ''}</span>
          <button type="button" className="ot-view-x" onClick={exitView}>Zamknij podgląd <span aria-hidden="true">×</span></button>
        </div>
      )}

      {!d ? (
        <section className="ot-card">
          <div className="ot-k">Od redakcji</div>
          <h2 className="ot-h">Ten zestaw jest w pełnej wersji</h2>
          <p>Pierwszy zestaw w każdej części matury ustnej jest darmowy, a resztę odblokujesz w pełnej wersji EasyWonders. Przez 14 dni możesz ją sprawdzić za darmo, bez podpinania karty.</p>
          <div className="ot-btns">
            <a className="ot-btn" href="/oferta">{user ? 'Rozpocznij 14 dni za darmo' : 'Wypróbuj za darmo'}</a>
            {!user && <a className="ot-btn ot-ghost" href={'/logowanie?powrot=' + encodeURIComponent('matura/' + slug)}>Mam konto, zaloguj się</a>}
          </div>
        </section>
      ) : (
        <>
          <section className="ot-card">
            <div className="ot-k">{part.title}</div>
            <p className="ot-lead">{part.lead}</p>
            {d.situation && <p className="ot-sit">{d.situation}</p>}
            {Array.isArray(d.elements) && d.elements.length > 0 && (
              <ol className="ot-el">{d.elements.map((x, i) => <li key={i}>{x}</li>)}</ol>
            )}

            {images.length === 1 && (
              <figure className="ot-fig ot-fig-one">
                {images[0].url ? <img src={images[0].url} alt={images[0].hint || 'Ilustracja'} /> : <div className="ot-ph">Ilustracja w przygotowaniu{images[0].hint ? ': ' + images[0].hint : ''}</div>}
              </figure>
            )}
            {images.length > 1 && (
              <div className="ot-grid">
                {images.map((im, i) => (
                  <figure className="ot-fig" key={i}>
                    <div className="ot-num">{i + 1}</div>
                    {im.url ? <img src={im.url} alt={im.label || im.hint || 'Ilustracja ' + (i + 1)} /> : <div className="ot-ph">Ilustracja w przygotowaniu{im.hint ? ': ' + im.hint : ''}</div>}
                    {im.label && <figcaption>{im.label}</figcaption>}
                  </figure>
                ))}
              </div>
            )}

            <div className="ot-timer">
              <span>Stoper: <strong>{fmt(sec)}</strong></span>
              <button type="button" className="ot-btn ot-small" onClick={toggleTimer}>{running ? 'Zatrzymaj' : sec ? 'Wznów' : 'Start'}</button>
              {sec > 0 && !running && <button type="button" className="ot-link" onClick={() => setSec(0)}>wyzeruj</button>}
            </div>
          </section>

          {(questions.length > 0 || (d.examiner && d.examiner.length > 0)) && (
            <section className="ot-card">
              <div className="ot-k">{partKey === 'o_role' ? 'Kwestie egzaminującego' : 'Pytania egzaminującego'}</div>
              {!showQ ? (
                <>
                  <p className="ot-muted">{partKey === 'o_intro' ? 'Pytania pojawiają się po kolei, jak na egzaminie.' : partKey === 'o_role' ? 'Zakryte, żeby rozmowa była jak na egzaminie. Odsłoń je, gdy ćwiczysz z kimś, kto zagra egzaminującego.' : 'Odsłoń je, gdy skończysz swoją wypowiedź.'}</p>
                  <button type="button" className="ot-btn" onClick={() => { setShowQ(true); setQi(0); }}>{partKey === 'o_intro' ? 'Pokaż pierwsze pytanie' : 'Odsłoń'}</button>
                </>
              ) : partKey === 'o_intro' ? (
                <>
                  <p className="ot-q" lang="en">{questions[qi]}</p>
                  <div className="ot-btns">
                    {qi < questions.length - 1
                      ? <button type="button" className="ot-btn" onClick={() => setQi(qi + 1)}>Następne pytanie ({qi + 2}/{questions.length})</button>
                      : <span className="ot-muted">To ostatnie pytanie.</span>}
                    <button type="button" className="ot-link" onClick={() => setShowQ(false)}>zakryj</button>
                  </div>
                </>
              ) : (
                <>
                  {partKey === 'o_role' && d.examiner_start && <p className="ot-q" lang="en">„{d.examiner_start}”</p>}
                  <ol className="ot-qs" lang="en">{(partKey === 'o_role' ? (d.examiner || []) : questions).map((q, i) => <li key={i}>{q}</li>)}</ol>
                  <button type="button" className="ot-link" onClick={() => setShowQ(false)}>zakryj</button>
                </>
              )}
            </section>
          )}

          {(d.tip || (Array.isArray(d.phrases) && d.phrases.length > 0)) && (
            <section className="ot-card">
              <details className="ot-help">
                <summary>Wskazówka i przydatne zwroty</summary>
                {d.tip && <p className="ot-tip">{d.tip}</p>}
                {Array.isArray(d.phrases) && d.phrases.length > 0 && (
                  <ul className="ot-phr">{d.phrases.map((p, i) => <li key={i}><span lang="en">{p[0]}</span><span>{p[1]}</span></li>)}</ul>
                )}
              </details>
            </section>
          )}

          {!viewing && (
            <div className="ot-actions">
              {user
                ? (done ? <span className="ot-pill">Zrobione</span> : <button type="button" className="ot-btn" onClick={markDone}>Oznacz jako zrobione</button>)
                : <span className="ot-muted"><a href={'/logowanie?powrot=' + encodeURIComponent('matura/' + slug)}>Zaloguj się</a>, żeby zapisywać postępy.</span>}
              {msg && <span className="ot-msg">{msg}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const CSS = `
.ot{ max-width:1120px; margin:18px auto 0; padding:0 16px; display:grid; gap:18px; }
.ot-card{ background:#fff; border:1px solid #ebe6dc; border-radius:20px; padding:22px 24px; font-size:16.5px; line-height:1.6; }
.ot-k{ display:block; font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; color:#ca4490; margin-bottom:10px; }
.ot-h{ font-family:'Playfair Display',Georgia,serif; font-size:28px; margin:0 0 8px; }
.ot-lead{ margin:0 0 10px; color:#4f4959; }
.ot-sit{ font-size:17.5px; font-weight:600; margin:0 0 10px; }
.ot-el{ margin:0 0 10px; padding-left:24px; font-size:17px; } .ot-el li{ margin:4px 0; }
.ot-fig{ margin:0; position:relative; }
.ot-fig img{ display:block; width:100%; height:auto; border-radius:14px; border:1px solid #ebe6dc; }
.ot-fig-one{ max-width:720px; margin:6px auto 4px; }
.ot-grid{ display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; margin-top:8px; }
.ot-grid .ot-fig img{ aspect-ratio:4/3; object-fit:cover; }
.ot-num{ position:absolute; top:10px; left:10px; width:32px; height:32px; border-radius:999px; background:#1d1a22; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; }
.ot-fig figcaption{ margin-top:6px; font-size:15px; font-weight:600; }
.ot-ph{ display:flex; align-items:center; justify-content:center; text-align:center; aspect-ratio:4/3; border:2px dashed #d8d0c4; border-radius:14px; padding:14px; color:#7a7385; font-size:14.5px; background:#fbfaf6; }
.ot-timer{ display:flex; align-items:center; gap:12px; margin-top:16px; padding-top:14px; border-top:1px solid #efeae1; font-size:15.5px; }
.ot-timer strong{ font-variant-numeric:tabular-nums; font-size:18px; }
.ot-q{ font-size:20px; font-weight:600; margin:0 0 12px; }
.ot-qs{ margin:0 0 10px; padding-left:24px; font-size:17.5px; } .ot-qs li{ margin:6px 0; }
.ot-btn{ display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:0 22px; border-radius:12px; border:none; background:#ca4490; color:#fff !important; font-family:'Outfit',sans-serif; font-size:16px; font-weight:600; cursor:pointer; text-decoration:none; }
.ot-btn:hover{ background:#b13a7e; }
.ot-small{ min-height:38px; padding:0 16px; font-size:14.5px; }
.ot-ghost{ background:transparent; color:#1d1a22 !important; border:1.5px solid #1d1a22; }
.ot-btns{ display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-top:12px; }
.ot-link{ background:none; border:none; padding:0; font-family:inherit; font-size:14.5px; color:#7a7385; text-decoration:underline; cursor:pointer; }
.ot-muted{ color:#7a7385; font-size:15px; margin:0 0 12px; }
.ot-muted a{ color:#ca4490; font-weight:600; }
.ot-help summary{ cursor:pointer; font-weight:600; }
.ot-tip{ background:#fbfaf6; border-radius:12px; padding:10px 14px; color:#4f4959; font-size:15px; }
.ot-phr{ list-style:none; padding:0; margin:8px 0 0; display:grid; gap:6px; }
.ot-phr li{ display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:15px; padding:6px 0; border-bottom:1px dashed #ebe6dc; }
.ot-phr li span:first-child{ font-weight:600; } .ot-phr li span:last-child{ color:#7a7385; }
.ot-actions{ display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:12px; }
.ot-pill{ font-size:14px; font-weight:700; color:#1e7e50; background:#eaf7f0; padding:7px 14px; border-radius:999px; }
.ot-msg{ font-size:15px; font-weight:600; color:#1e7e50; }
.ot-view{ position:sticky; top:0; z-index:45; display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; padding:12px 14px 12px 18px; background:#1d1a22; color:#fff; border-radius:14px; box-shadow:0 10px 24px rgba(29,26,34,.18); }
.ot-view-k{ font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; color:#1d1a22; background:#f6f1ae; padding:4px 10px; border-radius:999px; }
.ot-view-t{ font-size:15.5px; flex:1 1 220px; }
.ot-view-t strong{ font-family:'Playfair Display',Georgia,serif; font-size:19px; font-weight:800; }
.ot-view-x{ min-height:40px; padding:0 14px; border:1.5px solid #fff; border-radius:999px; background:transparent; color:#fff; font-family:'Outfit',sans-serif; font-size:14.5px; font-weight:600; cursor:pointer; }
.ot-view-x:hover{ background:#fff; color:#1d1a22; }
html.eg-dark .ot-card{ background:#24263a; border-color:#363850; color:#e8e6ef; }
html.eg-dark .ot-lead, html.eg-dark .ot-muted, html.eg-dark .ot-tip, html.eg-dark .ot-phr li span:last-child{ color:#a29caf; }
html.eg-dark .ot-tip, html.eg-dark .ot-ph{ background:#1f2132; border-color:#41435c; color:#a29caf; }
html.eg-dark .ot-num{ background:#e8e6ef; color:#1a1b26; }
html.eg-dark .ot-ghost{ color:#e8e6ef !important; border-color:#e8e6ef; }
html.eg-dark .ot-timer, html.eg-dark .ot-phr li{ border-color:#363850; }
html.eg-dark .ot-view{ background:#e8e6ef; color:#1a1b26; }
html.eg-dark .ot-view-x{ border-color:#1a1b26; color:#1a1b26; }
@media (max-width:700px){ .ot-grid{ grid-template-columns:1fr; } .ot-card{ padding:18px 16px; } .ot-phr li{ grid-template-columns:1fr; gap:2px; } .ot-view{ border-radius:0 0 14px 14px; margin:0 -16px; } }
`;
