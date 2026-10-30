export type TxType = 'INCOME' | 'EXPENSE';

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  currency: string;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  type: TxType;
  icon: string;
  color: string;
  transactionCount?: number;
};

export type Transaction = {
  id: string;
  type: TxType;
  amount: string;
  currency: string;
  note: string;
  date: string;
  category: Category | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionInput = {
  type: TxType;
  amount: string;
  currency: string;
  categoryId: string | null;
  note: string;
  date: string;
};

export type Summary = {
  month: string;
  currency: string;
  currencies: { currency: string; income: string; expense: string; net: string; balance: string }[];
  topCategories: { category: Category | null; total: string }[];
  recent: Transaction[];
  transactionCount: number;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(value: string | null) {
  token = value;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, 'CONFIG', 'EXPO_PUBLIC_API_URL is not set. Add it to app/.env and restart.');
  }
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', "Can't reach Ledgerly. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, err.code ?? 'HTTP_ERROR', err.message ?? `Request failed (${res.status}).`, err.fields ?? {});
  }
  return data as T;
}

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const api = {
  register: (input: { name: string; email: string; password: string; currency: string }) =>
    request<{ token: string; user: User }>('POST', '/auth/register', input),
  signIn: (input: { email: string; password: string }) =>
    request<{ token: string; user: User }>('POST', '/auth/sign-in', input),
  me: () => request<{ user: User }>('GET', '/auth/me'),
  updateMe: (input: { name?: string; currency?: string }) => request<{ user: User }>('PATCH', '/auth/me', input),

  summary: (month?: string) => request<Summary>('GET', `/summary${qs({ month })}`),

  listTransactions: (params: { q?: string; type?: TxType }) =>
    request<{ transactions: Transaction[] }>('GET', `/transactions${qs(params)}`),
  getTransaction: (id: string) =>
    request<{ transaction: Transaction }>('GET', `/transactions/${encodeURIComponent(id)}`),
  createTransaction: (input: TransactionInput) =>
    request<{ transaction: Transaction }>('POST', '/transactions', input),
  updateTransaction: (id: string, input: TransactionInput) =>
    request<{ transaction: Transaction }>('PATCH', `/transactions/${encodeURIComponent(id)}`, input),
  deleteTransaction: (id: string) => request<void>('DELETE', `/transactions/${encodeURIComponent(id)}`),

  listCategories: () => request<{ categories: Category[] }>('GET', '/categories'),
  createCategory: (input: { name: string; type: TxType; icon: string; color: string }) =>
    request<{ category: Category }>('POST', '/categories', input),
  deleteCategory: (id: string) => request<void>('DELETE', `/categories/${encodeURIComponent(id)}`),
};
