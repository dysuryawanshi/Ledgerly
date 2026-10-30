import type { Category, Transaction } from '../generated/prisma/client.js';

export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function serializeCategory(c: Category) {
  return { id: c.id, name: c.name, type: c.type, icon: c.icon, color: c.color };
}

export function serializeTransaction(t: Transaction & { category: Category | null }) {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount.toString(),
    currency: t.currency,
    note: t.note,
    date: toDateString(t.date),
    category: t.category ? serializeCategory(t.category) : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
