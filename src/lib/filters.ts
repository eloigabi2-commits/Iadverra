export function parseCnaesParam(value: string | null): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => c.padStart(7, "0")),
    ),
  );
}

export function parseUfParam(value: string | null): string | null {
  if (!value) return null;
  const uf = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(uf) ? uf : null;
}

export function formatTelefone(ddd: string | null, numero: string | null): string | null {
  if (!ddd || !numero) return null;
  return `(${ddd}) ${numero}`;
}
