'use client';

import { useEffect } from 'react';
import { captureSource, sendSourceIfLoggedIn } from '../lib/zrodlo';

// Zapamiętuje, skąd ktoś pierwszy raz przyszedł na stronę (lib/zrodlo.js),
// a po zalogowaniu świeżego konta wysyła to do bazy — do Panelu właścicielki.
export default function SignupSource() {
  useEffect(() => {
    captureSource();
    sendSourceIfLoggedIn();
    const onStorage = (e) => { if (e.key && e.key.indexOf('auth-token') !== -1) sendSourceIfLoggedIn(); };
    window.addEventListener('storage', onStorage);
    // sesja po logowaniu przez Google / link z maila pojawia się chwilę po załadowaniu strony
    const t1 = setTimeout(sendSourceIfLoggedIn, 3000);
    const t2 = setTimeout(sendSourceIfLoggedIn, 10000);
    return () => { window.removeEventListener('storage', onStorage); clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return null;
}
