import MaturaHub from './MaturaHub';

// Strona /matura jest na razie UKRYTA: brak linku w menu, nie ma jej w mapie strony,
// a Google dostaje „noindex”. Zmień index na true dopiero przy publicznym starcie.
export const metadata = {
  title: 'Matura z angielskiego – ćwiczenia online',
  description: 'Ćwiczenia z angielskiego wzorowane na arkuszach maturalnych: Listening, Reading i Use of English na poziomie podstawowym i rozszerzonym.',
  alternates: { canonical: '/matura' },
  robots: { index: false, follow: false },
};

export default function MaturaPage() {
  return <MaturaHub />;
}
