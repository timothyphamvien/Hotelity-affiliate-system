export type UserRole = 'super_admin' | 'admin' | 'staff' | 'ctv' | 'manager' | 'ADMIN' | 'CTV';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'INACTIVE';
  referralCode?: string;
  commissionRate: number; // For CTV custom rate %
  createdAt: string;
}

export type PropertyType = 'HOMESTAY' | 'VILLA' | 'BUNGALOW' | 'RESORT' | 'HOTEL' | 'MOTEL' | 'GLAMPING';

export interface Property {
  id: string;
  name: string;
  brand?: string;
  city?: string;
  district?: string;
  address: string;
  description: string;
  coverImage?: string;
  status: 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';
  totalRooms?: number;
  internalNote?: string;
  type?: PropertyType;
  facilities: string[];
  policies: string;
  images?: string[];
  videoUrl?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface SpecialRateConfig {
  name: string;
  dateStart: string;
  dateEnd: string;
  ctvPrice: number;
  clientPrice: number;
}

export interface RoomType {
  id: string;
  propertyId: string;
  name: string;
  code: string;
  shortDescription: string;
  longDescription: string;
  basePrice: number;
  weekendPrice: number;
  holidayPrice: number;
  extraGuestFee: number;
  depositAmount: number;
  standardGuests: number;
  maxGuests: number;
  area: number;
  bedType: string;
  amenities: string[];
  images: string[];
  cancellationPolicy: string;
  checkInTime: string;
  checkOutTime: string;
  status: 'active' | 'hidden' | 'ACTIVE' | 'HIDDEN';
}

export interface Room {
  id: string;
  propertyId: string;
  roomTypeId?: string;
  roomCode?: string;
  roomName?: string;
  floor?: string;
  standardGuests?: number;
  maxGuests: number;
  priceOverride?: number;
  status: 'available' | 'hold' | 'booked' | 'checked_in' | 'checked_out' | 'cleaning' | 'maintenance' | 'hidden' | 'AVAILABLE' | 'ON_HOLD' | 'BOOKED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CLEANING' | 'MAINTENANCE' | 'HIDDEN';
  housekeepingStatus?: 'clean' | 'dirty' | 'inspecting';
  images: string[];
  internalNote?: string;
  isVisible?: boolean;

  // Existing properties compatibility
  propertyName?: string;
  propertyType?: PropertyType;
  name: string;
  description: string;
  originalPrice: number;
  clientPrice: number;
  ctvPrice: number;
  commissionRate?: number;
  videoUrl?: string;
  blockedDates?: string[];
  quantity?: number;
  priceByHour?: number;
  priceByDay?: number;
  priceByWeek?: number;
  specialRates?: SpecialRateConfig[];
  latitude?: number;
  longitude?: number;
  createdAt: string;
  amenities?: string[];
  roomTypeName?: string;
  bedType?: string;
  area?: number;
}

export interface ReferralLink {
  id: string;
  code: string;
  ctvId: string;
  ctvName: string;
  targetType: 'ROOM' | 'PROPERTY';
  targetId: string;
  targetName: string;
  clicks: number;
  bookingsCreated: number;
  bookingsCompleted: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  identityNumber?: string;
  gender?: string;
  address?: string;
  tags?: string[];
  files?: Array<{ name: string; url: string; uploadedAt: string }>;
  note?: string;
}

export interface Booking {
  id: string;
  bookingCode?: string;
  customerId?: string;
  propertyId?: string;
  roomIds?: string[]; // Array of physical rooms
  source: 'direct' | 'ctv' | 'website' | 'ota' | 'DIRECT' | 'CTV' | 'WEBSITE' | 'OTA';
  ctvId: string;
  ctvName?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  subtotal?: number;
  discount?: number;
  surcharge?: number;
  depositRequired?: number;
  paidAmount?: number;
  totalAmount?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'bank_transfer' | 'card' | 'e_wallet' | 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'E_WALLET';
  paymentStatus?: 'unpaid' | 'deposit_paid' | 'paid' | 'refunded' | 'UNPAID' | 'DEPOSIT_PAID' | 'PAID' | 'REFUNDED';
  bookingStatus?: 'lead' | 'draft' | 'on_hold' | 'pending_payment' | 'confirmed' | 'checked_in' | 'checked_out' | 'completed' | 'cancelled' | 'no_show' | 'LEAD' | 'DRAFT' | 'ON_HOLD' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  holdExpiredAt?: string;
  note?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;

  // Existing mappings compatibility
  customerName?: string;
  customerPhone?: string;
  commissionEarned?: number;
  roomId: string;
  roomName: string;
  propertyName?: string;
  propertyType?: PropertyType;
  originalPrice: number;
  clientPrice: number;
  ctvPrice: number;
  sellingPrice: number;
  commissionAmount: number;
  services: string[];
  status: 'PENDING' | 'APPROVED' | 'CANCELLED';
  rejectionReason?: string;
  referralCode?: string;
}

export interface Wallet {
  ctvId: string;
  balance: number;
  pending: number;
  totalEarned: number;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
}

export interface PayoutRequest {
  id: string;
  ctvId: string;
  ctvName: string;
  amount: number;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
  processedAt?: string;
}

export interface Commission {
  id: string;
  bookingId: string;
  ctvId: string;
  rate: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  paidAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
  isRead: boolean;
  createdAt: string;
}

export const TYPES_STABILIZER = true;
