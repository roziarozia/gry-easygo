'use client';
import { useEffect, useState } from 'react';

// Baner zgody RODO + Meta Pixel, który uruchamia się DOPIERO po kliknięciu "Akceptuję".
// Wybór zapamiętywany w localStorage (easygo_zgoda_cookies). Marka EasyGo (róż #ca4490).
const PIXEL_ID = '1747890483017414';

function loadPixel() {
  if (window.__egPixelLoaded) return;
  window.__egPixelLoaded = true;
  /* standardowy fragment Meta Pixel */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
}

export default function ConsentPixel() {
  const [decision, setDecision] = useState(null); // null = jeszcze nie wybrano

  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem('easygo_zgoda_cookies'); } catch (e) {}
    setDecision(saved);
    if (saved === 'accepted') loadPixel(); // zgoda z wcześniejszej wizyty → ładuj Pixel
  }, []);

  function accept() {
    try { localStorage.setItem('easygo_zgoda_cookies', 'accepted'); } catch (e) {}
    setDecision('accepted');
    loadPixel();
  }
  function reject() {
    try { localStorage.setItem('easygo_zgoda_cookies', 'rejected'); } catch (e) {}
    setDecision('rejected');
  }

  // decyzja już podjęta (w tej lub poprzedniej wizycie) → nie pokazuj banera
  if (decision === 'accepted' || decision === 'rejected') return null;
  // jeszcze nie wiemy (pierwsze renderowanie na serwerze) → nic nie pokazuj do czasu sprawdzenia
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
