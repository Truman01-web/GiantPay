import { api, type RequestOptions } from './client';

export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  category: 'INTEGRATION' | 'PAYMENT' | 'SETTLEMENT' | 'ACCOUNT' | 'OTHER';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  message: string;
  createdAt: string;
}

export const supportApi = {
  listTickets(options?: RequestOptions): Promise<{ items: SupportTicket[]; total: number }> {
    return api.get<{ items: SupportTicket[]; total: number }>('/support/tickets', options);
  },

  createTicket(data: { subject: string; category: string; priority: string; message: string }, options?: RequestOptions): Promise<SupportTicket> {
    return api.post<SupportTicket>('/support/tickets', data, options);
  },
};
