import { Sale, DashboardStats, User } from '@/types';

const API_URL = 'http://localhost:3001/api';

// Helper function for API calls
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// Auth APIs
export const authAPI = {
  login: (username: string, password: string) =>
    fetchAPI<{ message: string; user: User }>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    fetchAPI<{ message: string }>('/logout', {
      method: 'POST',
    }),

  checkStatus: () =>
    fetchAPI<{ authenticated: boolean; user?: User }>('/auth/status'),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => fetchAPI<DashboardStats>('/dashboard'),
};

// Sales APIs
export const salesAPI = {
  getAll: () => fetchAPI<Sale[]>('/sales'),

  getUnpaid: () => fetchAPI<Sale[]>('/sales/unpaid'),

  getById: (id: number) => fetchAPI<Sale>(`/sales/${id}`),

  create: (sale: {
    customerName: string;
    quantity: number;
    pricePerUnit: number;
    totalAmount: number;
    paymentStatus: 'Paid' | 'Not Paid';
  }) =>
    fetchAPI<{ message: string; sale: Sale }>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    }),

  update: (
    id: number,
    sale: {
      quantity: number;
      pricePerUnit: number;
      totalAmount: number;
      paymentStatus: 'Paid' | 'Not Paid';
    }
  ) =>
    fetchAPI<{ message: string; sale: Sale }>(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sale),
    }),

  markAsPaid: (id: number) =>
    fetchAPI<{ message: string; sale: Sale }>(`/sales/${id}/mark-paid`, {
      method: 'PATCH',
    }),

  delete: (id: number) =>
    fetchAPI<{ message: string }>(`/sales/${id}`, {
      method: 'DELETE',
    }),
};
