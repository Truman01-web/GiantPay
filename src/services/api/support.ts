import { api, type RequestOptions } from './client';
import { itemsPage, type BackendPage } from './contractAdapters';

export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  category: 'API_INTEGRATION' | 'PAYMENT' | 'SETTLEMENT' | 'ACCOUNT' | 'OTHER';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_MERCHANT' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
}

export const supportApi = {
  listTickets(options?: RequestOptions): Promise<{ items: SupportTicket[]; total: number }> {
    return api.get<BackendPage<SupportTicket>>('/support/cases', options).then(itemsPage);
  },

  createTicket(data: { subject: string; category: string; priority: string; message: string }, options?: RequestOptions): Promise<SupportTicket> {
    return api.post<SupportTicket>('/support/cases', data, options);
  },
};
