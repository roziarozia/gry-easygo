// Baner cookies + GA4 + PostHog dla plików HTML z public/ otwieranych BEZPOŚREDNIO (np. /graj-player.html?g=…
// z wyszukiwarki albo /demo-panelu.html w nowej karcie). Strony Next.js mają to
// z app/ConsentPixel.js, tutaj te same zasady:
// - w ramce nic nie robimy: baner i odsłony obsługuje strona nadrzędna (inaczej byłyby podwójne),
// - baner tylko gdy nie ma jeszcze decyzji; decyzja jest wspólna z ConsentPixel
//   (localStorage 'easygo_zgoda_cookies': 'all' | 'necessary', stare 'accepted'/'rejected' też działają),
//   dlatego baner wymienia te same usługi co główny,
// - GA4 tylko po zgodzie 'all' i nie dla zalogowanych (sesja Supabase w localStorage),
// - PostHog tylko po zgodzie 'all', także dla zalogowanych (tak jak w app/PostHogInit.js).
// GA_ID musi być taki sam jak w app/ConsentPixel.js, token i host PostHoga jak w app/PostHogInit.js.
(function () {
  var GA_ID = 'G-KWQVZY8YED';
  var POSTHOG_TOKEN = 'phc_mvddXpdXGjUDxYmt7F6BqUmrDFNCfPsLSNoFABpJLn4f';
  var POSTHOG_HOST = 'https://eu.i.posthog.com';
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

  // Oficjalny snippet PostHoga (ładuje SDK z CDN). Wołane tylko po zgodzie.
  function loadPostHog() {
    if (window.__egPostHogLoaded) return;
    window.__egPostHogLoaded = true;
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="vu fu pu gu bu init Hu zu qu ju Gu Xa Bu Qu Du eh ih nh sh rh oh capture getExtension Uu cu hh calculateEventProperties uh register register_once register_for_session unregister unregister_for_session gh Nu dh getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync mh identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset yh shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty fh Xu createPersonProfile setInternalOrTestUser ph wu opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Ju debug Ya Os getPageViewId captureTraceFeedback captureTraceMetric Ru".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    window.posthog.init(POSTHOG_TOKEN, {
      api_host: POSTHOG_HOST,
      defaults: '2026-05-30',
      person_profiles: 'identified_only',
      // zgoda jest już w 'easygo_zgoda_cookies'; zapisz ją też po stronie PostHoga,
      // żeby app/PostHogInit.js (opt_out_capturing_by_default) widział ją jako udzieloną
      loaded: function (ph) {
        if (ph.get_explicit_consent_status() !== 'granted') ph.opt_in_capturing({ captureEventName: false });
      },
    });
  }

  function loadOptional() {
    loadAnalytics();
    loadPostHog();
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
      if (kind === 'all') loadOptional();
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
  if (decision === 'all') loadOptional();
  else if (!decision) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBanner);
    else showBanner();
  }
})();
