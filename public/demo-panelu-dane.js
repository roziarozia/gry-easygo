// PODGLĄD PANELU LEKTORA (panel-lektora?demo=1)
// Prawdziwy panel lektora, ale zamiast bazy dostaje ten "udawany" klient Supabase z przykładowymi danymi.
// Wszystko dzieje się w pamięci przeglądarki: nic nie trafia do bazy, nikt nie dostaje maili.
// Lista ćwiczeń (okładki, tytuły) jest prawdziwa — panel pobiera ją sam z publicznego katalogu.
(function(){
  var DZIEN = 86400000;
  function dni(n){ return new Date(Date.now() - n * DZIEN).toISOString(); }
  var ME = { id: 'demo-lektor', email: 'anna@przyklad.pl' };

  // ---------- przykładowe dane ----------
  var DB = {
    profiles: [{ id: ME.id, role: 'teacher', display_name: 'Anna', team_name: 'Szkoła Językowa Słoneczko',
      is_owner: true, owner_id: null, seats: 20, seat_limit: null, access_source: 'stripe', access_level: 'full', comp_expires_at: null }],
    groups: [
      { id: 'g1', name: 'Matura 2027', color: '#ca4490', teacher_id: ME.id },
      { id: 'g2', name: 'B1 wtorki', color: '#6885db', teacher_id: ME.id },
      { id: 'g3', name: 'Dzieci 10-12', color: '#e0a417', teacher_id: 't1' }
    ],
    students: [
      { id: 's1', email: 'kasia.nowak@przyklad.pl', student_name: 'Kasia Nowak', status: 'active', speaking_enabled: true, group_id: 'g1', teacher_id: ME.id },
      { id: 's2', email: 'michal.wisniewski@przyklad.pl', student_name: 'Michał Wiśniewski', status: 'active', speaking_enabled: false, group_id: 'g1', teacher_id: ME.id },
      { id: 's3', email: 'ola.zielinska@przyklad.pl', student_name: 'Ola Zielińska', status: 'active', speaking_enabled: false, group_id: 'g2', teacher_id: ME.id },
      { id: 's4', email: 'tomek.kowalczyk@przyklad.pl', student_name: 'Tomek Kowalczyk', status: 'active', speaking_enabled: true, group_id: 'g2', teacher_id: ME.id },
      { id: 's5', email: 'julia.lewandowska@przyklad.pl', student_name: 'Julia Lewandowska', status: 'active', speaking_enabled: true, group_id: null, teacher_id: ME.id },
      { id: 'p1', email: 'marek.dabrowski@przyklad.pl', student_name: null, status: 'pending', speaking_enabled: false, group_id: null, invited_at: dni(2), teacher_id: ME.id },
      { id: 'p2', email: 'zosia.kaminska@przyklad.pl', student_name: null, status: 'pending', speaking_enabled: false, group_id: null, invited_at: null, teacher_id: ME.id },
      // uczniowie lektorki Ewy (zakładka "Moi lektorzy")
      { id: 'e1', email: 'antek.wojcik@przyklad.pl', student_name: 'Antek Wójcik', status: 'active', group_id: 'g3', teacher_id: 't1' },
      { id: 'e2', email: 'hania.mazur@przyklad.pl', student_name: 'Hania Mazur', status: 'active', group_id: 'g3', teacher_id: 't1' },
      { id: 'e3', email: 'kuba.krawczyk@przyklad.pl', student_name: 'Kuba Krawczyk', status: 'active', group_id: null, teacher_id: 't1' }
    ],
    subteachers: [
      { id: 't1', email: 'ewa@przyklad.pl', display_name: 'Ewa', seat_limit: 6, status: 'active' },
      { id: null, email: 'piotr@przyklad.pl', display_name: null, seat_limit: 4, status: 'pending', students_count: 0 }
    ],
    homework: [
      { id: 'h1', teacher_id: ME.id, student_id: 's1', game_slug: 'common-mistakes-b1', created_at: dni(9), completed_at: dni(7) },
      { id: 'h2', teacher_id: ME.id, student_id: 's1', game_slug: 'american-high-school-listening', created_at: dni(3), completed_at: dni(1) },
      { id: 'h3', teacher_id: ME.id, student_id: 's1', game_slug: 'quiz-australia-kuratoryjny', created_at: dni(1), completed_at: null },
      { id: 'h4', teacher_id: ME.id, student_id: 's2', game_slug: 'common-mistakes-b1', created_at: dni(9), completed_at: dni(5) },
      { id: 'h5', teacher_id: ME.id, student_id: 's2', game_slug: 'american-high-school-listening', created_at: dni(3), completed_at: null },
      { id: 'h6', teacher_id: ME.id, student_id: 's3', game_slug: 'articles-a-day-with-the-barkers-a1', created_at: dni(6), completed_at: dni(4) },
      { id: 'h7', teacher_id: ME.id, student_id: 's3', game_slug: 'quiz-everyday-english-a1', created_at: dni(2), completed_at: null },
      { id: 'h8', teacher_id: ME.id, student_id: 's4', game_slug: 'articles-a-day-with-the-barkers-a1', created_at: dni(6), completed_at: dni(6) },
      { id: 'h9', teacher_id: ME.id, student_id: 's5', game_slug: 'about-you-0qa6', created_at: dni(4), completed_at: dni(2) },
      { id: 'h10', teacher_id: ME.id, student_id: 's5', game_slug: '0-conditional-1tax', created_at: dni(1), completed_at: null }
    ],
    game_completions: [
      { user_id: 's1', game_slug: 'common-mistakes-b1', completed_at: dni(7), source: 'homework', score: 8, score_max: 10 },
      { user_id: 's1', game_slug: 'american-high-school-listening', completed_at: dni(1), source: 'homework', score: 5, score_max: 6 },
      { user_id: 's1', game_slug: 'american-high-school-vocabulary-b2', completed_at: dni(3), source: 'self', score: 9, score_max: 10 },
      { user_id: 's2', game_slug: 'common-mistakes-b1', completed_at: dni(5), source: 'homework', score: 6, score_max: 10 },
      { user_id: 's3', game_slug: 'articles-a-day-with-the-barkers-a1', completed_at: dni(4), source: 'homework', score: 11, score_max: 12 },
      { user_id: 's4', game_slug: 'articles-a-day-with-the-barkers-a1', completed_at: dni(6), source: 'homework', score: 9, score_max: 12 },
      { user_id: 's4', game_slug: 'quiz-everyday-english-a1', completed_at: dni(2), source: 'self', score: 10, score_max: 10 },
      { user_id: 's5', game_slug: 'about-you-0qa6', completed_at: dni(2), source: 'homework', score: 4, score_max: 5 }
    ],
    student_progress: [
      { id: 'sp1', teacher_id: ME.id, student_id: 's1', game_slug: 'american-high-school-speaking', done: true, note: 'Świetnie opowiadała o planach na wakacje. Powtórzyć "going to" vs "will".', created_at: dni(8) },
      { id: 'sp2', teacher_id: ME.id, student_id: 's1', game_slug: null, custom_title: 'Present Perfect vs Past Simple - powtórka na następnej lekcji', done: false, note: '', created_at: dni(2) },
      { id: 'sp3', teacher_id: ME.id, student_id: 's5', game_slug: null, custom_title: 'Skończyłyśmy na str. 24 w podręczniku', done: false, note: '', created_at: dni(4) }
    ],
    group_progress: [
      { id: 'gp1', teacher_id: ME.id, group_id: 'g1', game_slug: 'common-mistakes-b1', done: true, note: 'Najwięcej błędów: "depend of" i "contact with".', created_at: dni(9) },
      { id: 'gp2', teacher_id: ME.id, group_id: 'g1', game_slug: null, custom_title: 'Próbna matura - rozprawka na piątek', done: false, note: '', created_at: dni(1) }
    ],
    student_invites: [], teacher_invites: [], games: [], questions: []
  };

  // przykładowe szczegóły odpowiedzi (prawdziwe zdania z ćwiczenia "Common mistakes" B1)
  var ODP = [
    { s: 'Thank _ God, everyone was safe after the storm.', t: '-', c: '-', e: 'Poprawnie: thank God (bez „to”).' },
    { s: 'It all depends _ how much time we have.', t: 'of', c: 'on', e: 'Poprawnie: depend ON - mówimy „it depends on...” (to zależy od...).' },
    { s: 'I visited _ my grandma last weekend.', t: '-', c: '-', e: '' },
    { s: 'They contacted _ me last week about the job.', t: 'with', c: '-', e: 'Poprawnie: contact somebody. Po „contact” nie ma „with” (kalka z „kontaktować się Z”).' },
    { s: 'I saw a great documentary _ TV last night.', t: 'on', c: 'on', e: '' },
    { s: 'I found this great recipe _ the internet.', t: 'on', c: 'on', e: '' }
  ];

  var licznik = 100;
  function noweId(p){ licznik++; return p + licznik; }
  function kopia(o){ return JSON.parse(JSON.stringify(o)); }

  // ---------- zapytania do "tabel" (from) ----------
  function Zapytanie(tabela){
    this.t = tabela; this.filtry = []; this.akcja = 'select'; this.dane = null;
    this.jeden = null; this.sort = null; this.lim = null;
  }
  var P = Zapytanie.prototype;
  P.select = function(){ return this; };
  P.eq = function(k, v){ this.filtry.push(function(r){ return r[k] === v; }); return this; };
  P.neq = function(k, v){ this.filtry.push(function(r){ return r[k] !== v; }); return this; };
  P.in = function(k, lista){ this.filtry.push(function(r){ return (lista || []).indexOf(r[k]) !== -1; }); return this; };
  P.is = function(k, v){ this.filtry.push(function(r){ return (r[k] == null ? null : r[k]) === v; }); return this; };
  P.match = function(o){ var s = this; Object.keys(o || {}).forEach(function(k){ s.eq(k, o[k]); }); return this; };
  P.order = function(k, o){ this.sort = { k: k, asc: !(o && o.ascending === false) }; return this; };
  P.limit = function(n){ this.lim = n; return this; };
  P.range = function(){ return this; };
  P.single = function(){ this.jeden = 'single'; return this; };
  P.maybeSingle = function(){ this.jeden = 'maybe'; return this; };
  P.insert = function(d){ this.akcja = 'insert'; this.dane = d; return this; };
  P.upsert = function(d){ this.akcja = 'insert'; this.dane = d; return this; };
  P.update = function(d){ this.akcja = 'update'; this.dane = d; return this; };
  P.delete = function(){ this.akcja = 'delete'; return this; };
  P.wykonaj = function(){
    var tab = DB[this.t] || (DB[this.t] = []);
    var f = this.filtry;
    var pasuje = function(r){ return f.every(function(fn){ return fn(r); }); };
    if(this.akcja === 'insert'){
      var wiersze = Array.isArray(this.dane) ? this.dane : [this.dane];
      wiersze.forEach(function(w){ var n = Object.assign({ id: noweId('x'), created_at: new Date().toISOString() }, w); tab.unshift(n); });
      return { data: null, error: null };
    }
    if(this.akcja === 'update'){
      var d = this.dane; tab.forEach(function(r){ if(pasuje(r)) Object.assign(r, d); });
      return { data: null, error: null };
    }
    if(this.akcja === 'delete'){
      for(var i = tab.length - 1; i >= 0; i--){ if(pasuje(tab[i])) tab.splice(i, 1); }
      return { data: null, error: null };
    }
    var out = tab.filter(pasuje);
    if(this.sort){
      var k = this.sort.k, asc = this.sort.asc;
      out = out.slice().sort(function(a, b){ var x = a[k] || '', y = b[k] || ''; return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1); });
    }
    if(this.lim) out = out.slice(0, this.lim);
    out = kopia(out);
    if(this.jeden) return { data: out[0] || null, error: (this.jeden === 'single' && !out.length) ? { message: 'brak' } : null };
    return { data: out, error: null };
  };
  P.then = function(ok, blad){
    var wynik; try{ wynik = this.wykonaj(); }catch(e){ wynik = { data: null, error: { message: String(e) } }; }
    return Promise.resolve(wynik).then(ok, blad);
  };

  // ---------- funkcje bazy (rpc) ----------
  function moiUczniowie(nauczyciel){ return DB.students.filter(function(s){ return s.teacher_id === nauczyciel; }); }
  function grupyLektora(nauczyciel){
    return DB.groups.filter(function(g){ return g.teacher_id === nauczyciel; }).map(function(g){
      return Object.assign({}, g, { student_count: DB.students.filter(function(s){ return s.group_id === g.id && s.status === 'active'; }).length });
    });
  }
  function zadajGrupie(gid, slug){
    var ile = 0;
    DB.students.forEach(function(s){
      if(s.group_id !== gid || s.status !== 'active') return;
      if(DB.homework.some(function(h){ return h.student_id === s.id && h.game_slug === slug; })) return;
      DB.homework.unshift({ id: noweId('h'), teacher_id: ME.id, student_id: s.id, game_slug: slug, created_at: new Date().toISOString(), completed_at: null });
      ile++;
    });
    return 'Zadano ' + ile + ' ' + (ile === 1 ? 'uczniowi' : 'uczniom') + '.';
  }
  function oznacz(sid, slug, zrobione){
    if(zrobione){
      if(!DB.game_completions.some(function(c){ return c.user_id === sid && c.game_slug === slug; }))
        DB.game_completions.unshift({ user_id: sid, game_slug: slug, completed_at: new Date().toISOString(), source: 'teacher', score: null, score_max: null });
      DB.homework.forEach(function(h){ if(h.student_id === sid && h.game_slug === slug && !h.completed_at) h.completed_at = new Date().toISOString(); });
    } else {
      DB.game_completions = DB.game_completions.filter(function(c){ return !(c.user_id === sid && c.game_slug === slug && c.source === 'teacher'); });
    }
  }
  var RPC = {
    my_students: function(){ return kopia(moiUczniowie(ME.id)); },
    my_groups: function(){ return grupyLektora(ME.id); },
    my_subteachers: function(){
      return DB.subteachers.map(function(t){
        return Object.assign({}, t, { students_count: t.id ? moiUczniowie(t.id).length : 0 });
      });
    },
    subteacher_students: function(a){ return kopia(moiUczniowie(a.sub)); },
    owner_teacher_groups: function(a){ return grupyLektora(a.sub); },
    add_student: function(a){
      var mail = String(a.student_email || '').toLowerCase();
      if(DB.students.some(function(s){ return s.email === mail; })) return 'error: ten uczeń jest już na liście';
      if(moiUczniowie(ME.id).length >= 14) return 'error: brak wolnych miejsc';
      DB.students.push({ id: noweId('s'), email: mail, student_name: null, status: 'pending', speaking_enabled: false, group_id: null, invited_at: null, teacher_id: ME.id });
      return 'ok: zapisano zaproszenie';
    },
    owner_add_student: function(a){
      DB.students.push({ id: noweId('s'), email: String(a.student_email || '').toLowerCase(), student_name: a.s_name || null, status: 'pending', group_id: null, teacher_id: a.sub });
      return 'ok';
    },
    remove_student: function(a){ DB.students = DB.students.filter(function(s){ return s.id !== a.student; }); return 'ok'; },
    set_student_name: function(a){ DB.students.forEach(function(s){ if(s.id === a.p_student) s.student_name = a.p_name || null; }); return 'ok'; },
    set_speaking_access: function(a){ DB.students.forEach(function(s){ if(s.id === a.student) s.speaking_enabled = !!a.enabled; }); return 'ok'; },
    set_student_group: function(a){ DB.students.forEach(function(s){ if(s.id === a.p_student) s.group_id = a.g_id || null; }); return 'ok'; },
    create_group: function(a){ DB.groups.push({ id: noweId('g'), name: a.g_name, color: a.g_color || '#a78dd9', teacher_id: a.for_teacher || ME.id }); return 'ok'; },
    update_group: function(a){ DB.groups.forEach(function(g){ if(g.id === a.g_id){ g.name = a.g_name; g.color = a.g_color; } }); return 'ok'; },
    delete_group: function(a){
      DB.groups = DB.groups.filter(function(g){ return g.id !== a.g_id; });
      DB.students.forEach(function(s){ if(s.group_id === a.g_id) s.group_id = null; });
      return 'ok';
    },
    assign_group_to_teacher: function(a){ DB.groups.forEach(function(g){ if(g.id === a.g_id) g.teacher_id = a.sub; }); return 'ok'; },
    assign_homework_to_group: function(a){ return zadajGrupie(a.g_id, a.p_slug); },
    mark_group_completion: function(a){
      var ile = 0;
      DB.students.forEach(function(s){ if(s.group_id === a.g_id && s.status === 'active'){ oznacz(s.id, a.p_slug, a.p_done !== false); ile++; } });
      return ile + ' uczniów';
    },
    teacher_mark_completion: function(a){ oznacz(a.p_student, a.p_slug, a.p_done !== false); return 'ok'; },
    invite_subteacher: function(a){
      DB.subteachers.push({ id: null, email: String(a.sub_email || '').toLowerCase(), display_name: null, seat_limit: a.sub_limit || 1, status: 'pending', students_count: 0 });
      return 'ok';
    },
    set_subteacher_limit: function(a){ DB.subteachers.forEach(function(t){ if(t.id === a.sub) t.seat_limit = a.new_limit; }); return 'ok'; },
    set_subteacher_name: function(a){ DB.subteachers.forEach(function(t){ if(t.id === a.sub) t.display_name = a.s_name || null; }); return 'ok'; },
    remove_subteacher: function(a){ DB.subteachers = DB.subteachers.filter(function(t){ return t.id !== a.sub; }); return 'ok'; },
    owner_manage_sub_invite: function(){ return 'ok'; },
    get_completion_answers: function(a){
      var c = DB.game_completions.filter(function(x){ return x.user_id === a.p_owner_id && x.game_slug === a.p_game_slug; })[0];
      var ok = 0;
      var odp = ODP.map(function(o, i){ var dobrze = o.t === o.c; if(dobrze) ok++;
        return { type: 'gap', q: i, sentence: o.s, typed: o.t, correct_text: o.c, ok: dobrze, explanation: o.e }; });
      return { locked: false, answers: odp, score: c && c.score != null ? c.score : ok, score_max: c && c.score_max ? c.score_max : odp.length };
    },
    delete_my_account: function(){ throw new Error('W podglądzie nie można usunąć konta.'); }
  };

  function wywolaj(nazwa, arg){
    return new Promise(function(ok){
      setTimeout(function(){
        try{
          var f = RPC[nazwa];
          ok({ data: f ? f(arg || {}) : null, error: null });
        }catch(e){ ok({ data: null, error: { message: e.message || String(e) } }); }
      }, 60);
    });
  }

  var klient = {
    from: function(t){ return new Zapytanie(t); },
    rpc: wywolaj,
    auth: {
      getSession: function(){ return Promise.resolve({ data: { session: { user: ME } }, error: null }); },
      getUser: function(){ return Promise.resolve({ data: { user: ME }, error: null }); },
      signOut: function(){ return Promise.resolve({ error: null }); },
      updateUser: function(){ return Promise.resolve({ data: null, error: { message: 'W podglądzie nie można zmienić hasła.' } }); },
      onAuthStateChange: function(){ return { data: { subscription: { unsubscribe: function(){} } } }; }
    },
    functions: {
      invoke: function(nazwa){
        if(nazwa === 'send-invite' || nazwa === 'invite-teacher') return Promise.resolve({ data: { ok: true }, error: null });
        return Promise.resolve({ data: null, error: { message: 'W podglądzie ta opcja jest wyłączona.' } });
      }
    }
  };

  window.EG_DEMO_PANEL = true;
  window.supabase = { createClient: function(){ return klient; } };
})();
