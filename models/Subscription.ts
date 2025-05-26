export interface Subscription {
  userId: string;
  username: string;
  subscriptionType: 'monthly' | '6months' | 'yearly';
  startDate: Date;
  endDate: Date;
  paymentId: string;
  receiptUrl?: string;
  status: 'active' | 'inactive' | 'canceled';
  subdomain?: string;
  dbProvisioned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionDTO {
  userId: string;
  username: string;
  subscriptionType: 'monthly' | '6months' | 'yearly';
  paymentId: string;
  receiptUrl?: string;
} 