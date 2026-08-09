# gry.easygo-english.pl

Strona z ćwiczeniami EasyGo English (Next.js + Supabase).
Katalog i granie 1:1 z obecnej strony, plus podstrona per ćwiczenie dla Google/AI.

## Co gdzie jest
- app/page.js — strona główna (katalog + ukryta lista dla robotów)
- app/cwiczenie/[slug]/ — podstrona ćwiczenia (gra u góry + opis pod spodem)
- public/katalog-embed.html — Twój katalog 1:1 (osadzony)
- public/graj-player.html — Twój odtwarzacz 1:1 (osadzony)
- lib/supabase.js — połączenie z bazą

## Wgranie
Połącz to repozytorium z Vercel — zbuduje się automatycznie.
Potem podłącz domenę gry.easygo-english.pl w ustawieniach Vercel.
