// Skąd przychodzą nowe konta (źródło pierwszego wejścia).
// Zapisujemy w przeglądarce TYLKO: domenę strony, z której ktoś przyszedł (np. www.google.com),
// adres tej strony bez parametrów, pierwszą stronę na easywonders.pl i oznaczenia utm z linku.
// Żadnych identyfikatorów ani danych osobowych. Przy rejestracji źródło trafia do bazy
// (tabela signup_sources, widoczna tylko w Panelu właścicielki).
// Ta sama logika jest w app/eg-analytics.js/route.js (strony HTML otwierane bez ramki) — zmieniać razem.
import { SUPA_URL, SUPA_KEY } from './supabase';

const KEY = 'eg_zrodlo';            // { ref, ref_url, landing, utm_source, utm_medium, utm_campaign, at }
const SENT_KEY = 'eg_zrodlo_wyslane';
const SB_AUTH_KEY = 'sb-svjrdyxwqznbzxqeytdn-auth-token';
const MAX_AGE = 30 * 86400000;      // źródło sprzed 30 dni już się nie liczy

function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

// Odczyt zapisanego źródła (albo null)
export function readSource() {
  let cur = null;
  try { cur = JSON.parse(get(KEY) || 'null'); } catch (e) { cur = null; }
  if (!cur || typeof cur !== 'object') return null;
  if (cur.at && Date.now() - new Date(cur.at).getTime() > MAX_AGE) return null;
  return cur;
}

// Wołane na każdej stronie: zapamiętuje PIERWSZE wejście z zewnątrz.
// Wejście „bezpośrednie” (bez odsyłacza) zostaje nadpisane, jeśli później ktoś przyjdzie np. z Google.
export function captureSource() {
  if (typeof window === 'undefined') return;
  try { if (window.self !== window.top) return; } catch (e) { return; }
  const cur = readSource();
  const r = document.referrer || '';
  let host = '';
  try { host = r ? new URL(r).hostname : ''; } catch (e) { host = ''; }
  const own = host === window.location.hostname || /(^|\.)easywonders\.pl$/.test(host);
  const q = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: (q.get('utm_source') || '').slice(0, 120),
    utm_medium: (q.get('utm_medium') || '').slice(0, 120),
    utm_campaign: (q.get('utm_campaign') || '').slice(0, 160),
  };
  const external = (host && !own) || utm.utm_source;
  if (own && !utm.utm_source) return;                 // przejście wewnątrz strony — nic nowego
  if (cur && !(cur.ref === 'direct' && external)) return; // mamy już pierwsze wejście
  const src = {
    ref: host && !own ? host : (utm.utm_source ? 'utm' : 'direct'),
    ref_url: host && !own ? r.split('?')[0].split('#')[0].slice(0, 300) : '',
    landing: (window.location.pathname || '/').slice(0, 300),
    ...utm,
    at: new Date().toISOString(),
  };
  set(KEY, JSON.stringify(src));
}

// Po zalogowaniu (także przez Google albo po kliknięciu linku z maila na innym urządzeniu)
// wysyła źródło do bazy. Baza zapisze je tylko raz i tylko dla świeżego konta (do 3 dni).
export async function sendSourceIfLoggedIn() {
  if (typeof window === 'undefined') return;
  if (get(SENT_KEY)) return;
  const src = readSource();
  if (!src) return;
  let token = null;
  try {
    const s = JSON.parse(get(SB_AUTH_KEY) || 'null');
    token = s && (s.access_token || (s.currentSession && s.currentSession.access_token));
  } catch (e) { token = null; }
  if (!token) return;
  try {
    const res = await fetch(SUPA_URL + '/rest/v1/rpc/save_signup_source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + token },
      body: JSON.stringify({ p: src }),
    });
    if (res.ok) set(SENT_KEY, '1'); // wysłane (albo konto starsze niż 3 dni) — więcej nie próbujemy
  } catch (e) {}
}
