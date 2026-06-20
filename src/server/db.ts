import * as fs from 'fs';
import * as path from 'path';
import { 
  User, Property, Room, Booking, Wallet, PayoutRequest, 
  AppNotification, ReferralLink, RoomType, Customer, Commission, AuditLog 
} from '../types';

interface DatabaseSchema {
  users: Record<string, User & { passwordHash: string }>;
  properties: Property[];
  roomTypes: RoomType[];
  rooms: Room[];
  bookings: Booking[];
  wallets: Record<string, Wallet>;
  payouts: PayoutRequest[];
  notifications: AppNotification[];
  referrals: ReferralLink[];
  commissions: Commission[];
  auditLogs: AuditLog[];
  customers: Customer[];
}

const DB_PATH = path.resolve(process.cwd(), 'data_store.json');

const INITIAL_DATA: DatabaseSchema = {
  customers: [
    {
      id: 'cus_demo_1',
      fullName: 'Nguyễn Kỳ Duyên',
      phone: '0905121314',
      email: 'kyduyen@gmail.com',
      identityNumber: '079198000123',
      note: 'Khách hàng VIP thích resort sườn đồi, thường ăn sáng sớm.',
      gender: 'Nữ',
      address: 'Quận 1, TP. Hồ Chí Minh',
      tags: ['VIP', 'Thân thiết'],
      files: [
        { name: 'CCCD_KyDuyen.pdf', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80', uploadedAt: '2026-06-08T10:00:00Z' }
      ]
    },
    {
      id: 'cus_demo_2',
      fullName: 'Lê Hoàng Hải',
      phone: '0948999888',
      email: 'hoanghai_travel@gmail.com',
      identityNumber: '048099001412',
      note: 'Chuộng biệt thự sát biển riêng tư, thanh toán đúng hạn.',
      gender: 'Nam',
      address: 'Hoàn Kiếm, Hà Nội',
      tags: ['Sát Biển', 'Khách VIP'],
      files: []
    }
  ],
  users: {
    'usr_admin': {
      id: 'usr_admin',
      name: 'Admin Tổng (Super)',
      email: 'admin@gmail.com',
      phone: '0901234567',
      role: 'super_admin',
      status: 'APPROVED',
      commissionRate: 10,
      passwordHash: 'admin123',
      createdAt: new Date('2026-01-01').toISOString()
    },
    'usr_admin2': {
      id: 'usr_admin2',
      name: 'Phạm Huỳnh Admin',
      email: 'admin_mgr@gmail.com',
      phone: '0909998887',
      role: 'admin',
      status: 'APPROVED',
      commissionRate: 10,
      passwordHash: 'admin123',
      createdAt: new Date('2026-02-01').toISOString()
    },
    'usr_staff': {
      id: 'usr_staff',
      name: 'Nguyễn Tiến Staff',
      email: 'staff@gmail.com',
      phone: '0912345678',
      role: 'staff',
      status: 'APPROVED',
      commissionRate: 10,
      passwordHash: 'admin123',
      createdAt: new Date('2026-03-01').toISOString()
    },
    'usr_manager': {
      id: 'usr_manager',
      name: 'Trần Thảo Manager',
      email: 'manager@gmail.com',
      phone: '0988887777',
      role: 'manager',
      status: 'APPROVED',
      commissionRate: 10,
      passwordHash: 'admin123',
      createdAt: new Date('2026-03-15').toISOString()
    },
    'usr_ctv1': {
      id: 'usr_ctv1',
      name: 'Nguyễn Văn A',
      email: 'ctv1@gmail.com',
      phone: '0911222333',
      role: 'ctv',
      status: 'APPROVED',
      commissionRate: 12,
      passwordHash: 'ctv123',
      referralCode: 'VILLA_CTVA',
      createdAt: new Date('2026-05-15').toISOString()
    },
    'usr_ctv2': {
      id: 'usr_ctv2',
      name: 'Trần Thị B',
      email: 'ctv2@gmail.com',
      phone: '0988777666',
      role: 'ctv',
      status: 'PENDING',
      commissionRate: 10,
      passwordHash: 'ctv123',
      referralCode: 'VILLA_CTVB',
      createdAt: new Date('2026-06-01').toISOString()
    }
  },
  properties: [
    {
      id: 'prop_da_lat',
      name: 'Pine Hill Woods Resort',
      brand: 'StayHub Premium',
      city: 'Đà Lạt',
      district: 'Phường 4',
      address: 'Đường Triệu Việt Vương, Phường 4, Đà Lạt, Lâm Đồng',
      description: 'Khu lưu trú homestay sinh thái yên tĩnh ẩn giữa rừng thông nguyên sinh tuyệt đẹp của Đà Lạt.',
      coverImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
      status: 'ACTIVE',
      totalRooms: 4,
      internalNote: 'Cần dọn dẹp các đường dốc rừng thông trước mùa mưa lũ.',
      facilities: ['Hồ bơi ấm', 'Bếp nướng BBQ', 'Sân golf mini', 'Thuê xe máy', 'Wifi tốc độ cao'],
      policies: 'Huỷ trước 3 ngày hoàn phí 100%. Huỷ sau thời điểm này phạt phí đêm đầu tiên.',
      createdAt: new Date('2026-01-01').toISOString()
    },
    {
      id: 'prop_da_nang',
      name: 'Sơn Trà Ocean Luxury Villas',
      brand: 'StayHub Premium',
      city: 'Đà Nẵng',
      district: 'Sơn Trà',
      address: 'Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng',
      description: 'Tổ hợp biệt thự nghỉ dưỡng cao cấp ven biển Đà Nẵng với bãi biển riêng tư tuyệt đẳng cấp.',
      coverImage: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800',
      status: 'ACTIVE',
      totalRooms: 2,
      internalNote: 'Liên hệ đối tác giặt xả thảm cao cấp 1 lần/tháng.',
      facilities: ['Hồ bơi vô cực', 'Bar ngoài trời', 'Xe đưa đón sân bay', 'BBQ hải sản'],
      policies: 'Huỷ booking trước 5 ngày được hoàn tiền cọc mặc định 100%.',
      createdAt: new Date('2026-01-10').toISOString()
    }
  ],
  roomTypes: [
    {
      id: 'rt_dl_bungalow',
      propertyId: 'prop_da_lat',
      name: 'Bungalow Gỗ Thông Ấm Cúng',
      code: 'DL-BUNGALOW',
      shortDescription: 'Bungalow gỗ ấm cúng hướng sườn đồi rừng thông.',
      longDescription: 'Bungalow lãng mạn lót hoàn toàn bằng gỗ thông tự nhiên Thụy Điển, trang bị bồn tắm gỗ sồi và ban công đón sương mai sảng khoái.',
      basePrice: 1200000,
      weekendPrice: 1500000,
      holidayPrice: 1800000,
      extraGuestFee: 150000,
      depositAmount: 500000,
      standardGuests: 2,
      maxGuests: 4,
      area: 32,
      bedType: '1 Double Queen Bed',
      amenities: ['Wifi', 'Máy lạnh', 'Bồn tắm', 'View đẹp', 'Tủ lạnh'],
      images: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800'],
      cancellationPolicy: 'Huỷ trước 3 ngày nhận phòng để giải toả cọc không mất phí.',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      status: 'ACTIVE'
    },
    {
      id: 'rt_dl_cabin',
      propertyId: 'prop_da_lat',
      name: 'Cozy Cabin Sườn Dốc',
      code: 'DL-CABIN',
      shortDescription: 'Nhà gỗ cabin mini xinh xắn ngắm thung lũng cực chill.',
      longDescription: 'Phù hợp nhóm bạn trẻ du ngoạn phượt dã ngoại thông thả, không gian nhỏ tối giản nhưng cực ấm áp.',
      basePrice: 800000,
      weekendPrice: 1000000,
      holidayPrice: 1300000,
      extraGuestFee: 100000,
      depositAmount: 300000,
      standardGuests: 2,
      maxGuests: 2,
      area: 20,
      bedType: '1 Double Bed',
      amenities: ['Wifi', 'Máy sấy', 'Ban công', 'Máy sấy', 'Tủ lạnh'],
      images: ['https://images.unsplash.com/photo-1508333706533-1ec43ecb1606?auto=format&fit=crop&q=80&w=800'],
      cancellationPolicy: 'Huỷ trước 24 giờ nhận phòng.',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      status: 'ACTIVE'
    },
    {
      id: 'rt_dn_luxury',
      propertyId: 'prop_da_nang',
      name: 'Oceanfront Sunset Luxury Villa',
      code: 'DN-LUX-VILLA',
      shortDescription: 'Villa biển vô cực ngắm hoàng hôn đỉnh cao.',
      longDescription: 'Trang thiết bị hoàng gia vương giả tối tân, hồ bơi riêng tràn bờ sát vách thềm sóng cát tự nhiên, vòi hoa sen ngoài trời độc lạ.',
      basePrice: 3500000,
      weekendPrice: 4200000,
      holidayPrice: 5500000,
      extraGuestFee: 250000,
      depositAmount: 1000000,
      standardGuests: 4,
      maxGuests: 6,
      area: 95,
      bedType: '2 King Beds',
      amenities: ['Wifi', 'Hồ bơi', 'Máy lạnh', 'Máy giặt', 'Bếp', 'Smart TV', 'View đẹp'],
      images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800'],
      cancellationPolicy: 'Huỷ trước 5 ngày nhận phòng.',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      status: 'ACTIVE'
    }
  ],
  rooms: [
    {
      id: 'rm_dl_101',
      propertyId: 'prop_da_lat',
      roomTypeId: 'rt_dl_bungalow',
      roomCode: 'DL-101',
      roomName: 'Phòng 101 - Bungalow Hoa Đào',
      floor: 'Tầng trệt',
      standardGuests: 2,
      maxGuests: 4,
      priceOverride: 1250000,
      status: 'available',
      housekeepingStatus: 'clean',
      images: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800'],
      internalNote: 'Đèn phòng tắm hơi chập chờn nhẹ, đã thay bóng.',
      isVisible: true,
      
      // Compatibility fields
      name: 'Phòng 101 - Bungalow Hoa Đào',
      description: 'Bungalow gỗ ấm cúng hướng sườn đồi rừng thông.',
      originalPrice: 800000,
      clientPrice: 1250000,
      ctvPrice: 1050000,
      createdAt: new Date('2026-01-11').toISOString()
    },
    {
      id: 'rm_dl_102',
      propertyId: 'prop_da_lat',
      roomTypeId: 'rt_dl_bungalow',
      roomCode: 'DL-102',
      roomName: 'Phòng 102 - Bungalow Hoa Cúc',
      floor: 'Tầng trệt',
      standardGuests: 2,
      maxGuests: 4,
      status: 'hold',
      housekeepingStatus: 'clean',
      images: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800'],
      internalNote: 'Cửa hướng tây gió lộng sảng khoái.',
      isVisible: true,

      name: 'Phòng 102 - Bungalow Hoa Cúc',
      description: 'Bungalow gỗ thông thơm ngọt đón bình minh đại ngàn.',
      originalPrice: 800000,
      clientPrice: 1200000,
      ctvPrice: 1000000,
      createdAt: new Date('2026-01-11').toISOString()
    },
    {
      id: 'rm_dl_201',
      propertyId: 'prop_da_lat',
      roomTypeId: 'rt_dl_cabin',
      roomCode: 'DL-201',
      roomName: 'Phòng 201 - Cabin Hoàng Thảo',
      floor: 'Tầng 1',
      standardGuests: 2,
      maxGuests: 2,
      status: 'available',
      housekeepingStatus: 'dirty',
      images: ['https://images.unsplash.com/photo-1508333706533-1ec43ecb1606?auto=format&fit=crop&q=80&w=800'],
      internalNote: 'Cần nạp ga máy lạnh trong tháng này.',
      isVisible: true,

      name: 'Phòng 201 - Cabin Hoàng Thảo',
      description: 'Nhà cabin gỗ sườn dốc hóng gió cực chill.',
      originalPrice: 500000,
      clientPrice: 800000,
      ctvPrice: 650000,
      createdAt: new Date('2026-01-12').toISOString()
    },
    {
      id: 'rm_dl_202',
      propertyId: 'prop_da_lat',
      roomTypeId: 'rt_dl_cabin',
      roomCode: 'DL-202',
      roomName: 'Phòng 202 - Cabin Thạch Thảo',
      floor: 'Tầng 1',
      standardGuests: 2,
      maxGuests: 2,
      status: 'maintenance',
      housekeepingStatus: 'inspecting',
      images: ['https://images.unsplash.com/photo-1508333706533-1ec43ecb1606?auto=format&fit=crop&q=80&w=800'],
      internalNote: 'Đang gia cố mái thoát nước sau trận bão rừng.',
      isVisible: true,

      name: 'Phòng 202 - Cabin Thạch Thảo',
      description: 'Không gian nhỏ gọn thích hợp du lịch cặp đôi ấm áp.',
      originalPrice: 500000,
      clientPrice: 800000,
      ctvPrice: 650000,
      createdAt: new Date('2026-01-12').toISOString()
    },
    {
      id: 'rm_dn_301',
      propertyId: 'prop_da_nang',
      roomTypeId: 'rt_dn_luxury',
      roomCode: 'DN-301',
      roomName: 'Phòng 301 - Ocean VIP Diamond',
      floor: 'Tầng trệt sát biển',
      standardGuests: 4,
      maxGuests: 6,
      status: 'booked',
      housekeepingStatus: 'clean',
      images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800'],
      internalNote: 'Loạt gối ngủ lông hông nhập khẩu, giữ gìn kỹ.',
      isVisible: true,

      name: 'Phòng 301 - Ocean VIP Diamond',
      description: 'Phòng VIP vô cực sầm uất đại dương mênh mông bãi cát vàng.',
      originalPrice: 2500000,
      clientPrice: 3500000,
      ctvPrice: 2950000,
      createdAt: new Date('2026-01-15').toISOString()
    }
  ],
  bookings: [
    {
      id: 'bk_demo_1',
      bookingCode: 'STAY2026-1025',
      customerId: 'cus_demo_1',
      propertyId: 'prop_da_nang',
      roomIds: ['rm_dn_301'],
      source: 'ctv',
      ctvId: 'usr_ctv1',
      ctvName: 'Nguyễn Văn A',
      checkIn: '2026-06-15',
      checkOut: '2026-06-17',
      nights: 2,
      guests: 4,
      subtotal: 7000000,
      discount: 0,
      surcharge: 0,
      depositRequired: 2000000,
      paidAmount: 2000000,
      totalAmount: 7000000,
      remainingAmount: 5000000,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'deposit_paid',
      bookingStatus: 'confirmed',
      note: 'Yêu cầu dọn dẹp thật sạch và chuẩn bị hoa ngập tràn.',
      createdBy: 'usr_ctv1',
      createdAt: new Date('2026-06-08T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-06-08T11:30:00Z').toISOString(),

      // Compatibility fields
      roomId: 'rm_dn_301',
      roomName: 'Phòng 301 - Ocean VIP Diamond',
      propertyName: 'Sơn Trà Ocean Luxury Villas',
      originalPrice: 5000000,
      clientPrice: 7000000,
      ctvPrice: 5900000,
      sellingPrice: 7000000,
      commissionAmount: 1100000,
      services: [],
      status: 'APPROVED'
    }
  ],
  wallets: {
    'usr_ctv1': {
      ctvId: 'usr_ctv1',
      balance: 1500000,
      pending: 1100000,
      totalEarned: 4500000,
      bankName: 'Vietcombank',
      bankAccount: '1903554442221',
      bankHolder: 'NGUYEN VAN A'
    },
    'usr_ctv2': {
      ctvId: 'usr_ctv2',
      balance: 0,
      pending: 0,
      totalEarned: 0
    }
  },
  payouts: [
    {
      id: 'po_demo_1',
      ctvId: 'usr_ctv1',
      ctvName: 'Nguyễn Văn A',
      amount: 1200000,
      bankName: 'Vietcombank',
      bankAccount: '1903554442221',
      bankHolder: 'NGUYEN VAN A',
      status: 'COMPLETED',
      createdAt: new Date('2026-05-30T14:00:00Z').toISOString(),
      processedAt: new Date('2026-05-30T16:15:00Z').toISOString()
    }
  ],
  notifications: [
    {
      id: 'nt_1',
      userId: 'usr_ctv1',
      title: 'Duyệt Đơn Hàng Thành Công 🎉',
      message: 'AdminStay đã phê chuẩn đơn hàng số hiệu STAY2026-1025. Bạn vừa cộng hoa hồng vào ví!',
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date('2026-06-08T11:30:00Z').toISOString()
    },
    {
      id: 'nt_2',
      userId: 'ADMIN',
      title: 'Đăng Ký CTV Mới Chờ Duyệt',
      message: 'Cộng tác viên Trần Thị B vừa hoàn tất quy trình điền dữ liệu đăng ký và chờ được cấp quyền hoạt động.',
      type: 'WARNING',
      isRead: false,
      createdAt: new Date('2026-06-01T08:00:00Z').toISOString()
    }
  ],
  referrals: [
    {
      id: 'ref_1',
      code: 'VILLA_CTVA_DL',
      ctvId: 'usr_ctv1',
      ctvName: 'Nguyễn Văn A',
      targetType: 'ROOM',
      targetId: 'rm_dl_101',
      targetName: 'Phòng 101 - Bungalow Hoa Đào',
      clicks: 142,
      bookingsCreated: 3,
      bookingsCompleted: 2,
      createdAt: new Date('2026-05-20').toISOString()
    }
  ],
  commissions: [
    {
      id: 'cmd_1',
      bookingId: 'bk_demo_1',
      ctvId: 'usr_ctv1',
      rate: 10,
      amount: 1100000,
      status: 'approved',
      paidAt: new Date('2026-06-08T11:30:00Z').toISOString()
    }
  ],
  auditLogs: [
    {
      id: 'alg_1',
      userId: 'usr_admin',
      action: 'Duyệt đơn đặt STAY2026-1025',
      entityType: 'booking',
      entityId: 'bk_demo_1',
      newValue: 'status: confirmed',
      createdAt: new Date('2026-06-08T11:30:00Z').toISOString()
    }
  ]
};

export class FileDatabase {
  private static data: DatabaseSchema | null = null;

  private static load() {
    if (this.data) return;
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(raw);
        
        // Upgrade database structure dynamically if missing structural tables
        if (!this.data!.properties) {
          this.data!.properties = JSON.parse(JSON.stringify(INITIAL_DATA.properties));
        }
        if (!this.data!.roomTypes) {
          this.data!.roomTypes = JSON.parse(JSON.stringify(INITIAL_DATA.roomTypes));
        }
        if (!this.data!.commissions) {
          this.data!.commissions = JSON.parse(JSON.stringify(INITIAL_DATA.commissions || []));
        }
        if (!this.data!.auditLogs) {
          this.data!.auditLogs = JSON.parse(JSON.stringify(INITIAL_DATA.auditLogs || []));
        }
        if (!this.data!.referrals) {
          this.data!.referrals = JSON.parse(JSON.stringify(INITIAL_DATA.referrals || []));
        }
        if (!this.data!.customers) {
          this.data!.customers = JSON.parse(JSON.stringify(INITIAL_DATA.customers || []));
        }

        // Align and sanitize physical rooms
        this.data!.rooms.forEach(r => {
          if (!r.roomTypeId) r.roomTypeId = 'rt_dl_bungalow';
          if (!r.roomCode) r.roomCode = r.id.substring(3).toUpperCase();
          if (!r.roomName) r.roomName = r.name;
          if (r.status === undefined) r.status = 'available';
          if (r.housekeepingStatus === undefined) r.housekeepingStatus = 'clean';
          if (r.isVisible === undefined) r.isVisible = true;
          
          // Back-compatibility properties mapping links
          if (!r.originalPrice) r.originalPrice = 800000;
          if (!r.clientPrice) r.clientPrice = 1200000;
          if (!r.ctvPrice) r.ctvPrice = 1000000;
        });

        // Align bookings compatible field names
        this.data!.bookings.forEach(b => {
          if (!b.roomId && b.roomIds && b.roomIds.length > 0) b.roomId = b.roomIds[0];
          if (!b.roomIds && b.roomId) b.roomIds = [b.roomId];
          if (!b.bookingCode) b.bookingCode = `STAY2026-${Math.round(1000 + Math.random() * 8999)}`;
          if (!b.source) b.source = 'ctv';
          if (!b.paymentStatus) b.paymentStatus = b.status === 'APPROVED' ? 'paid' : 'unpaid';
          if (!b.bookingStatus) b.bookingStatus = b.status === 'APPROVED' ? 'confirmed' : 'lead';
        });

      } else {
        this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
        this.save();
      }
    } catch (e) {
      console.error('Error loading file data_store.json, resetting mock:', e);
      this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
  }

  private static save() {
    if (!this.data) return;
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing data_store.json:', e);
    }
  }

  // --- USERS ---
  static getUsers() {
    this.load();
    return Object.values(this.data!.users);
  }

  static getUserByEmail(email: string) {
    this.load();
    return Object.values(this.data!.users).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  static getUserById(id: string) {
    this.load();
    return this.data!.users[id] || null;
  }

  static createUser(user: User, passwordHash: string) {
    this.load();
    this.data!.users[user.id] = { ...user, passwordHash };
    if (user.role === 'ctv' || user.role === 'CTV') {
      this.data!.wallets[user.id] = {
        ctvId: user.id,
        balance: 0,
        pending: 0,
        totalEarned: 0
      };
    }
    this.save();
    return user;
  }

  static updateUser(id: string, updates: Partial<User>) {
    this.load();
    if (this.data!.users[id]) {
      this.data!.users[id] = { ...this.data!.users[id], ...updates } as any;
      this.save();
      return this.data!.users[id];
    }
    return null;
  }

  // --- PROPERTIES ---
  static getProperties() {
    this.load();
    return this.data!.properties;
  }

  static getPropertyById(id: string) {
    this.load();
    return this.data!.properties.find(p => p.id === id) || null;
  }

  static createProperty(prop: Property) {
    this.load();
    this.data!.properties.push(prop);
    this.save();
    return prop;
  }

  static updateProperty(id: string, updates: Partial<Property>) {
    this.load();
    const idx = this.data!.properties.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data!.properties[idx] = { ...this.data!.properties[idx], ...updates };
      this.save();
      return this.data!.properties[idx];
    }
    return null;
  }

  static deleteProperty(id: string) {
    this.load();
    const initialLen = this.data!.properties.length;
    this.data!.properties = this.data!.properties.filter(p => p.id !== id);
    if (this.data!.properties.length !== initialLen) {
      // Remove room types and rooms associated with this property
      this.data!.roomTypes = this.data!.roomTypes.filter(rt => rt.propertyId !== id);
      this.data!.rooms = this.data!.rooms.filter(r => r.propertyId !== id);
      this.save();
      return true;
    }
    return false;
  }

  // --- ROOM TYPES (TEMPLATE CATALOG) ---
  static getRoomTypes() {
    this.load();
    return this.data!.roomTypes || [];
  }

  static getRoomTypeById(id: string) {
    this.load();
    return this.data!.roomTypes.find(rt => rt.id === id) || null;
  }

  static createRoomType(rt: RoomType) {
    this.load();
    if (!this.data!.roomTypes) this.data!.roomTypes = [];
    this.data!.roomTypes.push(rt);
    this.save();
    return rt;
  }

  static updateRoomType(id: string, updates: Partial<RoomType>) {
    this.load();
    const idx = this.data!.roomTypes.findIndex(rt => rt.id === id);
    if (idx !== -1) {
      this.data!.roomTypes[idx] = { ...this.data!.roomTypes[idx], ...updates };
      this.save();
      return this.data!.roomTypes[idx];
    }
    return null;
  }

  static deleteRoomType(id: string) {
    this.load();
    const initialLen = this.data!.roomTypes.length;
    this.data!.roomTypes = this.data!.roomTypes.filter(rt => rt.id !== id);
    if (this.data!.roomTypes.length !== initialLen) {
      // Clean up rooms mapped to this roomTypeId
      this.data!.rooms = this.data!.rooms.filter(r => r.roomTypeId !== id);
      this.save();
      return true;
    }
    return false;
  }

  // --- PHYSICAL ROOMS ---
  static getRooms() {
    this.load();
    
    // Supplement properties metadata names
    return this.data!.rooms.map(room => {
      const prop = this.data!.properties.find(p => p.id === room.propertyId);
      const rt = this.data!.roomTypes.find(t => t.id === room.roomTypeId);
      return {
        ...room,
        propertyName: prop ? prop.name : room.propertyName || 'Khu biệt thự',
        propertyType: prop ? prop.type : room.propertyType || 'VILLA',
        propertyLocation: prop ? prop.address : 'Đang tìm kiếm',
        
        // Detailed roomType features
        amenities: rt?.amenities || (room as any).amenities || [],
        roomTypeName: rt?.name || 'Tiêu chuẩn',
        bedType: rt?.bedType || (room as any).bedType || '1 giường',
        area: rt?.area || (room as any).area || 25,

        // Sync prices if types details present
        clientPrice: room.priceOverride || rt?.basePrice || room.clientPrice,
        ctvPrice: rt ? Math.round(rt.basePrice * 0.85) : room.ctvPrice,
        originalPrice: rt ? Math.round(rt.basePrice * 0.65) : room.originalPrice,
        maxGuests: rt?.maxGuests || room.maxGuests
      };
    });
  }

  static getRoomById(id: string) {
    this.load();
    const r = this.data!.rooms.find(rm => rm.id === id) || null;
    if (!r) return null;
    const prop = this.data!.properties.find(p => p.id === r.propertyId);
    const rt = this.data!.roomTypes.find(t => t.id === r.roomTypeId);
    return {
      ...r,
      propertyName: prop ? prop.name : r.propertyName || 'Khu biệt thự',
      propertyType: prop ? prop.type : r.propertyType || 'VILLA',
      
      // Detailed roomType features
      amenities: rt?.amenities || (r as any).amenities || [],
      roomTypeName: rt?.name || 'Tiêu chuẩn',
      bedType: rt?.bedType || (r as any).bedType || '1 giường',
      area: rt?.area || (r as any).area || 25,

      clientPrice: r.priceOverride || rt?.basePrice || r.clientPrice,
      ctvPrice: rt ? Math.round(rt.basePrice * 0.85) : r.ctvPrice,
      originalPrice: rt ? Math.round(rt.basePrice * 0.65) : r.originalPrice,
      maxGuests: rt?.maxGuests || r.maxGuests
    };
  }

  static createRoom(room: Room) {
    this.load();
    this.data!.rooms.push(room);
    this.save();
    return this.getRoomById(room.id)!;
  }

  static updateRoom(id: string, updates: Partial<Room>) {
    this.load();
    const idx = this.data!.rooms.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.data!.rooms[idx] = { ...this.data!.rooms[idx], ...updates };
      this.save();
      return this.getRoomById(id);
    }
    return null;
  }

  static deleteRoom(id: string) {
    this.load();
    const initialLen = this.data!.rooms.length;
    this.data!.rooms = this.data!.rooms.filter(r => r.id !== id);
    if (this.data!.rooms.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- CHECK ROOM AVAILABILITY & SAFETY CONTROLS ---
  static isRoomAvailable(roomId: string, checkInStr: string, checkOutStr: string, excludeBookingId?: string): boolean {
    this.load();

    const room = this.data!.rooms.find(r => r.id === roomId);
    if (!room) return false;

    // RULE 1: Block rooms that are Maintenance, Cleaning or Hidden
    const roomStatusLower = String(room.status).toLowerCase();
    if (roomStatusLower === 'maintenance' || roomStatusLower === 'cleaning' || roomStatusLower === 'hidden') {
      return false; // Blocker: Not available due to internal engineering/hygiene
    }

    const start = new Date(checkInStr);
    const end = new Date(checkOutStr);
    if (isNaN(start.getTime()) || !checkInStr) return true;
    if (isNaN(end.getTime()) || !checkOutStr) return true;
    if (start >= end) return false;

    // Filter active bookings
    const activeBookings = this.data!.bookings.filter(b => {
      // Match room and prevent self-conflict on edit
      const bMatchesRoom = b.roomId === roomId || (b.roomIds && b.roomIds.includes(roomId));
      const bNotCancelled = b.status !== 'CANCELLED' && b.bookingStatus !== 'CANCELLED';
      const bNotSelf = b.id !== excludeBookingId;
      return bMatchesRoom && bNotCancelled && bNotSelf;
    });

    for (const b of activeBookings) {
      const bStart = new Date(b.checkIn);
      const bEnd = new Date(b.checkOut);
      // Interval overlap check: start < bEnd && bStart < end
      if (start < bEnd && bStart < end) {
        return false; // Blocker: Conflict detected
      }
    }

    return true;
  }

  // --- BOOKINGS ---
  static getBookings() {
    this.load();
    return this.data!.bookings;
  }

  static getBookingById(id: string) {
    this.load();
    return this.data!.bookings.find(b => b.id === id) || null;
  }

  static createBooking(booking: Booking) {
    this.load();
    this.data!.bookings.push(booking);
    
    // Setup and trigger wallet accrual values
    if (booking.ctvId && booking.ctvId !== 'usr_admin' && booking.ctvId !== 'usr_admin2' && booking.ctvId !== 'usr_staff') {
      const wallet = this.data!.wallets[booking.ctvId];
      if (wallet) {
        wallet.pending += booking.commissionAmount;
      }
    }

    // Capture in commissions history list
    const parsedAmount = booking.commissionAmount || 0;
    const newCommission: Commission = {
      id: 'cms_' + Math.random().toString(36).substr(2, 9),
      bookingId: booking.id,
      ctvId: booking.ctvId,
      rate: 10,
      amount: parsedAmount,
      status: 'pending'
    };
    if (!this.data!.commissions) this.data!.commissions = [];
    this.data!.commissions.push(newCommission);

    // Capture audit log entry
    this.createAuditLog(booking.ctvId, `Tạo mới đơn đặt phòng ${booking.bookingCode}`, 'booking', booking.id, '', 'status: confirmed/pending');

    this.save();
    return booking;
  }

  static updateBooking(id: string, updates: Partial<Booking>) {
    this.load();
    const idx = this.data!.bookings.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.data!.bookings[idx] = { ...this.data!.bookings[idx], ...updates } as any;
      this.save();
      return this.data!.bookings[idx];
    }
    return null;
  }

  static updateBookingStatus(id: string, status: 'APPROVED' | 'CANCELLED', rejectionReason?: string) {
    this.load();
    const booking = this.data!.bookings.find(b => b.id === id);
    if (!booking) return null;
    
    // Transfer pending to balance/total if approved or subtract if cancelled
    if (booking.status === 'PENDING') {
      booking.status = status;
      booking.bookingStatus = status === 'APPROVED' ? 'confirmed' : 'cancelled';
      booking.paymentStatus = status === 'APPROVED' ? 'paid' : 'unpaid';
      if (rejectionReason) booking.rejectionReason = rejectionReason;

      const wallet = this.data!.wallets[booking.ctvId];
      if (wallet && booking.ctvId !== 'usr_admin') {
        if (status === 'APPROVED') {
          wallet.pending = Math.max(0, wallet.pending - booking.commissionAmount);
          wallet.balance += booking.commissionAmount;
          wallet.totalEarned += booking.commissionAmount;
          
          const cms = this.data!.commissions?.find(c => c.bookingId === booking.id);
          if (cms) {
            cms.status = 'approved';
            cms.paidAt = new Date().toISOString();
          }
        } else if (status === 'CANCELLED') {
          wallet.pending = Math.max(0, wallet.pending - booking.commissionAmount);
          const cms = this.data!.commissions?.find(c => c.bookingId === booking.id);
          if (cms) cms.status = 'pending';
        }
      }

      this.createAuditLog('usr_admin', `Thay đổi trạng thái đơn đặt phòng sang ${status}`, 'booking', booking.id, 'PENDING', status);
      this.save();
      return booking;
    }
    
    return booking;
  }

  // --- WALLETS ---
  static getWalletByCreator(ctvId: string) {
    this.load();
    if (!this.data!.wallets[ctvId]) {
      this.data!.wallets[ctvId] = {
        ctvId,
        balance: 0,
        pending: 0,
        totalEarned: 0
      };
      this.save();
    }
    return this.data!.wallets[ctvId];
  }

  static updateWalletBankDetails(ctvId: string, bankName: string, bankAccount: string, bankHolder: string) {
    this.load();
    const wallet = this.getWalletByCreator(ctvId);
    wallet.bankName = bankName;
    wallet.bankAccount = bankAccount;
    wallet.bankHolder = bankHolder;
    this.save();
    return wallet;
  }

  // --- PAYOUT REQUESTS ---
  static getPayouts() {
    this.load();
    return this.data!.payouts;
  }

  static createPayoutRequest(payout: PayoutRequest) {
    this.load();
    this.data!.payouts.push(payout);
    
    const wallet = this.data!.wallets[payout.ctvId];
    if (wallet) {
      wallet.balance = Math.max(0, wallet.balance - payout.amount);
    }

    this.save();
    return payout;
  }

  static updatePayoutStatus(id: string, status: 'COMPLETED' | 'REJECTED') {
    this.load();
    const payout = this.data!.payouts.find(p => p.id === id);
    if (!payout) return null;

    if (payout.status === 'PENDING') {
      payout.status = status;
      payout.processedAt = new Date().toISOString();

      if (status === 'REJECTED') {
        const wallet = this.data!.wallets[payout.ctvId];
        if (wallet) {
          wallet.balance += payout.amount;
        }
      }
      this.save();
      return payout;
    }
    return payout;
  }

  // --- REQUISITE MINTING OPERATIONS FOR OTHER TABLES ---
  static getCommissions() {
    this.load();
    return this.data!.commissions || [];
  }

  static getAuditLogs() {
    this.load();
    return this.data!.auditLogs || [];
  }

  static createAuditLog(userId: string, action: string, entityType: string, entityId: string, oldValue?: string, newValue?: string) {
    this.load();
    const log: AuditLog = {
      id: 'alg_' + Math.random().toString(36).substr(2, 9),
      userId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      createdAt: new Date().toISOString()
    };
    if (!this.data!.auditLogs) this.data!.auditLogs = [];
    this.data!.auditLogs.push(log);
    this.save();
    return log;
  }

  // --- NOTIFICATIONS ---
  static getNotifications(userId: string) {
    this.load();
    return this.data!.notifications.filter(
      n => n.userId === userId || n.userId === 'ALL' || (userId === 'usr_admin' && n.userId === 'ADMIN')
    ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static createNotification(userId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING') {
    this.load();
    const notif: AppNotification = {
      id: 'nt_' + Math.random().toString(36).substr(2, 9),
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.data!.notifications.push(notif);
    this.save();
    return notif;
  }

  static markAllNotificationsAsRead(userId: string) {
    this.load();
    this.data!.notifications.forEach(n => {
      if (n.userId === userId || (userId === 'usr_admin' && n.userId === 'ADMIN')) {
        n.isRead = true;
      }
    });
    this.save();
  }

  // --- REFERRALS ---
  static getReferrals() {
    this.load();
    return this.data!.referrals || [];
  }

  static createReferral(ref: ReferralLink) {
    this.load();
    if (!this.data!.referrals) this.data!.referrals = [];
    this.data!.referrals.push(ref);
    this.save();
    return ref;
  }

  static getReferralByCode(code: string) {
    this.load();
    if (!this.data!.referrals) this.data!.referrals = [];
    return this.data!.referrals.find(r => r.code === code) || null;
  }

  static trackReferralClick(code: string) {
    this.load();
    if (!this.data!.referrals) this.data!.referrals = [];
    const found = this.data!.referrals.find(r => r.code === code);
    if (found) {
      found.clicks = (found.clicks || 0) + 1;
      this.save();
      return true;
    }
    return false;
  }

  static trackReferralBooking(code: string, isCompleted: boolean) {
    this.load();
    if (!this.data!.referrals) this.data!.referrals = [];
    const found = this.data!.referrals.find(r => r.code === code);
    if (found) {
      found.bookingsCreated = (found.bookingsCreated || 0) + 1;
      if (isCompleted) {
        found.bookingsCompleted = (found.bookingsCompleted || 0) + 1;
      }
      this.save();
      return true;
    }
    return false;
  }

  // --- CUSTOMERS CRUD ---
  static getCustomers() {
    this.load();
    if (!this.data!.customers) {
      this.data!.customers = [];
    }
    return this.data!.customers;
  }

  static getCustomerById(id: string) {
    this.load();
    if (!this.data!.customers) this.data!.customers = [];
    return this.data!.customers.find(c => c.id === id) || null;
  }

  static createCustomer(cus: Customer) {
    this.load();
    if (!this.data!.customers) this.data!.customers = [];
    this.data!.customers.push(cus);
    this.save();
    return cus;
  }

  static updateCustomer(id: string, updates: Partial<Customer>) {
    this.load();
    if (!this.data!.customers) this.data!.customers = [];
    const idx = this.data!.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data!.customers[idx] = { ...this.data!.customers[idx], ...updates };
      this.save();
      return this.data!.customers[idx];
    }
    return null;
  }

  static deleteCustomer(id: string) {
    this.load();
    if (!this.data!.customers) this.data!.customers = [];
    const initialLen = this.data!.customers.length;
    this.data!.customers = this.data!.customers.filter(c => c.id !== id);
    if (this.data!.customers.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }
}
