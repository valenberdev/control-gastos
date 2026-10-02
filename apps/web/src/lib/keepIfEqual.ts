// Devuelve el valor anterior si el nuevo es idéntico. Así el auto-refresco no cambia
// la identidad de los datos cuando no hubo novedades: React no re-renderiza y
// Recharts no vuelve a animar los gráficos cada 20 s.
export function keepIfEqual<T>(prev: T, next: T): T {
  return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
}
