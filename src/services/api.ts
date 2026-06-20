import { User, Property, Room, Booking, Wallet, PayoutRequest, AppNotification, RoomType, Customer } from '../types';

let authToken = localStorage.getItem('ctv_booking_token') || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...options,
    headers
  });

  if (!res.ok) {
    let errorData;
    try {
      errorData = await res.json();
    } catch (err) {
      errorData = { message: 'Đã xảy ra lỗi không xác định trên hệ thống.' };
    }
    throw new Error(errorData.message || `Lỗi hệ thống (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  setToken(token: string) {
    authToken = token;
    localStorage.setItem('ctv_booking_token', token);
  },

  getToken() {
    return authToken;
  },

  clearToken() {
    authToken = '';
    localStorage.removeItem('ctv_booking_token');
  },

  // --- AUTH CORES ---
  async login(payload: { email: string; passwordHash: string }) {
    const data = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: payload.email, password: payload.passwordHash })
    });
    this.setToken(data.token);
    return data.user;
  },

  async register(payload: { name: string; email: string; phone: string; passwordHash: string }) {
    return request<{ message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password: payload.passwordHash
      })
    });
  },

  async getMe() {
    return request<User>('/api/auth/me');
  },

  // --- PROPERTIES (Khu lưu trú) ---
  async getProperties() {
    return request<Property[]>('/api/properties');
  },

  async createProperty(property: Omit<Property, 'id' | 'createdAt'>) {
    return request<Property>('/api/properties', {
      method: 'POST',
      body: JSON.stringify(property)
    });
  },

  async updateProperty(id: string, updates: Partial<Property>) {
    return request<Property>(`/api/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteProperty(id: string) {
    return request<{ message: string }>(`/api/properties/${id}`, {
      method: 'DELETE'
    });
  },

  // --- ROOM TYPES ---
  async getRoomTypes() {
    return request<RoomType[]>('/api/room-types');
  },

  async createRoomType(roomType: Omit<RoomType, 'id'>) {
    return request<RoomType>('/api/room-types', {
      method: 'POST',
      body: JSON.stringify(roomType)
    });
  },

  async updateRoomType(id: string, updates: Partial<RoomType>) {
    return request<RoomType>(`/api/room-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteRoomType(id: string) {
    return request<{ message: string }>(`/api/room-types/${id}`, {
      method: 'DELETE'
    });
  },

  // --- ROOMS ---
  async getRooms(filters?: { checkIn?: string; checkOut?: string; search?: string; propertyType?: string; maxGuests?: number }) {
    const params = new URLSearchParams();
    if (filters?.checkIn) params.append('checkIn', filters.checkIn);
    if (filters?.checkOut) params.append('checkOut', filters.checkOut);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.propertyType) params.append('propertyType', filters.propertyType);
    if (filters?.maxGuests) params.append('maxGuests', String(filters.maxGuests));

    const query = params.toString() ? `?${params.toString()}` : '';
    return request<Room[]>(`/api/rooms${query}`);
  },

  async getRoomById(id: string) {
    return request<Room>(`/api/rooms/${id}`);
  },

  async createRoom(room: Omit<Room, 'id' | 'createdAt' | 'blockedDates'>) {
    return request<Room>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(room)
    });
  },

  async updateRoom(id: string, updates: Partial<Room>) {
    return request<Room>(`/api/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteRoom(id: string) {
    return request<{ message: string }>(`/api/rooms/${id}`, {
      method: 'DELETE'
    });
  },

  // --- BOOKINGS ---
  async getBookings() {
    return request<Booking[]>('/api/bookings');
  },

  async createBooking(booking: {
    roomId: string;
    customerName: string;
    customerPhone: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    sellingPrice: number;
    note?: string;
    services?: string[];
    referralCode?: string;
  }) {
    return request<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(booking)
    });
  },

  async updateBookingStatus(id: string, status: 'APPROVED' | 'CANCELLED', rejectionReason?: string) {
    return request<Booking>(`/api/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, rejectionReason })
    });
  },

  async updateBooking(id: string, updates: Partial<Booking>) {
    return request<Booking>(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // --- WALLET ---
  async getWallet() {
    return request<Wallet>('/api/wallet');
  },

  async updateBankDetails(bankDetails: { bankName: string; bankAccount: string; bankHolder: string }) {
    return request<Wallet>('/api/wallet/bank', {
      method: 'PUT',
      body: JSON.stringify(bankDetails)
    });
  },

  async requestPayout(amount: number) {
    return request<{ message: string; payout: PayoutRequest }>('/api/wallet/payout', {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  },

  async getPayouts() {
    return request<PayoutRequest[]>('/api/payouts');
  },

  async updatePayoutStatus(id: string, status: 'COMPLETED' | 'REJECTED') {
    return request<PayoutRequest>(`/api/payouts/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // --- COLLABORATORS (Admin Control) ---
  async getCTVs() {
    return request<(User & { wallet: Wallet; stats: any })[]>('/api/admin/ctvs');
  },

  async approveCTV(id: string) {
    return request<{ message: string }>(`/api/admin/ctvs/${id}/approve`, {
      method: 'PUT'
    });
  },

  async updateCTVCommission(id: string, commissionRate: number) {
    return request<{ message: string }>(`/api/admin/ctvs/${id}/commission`, {
      method: 'PUT',
      body: JSON.stringify({ commissionRate })
    });
  },

  // --- REFERRALS & CTV SHARINGS ---
  async getReferrals() {
    return request<any[]>('/api/referrals');
  },

  async createReferral(payload: { code: string; targetType: 'ROOM' | 'PROPERTY'; targetId: string }) {
    return request<any>('/api/referrals', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async trackReferralClick(code: string) {
    return request<any>(`/api/referrals/public/${code}/click`, {
      method: 'POST'
    });
  },

  async getPublicReferral(code: string) {
    return request<any>(`/api/referrals/public/${code}`);
  },

  // --- NOTIFICATIONS ---
  async getNotifications() {
    return request<AppNotification[]>('/api/notifications');
  },

  async markAllNotificationsRead() {
    return request<{ message: string }>('/api/notifications/read', {
      method: 'POST'
    });
  },

  // --- SYSTEM STATS (Admin) ---
  async getAdminStats() {
    return request<any>('/api/admin/stats');
  },

  // --- CUSTOMER DOSSIER & TRANSACTIONS ---
  async getCustomers() {
    return request<Customer[]>('/api/customers');
  },

  async getCustomerById(id: string) {
    return request<any>(`/api/customers/${id}`);
  },

  async createCustomer(customer: Omit<Customer, 'id'>) {
    return request<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customer)
    });
  },

  async updateCustomer(id: string, updates: Partial<Customer>) {
    return request<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteCustomer(id: string) {
    return request<{ message: string }>(`/api/customers/${id}`, {
      method: 'DELETE'
    });
  },

  // --- LIVE ALERTS AND GEMINI AI ASSISTANCE ---
  async getLiveAlerts() {
    return request<any[]>('/api/live-alerts');
  },

  async getGeminiRecommendations() {
    return request<{
      customerSegmentAnalysis: string;
      recommendations: {
        propertyId: string;
        propertyName: string;
        type: string;
        location: string;
        reason: string;
      }[];
      actionStrategy: string;
    }>('/api/recommendations/gemini', {
      method: 'POST'
    });
  }
};
