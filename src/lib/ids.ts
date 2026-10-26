/** Human-readable references for frontend-only records, e.g. DEM-2026-4821. */
export const newReference = (prefix: string): string => {
  const year = new Date().getFullYear();
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${serial}`;
};

export const newId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
