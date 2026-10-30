import type { TransactionType } from '../generated/prisma/client.js';

export const DEFAULT_CATEGORIES: { name: string; type: TransactionType; icon: string; color: string }[] = [
  { name: 'Salary', type: 'INCOME', icon: 'briefcase-outline', color: '#1F4D3A' },
  { name: 'Freelance', type: 'INCOME', icon: 'laptop', color: '#2E7D5B' },
  { name: 'Gifts', type: 'INCOME', icon: 'gift-outline', color: '#5C8A4D' },
  { name: 'Groceries', type: 'EXPENSE', icon: 'cart-outline', color: '#B5651D' },
  { name: 'Rent', type: 'EXPENSE', icon: 'home-outline', color: '#7A4E2D' },
  { name: 'Dining', type: 'EXPENSE', icon: 'silverware-fork-knife', color: '#C2410C' },
  { name: 'Transport', type: 'EXPENSE', icon: 'train-car', color: '#4B6584' },
  { name: 'Utilities', type: 'EXPENSE', icon: 'flash-outline', color: '#A16207' },
  { name: 'Health', type: 'EXPENSE', icon: 'heart-pulse', color: '#9F1239' },
  { name: 'Entertainment', type: 'EXPENSE', icon: 'movie-open-outline', color: '#6D28D9' },
];
