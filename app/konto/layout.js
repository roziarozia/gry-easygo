// Moje konto: strona prywatna, nie ma się pojawiać w Google (np. adresy z ?reset=1).
export const metadata = {
  title: 'Moje konto | EasyWonders',
  robots: { index: false, follow: true },
};

export default function KontoLayout({ children }) {
  return children;
}
