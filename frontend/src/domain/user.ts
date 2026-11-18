// Up to two initials from the first and last words of the name (e.g. "Camila Rodriguez Perez" -> "CP").
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return '?';
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return (first.charAt(0) + (last ? last.charAt(0) : '')).toLocaleUpperCase('es-CO');
}
