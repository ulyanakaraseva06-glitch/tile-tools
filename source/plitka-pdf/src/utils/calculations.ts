import { TableRow } from '../types/project';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  return Number(value.replace(/\s/g, '').replace(',', '.')) || 0;
}

export function rowTotal(row: TableRow): number {
  return toNumber(row.price) * toNumber(row.quantity);
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value);
}
