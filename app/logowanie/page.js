'use client';
import { useEffect, useRef, useState } from 'react';

// Logowanie NA gry.easygo-english.pl — sesja zapisuje się pod tą domeną,
// dzięki czemu katalog (na tej samej domenie) widzi zalogowanego użytkownika.
const SUPABASE_URL = 'https://svjrdyxwqznbzxqeytdn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TNCq1UAMAvLO0Z5Mt8QOig_OvsxhhyJ';
const REDIRECT_AFTER = 'https://gry.easygo-english.pl/';

export default function Logowanie() {
  const [mode, setMode] = useState('login');       // 'login' | 'signup'
  const [role, setRole] = useState('student');     // 'student' | 'teacher'
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState(null);        // baner powrotu z oferty
  const emailRef = useRef(null);
  const passRef = useRef(null);
  const sbRef = useRef(null);

  // wczytaj supabase-js z CDN i utwórz klienta
  useEffect(() => {
    function init() {
      if (window.supabase && !sbRef.current) {
        sbRef.current = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        // jeśli już zalogowany — przekieruj od razu
        sbRef.current.auth.getSession().then(function (r) {
          if (r && r.data && r.data.session) window.location.href = REDIRECT_AFTER;
        });
      }
    }
    if (window.supabase) { init(); }
    else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = init;
      document.head.appendChild(s);
    }
    // obsługa parametrów: ?rejestracja, ?rola=lektor/uczen, ?powrot=oferta
    const qs = window.location.search || '';
    const params = new URLSearchParams(qs);
    if (qs.indexOf('rejestracja') !== -1 || window.location.hash.indexOf('rejestracja') !== -1) setMode('signup');
    const rola = params.get('rola');
    if (rola === 'lektor') setRole('teacher');
    if (rola === 'uczen') setRole('student');
    if (params.get('powrot') === 'oferta') {
      setMode('signup');
      setOffer(rola === 'lektor'
        ? { title: 'Zakładasz konto lektora.', text: 'Najpierw zarejestruj się poniżej (rola „Lektor” jest już wybrana), a potem dokończysz płatność. Wybrany plan jest zapamiętany.' }
        : { title: 'Zakładasz konto indywidualne.', text: 'Najpierw zarejestruj się poniżej (rola „Uczeń” jest już wybrana), a potem dokończysz płatność. Wybrany plan jest zapamiętany.' });
    }
  }, []);

  function backTarget() {
    const params = new URLSearchParams(window.location.search || '');
    return params.get('powrot') === 'oferta' ? 'https://easygo-english.pl/oferta.html' : REDIRECT_AFTER;
  }

  async function submit() {
    const sb = sbRef.current;
    if (!sb) { setMsg({ text: 'Chwila, ładuję… spróbuj ponownie za sekundę.', type: 'err' }); return; }
    const email = (emailRef.current.value || '').trim();
    const password = passRef.current.value || '';
    if (!email || !password) { setMsg({ text: 'Podaj e-mail i hasło.', type: 'err' }); return; }
    if (mode === 'signup' && password.length < 6) { setMsg({ text: 'Hasło musi mieć co najmniej 6 znaków.', type: 'err' }); return; }
    setBusy(true); setMsg({ text: '', type: '' });
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMsg({ text: 'Zalogowano! Przekierowuję…', type: 'ok' });
        setTimeout(() => { window.location.href = backTarget(); }, 800);
      } else {
        const { error } = await sb.auth.signUp({
          email, password,
          options: { data: { role: role }, emailRedirectTo: backTarget() },
        });
        if (error) throw error;
        setMsg({ text: 'Konto utworzone! Sprawdź e-mail, żeby potwierdzić adres.', type: 'ok' });
      }
    } catch (err) {
      let m = err.message || 'Coś poszło nie tak.';
      if (/Invalid login credentials/i.test(m)) m = 'Nieprawidłowy e-mail lub hasło. Jeśli zakładasz konto przez Google, użyj przycisku „Kontynuuj z Google” zamiast hasła.';
      if (/already registered/i.test(m)) m = 'To konto już istnieje. Zaloguj się.';
      if (/Email not confirmed/i.test(m)) m = 'Potwierdź najpierw e-mail (sprawdź skrzynkę).';
      setMsg({ text: m, type: 'err' });
    } finally { setBusy(false); }
  }

  async function google() {
    const sb = sbRef.current;
    if (!sb) return;
    setMsg({ text: '', type: '' });
    try {
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT_AFTER } });
      if (error) throw error;
    } catch (err) {
      setMsg({ text: 'Logowanie Google nie jest jeszcze skonfigurowane.', type: 'err' });
    }
  }

  async function forgot(e) {
    e.preventDefault();
    const sb = sbRef.current;
    if (!sb) return;
    const email = (emailRef.current.value || '').trim();
    if (!email) { setMsg({ text: 'Wpisz najpierw swój adres e-mail powyżej, a wyślemy link do zmiany hasła.', type: 'err' }); emailRef.current.focus(); return; }
    const r = await sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://gry.easygo-english.pl/konto?reset=1' });
    if (r.error) { setMsg({ text: 'Nie udało się wysłać linku: ' + r.error.message, type: 'err' }); return; }
    setMsg({ text: 'Wysłaliśmy link do zmiany hasła na ' + email + '. Sprawdź skrzynkę (także spam).', type: 'ok' });
  }

  const roleBtn = (r, label) => (
    <button type="button" className={role === r ? 'active' : ''} data-role={r} onClick={() => setRole(r)}>{label}</button>
  );

  return (
    <div className="eg-wrap">
      <style>{CSS}</style>
      <div className="eg-card">
        <div className="eg-brand">
          <div className="eg-brand-name">EasyGo</div>
          <div className="eg-brand-tag"><span className="eg-underline">Gry i zadania interaktywne</span></div>
        </div>
        <div className="eg-sub">{mode === 'login' ? 'Zaloguj się, żeby korzystać z zadań' : 'Załóż konto i zacznij naukę'}</div>

        {offer && (
          <div className="eg-offer-banner">
            <strong>{offer.title}</strong>
            <span>{offer.text}</span>
          </div>
        )}

        <div className="eg-tabs">
          <button className={'eg-tab' + (mode === 'login' ? ' active' : '')} onClick={() => { setMode('login'); setMsg({ text: '', type: '' }); }}>Logowanie</button>
          <button className={'eg-tab' + (mode === 'signup' ? ' active' : '')} onClick={() => { setMode('signup'); setMsg({ text: '', type: '' }); }}>Załóż konto</button>
        </div>

        {mode === 'signup' && (
          <div className="eg-role">
            <label>Zakładam konto jako:</label>
            <div className="eg-role-opts">
              {roleBtn('student', 'Uczeń')}
              {roleBtn('teacher', 'Lektor')}
            </div>
          </div>
        )}

        <div className="eg-field">
          <label htmlFor="egEmail">E-mail</label>
          <input ref={emailRef} type="email" id="egEmail" autoComplete="email" placeholder="twoj@email.pl"
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </div>
        <div className="eg-field">
          <label htmlFor="egPass">Hasło</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input ref={passRef} type={showPass ? 'text' : 'password'} id="egPass"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••" style={{ width: '100%' }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            <button type="button" aria-label="Pokaż hasło" onClick={() => setShowPass(!showPass)}
              style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#9b95a6', padding: 4, display: 'flex' }}>
              <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" fill="currentColor" /></svg>
            </button>
          </div>
        </div>

        <button className="eg-btn" disabled={busy} onClick={submit}>{mode === 'login' ? 'Zaloguj się' : 'Załóż konto'}</button>

        {mode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="#" onClick={forgot} style={{ color: '#6885db', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>Nie pamiętasz hasła?</a>
          </div>
        )}

        <div className="eg-divider">lub</div>

        <button className="eg-google" onClick={google}>
          <svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
          Kontynuuj z Google
        </button>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: '#9b95a6', marginTop: 10, lineHeight: 1.5 }}>
          Jeśli zakładałeś konto przez Google, loguj się zawsze tym przyciskiem — takie konto nie ma osobnego hasła.
        </div>

        {msg.text && <div className={'eg-msg ' + msg.type}>{msg.text}</div>}

        <div className="eg-foot">Problem z logowaniem? <a href="mailto:rozialak@gmail.com">Napisz do nas</a></div>
      </div>
    </div>
  );
}

const CSS = `
  .eg-wrap{ --eg-magenta:#ca4490; --eg-violet:#6885db; --eg-gold:#f4c94c; --eg-ink:#2e2a33; --eg-muted:#7d7788; --eg-line:#eceaf2;
    font-family:'Nunito',sans-serif; color:var(--eg-ink); background:#faf9fc; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .eg-wrap *{ box-sizing:border-box; }
  .eg-card{ background:#fff; border:1px solid var(--eg-line); border-radius:24px; box-shadow:0 18px 50px rgba(46,42,51,.10); width:100%; max-width:420px; padding:38px 34px 32px; }
  .eg-brand{ text-align:center; margin-bottom:6px; }
  .eg-brand-name{ font-family:'Quicksand',sans-serif; font-weight:700; font-size:38px; letter-spacing:-1px; line-height:1.05; color:var(--eg-magenta); }
  .eg-brand-tag{ font-family:'Quicksand',sans-serif; font-weight:700; font-size:19px; letter-spacing:-.3px; color:var(--eg-ink); margin-top:6px; }
  .eg-underline{ background-image:linear-gradient(rgba(244,201,76,.55),rgba(244,201,76,.55)); background-size:100% .22em; background-position:0 88%; background-repeat:no-repeat; -webkit-box-decoration-break:clone; box-decoration-break:clone; }
  .eg-sub{ text-align:center; color:var(--eg-muted); font-size:14.5px; margin-bottom:26px; margin-top:14px; }
  .eg-offer-banner{ background:#faf0f6; border:1.5px solid #f0cde1; border-radius:14px; padding:14px 16px; margin-bottom:22px; font-size:13.5px; line-height:1.5; color:var(--eg-ink); }
  .eg-offer-banner strong{ display:block; color:var(--eg-magenta); margin-bottom:3px; font-size:14.5px; }
  .eg-tabs{ display:flex; gap:6px; background:#f4f2f8; border-radius:12px; padding:4px; margin-bottom:24px; }
  .eg-tab{ flex:1; border:none; background:transparent; font-family:inherit; font-weight:700; font-size:14.5px; color:var(--eg-muted); padding:10px; border-radius:9px; cursor:pointer; transition:background .15s, color .15s; }
  .eg-tab.active{ background:#fff; color:var(--eg-magenta); box-shadow:0 2px 8px rgba(46,42,51,.06); }
  .eg-field{ margin-bottom:16px; }
  .eg-field label{ display:block; font-size:13px; font-weight:700; color:var(--eg-muted); margin-bottom:6px; }
  .eg-field input{ width:100%; font-family:inherit; font-size:15px; color:var(--eg-ink); background:#fff; border:1.5px solid var(--eg-line); border-radius:12px; padding:13px 15px; outline:none; transition:border-color .15s; }
  .eg-field input:focus{ border-color:var(--eg-magenta); }
  .eg-btn{ width:100%; font-family:inherit; font-weight:700; font-size:15.5px; color:#fff; background:var(--eg-magenta); border:none; border-radius:12px; padding:14px; cursor:pointer; transition:filter .15s, transform .1s; margin-top:4px; }
  .eg-btn:hover{ filter:brightness(1.06); }
  .eg-btn:active{ transform:translateY(1px); }
  .eg-btn:disabled{ opacity:.6; cursor:default; }
  .eg-divider{ display:flex; align-items:center; gap:12px; margin:22px 0; color:var(--eg-muted); font-size:13px; }
  .eg-divider::before, .eg-divider::after{ content:''; flex:1; height:1px; background:var(--eg-line); }
  .eg-google{ width:100%; display:flex; align-items:center; justify-content:center; gap:10px; font-family:inherit; font-weight:700; font-size:15px; color:var(--eg-ink); background:#fff; border:1.5px solid var(--eg-line); border-radius:12px; padding:13px; cursor:pointer; transition:border-color .15s, background .15s; }
  .eg-google:hover{ border-color:#d8d4e0; background:#fafafa; }
  .eg-google svg{ width:19px; height:19px; }
  .eg-msg{ margin-top:16px; padding:11px 14px; border-radius:10px; font-size:13.5px; font-weight:600; }
  .eg-msg.err{ background:#fbeded; color:#c0392b; }
  .eg-msg.ok{ background:#eaf7f0; color:#1e7e50; }
  .eg-foot{ text-align:center; margin-top:22px; font-size:12.5px; color:var(--eg-muted); }
  .eg-foot a{ color:var(--eg-magenta); text-decoration:none; font-weight:700; }
  .eg-role{ margin-bottom:16px; }
  .eg-role label{ display:block; font-size:13px; font-weight:700; color:var(--eg-muted); margin-bottom:8px; }
  .eg-role-opts{ display:flex; gap:8px; }
  .eg-role-opts button{ flex:1; font-family:inherit; font-weight:700; font-size:13.5px; color:var(--eg-muted); background:#fff; border:1.5px solid var(--eg-line); border-radius:10px; padding:11px 8px; cursor:pointer; transition:all .15s; }
  .eg-role-opts button.active{ background:#fce4ef; border-color:#f4c4dd; color:var(--eg-magenta); }
`;
