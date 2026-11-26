// Logowanie i rejestracja: strona nie ma się pojawiać w Google.
// Każde ćwiczenie linkuje tu z innym adresem (?rejestracja&powrot=...), co Google liczyło jako duplikaty.
export const metadata = {
  title: 'Logowanie | EasyWonders',
  robots: { index: false, follow: true },
};

export default function LogowanieLayout({ children }) {
  return children;
}
