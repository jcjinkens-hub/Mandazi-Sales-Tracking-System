export interface Sale {
  id: number;
  customerName: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Not Paid';
  date: string;
}

export interface DashboardStats {
  totalSales: number;
  totalPaid: number;
  totalUnpaid: number;
  totalSalesCount: number;
  recentSales: Sale[];
}

export interface User {
  id: number;
  username: string;
  name: string;
}

export type Page = 'login' | 'dashboard' | 'record-sale' | 'view-sales' | 'view-unpaid' | 'edit-sale';
