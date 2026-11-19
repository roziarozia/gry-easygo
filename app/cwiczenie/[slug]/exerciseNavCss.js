// Wygląd górnego paska (ExerciseNav). Osobny plik, bo stałe z pliku 'use client'
// nie dają się zaimportować do strony renderowanej na serwerze.
export const NAV_CSS = `
.exn{ max-width:1240px; margin:0 auto; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; gap:12px; font-family:'Outfit','Nunito',sans-serif; border-bottom:1px solid var(--eg-line,#eceaf2); }
.exn-brand{ font-weight:700; font-size:19px; text-decoration:none; letter-spacing:-.2px; }
.exn-brand .e, .exn-mbrand .e{ color:var(--eg-magenta,#ca4490); } .exn-brand .w, .exn-mbrand .w{ color:var(--eg-gold,#f4c94c); }
.exn-links{ display:flex; align-items:center; gap:6px; }
.exn-txt{ font-size:14.5px; font-weight:600; color:var(--eg-ink,#2e2a33) !important; text-decoration:none; padding:7px 12px; border-radius:999px; }
.exn-txt:hover{ color:var(--eg-magenta,#ca4490) !important; }
.exn-pill{ font-size:13px; font-weight:700; color:#fff !important; text-decoration:none; padding:7px 16px; border-radius:999px; white-space:nowrap; }
.exn-oferta{ background:var(--eg-magenta,#ca4490); margin-left:6px; } .exn-oferta:hover{ background:#b33a7e; }
.exn-opinie{ background:var(--eg-gold,#f4c94c); } .exn-opinie:hover{ background:#eab827; }
.exn-theme{ width:34px; height:34px; margin-left:4px; border-radius:999px; border:1.5px solid var(--eg-line,#eceaf2); background:var(--eg-card,#fff); color:var(--eg-ink,#2e2a33); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
.exn-theme:hover{ border-color:#a78dd9; color:var(--eg-magenta,#ca4490); }
.exn-mobile{ display:none; align-items:center; gap:10px; }
.exn-burger{ width:38px; height:38px; border:1.5px solid var(--eg-line,#eceaf2); border-radius:10px; background:var(--eg-card,#fff); cursor:pointer; display:inline-flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; }
.exn-burger span{ width:18px; height:2px; background:var(--eg-ink,#2e2a33); border-radius:2px; }
.exn-overlay{ display:none; position:fixed; inset:0; background:rgba(30,25,40,.45); z-index:150; }
.exn-overlay.open{ display:block; }
.exn-menu{ position:fixed; top:0; right:0; bottom:0; width:80%; max-width:320px; background:var(--eg-card,#fff); z-index:200; box-shadow:-10px 0 40px rgba(0,0,0,.16); padding:24px 20px 28px; display:flex; flex-direction:column; gap:6px; transform:translateX(105%); transition:transform .25s ease; font-family:'Outfit','Nunito',sans-serif; visibility:hidden; }
.exn-menu.open{ transform:none; visibility:visible; }
.exn-close{ position:absolute; top:16px; right:16px; width:36px; height:36px; border:none; background:var(--eg-card-soft,#faf7fb); border-radius:50%; font-size:22px; line-height:1; color:var(--eg-ink,#2e2a33); cursor:pointer; }
.exn-mbrand{ font-weight:700; font-size:21px; text-decoration:none; margin-bottom:14px; padding-bottom:16px; border-bottom:1px solid var(--eg-line,#eceaf2); }
.exn-item{ display:flex; flex-direction:column; text-decoration:none; padding:12px 14px; border-radius:14px; border-left:4px solid transparent; }
.exn-item:hover{ background:var(--eg-card-soft,#faf7fb); border-left-color:var(--eg-magenta,#ca4490); }
.exn-item b{ font-size:16px; font-weight:700; color:var(--eg-ink,#2e2a33); line-height:1.2; }
.exn-item small{ font-size:12.5px; color:var(--eg-muted,#7d7788); margin-top:2px; }
.exn-mtheme{ margin-top:auto; display:flex; align-items:center; justify-content:center; gap:8px; font:inherit; font-size:14.5px; font-weight:700; color:var(--eg-muted,#7d7788); padding:14px; border:1px solid var(--eg-line,#eceaf2); border-radius:14px; background:none; cursor:pointer; }
@media (max-width:820px){
  .exn{ padding:12px 16px; }
  .exn-links{ display:none; }
  .exn-mobile{ display:flex; }
}
`;
