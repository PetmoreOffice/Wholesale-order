import { api } from '@/lib/api';

// Query keys and loaders for customer orders, shared by the home page, the list and the detail.
export const customerOrdersQuery = { queryKey: ['orders', 'mine'], queryFn: () => api('/orders').then(result => result.data) };

export const orderQuery = (orderId) => ({ queryKey: ['orders', 'detail', String(orderId)], queryFn: () => api(`/orders/${orderId}`).then(result => result.data) });
