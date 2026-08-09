'use client';
import { useEffect, useState } from 'react';

// Baner zgody RODO + Meta Pixel.
// Pixel uruchamia się DOPIERO po "Akceptuję" ORAZ tylko dla NIEZALOGOWANYCH gości.
// Osadzony katalog (w ramce) wysyła postMessage {egLoggedIn:true}; gdy zalogowany,
// Pixel NIE jest ładowany (prywatność uczniów). Wybór zgody zapamiętywany w localStorage.
const PIXEL_ID = '1747890483017414';
let egKnownLoggedIn = false;

function loadPixel() {
  if (window.__egPixelLoaded) return;
  if (egKnownLoggedIn) return; // zalogowany → nie śledzimy
  window.__egPixelLoaded = true;
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
}

export default function ConsentPixel() {
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    function onMsg(e) {
      if (e.data && e.data.egLoggedIn === true) {
        egKnownLoggedIn = true; // zalogowany uczeń → nie śledzimy
      }
    }
    window.addEventListener('message', onMsg);

    let saved = null;
    try { saved = localStorage.getItem('easygo_zgoda_cookies'); } catch (e) {}
    setDecision(saved);
    // poczekaj chwilę na sygnał z ramki, zanim załadujesz Pixel (żeby nie złapać zalogowanego)
    if (saved === 'accepted') setTimeout(function(){ loadPixel(); }, 1200);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function accept() {
    try { localStorage.setItem('easygo_zgoda_cookies', 'accepted'); } catch (e) {}
    setDecision('accepted');
    setTimeout(function(){ loadPixel(); }, 400);
  }
  function reject() {
    try { localStorage.setItem('easygo_zgoda_cookies', 'rejected'); } catch (e) {}
    setDecision('rejected');
  }

  if (decision === 'accepted' || decision === 'rejected') return null;
  if (decision === null && typeof window === 'undefined') return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999,
      background: '#ffffff', borderTop: '3px solid #ca4490',
      boxShadow: '0 -6px 24px rgba(0,0,0,0.12)',
      padding: '18px 20px', display: 'flex', flexWrap: 'wrap',
      alignItems: 'center', justifyContent: 'center', gap: '14px',
      fontFamily: "'Nunito', sans-serif",
    }}>
      <p style={{ margin: 0, fontSize: '14.5px', color: '#2e2a33', maxWidth: '620px', lineHeight: 1.55 }}>
        Ta strona używa plików cookies do celów statystycznych i marketingowych (m.in. Meta Pixel),
        aby lepiej dopasować treści i reklamy. Możesz zaakceptować lub odrzucić. Więcej w{' '}
        <a href="https://easygo-english.pl/polityka-prywatnosci/" target="_blank" rel="noopener noreferrer"
           style={{ color: '#ca4490', fontWeight: 700 }}>Polityce prywatności</a>.
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={reject} style={{
          background: '#f2eef4', color: '#5a5568', border: 'none',
          padding: '11px 22px', borderRadius: '22px', fontWeight: 700, fontSize: '14px',
          cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
        }}>Odrzuć</button>
        <button onClick={accept} style={{
          background: '#ca4490', color: '#fff', border: 'none',
          padding: '11px 26px', borderRadius: '22px', fontWeight: 700, fontSize: '14px',
          cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
          boxShadow: '0 3px 10px rgba(202,68,144,0.35)',
        }}>Akceptuję</button>
      </div>
    </div>
  );
}
