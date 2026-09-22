// Baner cookies + GA4 dla plików HTML z public/ otwieranych BEZPOŚREDNIO (np. /graj-player.html?g=…
// z wyszukiwarki albo /demo-panelu.html w nowej karcie). Strony Next.js mają to
// z app/ConsentPixel.js, tutaj te same zasady:
// - w ramce nic nie robimy: baner i odsłony obsługuje strona nadrzędna (inaczej byłyby podwójne),
// - baner tylko gdy nie ma jeszcze decyzji; decyzja jest wspólna z ConsentPixel
//   (localStorage 'easygo_zgoda_cookies': 'all' | 'necessary', stare 'accepted'/'rejected' też działają),
//   dlatego baner wymienia te same usługi co główny,
// - GA4 tylko po zgodzie 'all' i nie dla zalogowanych (sesja Supabase w localStorage).
// GA_ID musi być taki sam jak w app/ConsentPixel.js.
(function () {
  var GA_ID = 'G-KWQVZY8YED';
  var KEY = 'easygo_zgoda_cookies';
  var SB_SESSION_KEY = 'sb-svjrdyxwqznbzxqeytdn-auth-token';

  try { if (window.self !== window.top) return; } catch (e) { return; }

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function readDecision() {
    var v = get(KEY);
    if (v === 'all' || v === 'accepted') return 'all';
    if (v === 'necessary' || v === 'rejected') return 'necessary';
    return null;
  }

  function loadAnalytics() {
    if (window.__egGaLoaded || get(SB_SESSION_KEY)) return;
    window.__egGaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  function button(label, bg, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = 'border:none;padding:11px 20px;border-radius:22px;font-weight:800;font-size:14px;cursor:pointer;'
      + "font-family:'Nunito',sans-serif;color:#fff;background:" + bg + ';'
      + (bg === '#ca4490' ? 'box-shadow:0 3px 10px rgba(202,68,144,0.35);' : '');
    b.addEventListener('click', onClick);
    return b;
  }

  // Wygląd jak baner w ConsentPixel.js; bez okna "Zarządzaj", bo jest tylko jedna kategoria do wyboru.
  function showBanner() {
    if (document.getElementById('egCookieBanner')) return;
    var bar = document.createElement('div');
    bar.id = 'egCookieBanner';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Zgoda na cookies');
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#ffffff;'
      + 'border-top:3px solid #ca4490;box-shadow:0 -6px 24px rgba(0,0,0,0.12);padding:16px 20px;'
      + 'display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:14px;'
      + "font-family:'Nunito',sans-serif;";

    var p = document.createElement('p');
    p.style.cssText = 'margin:0;font-size:14px;color:#2e2a33;max-width:560px;line-height:1.55;';
    p.appendChild(document.createTextNode(
      'Używamy ciasteczek niezbędnych do działania strony oraz - za Twoją zgodą - analitycznych i marketingowych '
      + '(Google Analytics, PostHog, Meta Pixel). Możesz zaakceptować wszystkie albo tylko niezbędne. Więcej w '));
    var a = document.createElement('a');
    a.href = 'https://easygo-english.pl/polityka-prywatnosci/';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Polityce prywatności';
    a.style.cssText = 'color:#ca4490;font-weight:800;';
    p.appendChild(a);
    p.appendChild(document.createTextNode('.'));

    function save(kind) {
      try { localStorage.setItem(KEY, kind); } catch (e) {}
      bar.remove();
      if (kind === 'all') loadAnalytics();
    }

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';
    btns.appendChild(button('Tylko niezbędne', '#2e2a33', function () { save('necessary'); }));
    btns.appendChild(button('Zaakceptuj wszystkie', '#ca4490', function () { save('all'); }));

    bar.appendChild(p);
    bar.appendChild(btns);
    document.body.appendChild(bar);
  }

  var decision = readDecision();
  if (decision === 'all') loadAnalytics();
  else if (!decision) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBanner);
    else showBanner();
  }
})();
