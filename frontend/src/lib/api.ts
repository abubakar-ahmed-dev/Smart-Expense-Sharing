const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4500/api/v1';

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  timestamp?: string;
  path?: string;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: ApiErrorPayload,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface HealthData {
  service: string;
  version: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phones: UserPhone[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPhone {
  id: string;
  number: string;
  label?: string;
  verified: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  phone: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthSessionResponse {
  token: string;
  user: AuthSessionUser;
}

export interface Group {
  id: string;
  name: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  selectedPhoneId?: string | null;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  isActive: boolean;
  selectedPhone?: UserPhone | null;
  user: User;
}

export interface ExpenseShare {
  id: string;
  expenseId: string;
  userId: string;
  amountOwed: number;
  createdAt: string;
  user: User;
}

export interface Expense {
  id: string;
  groupId: string;
  paidByUserId: string;
  totalAmount: number;
  currency: string;
  description: string;
  splitType: SplitType;
  createdAt: string;
  updatedAt: string;
  paidBy: User;
  shares: ExpenseShare[];
}

export interface PairBalance {
  debtorUserId: string;
  creditorUserId: string;
  netAmount: number;
}

export interface UserBalanceSummary {
  userId: string;
  totalOwed: number;
  totalReceivable: number;
  netBalance: number;
  owes: Array<{ userId: string; amount: number }>;
  owedBy: Array<{ userId: string; amount: number }>;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  createdAt: string;
  fromUser: User;
  toUser: User;
}

export interface ExpenseParticipantPayload {
  userId: string;
  amount?: number;
  percentage?: number;
}

export interface CreateExpensePayload {
  paidByUserId: string;
  totalAmount: number;
  currency: string;
  description: string;
  splitType: SplitType;
  participants: ExpenseParticipantPayload[];
}

export interface CreateSettlementPayload {
  fromUserId: string;
  toUserId: string;
  amount: number;
  idempotencyKey?: string;
}

export interface AuthContext {
  token?: string;
  userId?: string;
  role?: 'ADMIN' | 'MEMBER';
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth?: AuthContext,
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set('Accept', 'application/json');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth?.token) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  } else if (auth?.userId) {
    headers.set('X-User-ID', auth.userId);
  }

  if (auth?.role) {
    headers.set('X-User-Role', auth.role);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  let body: ApiResponse<T> | ApiErrorResponse | null = null;
  try {
    body = (await response.json()) as ApiResponse<T> | ApiErrorResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorPayload = body && 'error' in body ? body.error : undefined;
    const message = errorPayload?.message ?? `Request failed with status ${response.status}`;
    throw new ApiClientError(message, response.status, errorPayload);
  }

  if (!body || !('success' in body) || body.success !== true) {
    throw new ApiClientError('Malformed API response', response.status);
  }

  return body.data;
}

export const apiClient = {
  fetchHealth: () => request<HealthData>('/health'),
  fetchUsers: (auth?: AuthContext) => request<User[]>('/users', {}, auth),
  signup: (payload: CreateUserPayload) =>
    request<AuthSessionResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginPayload) =>
    request<AuthSessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  
  // Phone management
  fetchUserPhones: (userId: string, auth?: AuthContext) =>
    request<UserPhone[]>(`/users/${userId}/phones`, {}, auth),
  addPhoneNumber: (userId: string, number: string, label?: string, auth?: AuthContext) =>
    request<UserPhone>(
      `/users/${userId}/phones`,
      {
        method: 'POST',
        body: JSON.stringify({ number, label }),
      },
      auth,
    ),
  updatePhoneNumber: (userId: string, phoneId: string, updates: Partial<{ number: string; label: string; verified: boolean }>, auth?: AuthContext) =>
    request<UserPhone>(
      `/users/${userId}/phones/${phoneId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      },
      auth,
    ),
  deletePhoneNumber: (userId: string, phoneId: string, auth?: AuthContext) =>
    request<UserPhone>(
      `/users/${userId}/phones/${phoneId}`,
      {
        method: 'DELETE',
      },
      auth,
    ),

  // Groups
  fetchGroups: (auth?: AuthContext) => request<Group[]>('/groups', {}, auth),
  createGroup: (name: string, auth: AuthContext) =>
    request<Group>(
      '/groups',
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      },
      auth,
    ),
  fetchGroupMembers: (groupId: string, auth?: AuthContext) => request<GroupMember[]>(`/groups/${groupId}/members`, {}, auth),
  addGroupMember: (
    groupId: string,
    userId: string,
    phoneId: string,
    role: 'ADMIN' | 'MEMBER',
    auth: AuthContext,
  ) =>
    request<GroupMember>(
      `/groups/${groupId}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ userId, phoneId, role }),
      },
      auth,
    ),
  updateGroupMemberRole: (groupId: string, memberId: string, role: 'ADMIN' | 'MEMBER', auth: AuthContext) =>
    request<GroupMember>(
      `/groups/${groupId}/members/${memberId}/role`,
      {
        method: 'PUT',
        body: JSON.stringify({ role }),
      },
      auth,
    ),
  fetchGroupExpenses: (groupId: string, auth?: AuthContext) => request<Expense[]>(`/groups/${groupId}/expenses`, {}, auth),
  createExpense: (groupId: string, payload: CreateExpensePayload, auth: AuthContext) =>
    request<Expense>(
      `/groups/${groupId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      auth,
    ),
  fetchGroupBalances: (groupId: string, auth?: AuthContext) => request<PairBalance[]>(`/groups/${groupId}/balances`, {}, auth),
  fetchUserBalanceSummary: (groupId: string, userId: string, auth?: AuthContext) =>
    request<UserBalanceSummary>(`/groups/${groupId}/balances/users/${userId}`, {}, auth),
  fetchGroupSettlements: (groupId: string, auth?: AuthContext) => request<Settlement[]>(`/groups/${groupId}/settlements`, {}, auth),
  createSettlement: (groupId: string, payload: CreateSettlementPayload, auth: AuthContext) =>
    request<Settlement>(
      `/groups/${groupId}/settlements`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      auth,
    ),
};
