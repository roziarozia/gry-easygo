'use client';
import { useEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { analyticsEnabled } from '../PostHogInit';
import { gaEvent } from '../ConsentPixel';

function identifyUser(user, fallbackRole) {
  if (!analyticsEnabled || !user || !user.id) return;
  posthog.identify(user.id, {
    email: user.email,
    role: user.user_metadata && user.user_metadata.role ? user.user_metadata.role : fallbackRole,
  });
}

// Logowanie na TEJ domenie — sesja zapisuje się pod nią,
// dzięki czemu katalog (na tej samej domenie) widzi zalogowanego użytkownika.
const SUPABASE_URL = 'https://svjrdyxwqznbzxqeytdn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TNCq1UAMAvLO0Z5Mt8QOig_OvsxhhyJ';
const REDIRECT_AFTER = '/';   // ścieżka względna — działa pod każdą domeną

export default function Logowanie() {
  const [mode, setMode] = useState('login');       // 'login' | 'signup'
  const [role, setRole] = useState('student');     // 'student' | 'teacher'
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState(null);        // baner powrotu z oferty
  const [sentTo, setSentTo] = useState('');        // po rejestracji: adres, na który wysłaliśmy link
  const [needConfirm, setNeedConfirm] = useState(''); // logowanie na niepotwierdzone konto: adres do ponownej wysyłki
  const [resendState, setResendState] = useState(''); // '' | 'busy' | 'ok' | 'err'
  const emailRef = useRef(null);
  const passRef = useRef(null);
  const sbRef = useRef(null);

  // wczytaj supabase-js z CDN i utwórz klienta
  useEffect(() => {
    function init() {
      if (window.supabase && !sbRef.current) {
        sbRef.current = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        function handleSession(session) {
          identifyUser(session.user);
          try {
            const oauthFlow = sessionStorage.getItem('eg_oauth_flow');
            if (oauthFlow) {
              sessionStorage.removeItem('eg_oauth_flow');
              if (analyticsEnabled) posthog.capture('user_logged_in', { auth_method: 'google' });
              if (oauthFlow === 'signup') gaEvent('sign_up', { method: 'google' });
            }
          } catch (err) {}
          window.location.href = REDIRECT_AFTER;
        }
        // jeśli już zalogowany — przekieruj od razu
        sbRef.current.auth.getSession().then(function (r) {
          if (r && r.data && r.data.session) handleSession(r.data.session);
        });
        // po powrocie z Google token przychodzi w URL i Supabase zapisuje sesję asynchronicznie —
        // nasłuchuj zmiany stanu i przekieruj gdy sesja się pojawi (SIGNED_IN)
        sbRef.current.auth.onAuthStateChange(function (event, session) {
          if (session) handleSession(session);
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
    return params.get('powrot') === 'oferta' ? '/oferta' : REDIRECT_AFTER;
  }

  async function submit() {
    const sb = sbRef.current;
    if (!sb) { setMsg({ text: 'Chwila, ładuję… spróbuj ponownie za sekundę.', type: 'err' }); return; }
    const email = (emailRef.current.value || '').trim();
    const password = passRef.current.value || '';
    if (!email || !password) { setMsg({ text: 'Podaj e-mail i hasło.', type: 'err' }); return; }
    if (mode === 'signup' && password.length < 6) { setMsg({ text: 'Hasło musi mieć co najmniej 6 znaków.', type: 'err' }); return; }
    setBusy(true); setMsg({ text: '', type: '' }); setNeedConfirm(''); setResendState('');
    try {
      if (mode === 'login') {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        identifyUser(data && data.user);
        if (analyticsEnabled) {
          posthog.capture('user_logged_in', {
            auth_method: 'password',
            returned_to_offer: backTarget() === '/oferta',
          });
        }
        setMsg({ text: 'Zalogowano! Przekierowuję…', type: 'ok' });
        setTimeout(() => { window.location.href = backTarget(); }, 800);
      } else {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { role: role }, emailRedirectTo: backTarget() },
        });
        if (error) throw error;
        identifyUser(data && data.user, role);
        gaEvent('sign_up', { method: 'password', account_role: role });
        if (analyticsEnabled) {
          posthog.capture('user_signed_up', {
            auth_method: 'password',
            account_role: role,
            returned_to_offer: backTarget() === '/oferta',
          });
        }
        // zamiast małego komunikatu na dole — osobny, wyraźny ekran „Sprawdź skrzynkę”
        setMsg({ text: '', type: '' });
        setResendState('');
        setSentTo(email);
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e2) { window.scrollTo(0, 0); }
      }
    } catch (err) {
      let m = err.message || 'Coś poszło nie tak.';
      if (/Invalid login credentials/i.test(m)) m = 'Nieprawidłowy e-mail lub hasło. Jeśli zakładasz konto przez Google, użyj przycisku „Kontynuuj z Google” zamiast hasła.';
      if (/already registered/i.test(m)) m = 'To konto już istnieje. Zaloguj się.';
      if (/Email not confirmed/i.test(m)) { m = 'Twój adres e-mail nie jest jeszcze potwierdzony. Kliknij link z wiadomości, którą wysłaliśmy po rejestracji (sprawdź też spam).'; setNeedConfirm(email); }
      setMsg({ text: m, type: 'err' });
      if (analyticsEnabled) posthog.captureException(err, { auth_flow: mode });
    } finally { setBusy(false); }
  }

  // ponowne wysłanie linku potwierdzającego (po rejestracji albo przy próbie logowania na niepotwierdzone konto)
  async function resend(addr) {
    const sb = sbRef.current;
    if (!sb || !addr) return;
    setResendState('busy');
    try {
      const { error } = await sb.auth.resend({ type: 'signup', email: addr, options: { emailRedirectTo: backTarget() } });
      if (error) throw error;
      setResendState('ok');
      if (analyticsEnabled) posthog.capture('signup_email_resent');
    } catch (err) {
      setResendState('err');
      if (analyticsEnabled) posthog.captureException(err, { auth_flow: 'resend_confirmation' });
    }
  }

  async function google() {
    const sb = sbRef.current;
    if (!sb) return;
    setMsg({ text: '', type: '' });
    try {
      // Google musi wrócić na /logowanie (tu jest klient Supabase, który przechwyci token z URL
      // i zapisze sesję pod gry.easygo); stąd useEffect przekieruje dalej na stronę główną.
      try { sessionStorage.setItem('eg_oauth_flow', mode); } catch (err) {}
      if (analyticsEnabled) posthog.capture('oauth_login_started', { auth_provider: 'google', auth_flow: mode });
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/logowanie' } });
      if (error) throw error;
    } catch (err) {
      setMsg({ text: 'Logowanie Google nie jest jeszcze skonfigurowane.', type: 'err' });
      if (analyticsEnabled) posthog.captureException(err, { auth_flow: 'google_oauth' });
    }
  }

  async function forgot(e) {
    e.preventDefault();
    const sb = sbRef.current;
    if (!sb) return;
    const email = (emailRef.current.value || '').trim();
    if (!email) { setMsg({ text: 'Wpisz najpierw swój adres e-mail powyżej, a wyślemy link do zmiany hasła.', type: 'err' }); emailRef.current.focus(); return; }
    const r = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/konto?reset=1' });
    if (r.error) {
      setMsg({ text: 'Nie udało się wysłać linku: ' + r.error.message, type: 'err' });
      if (analyticsEnabled) posthog.captureException(r.error, { auth_flow: 'password_reset' });
      return;
    }
    if (analyticsEnabled) posthog.capture('password_reset_requested');
    setMsg({ text: 'Wysłaliśmy link do zmiany hasła na ' + email + '. Sprawdź skrzynkę (także spam).', type: 'ok' });
  }

  const roleBtn = (r, label) => (
    <button type="button" className={role === r ? 'active' : ''} data-role={r} onClick={() => setRole(r)}>{label}</button>
  );

  const resendInfo = resendState === 'busy' ? 'Wysyłam…'
    : resendState === 'ok' ? 'Gotowe! Wysłaliśmy nowy link. Sprawdź skrzynkę.'
    : resendState === 'err' ? 'Nie udało się wysłać. Odczekaj minutę i spróbuj ponownie.' : '';

  return (
    <div className="eg-wrap">
      <style>{CSS}</style>
      <div className="eg-shell">
        {/* LEWA KARTA — powitanie */}
        <aside className="eg-hello">
          <a className="eg-logo" href="/" title="Powrót na stronę główną"><span className="e">Easy</span><span className="w">Wonders</span></a>
          <h1 className="eg-hello-h">Witaj w EasyWonders <span className="eg-heart">&#9829;</span></h1>
          <p className="eg-hello-lead">{mode === 'login'
            ? 'Miło nam, że wracasz. Zaloguj się i ćwicz dalej, a my zadbamy o Twoje postępy.'
            : 'Załóż konto i ucz się angielskiego w swoim tempie, z ćwiczeniami, które sprawdzają się same.'}</p>
          <ul className="eg-hello-list">
            <li>Gramatyka, słownictwo, czytanki, słuchanki i speaking od A1 do C1</li>
            <li>Każde ćwiczenie od razu pokazuje wynik i tłumaczy błędy</li>
            <li>Twoje postępy i wyniki zapisują się na koncie</li>
            <li>Lektorzy zadają pracę domową i śledzą postępy uczniów</li>
          </ul>
        </aside>

        {/* PRAWA KARTA — logowanie / rejestracja / potwierdzenie */}
        <main className="eg-card">
          {sentTo ? (
            <div className="eg-sent">
              <div className="eg-sent-badge">Ostatni krok</div>
              <h2 className="eg-sent-h">Sprawdź swoją skrzynkę</h2>
              <p className="eg-sent-p">Wysłaliśmy link potwierdzający na adres:</p>
              <p className="eg-sent-mail">{sentTo}</p>
              <p className="eg-sent-p">Kliknij go, żeby aktywować konto. Potem możesz od razu zacząć ćwiczyć.</p>
              <div className="eg-sent-tip">
                <strong>Nie widzisz wiadomości?</strong>
                <span>Zajrzyj do folderu Spam albo do zakładki Oferty lub Powiadomienia. Wiadomość przychodzi zwykle w ciągu minuty.</span>
              </div>
              <button className="eg-btn" disabled={resendState === 'busy'} onClick={() => resend(sentTo)}>Wyślij link ponownie</button>
              {resendInfo && <div className={'eg-msg ' + (resendState === 'err' ? 'err' : 'ok')}>{resendInfo}</div>}
              <button className="eg-ghost" onClick={() => { setSentTo(''); setMode('login'); setResendState(''); }}>Wróć do logowania</button>
              <div className="eg-sent-small">Pomyłka w adresie? <button className="eg-link-inline" onClick={() => { setSentTo(''); setMode('signup'); setResendState(''); }}>Załóż konto jeszcze raz</button></div>
            </div>
          ) : (
            <>
              <div className="eg-head">
                <h2 className="eg-title">{mode === 'login' ? 'Zaloguj się' : 'Załóż konto'}</h2>
                <div className="eg-sub">{mode === 'login' ? 'Wpisz e-mail i hasło albo zaloguj się przez Google.' : 'Zajmie Ci to mniej niż minutę.'}</div>
              </div>

              {offer && (
                <div className="eg-offer-banner">
                  <strong>{offer.title}</strong>
                  <span>{offer.text}</span>
                </div>
              )}

              <div className="eg-tabs">
                <button className={'eg-tab' + (mode === 'login' ? ' active' : '')} onClick={() => { setMode('login'); setMsg({ text: '', type: '' }); setNeedConfirm(''); }}>Logowanie</button>
                <button className={'eg-tab' + (mode === 'signup' ? ' active' : '')} onClick={() => { setMode('signup'); setMsg({ text: '', type: '' }); setNeedConfirm(''); }}>Załóż konto</button>
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
                {mode === 'signup' && <div className="eg-hint">Co najmniej 6 znaków.</div>}
              </div>

              {msg.text && <div className={'eg-msg eg-msg-top ' + msg.type}>{msg.text}</div>}
              {needConfirm && (
                <div className="eg-resend">
                  <button className="eg-link-inline" disabled={resendState === 'busy'} onClick={() => resend(needConfirm)}>Wyślij link potwierdzający ponownie</button>
                  {resendInfo && <div className={'eg-msg ' + (resendState === 'err' ? 'err' : 'ok')}>{resendInfo}</div>}
                </div>
              )}

              <button className="eg-btn" disabled={busy} onClick={submit}>{busy ? 'Chwileczkę…' : (mode === 'login' ? 'Zaloguj się' : 'Załóż konto')}</button>

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
                Jeśli konto zostało założone przez Google, loguj się zawsze tym przyciskiem — takie konto nie ma osobnego hasła.
              </div>

              <div className="eg-foot">Problem z logowaniem? <a href="mailto:rozialak@gmail.com">Napisz do nas</a></div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  .eg-wrap{ --eg-magenta:#ca4490; --eg-violet:#6885db; --eg-gold:#f4c94c; --eg-ink:#2e2a33; --eg-muted:#7d7788; --eg-line:#eceaf2;
    font-family:'Outfit',sans-serif; color:var(--eg-ink); background:#faf9fc; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:32px 24px; }
  .eg-wrap *{ box-sizing:border-box; }

  /* układ: z lewej powitanie, z prawej formularz (na telefonie jedno pod drugim) */
  .eg-shell{ width:100%; max-width:940px; display:grid; grid-template-columns:1fr 1fr; background:#fff; border:1px solid var(--eg-line);
    border-radius:28px; box-shadow:0 18px 50px rgba(46,42,51,.10); overflow:hidden; }

  .eg-hello{ background:#f4eefc; padding:44px 40px; display:flex; flex-direction:column; justify-content:center; border-right:1px solid #e9e0f6; }
  .eg-logo{ font-family:'Outfit',sans-serif; font-weight:700; font-size:30px; letter-spacing:-1px; line-height:1; text-decoration:none; display:inline-block; align-self:flex-start; }
  .eg-logo .e{ color:#ca4490; } .eg-logo .w{ color:#e0a91c; }
  .eg-logo:hover{ opacity:.85; }
  .eg-hello-h{ font-family:'Outfit',sans-serif; font-weight:600; font-size:30px; line-height:1.2; letter-spacing:-.5px; margin:34px 0 12px; color:var(--eg-ink); }
  .eg-heart{ color:#ff5fa2; }
  .eg-hello-lead{ font-size:16px; line-height:1.6; color:#4e475a; margin:0 0 24px; }
  .eg-hello-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px; }
  .eg-hello-list li{ position:relative; padding-left:22px; font-size:14.5px; line-height:1.5; font-weight:600; color:#4e475a; }
  .eg-hello-list li::before{ content:''; position:absolute; left:2px; top:.5em; width:9px; height:9px; border-radius:50%; background:var(--eg-magenta); }

  .eg-card{ padding:40px 40px 32px; min-width:0; }
  .eg-head{ margin-bottom:18px; }
  .eg-title{ font-family:'Outfit',sans-serif; font-weight:600; font-size:26px; letter-spacing:-.4px; margin:0 0 4px; color:var(--eg-ink); }
  .eg-sub{ color:var(--eg-muted); font-size:14.5px; }
  .eg-offer-banner{ background:#faf0f6; border:1.5px solid #f0cde1; border-radius:14px; padding:14px 16px; margin-bottom:20px; font-size:13.5px; line-height:1.5; color:var(--eg-ink); }
  .eg-offer-banner strong{ display:block; color:var(--eg-magenta); margin-bottom:3px; font-size:14.5px; }
  .eg-tabs{ display:flex; gap:6px; background:#f4f2f8; border-radius:12px; padding:4px; margin-bottom:22px; }
  .eg-tab{ flex:1; border:none; background:transparent; font-family:inherit; font-weight:700; font-size:14.5px; color:var(--eg-muted); padding:10px; border-radius:9px; cursor:pointer; transition:background .15s, color .15s; }
  .eg-tab.active{ background:#fff; color:var(--eg-magenta); box-shadow:0 2px 8px rgba(46,42,51,.06); }
  .eg-field{ margin-bottom:16px; }
  .eg-field label{ display:block; font-size:13px; font-weight:700; color:var(--eg-muted); margin-bottom:6px; }
  .eg-field input{ width:100%; font-family:inherit; font-size:15px; color:var(--eg-ink); background:#fff; border:1.5px solid var(--eg-line); border-radius:12px; padding:13px 15px; outline:none; transition:border-color .15s; }
  .eg-field input:focus{ border-color:var(--eg-magenta); }
  .eg-hint{ font-size:12.5px; color:var(--eg-muted); margin-top:6px; }
  .eg-btn{ width:100%; font-family:inherit; font-weight:700; font-size:15.5px; color:#fff; background:var(--eg-magenta); border:none; border-radius:12px; padding:14px; cursor:pointer; transition:filter .15s, transform .1s; margin-top:4px; }
  .eg-btn:hover{ filter:brightness(1.06); }
  .eg-btn:active{ transform:translateY(1px); }
  .eg-btn:disabled{ opacity:.6; cursor:default; }
  .eg-ghost{ width:100%; font-family:inherit; font-weight:700; font-size:15px; color:var(--eg-ink); background:#fff; border:1.5px solid var(--eg-line); border-radius:12px; padding:13px; cursor:pointer; margin-top:10px; }
  .eg-ghost:hover{ border-color:#d8d4e0; background:#fafafa; }
  .eg-link-inline{ background:none; border:none; padding:0; font-family:inherit; font-size:inherit; font-weight:700; color:var(--eg-magenta); cursor:pointer; text-decoration:underline; text-underline-offset:2px; }
  .eg-link-inline:disabled{ opacity:.6; cursor:default; }
  .eg-divider{ display:flex; align-items:center; gap:12px; margin:22px 0; color:var(--eg-muted); font-size:13px; }
  .eg-divider::before, .eg-divider::after{ content:''; flex:1; height:1px; background:var(--eg-line); }
  .eg-google{ width:100%; display:flex; align-items:center; justify-content:center; gap:10px; font-family:inherit; font-weight:700; font-size:15px; color:var(--eg-ink); background:#fff; border:1.5px solid var(--eg-line); border-radius:12px; padding:13px; cursor:pointer; transition:border-color .15s, background .15s; }
  .eg-google:hover{ border-color:#d8d4e0; background:#fafafa; }
  .eg-google svg{ width:19px; height:19px; }
  .eg-msg{ margin-top:12px; padding:11px 14px; border-radius:10px; font-size:13.5px; font-weight:600; line-height:1.5; }
  .eg-msg-top{ margin:0 0 14px; }
  .eg-msg.err{ background:#fbeded; color:#c0392b; }
  .eg-msg.ok{ background:#eaf7f0; color:#1e7e50; }
  .eg-resend{ margin:-4px 0 14px; font-size:13.5px; }
  .eg-foot{ text-align:center; margin-top:22px; font-size:12.5px; color:var(--eg-muted); }
  .eg-foot a{ color:var(--eg-magenta); text-decoration:none; font-weight:700; }
  .eg-role{ margin-bottom:16px; }
  .eg-role label{ display:block; font-size:13px; font-weight:700; color:var(--eg-muted); margin-bottom:8px; }
  .eg-role-opts{ display:flex; gap:8px; }
  .eg-role-opts button{ flex:1; font-family:inherit; font-weight:700; font-size:13.5px; color:var(--eg-muted); background:#fff; border:1.5px solid var(--eg-line); border-radius:10px; padding:11px 8px; cursor:pointer; transition:all .15s; }
  .eg-role-opts button.active{ background:#fce4ef; border-color:#f4c4dd; color:var(--eg-magenta); }

  /* ekran po rejestracji: „Sprawdź swoją skrzynkę” */
  .eg-sent{ text-align:center; padding:6px 0; }
  .eg-sent-badge{ display:inline-block; font-size:12px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:#1e7e50; background:#eaf7f0; border-radius:999px; padding:5px 12px; }
  .eg-sent-h{ font-family:'Outfit',sans-serif; font-weight:600; font-size:26px; letter-spacing:-.4px; margin:14px 0 10px; color:var(--eg-ink); }
  .eg-sent-p{ font-size:15px; line-height:1.6; color:#4e475a; margin:0 0 6px; }
  .eg-sent-mail{ font-size:16px; font-weight:800; color:var(--eg-magenta); margin:0 0 12px; word-break:break-all; }
  .eg-sent-tip{ text-align:left; background:#fbf8d9; border:1.5px solid #f0e3a0; border-radius:14px; padding:13px 15px; margin:18px 0 18px; font-size:13.5px; line-height:1.5; color:#4e475a; }
  .eg-sent-tip strong{ display:block; color:var(--eg-ink); margin-bottom:2px; }
  .eg-sent-small{ margin-top:16px; font-size:13px; color:var(--eg-muted); }

  @media (max-width:820px){
    .eg-wrap{ padding:16px; align-items:flex-start; }
    .eg-shell{ grid-template-columns:1fr; border-radius:22px; }
    .eg-hello{ padding:26px 24px 22px; border-right:none; border-bottom:1px solid #e9e0f6; text-align:center; }
    .eg-logo{ align-self:center; font-size:26px; }
    .eg-hello-h{ font-size:22px; margin:14px 0 6px; }
    .eg-hello-lead{ font-size:14.5px; margin:0; }
    .eg-hello-list{ display:none; }
    .eg-card{ padding:26px 22px 24px; }
    .eg-title{ font-size:23px; }
  }
`;
