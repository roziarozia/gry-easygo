'use client';

import posthog from 'posthog-js';

// Token projektu PostHog ze zmiennej POSTHOG_PROJECT_TOKEN (Vercel), udostępnianej
// w przeglądarce przez next.config.js. Ten sam token trafia do /eg-analytics.js
// (app/eg-analytics.js/route.js, strony HTML otwierane bez ramki).
const projectToken = process.env.POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
// Ten sam klucz decyzji co w ConsentPixel.js i app/eg-analytics.js/route.js
const CONSENT_KEY = 'easygo_zgoda_cookies';

export const analyticsEnabled = Boolean(projectToken && posthogHost);

const enabled = typeof window !== 'undefined' && analyticsEnabled;

// Zgoda z banera (RODO): PostHog nic nie wysyła ani nie zapisuje, dopóki użytkownik
// nie kliknie "Zaakceptuj wszystkie". Wołane przy starcie i po każdej zmianie decyzji
// w ConsentPixel. opt_in_capturing sam wysyła odsłonę bieżącej strony.
export function syncPostHogConsent() {
  if (!enabled) return;
  let v = null;
  try { v = localStorage.getItem(CONSENT_KEY); } catch (e) {}
  const status = posthog.get_explicit_consent_status();
  if (v === 'all' || v === 'accepted') {
    if (status !== 'granted') posthog.opt_in_capturing({ captureEventName: false });
  } else if (status === 'granted') {
    posthog.opt_out_capturing();
  }
}

if (enabled) {
  posthog.init(projectToken, {
    api_host: posthogHost,
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
  });
  syncPostHogConsent();
}

export default function PostHogInit() {
  return null;
}
