import type { Category, Transaction } from '@/@types/index';

export const PALETTE = [
  '#818cf8', // indigo
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fbbf24', // amber
  '#fb7185', // rose
  '#38bdf8', // sky
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#f472b6', // pink
  '#a3e635', // lime
];

export const ICON_KEYS = [
  'gamepad', 'cart', 'shirt', 'utensils', 'car', 'refresh',
  'house', 'heart', 'plane', 'film', 'coffee', 'book',
  'gift', 'pet', 'tools', 'sparkle',
] as const;

// ── Date helpers ─────────────────────────────────────────────

export const parseDate = (s: string): Date => new Date(s + 'T12:00:00');

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const todayIso = (): string => isoDate(new Date());

export const monthName = (d: Date): string =>
  d.toLocaleString('en-US', { month: 'long' });

export const shortDate = (d: Date): string =>
  d.toLocaleString('en-US', { month: 'short', day: 'numeric' });

export const longDate = (d: Date): string =>
  d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Period math ──────────────────────────────────────────────

export interface Period {
  start: Date;
  end: Date;
}

export function periodFor(resetDay: number, today: Date = new Date()): Period {
  const d = today.getDate();
  const m = today.getMonth();
  const y = today.getFullYear();
  let startMonth: number, startYear: number;
  if (d >= resetDay) {
    startMonth = m;
    startYear = y;
  } else {
    startMonth = m - 1;
    startYear = y;
    if (startMonth < 0) {
      startMonth = 11;
      startYear--;
    }
  }
  const start = new Date(startYear, startMonth, resetDay);
  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear++;
  }
  const end = new Date(endYear, endMonth, resetDay - 1);
  return { start, end };
}

export function spentInPeriod(
  category: Category,
  transactions: Transaction[],
  today: Date = new Date(),
): number {
  const { start, end } = periodFor(category.resetDay, today);
  const endInc = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
  return transactions
    .filter((t) => t.categoryId === category.id)
    .filter((t) => {
      const td = parseDate(t.date);
      return td >= start && td <= endInc;
    })
    .reduce((s, t) => s + t.price, 0);
}

export function daysUntilReset(category: Category, today: Date = new Date()): number {
  const { end } = periodFor(category.resetDay, today);
  const next = new Date(end);
  next.setDate(next.getDate() + 1);
  const diffMs = next.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ── Money formatting ─────────────────────────────────────────

export function fmtMoney(n: number): string {
  const s = n.toLocaleString('en-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return '€' + s;
}

export function fmtMoneyShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return '€' + (n / 1000).toFixed(1) + 'k';
  return '€' + Math.round(n);
}
