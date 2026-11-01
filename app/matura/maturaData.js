// Wspólne dane części maturalnej: typy zadań (te same klucze co w panelu ćwiczeń),
// nazwy działów i data matury do licznika.

export const SECTIONS = [
  { id: 'listening', roman: 'I', en: 'Listening', pl: 'Rozumienie ze słuchu' },
  { id: 'reading', roman: 'II', en: 'Reading', pl: 'Rozumienie tekstów pisanych' },
  { id: 'use', roman: 'III', en: 'Use of English', pl: 'Znajomość środków językowych' },
];

export const TASKS = {
  basic: {
    listening: [['l_match', 'Dobieranie wypowiedzi do zdań'], ['l_mc', 'Wybór wielokrotny'], ['l_notes', 'Uzupełnianie luk w notatce']],
    reading: [['r_headings', 'Dobieranie nagłówków'], ['r_texts', 'Dobieranie tekstów do zdań'], ['r_mc', 'Wybór wielokrotny'], ['r_gaps', 'Wstawianie zdań w luki']],
    use: [['u_dialogues', 'Minidialogi'], ['u_paraphrase', 'Znaczenie fragmentu zdania'], ['u_twosent', 'Jedno słowo do dwóch zdań'], ['u_box', 'Wyrazy z ramki'], ['u_onegap', 'Luki: jeden wyraz'], ['u_transform', 'Przekształcenia zdań']],
  },
  ext: {
    listening: [['l_mc', 'Wybór wielokrotny'], ['l_match', 'Dobieranie zdań do wypowiedzi'], ['l_notes', 'Uzupełnianie luk w zdaniach']],
    reading: [['r_match', 'Dobieranie pytań do tekstu'], ['r_gaps', 'Wstawianie zdań w luki'], ['r_mc', 'Wybór wielokrotny'], ['r_complete', 'Uzupełnianie zdań']],
    use: [['u_mc', 'Wybór wielokrotny w tekście'], ['u_wordform', 'Słowotwórstwo'], ['u_transform', 'Przekształcenia zdań']],
  },
};

export function taskName(level, section, task) {
  const list = (TASKS[level] || {})[section] || [];
  const f = list.find((t) => t[0] === task);
  return f ? f[1] : '';
}

export function sectionOf(id) {
  return SECTIONS.find((s) => s.id === id) || null;
}

// Matura 2027, język angielski, poziom podstawowy: 6 maja 2027, 9:00 (komunikat CKE z 20.08.2026).
export const EXAM_AT = Date.UTC(2027, 4, 6, 7, 0, 0);

export function daysToExam(now) {
  const d = Math.ceil((EXAM_AT - now) / 86400000);
  return d > 0 ? d : 0;
}

// Wspólne kroje i kolory „gazety”.
export const MT_FONTS = "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;0,900;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=Outfit:wght@700&display=swap');";
