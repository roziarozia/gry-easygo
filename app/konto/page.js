'use client';
import { useEffect } from 'react';

// Konto na TEJ SAMEJ domenie co logowanie, oferta i katalog —
// więc sesja jest widoczna. Cała logika (status subskrypcji, Stripe portal,
// reset/zmiana hasła, usuwanie konta, wylogowanie) przeniesiona 1:1.
export default function Konto() {
  useEffect(() => {
    const SUPA_URL = 'https://svjrdyxwqznbzxqeytdn.supabase.co';
    const SUPA_KEY = 'sb_publishable_TNCq1UAMAvLO0Z5Mt8QOig_OvsxhhyJ';

    function boot() {
      var sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
      function $(id){ return document.getElementById(id); }
      function msg(el, text, cls){ if(el){ el.textContent = text; el.className = 'msg ' + (cls||''); } }
      var me = null, myProfile = null;
      var isReset = /[?&]reset=1/.test(location.search);

      (async function init(){
        if(isReset){ await new Promise(function(r){ setTimeout(r, 800); }); }
        var res = await sb.auth.getSession();
        var session = res && res.data ? res.data.session : null;
        if(!session){
          if(isReset){
            $('account').classList.remove('hidden');
            $('resetBanner').classList.remove('hidden');
            $('resetBanner').innerHTML = '<strong>Link wygasł lub został już użyty.</strong> Wróć do logowania i kliknij „Nie pamiętasz hasła?” jeszcze raz.';
            $('resetBanner').className = 'reset-banner err';
            $('subCard').classList.add('hidden');
            var ssc1 = $('subStatusCard'); if(ssc1) ssc1.classList.add('hidden');
            $('delCard').style.display = 'none';
            $('whoLine').style.display = 'none';
            return;
          }
          $('notLogged').classList.remove('hidden');
          return;
        }
        me = session.user;
        $('account').classList.remove('hidden');
        $('whoEmail').textContent = me.email;
        if(isReset){
          $('resetBanner').classList.remove('hidden');
          $('delCard').style.display = 'none';
          $('subCard').classList.add('hidden');
          var ssc2 = $('subStatusCard'); if(ssc2) ssc2.classList.add('hidden');
          $('newPass').focus();
          return;
        }
        var pr = await sb.from('profiles')
          .select('access, access_source, role, seats, subscription_status, subscription_cancel_at, subscription_period_end, comp_expires_at')
          .eq('id', me.id).single();
        myProfile = pr && pr.data ? pr.data : null;
        if(myProfile && myProfile.access_source === 'own_sub'){ $('subCard').classList.remove('hidden'); }
        if(myProfile){ await renderSubStatus(myProfile); }
      })();

      function formatDatePL(iso){
        if(!iso) return '';
        var d = new Date(iso);
        if(isNaN(d)) return '';
        var months = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
      }
      function planLabelFor(p){
        if(p.role === 'teacher'){ return 'Konto lektora' + (p.seats ? ' (' + p.seats + ' miejsc)' : ''); }
        return 'Konto indywidualne';
      }
      async function renderSubStatus(p){
        var card = $('subStatusCard'), body = $('subStatusBody');
        var html = '', cls = 'status-ok';
        var cancelAt = p.subscription_cancel_at, periodEnd = p.subscription_period_end, status = p.subscription_status, src = p.access_source;
        if(src === 'own_sub'){
          if(cancelAt){
            cls = 'status-warn';
            html += '<p class="status-title">Subskrypcja anulowana</p>';
            html += '<p class="status-line">Dostęp pozostaje aktywny do <strong>' + formatDatePL(cancelAt) + '</strong>. Po tym dniu nie pobierzemy żadnej płatności.</p>';
            html += '<p class="status-line status-muted">Jeśli zmienisz zdanie, możesz wznowić subskrypcję przed tą datą.</p>';
          } else if(status === 'past_due'){
            cls = 'status-warn';
            html += '<p class="status-title">Problem z płatnością</p>';
            html += '<p class="status-line">Nie udało się pobrać opłaty. Zaktualizuj metodę płatności, aby zachować dostęp.</p>';
          } else if(status === 'trialing'){
            html += '<p class="status-title">Okres próbny</p>';
            html += '<p class="status-line">' + planLabelFor(p) + '</p>';
            if(periodEnd){ html += '<p class="status-line">Bezpłatny okres próbny do <strong>' + formatDatePL(periodEnd) + '</strong>, potem naliczymy pierwszą płatność.</p>'; }
          } else {
            html += '<p class="status-title">Subskrypcja aktywna</p>';
            html += '<p class="status-line">' + planLabelFor(p) + '</p>';
            if(periodEnd){ html += '<p class="status-line">Kolejna płatność: <strong>' + formatDatePL(periodEnd) + '</strong></p>'; }
          }
          if(p.role === 'teacher'){
            var usedSeats = 0;
            try{ var st = await sb.from('profiles').select('id', { count: 'exact', head: true }).eq('teacher_id', me.id); usedSeats = (st && typeof st.count === 'number') ? st.count : 0; }catch(e){ usedSeats = 0; }
            html += '<p class="status-line status-seats">Miejsca: wykorzystano <strong>' + usedSeats + '</strong> z ' + (p.seats || 0) + '</p>';
          }
        } else if(src === 'teacher'){
          html += '<p class="status-title">Dostęp przyznany przez lektora</p>';
          html += '<p class="status-line">Masz pełny dostęp do ćwiczeń dzięki swojemu lektorowi.</p>';
        } else if(src === 'comp'){
          html += '<p class="status-title">Pełny dostęp</p>';
          if(p.comp_expires_at){
            var dexp = new Date(p.comp_expires_at);
            html += '<p class="status-line">Masz pełny dostęp do platformy <strong>w ramach współpracy</strong> z EasyGo (do ' + dexp.toLocaleDateString('pl-PL') + '). Nie płacisz za subskrypcję.</p>';
          } else { html += '<p class="status-line">Masz stały, pełny dostęp do platformy.</p>'; }
        } else {
          cls = 'status-none';
          html += '<p class="status-title">Brak aktywnego dostępu</p>';
          html += '<p class="status-line">Wykup subskrypcję, aby odblokować wszystkie ćwiczenia.</p>';
          html += '<a class="status-cta" href="/oferta">Zobacz ofertę</a>';
        }
        body.innerHTML = html;
        card.className = 'card ' + cls;
        card.classList.remove('hidden');
      }

      $('eye1').addEventListener('click', function(){ var inp = $('newPass'); inp.type = inp.type === 'password' ? 'text' : 'password'; });

      $('savePass').addEventListener('click', async function(){
        var val = $('newPass').value;
        if(!val || val.length < 6){ msg($('passMsg'), 'Hasło musi mieć co najmniej 6 znaków.', 'err'); return; }
        $('savePass').disabled = true;
        var r = await sb.auth.updateUser({ password: val });
        $('savePass').disabled = false;
        if(r.error){ msg($('passMsg'), 'Błąd: ' + r.error.message, 'err'); return; }
        $('newPass').value = '';
        if(isReset){
          msg($('passMsg'), 'Hasło zostało zmienione. Za chwilę przeniesiemy Cię do logowania…', 'ok');
          setTimeout(function(){ window.location.href = '/logowanie'; }, 2200);
          return;
        }
        msg($('passMsg'), 'Hasło zostało zmienione.', 'ok');
      });

      $('manageSub').addEventListener('click', async function(e){
        e.preventDefault();
        $('manageSub').textContent = 'Otwieram…';
        try{
          var r = await sb.functions.invoke('stripe-portal', {});
          var url = r && r.data ? r.data.url : null;
          if(url){ window.location.href = url; }
          else { $('manageSub').textContent = 'Zarządzaj subskrypcją'; msg($('subMsg'), 'Nie udało się otworzyć panelu. Spróbuj ponownie.', 'err'); }
        }catch(err){ $('manageSub').textContent = 'Zarządzaj subskrypcją'; msg($('subMsg'), 'Nie udało się otworzyć panelu.', 'err'); }
      });

      $('delBtn').addEventListener('click', async function(){
        if(!confirm('Czy na pewno chcesz usunąć konto? Tej operacji nie można cofnąć.')) return;
        var typed = prompt('Aby potwierdzić, wpisz: USUŃ');
        // akceptuj różne formy: z ń i bez, z małej i dużej litery, z ewentualnymi spacjami
        var norm = (typed || '').trim().toLowerCase().replace(/ń/g, 'n');
        if(norm !== 'usun'){ msg($('delMsg'), 'Anulowano — konto nie zostało usunięte.', 'err'); return; }
        $('delBtn').disabled = true;
        var emailToNotify = me && me.email ? me.email : null;
        if(emailToNotify){ try{ await sb.functions.invoke('notify-account-deleted', { body: { user_email: emailToNotify } }); }catch(e){} }
        var r = await sb.rpc('delete_my_account');
        if(r.error || (r.data && String(r.data).startsWith('error'))){ $('delBtn').disabled = false; msg($('delMsg'), 'Nie udało się usunąć konta. Spróbuj ponownie.', 'err'); return; }
        await sb.auth.signOut();
        alert('Twoje konto zostało usunięte.');
        window.location.href = '/';
      });

      $('logoutLink').addEventListener('click', function(e){
        e.preventDefault();
        sb.auth.signOut().then(function(){ window.location.href = '/'; });
      });

      // przełącznik trybu
      var b = $('egTheme'), ic = $('egThemeIco');
      function s(){ if(ic) ic.textContent = document.documentElement.classList.contains('eg-dark') ? '☀' : '☾'; }
      s();
      if(b) b.addEventListener('click', function(){ var d = document.documentElement.classList.toggle('eg-dark'); try{ localStorage.setItem('easygo_tryb', d?'dark':'light'); }catch(e){} s(); });
    }

    // dark mode od razu (bez mignięcia)
    try{ if(localStorage.getItem('easygo_tryb')==='dark'){ document.documentElement.classList.add('eg-dark'); } }catch(e){}

    if(window.supabase){ boot(); }
    else {
      var sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      sc.onload = boot;
      document.head.appendChild(sc);
    }
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <button type="button" id="egTheme" title="Tryb jasny / ciemny" aria-label="Przełącz tryb"
        style={{ position: 'fixed', top: 14, right: 14, zIndex: 50, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--eg-card)', border: '1.5px solid var(--eg-line)', borderRadius: 999, padding: '5px 11px', cursor: 'pointer', color: 'var(--eg-ink)', fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700, boxShadow: '0 3px 12px rgba(0,0,0,.1)' }}>
        <span id="egThemeIco">☾</span>
      </button>
      <div className="wrap">
        <div className="brand">
          <div className="logo">EasyGo</div>
          <div className="sub">Moje konto</div>
        </div>

        <div id="notLogged" className="card hidden" style={{ textAlign: 'center' }}>
          <p className="desc" style={{ marginBottom: 16 }}>Aby zarządzać kontem, zaloguj się.</p>
          <a className="btn" href="/logowanie" style={{ textDecoration: 'none' }}>Zaloguj się</a>
        </div>

        <div id="account" className="hidden">
          <div id="resetBanner" className="reset-banner hidden"><strong>Ustaw nowe hasło.</strong> Wpisz poniżej nowe hasło do swojego konta i zapisz.</div>
          <p className="who" id="whoLine">Zalogowano jako <b id="whoEmail"></b></p>

          <div className="card hidden" id="subStatusCard">
            <h2>Status dostępu</h2>
            <div id="subStatusBody"></div>
          </div>

          <div className="card hidden" id="subCard">
            <h2>Moja subskrypcja</h2>
            <p className="desc">Zarządzaj swoją subskrypcją — zmień plan, zaktualizuj kartę, pobierz faktury lub anuluj. Otworzy się bezpieczny panel płatności.</p>
            <a href="#" className="link-sub" id="manageSub">Zarządzaj subskrypcją</a>
            <div className="msg" id="subMsg"></div>
            <div className="sub-info">
              <p><strong>Jak to działa?</strong></p>
              <p>Możesz zmienić plan z miesięcznego na roczny lub odwrotnie. Nowy plan zaczyna obowiązywać od kolejnego okresu rozliczeniowego — do końca opłaconego okresu zachowujesz obecny plan i pełny dostęp.</p>
              <p>Jeśli anulujesz subskrypcję, zachowujesz dostęp do końca opłaconego okresu. Opłacony okres nie podlega zwrotowi.</p>
            </div>
          </div>

          <div className="card">
            <h2>Zmiana hasła</h2>
            <p className="desc">Ustaw nowe hasło do swojego konta.</p>
            <div className="field">
              <label htmlFor="newPass">Nowe hasło</label>
              <div className="pass-wrap">
                <input type="password" id="newPass" placeholder="min. 6 znaków" autoComplete="new-password" />
                <button className="eye" id="eye1" type="button" aria-label="Pokaż hasło">
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" fill="currentColor" /></svg>
                </button>
              </div>
            </div>
            <button className="btn" id="savePass">Zapisz nowe hasło</button>
            <div className="msg" id="passMsg"></div>
          </div>

          <div className="card" id="delCard">
            <h2>Usunięcie konta</h2>
            <p className="desc">Trwale usuwa Twoje konto i wszystkie powiązane dane. Tej operacji nie można cofnąć.</p>
            <button className="btn danger" id="delBtn">Usuń moje konto</button>
            <div className="msg" id="delMsg"></div>
          </div>

          <div className="top-actions">
            <a href="/">← Wróć do ćwiczeń</a>
            &nbsp;·&nbsp;
            <a href="#" id="logoutLink">Wyloguj</a>
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
  :root{ --eg-magenta:#ca4490; --eg-violet:#6885db; --eg-gold:#f4c94c; --eg-ink:#2e2a33; --eg-muted:#7d7788; --eg-line:#eceaf2; --eg-bg:#faf9fc; --eg-card:#ffffff; }
  html.eg-dark{ --eg-ink:#e8e6ef; --eg-muted:#a29caf; --eg-line:#363850; --eg-bg:#1a1b26; --eg-card:#24263a; }
  html.eg-dark .btn.secondary{ background:#3a3550; color:#c9a8e0; }
  html.eg-dark .btn.danger{ background:#3d2226; color:#e88; }
  html.eg-dark .link-sub{ background:#4a2740; color:#f4a8d0; }
  html.eg-dark .reset-banner{ background:#20222f; border-color:#3f4468; color:var(--eg-ink); }
  html.eg-dark .reset-banner.err{ background:#3d2226; border-color:#5a3a3a; }
  html.eg-dark .card.status-warn{ background:#3a3320; border-color:#5a4d28; }
  html.eg-dark .card.status-none{ background:#3a2434; border-color:#5a3a4f; }
  html.eg-dark input::placeholder{ color:#8a84a0; }
  body{ margin:0; font-family:'Nunito',Arial,sans-serif; background:var(--eg-bg); color:var(--eg-ink); }
  .wrap{ max-width:560px; margin:0 auto; padding:40px 20px 60px; }
  .brand{ text-align:center; margin-bottom:28px; }
  .brand .logo{ font-family:'Quicksand',sans-serif; font-weight:700; font-size:34px; letter-spacing:-1px; color:var(--eg-magenta); line-height:1; }
  .brand .sub{ font-family:'Quicksand',sans-serif; font-weight:700; font-size:15px; display:inline-block; border-bottom:4px solid rgba(244,201,76,.55); padding-bottom:2px; margin-top:8px; }
  .card{ background:var(--eg-card); border:1px solid var(--eg-line); border-radius:18px; padding:26px 26px; margin-bottom:18px; box-shadow:0 6px 24px rgba(46,42,51,.04); }
  h2{ font-family:'Quicksand',sans-serif; font-size:19px; margin:0 0 4px; }
  .card p.desc{ color:var(--eg-muted); font-size:14px; margin:0 0 18px; line-height:1.5; }
  label{ display:block; font-size:13px; font-weight:700; color:var(--eg-muted); margin-bottom:7px; }
  .field{ margin-bottom:14px; }
  .pass-wrap{ position:relative; display:flex; align-items:center; }
  input[type=password],input[type=text],input[type=email]{ width:100%; font-family:inherit; font-size:15px; border:1.5px solid var(--eg-line); background:var(--eg-card); color:var(--eg-ink); border-radius:12px; padding:12px 15px; outline:none; transition:border-color .15s; }
  input:focus{ border-color:var(--eg-violet); }
  .eye{ position:absolute; right:12px; background:none; border:none; cursor:pointer; color:var(--eg-muted); padding:4px; display:flex; }
  .btn{ font-family:'Quicksand',sans-serif; font-weight:700; font-size:15px; background:var(--eg-magenta); color:#fff; border:none; padding:12px 22px; border-radius:12px; cursor:pointer; transition:filter .15s; }
  .btn:hover{ filter:brightness(1.06); }
  .btn:disabled{ opacity:.6; cursor:default; }
  .btn.secondary{ background:#f3f0fa; color:var(--eg-violet); }
  .btn.danger{ background:#fbeaea; color:#c0392b; }
  .link-sub{ display:inline-block; font-family:'Quicksand',sans-serif; font-weight:700; font-size:15px; color:var(--eg-magenta); text-decoration:none; background:#fbeaf3; padding:12px 22px; border-radius:12px; }
  .msg{ font-size:13.5px; margin-top:10px; min-height:18px; }
  .msg.ok{ color:#1e7e50; }
  .msg.err{ color:#c0392b; }
  .top-actions{ text-align:center; margin-top:8px; }
  .top-actions a{ color:var(--eg-violet); text-decoration:none; font-weight:700; font-size:14px; }
  .hidden{ display:none; }
  .who{ text-align:center; color:var(--eg-muted); font-size:14px; margin-bottom:22px; }
  .who b{ color:var(--eg-ink); }
  .reset-banner{ background:#f3f0fa; border:1.5px solid #d8c8ec; border-radius:14px; padding:16px 18px; font-size:14.5px; line-height:1.5; color:var(--eg-ink); margin-bottom:20px; }
  .reset-banner strong{ color:var(--eg-violet); }
  .reset-banner.err{ background:#fbeaea; border-color:#f0c4c4; }
  .reset-banner.err strong{ color:#c0392b; }
  .sub-info{ margin-top:18px; padding-top:16px; border-top:1px solid var(--eg-line); }
  .sub-info p{ font-size:13px; line-height:1.55; color:var(--eg-muted); margin:0 0 8px; }
  .sub-info p:last-child{ margin-bottom:0; }
  .sub-info strong{ color:var(--eg-ink); font-family:'Quicksand',sans-serif; }
  .status-title{ font-family:'Quicksand',sans-serif; font-weight:700; font-size:16px; margin:0 0 8px; color:var(--eg-ink); }
  .status-line{ font-size:14px; line-height:1.55; color:var(--eg-ink); margin:0 0 6px; }
  .status-line:last-child{ margin-bottom:0; }
  .status-line strong{ font-family:'Quicksand',sans-serif; color:var(--eg-magenta); }
  .status-muted{ color:var(--eg-muted); font-size:13px; }
  .status-seats{ margin-top:12px; padding-top:12px; border-top:1px solid var(--eg-line); color:var(--eg-muted); }
  .status-seats strong{ color:var(--eg-ink); }
  .status-cta{ display:inline-block; margin-top:12px; font-family:'Quicksand',sans-serif; font-weight:700; font-size:15px; color:#fff; background:var(--eg-magenta); text-decoration:none; padding:11px 22px; border-radius:12px; }
  .status-cta:hover{ filter:brightness(1.06); }
  .card.status-warn{ border-color:#f0d9a0; background:#fdf8ec; }
  .card.status-warn .status-title{ color:#a06a12; }
  .card.status-none{ border-color:#f0c4dd; background:#fdf2f8; }
`;
