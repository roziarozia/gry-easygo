'use client';

import posthog from 'posthog-js';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
// Ten sam klucz decyzji co w ConsentPixel.js i public/eg-analytics.js
const CONSENT_KEY = 'easygo_zgoda_cookies';

if (!projectToken && process.env.NODE_ENV !== 'production') {
  throw new Error('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured');
}

if (!posthogHost && process.env.NODE_ENV !== 'production') {
  throw new Error('NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured');
}

const enabled = typeof window !== 'undefined' && Boolean(projectToken && posthogHost);

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
