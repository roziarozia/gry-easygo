'use client';
import { useEffect, useState } from 'react';

// ───────────────────────────────────────────────────────────────────────────
// Zgoda na cookies (RODO) z WYBOREM kategorii.
// - Wymagane: zawsze (logowanie, ustawienia) — bez zgody, nie da się wyłączyć.
// - Analityka i marketing: Google Analytics (GA4) + Meta Pixel — TYLKO po zgodzie.
// Zalogowani uczniowie nie są śledzeni (katalog w ramce wysyła {egLoggedIn:true}).
// Decyzja w localStorage 'easygo_zgoda_cookies': 'all' | 'necessary'.
// (stare wartości 'accepted'/'rejected' są rozumiane jako all/necessary)
// ───────────────────────────────────────────────────────────────────────────
const PIXEL_ID = '1747890483017414';
const GA_ID = 'G-KWQVZY8YED';
const KEY = 'easygo_zgoda_cookies';
let egKnownLoggedIn = false;

function loadPixel() {
  if (window.__egPixelLoaded || egKnownLoggedIn) return;
  window.__egPixelLoaded = true;
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
}

function loadAnalytics() {
  if (window.__egGaLoaded || egKnownLoggedIn) return;
  window.__egGaLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID, { anonymize_ip: true });
}

function loadOptional() {
  // małe opóźnienie: poczekaj na sygnał z ramki, czy użytkownik nie jest zalogowany
  setTimeout(function(){ loadAnalytics(); loadPixel(); }, 1200);
}

function readDecision() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'all' || v === 'accepted') return 'all';
    if (v === 'necessary' || v === 'rejected') return 'necessary';
  } catch (e) {}
  return null;
}

export default function ConsentPixel() {
  const [decision, setDecision] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function onMsg(e) {
      if (e.data && e.data.egLoggedIn === true) egKnownLoggedIn = true;
      // katalog/gracz mogą poprosić o otwarcie ustawień cookies (np. link w stopce)
      if (e.data && e.data.egOpenCookies === true) { setManage(true); }
    }
    window.addEventListener('message', onMsg);
    const saved = readDecision();
    setDecision(saved);
    setAnalytics(saved === 'all');
    if (saved === 'all') loadOptional();
    // globalny otwieracz ustawień (dla linku "Ustawienia cookies" w stopce)
    window.egOpenCookieSettings = function(){ setManage(true); };
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function save(kind) {
    try { localStorage.setItem(KEY, kind); } catch (e) {}
    setDecision(kind);
    setManage(false);
    if (kind === 'all') { setAnalytics(true); loadOptional(); }
    else { setAnalytics(false); }
  }

  if (!mounted) return null;

  // ── MODAL: Zarządzaj ciasteczkami ──
  const modal = manage ? (
    <div onClick={() => setManage(false)} style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(46,42,51,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Nunito', sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 24px 70px rgba(0,0,0,.35)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #eae6f2' }}>
          <h3 style={{ margin: 0, fontFamily: "'Quicksand', sans-serif", fontSize: 19, color: '#2e2a33' }}>Zarządzaj ciasteczkami</h3>
          <button onClick={() => setManage(false)} aria-label="Zamknij" style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#f2eef4', fontSize: 20, cursor: 'pointer', color: '#2e2a33' }}>×</button>
        </div>
        <div style={{ padding: '16px 22px 6px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: '#7a7484', lineHeight: 1.5 }}>Tutaj możesz wybrać, na jakie opcjonalne ciasteczka wyrażasz zgodę.</p>

          <Row title="Wymagane" desc="Logowanie, zapamiętanie ustawień (język, motyw) i działanie ćwiczeń. Bez nich strona nie działa - nie da się ich wyłączyć." locked on />
          <Row title="Analityka i marketing" desc="Google Analytics (statystyki odwiedzin) i Meta Pixel (dopasowanie reklam). Pomagają nam rozwijać EasyWonders. Nie śledzimy zalogowanych uczniów." on={analytics} onToggle={() => setAnalytics(!analytics)} badge="2 usługi" />

          <p style={{ fontSize: 13, color: '#7a7484', margin: '14px 0 16px', background: '#faf8fd', border: '1px solid #eae6f2', borderRadius: 10, padding: '10px 12px' }}>
            Więcej informacji znajdziesz w{' '}
            <a href="https://easygo-english.pl/polityka-prywatnosci/" target="_blank" rel="noopener noreferrer" style={{ color: '#ca4490', fontWeight: 800 }}>Polityce prywatności</a>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 22px 20px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn onClick={() => save('all')} dark>Zaakceptuj wszystkie</Btn>
            <Btn onClick={() => save('necessary')} dark>Tylko niezbędne</Btn>
          </div>
          <Btn onClick={() => save(analytics ? 'all' : 'necessary')} primary>Zapisz wybrane</Btn>
        </div>
      </div>
    </div>
  ) : null;

  // decyzja podjęta → tylko modal (gdy otwarty z ustawień), bez banera
  if (decision === 'all' || decision === 'necessary') return modal;

  // ── BANER (brak decyzji) ──
  return (
    <>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999,
        background: '#ffffff', borderTop: '3px solid #ca4490',
        boxShadow: '0 -6px 24px rgba(0,0,0,0.12)',
        padding: '16px 20px', display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'center', gap: '14px',
        fontFamily: "'Nunito', sans-serif",
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#2e2a33', maxWidth: '560px', lineHeight: 1.55 }}>
          Używamy ciasteczek niezbędnych do działania strony oraz - za Twoją zgodą - analitycznych i marketingowych (Google Analytics, Meta Pixel).
          Możesz zaakceptować wszystkie, tylko niezbędne, albo wybrać samodzielnie.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Btn onClick={() => setManage(true)}>Zarządzaj</Btn>
          <Btn onClick={() => save('necessary')} dark>Tylko niezbędne</Btn>
          <Btn onClick={() => save('all')} primary>Zaakceptuj wszystkie</Btn>
        </div>
      </div>
      {modal}
    </>
  );
}

function Row({ title, desc, locked, on, onToggle, badge }) {
  return (
    <div style={{ background: '#f7f5fb', border: '1px solid #eae6f2', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, fontWeight: 800, fontSize: 15, color: '#2e2a33' }}>{title}</div>
        {badge && <span style={{ background: '#2e2a33', color: '#fff', fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: '3px 10px' }}>{badge}</span>}
        <button onClick={locked ? undefined : onToggle} aria-label={title} disabled={locked} style={{
          width: 44, height: 24, borderRadius: 999, border: 'none', cursor: locked ? 'not-allowed' : 'pointer',
          background: on ? (locked ? '#c9c3d6' : '#5fbf9f') : '#d8d2e4', position: 'relative', padding: 0, opacity: locked ? .8 : 1,
        }}>
          <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: on ? '#5fbf9f' : '#8a8496' }}>{locked ? '✓' : (on ? '✓' : '×')}</span>
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: '#7a7484', marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function Btn({ children, onClick, primary, dark }) {
  const base = { border: 'none', padding: '11px 20px', borderRadius: 22, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" };
  const style = primary
    ? { ...base, background: '#ca4490', color: '#fff', boxShadow: '0 3px 10px rgba(202,68,144,0.35)' }
    : dark
    ? { ...base, background: '#2e2a33', color: '#fff' }
    : { ...base, background: '#f2eef4', color: '#5a5568' };
  return <button onClick={onClick} style={style}>{children}</button>;
}
