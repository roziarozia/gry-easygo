// Wspólne dane części maturalnej: typy zadań (te same klucze co w panelu ćwiczeń),
// nazwy działów i data matury do licznika.

export const SECTIONS = [
  { id: 'listening', roman: 'I', en: 'Listening', pl: 'Rozumienie ze słuchu' },
  { id: 'reading', roman: 'II', en: 'Reading', pl: 'Rozumienie tekstów pisanych' },
  { id: 'use', roman: 'III', en: 'Use of English', pl: 'Znajomość środków językowych' },
  { id: 'writing', roman: 'IV', en: 'Writing', pl: 'Wypowiedź pisemna' },
  { id: 'speaking', roman: 'V', en: 'Oral exam', pl: 'Matura ustna' },
];

// Matura ustna jest jedna (bez poziomów), więc jej zadania pokazujemy przy obu poziomach.
const ORAL = [['o_intro', 'Rozmowa wstępna'], ['o_role', 'Rozmowa z odgrywaniem roli'], ['o_picture', 'Opis ilustracji'], ['o_stimulus', 'Materiał stymulujący']];
export const BOTH_LEVELS = ['speaking'];

// Kryteria oceny wypowiedzi pisemnej (zasady oceniania CKE, formuła 2023).
export const WRITING_CRITERIA = {
  basic: [['tresc', 'Treść', 5], ['spojnosc', 'Spójność i logika wypowiedzi', 2], ['zakres', 'Zakres środków językowych', 3], ['poprawnosc', 'Poprawność środków językowych', 2]],
  ext: [['zgodnosc', 'Zgodność z poleceniem', 5], ['spojnosc', 'Spójność i logika wypowiedzi', 2], ['zakres', 'Zakres środków językowych', 3], ['poprawnosc', 'Poprawność środków językowych', 3]],
};

export const TASKS = {
  basic: {
    listening: [['l_match', 'Dobieranie wypowiedzi do zdań'], ['l_mc', 'Wybór wielokrotny'], ['l_notes', 'Uzupełnianie luk w notatce']],
    reading: [['r_headings', 'Dobieranie nagłówków'], ['r_texts', 'Dobieranie tekstów do zdań'], ['r_mc', 'Wybór wielokrotny'], ['r_gaps', 'Wstawianie zdań w luki']],
    // kolejność jak w arkuszu CKE (maj 2026): minidialogi, znaczenie fragmentu, wyrazy z ramki, przekształcenia;
    // dwa typy spoza arkusza 2026 na końcu
    use: [['u_dialogues', 'Minidialogi'], ['u_paraphrase', 'Znaczenie fragmentu zdania'], ['u_box', 'Wyrazy z ramki'], ['u_transform', 'Przekształcenia zdań'], ['u_twosent', 'Jedno słowo do dwóch zdań'], ['u_onegap', 'Luki: jeden wyraz']],
    writing: [['w_email', 'E-mail'], ['w_blog', 'Wpis na blogu']],
    speaking: ORAL,
  },
  ext: {
    listening: [['l_mc', 'Wybór wielokrotny'], ['l_match', 'Dobieranie zdań do wypowiedzi'], ['l_notes', 'Uzupełnianie luk w zdaniach']],
    reading: [['r_match', 'Dobieranie pytań do tekstu'], ['r_gaps', 'Wstawianie zdań w luki'], ['r_mc', 'Wybór wielokrotny'], ['r_complete', 'Uzupełnianie zdań']],
    use: [['u_mc', 'Wybór wielokrotny w tekście'], ['u_wordform', 'Słowotwórstwo'], ['u_transform', 'Przekształcenia zdań']],
    writing: [['w_opinion', 'Rozprawka opiniująca'], ['w_proscons', 'Rozprawka za i przeciw'], ['w_article', 'Artykuł publicystyczny'], ['w_letter', 'List formalny']],
    speaking: ORAL,
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

// Matura 2027, język angielski (harmonogram CKE): poziom podstawowy 6 maja 2027, 9:00;
// poziom rozszerzony 7 maja 2027, 9:00. Godziny w UTC (w maju Polska = UTC+2).
export const EXAM_AT = { basic: Date.UTC(2027, 4, 6, 7, 0, 0), ext: Date.UTC(2027, 4, 7, 7, 0, 0) };

export function daysToExam(now, level) {
  const d = Math.ceil(((EXAM_AT[level] || EXAM_AT.basic) - now) / 86400000);
  return d > 0 ? d : 0;
}

// Wspólne kroje: Playfair Display (tytuły) + Outfit (tekst, jak w całej marce).
export const MT_FONTS = "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;0,900;1,400&family=Outfit:wght@400;500;600;700&display=swap');";
