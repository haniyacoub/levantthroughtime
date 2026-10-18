import { tOf } from './years';

/**
 * Parse what a user types in "go to year": "586 BCE", "586 BC", "-586", "70", "70 CE",
 * "1948-05", "1948/5", and the Arabic/Hebrew era markers. Returns continuous time t, or null.
 */
export function parseUserDate(input: string): number | null {
  const s = input.trim().replace(/\s+/g, ' ');
  if (!s) return null;
  const ym = /^(\d{3,4})\s*[-/.]\s*(\d{1,2})$/.exec(s);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]);
    if (m >= 1 && m <= 12 && y > 0) return tOf(y, m);
    return null;
  }
  const bce = /^(?:c\.?\s*)?(\d{1,5}(?:,\d{3})?)\s*(bce|bc|b\.c\.e?\.?|ق\.?\s?م|לפנה"?״?ס|לפני הספירה)$/i.exec(s);
  if (bce) {
    const y = Number(bce[1]!.replace(',', ''));
    return y > 0 ? tOf(-y) : null;
  }
  const ce = /^(-?\d{1,5}(?:,\d{3})?)\s*(ce|ad|a\.d\.|م|לספירה)?$/i.exec(s);
  if (ce) {
    const y = Number(ce[1]!.replace(',', ''));
    if (y === 0 || !Number.isFinite(y)) return null;
    return tOf(y);
  }
  return null;
}
