import express from 'express';
import * as path from 'path';
import { createServer as createViteServer } from 'vite';
import { FileDatabase } from './src/server/db';
import { User, Property, Room, Booking, Wallet, PayoutRequest, AppNotification, ReferralLink, Customer } from './src/types';
import { GoogleGenAI } from '@google/genai';

interface LiveAlert {
  id: string;
  title: string;
  message: string;
  type: 'BOOKING_SUCCESS' | 'AVAILABILITY_CHANGE' | 'COMMISSION_EARNED';
  timestamp: string;
}

const recentLiveAlerts: LiveAlert[] = [
  {
    id: 'la_1',
    title: '🔥 Phút Lâm Bồn Săn Khách!',
    message: 'CTV Nguyễn Văn A vừa đặt thành công Pine Hill Sweet Bungalow Đà Lạt (+400.000đ)',
    type: 'BOOKING_SUCCESS',
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString()
  },
  {
    id: 'la_2',
    title: '🟢 Có Phòng Mới Trống Lịch!',
    message: 'Căn phòng "Grand President Suite Pool View" (Đà Nẵng) đã gỡ hạn khóa, hiện tại CTV có thể đặt sỉ!',
    type: 'AVAILABILITY_CHANGE',
    timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString()
  },
  {
    id: 'la_3',
    title: '🔥 Săn Phòng Siêu Hấp Dẫn!',
    message: 'Khách hàng vừa checkout sớm tại "Oceanfront Sunset Deluxe Villa". CTV hãy nhanh tay giới thiệu ngay!',
    type: 'AVAILABILITY_CHANGE',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

// Simple token generators (Base64 wrapper containing userId and role)
function generateToken(userId: string, role: string): string {
  return Buffer.from(`${userId}:${role}:${Date.now()}`).toString('base64');
}

function parseToken(token: string): { userId: string; role: string } | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const parts = raw.split(':');
    if (parts.length >= 2) {
      return { userId: parts[0], role: parts[1] };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Auth Middleware ---
  const authMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Không tìm thấy token xác thực.' });
    }
    const token = authHeader.split(' ')[1];
    const parsed = parseToken(token);
    if (!parsed) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
    
    const user = FileDatabase.getUserById(parsed.userId);
    if (!user) {
      return res.status(401).json({ message: 'Người dùng không tồn tại.' });
    }
    
    // Support dynamic mock role switching from token
    const baseUser = { ...user };
    if (parsed.role) {
      baseUser.role = parsed.role as any;
    }

    if (baseUser.role === 'CTV' && baseUser.status === 'PENDING') {
      return res.status(403).json({ message: 'Tài khoản CTV đang chờ duyệt bởi Admin.' });
    }

    req.user = baseUser;
    next();
  };

  const adminMiddleware = (req: any, res: any, next: any) => {
    const roleUpper = String(req.user.role).toUpperCase();
    const isAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'STAFF' || roleUpper === 'MANAGER';
    if (!isAdmin) {
      return res.status(403).json({ message: 'Quyền truy cập bị từ chối. Chỉ dành cho Admin, Staff, Manager.' });
    }
    next();
  };

  // --- API Endpoints ---

  // Auth: Đăng nhập
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ email và mật khẩu.' });
    }

    const user = FileDatabase.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    // Verify plaintext password (safe for mockup / visual preview)
    const dbUser = FileDatabase.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) as any;
    if (dbUser.passwordHash !== password) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    if (user.role === 'CTV' && user.status === 'PENDING') {
      return res.status(403).json({ message: 'Tài khoản của bạn đang chờ phê duyệt từ Ban quản trị (Admin).' });
    }

    const token = generateToken(user.id, user.role);
    res.json({
      token,
      user
    });
  });

  // Auth: Đăng ký CTV
  app.post('/api/auth/register', (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin đăng ký.' });
    }

    const existingUser = FileDatabase.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã đăng ký trên hệ thống.' });
    }

    const newUserId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const newCTV: User = {
      id: newUserId,
      name,
      email,
      phone,
      role: 'CTV',
      status: 'PENDING', // Registered CTVs start as pending
      commissionRate: 10, // Default baseline 10%
      createdAt: new Date().toISOString()
    };

    FileDatabase.createUser(newCTV, password);
    FileDatabase.createNotification('ADMIN', 'Đăng ký CTV mới', `CTV ${name} vừa đăng ký tài khoản và đang chờ bạn phê duyệt.`, 'WARNING');

    res.status(201).json({
      message: 'Đăng ký tài khoản CTV thành công! Ban quản trị sẽ sớm duyệt tài khoản của bạn.'
    });
  });

  // Auth: Lấy thông tin cá nhân hiện tại
  app.get('/api/auth/me', authMiddleware, (req: any, res) => {
    res.json(req.user);
  });

  // --- PROPERTIES (KHU LƯU TRÚ) ENDPOINTS ---
  app.get('/api/properties', (req, res) => {
    res.json(FileDatabase.getProperties());
  });

  app.get('/api/properties/:id', (req, res) => {
    const prop = FileDatabase.getPropertyById(req.params.id);
    if (!prop) {
      return res.status(404).json({ message: 'Không tìm thấy khu lưu trú.' });
    }
    res.json(prop);
  });

  app.post('/api/properties', authMiddleware, adminMiddleware, (req, res) => {
    const { name, type, location, address, description, facilities, policies, images, videoUrl, latitude, longitude } = req.body;
    if (!name || !type || (!location && !address)) {
      return res.status(400).json({ message: 'Vui lòng cung cấp ít nhất tên, loại hình và địa chỉ.' });
    }

    const newProp: Property = {
      id: 'prop_' + Math.random().toString(36).substr(2, 9),
      name,
      type,
      address: address || location || '',
      description: description || '',
      status: req.body.status || 'ACTIVE',
      facilities: Array.isArray(facilities) ? facilities : [],
      policies: policies || '',
      images: Array.isArray(images) ? images : [],
      videoUrl: videoUrl || '',
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      createdAt: new Date().toISOString()
    };

    FileDatabase.createProperty(newProp);
    res.status(201).json(newProp);
  });

  app.put('/api/properties/:id', authMiddleware, adminMiddleware, (req, res) => {
    const updated = FileDatabase.updateProperty(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy khu lưu trú để cập nhật.' });
    }
    res.json(updated);
  });

  app.delete('/api/properties/:id', authMiddleware, adminMiddleware, (req, res) => {
    const success = FileDatabase.deleteProperty(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy khu lưu trú để xóa.' });
    }
    res.json({ message: 'Đã xóa khu lưu trú thành công.' });
  });

  // --- CUSTOMERS ENDPOINTS ---
  app.get('/api/customers', authMiddleware, (req: any, res) => {
    const isCtv = String(req.user.role).toUpperCase() === 'CTV';
    const allCustomers = FileDatabase.getCustomers();
    const allBookings = FileDatabase.getBookings();

    if (isCtv) {
      // CTV gets basic access: customers details that they created bookings for
      const myBookingCustomerIds = new Set(
        allBookings
          .filter(b => b.ctvId === req.user.id)
          .map(b => b.customerId)
          .filter(Boolean)
      );
      // Let's also include any customer they created or general list but sanitized
      const ctvCustomers = allCustomers.map(c => {
        const isMine = myBookingCustomerIds.has(c.id);
        return {
          ...c,
          isMine
        };
      });
      return res.json(ctvCustomers);
    }

    // Admin/Staff sees all customers with statistics: total orders, total spend, and who referred them (CTV name)
    const processedCustomers = allCustomers.map(c => {
      const customerBookings = allBookings.filter(b => b.customerId === c.id || b.customerPhone === c.phone);
      const totalOrders = customerBookings.length;
      const totalSpent = customerBookings
        .filter(b => b.status === 'APPROVED' || b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed')
        .reduce((sum, b) => sum + (b.sellingPrice || 0) + (b.surcharge || 0), 0);
      
      // Look up who referred them (can look at first or most recent booking)
      const associatedCtvs = Array.from(new Set(customerBookings.map(b => b.ctvName || 'Trực tiếp').filter(Boolean)));

      return {
        ...c,
        totalOrders,
        totalSpent,
        associatedCtvs
      };
    });

    res.json(processedCustomers);
  });

  app.get('/api/customers/:id', authMiddleware, (req: any, res) => {
    const c = FileDatabase.getCustomerById(req.params.id);
    if (!c) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin khách gửi này.' });
    }

    const allBookings = FileDatabase.getBookings();
    const customerBookings = allBookings.filter(b => b.customerId === c.id || b.customerPhone === c.phone);

    // Calculate details
    const orderHistory = customerBookings.map(b => ({
      id: b.id,
      bookingCode: b.bookingCode,
      propertyName: b.propertyName,
      roomName: b.roomName,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.bookingStatus || b.status,
      sellingPrice: b.sellingPrice,
      surcharge: b.surcharge,
      totalAmount: b.sellingPrice + (b.surcharge || 0),
      paidAmount: b.paidAmount || 0,
      paymentStatus: b.paymentStatus,
      ctvName: b.ctvName || 'Hệ thống trực tiếp',
      ctvId: b.ctvId,
      createdAt: b.createdAt
    }));

    res.json({
      ...c,
      bookings: orderHistory
    });
  });

  app.post('/api/customers', authMiddleware, (req: any, res) => {
    const { fullName, phone, email, identityNumber, note, gender, address, tags } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json({ message: 'Vui lòng điền họ tên và số điện thoại khách hàng.' });
    }

    // Check if phone already registered to avoid duplication
    const existing = FileDatabase.getCustomers().find(c => c.phone === phone);
    if (existing) {
      return res.json(existing); // Return existing instead of throwing, or notify
    }

    const newCustomer: Customer & { createdBy?: string; gender?: string; address?: string; tags?: string[]; files?: any[]; createdAt?: string } = {
      id: 'cus_' + Math.random().toString(36).substr(2, 9),
      fullName,
      phone,
      email: email || '',
      identityNumber: identityNumber || '',
      note: note || '',
      gender: gender || 'Khác',
      address: address || '',
      tags: Array.isArray(tags) ? tags : [],
      files: [],
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    FileDatabase.createCustomer(newCustomer as any);
    res.status(201).json(newCustomer);
  });

  app.put('/api/customers/:id', authMiddleware, (req: any, res) => {
    const updated = FileDatabase.updateCustomer(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ khách hàng cần cập nhật.' });
    }
    res.json(updated);
  });

  app.delete('/api/customers/:id', authMiddleware, adminMiddleware, (req, res) => {
    const deleted = FileDatabase.deleteCustomer(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không thể xóa khách hàng.' });
    }
    res.json({ message: 'Đã xóa khách sỉ khỏi hệ thống thành công.' });
  });

  // --- ROOM TYPES (TEMPLATE CATALOG) ENDPOINTS ---
  app.get('/api/room-types', (req, res) => {
    res.json(FileDatabase.getRoomTypes());
  });

  app.get('/api/room-types/:id', (req, res) => {
    const rt = FileDatabase.getRoomTypeById(req.params.id);
    if (!rt) {
      return res.status(404).json({ message: 'Không tìm thấy loại phòng.' });
    }
    res.json(rt);
  });

  app.post('/api/room-types', authMiddleware, adminMiddleware, (req, res) => {
    const { propertyId, name, code, shortDescription, longDescription, basePrice, weekendPrice, holidayPrice, extraGuestFee, depositAmount, standardGuests, maxGuests, area, bedType, amenities, images, cancellationPolicy, checkInTime, checkOutTime } = req.body;
    if (!propertyId || !name || !code) {
      return res.status(400).json({ message: 'Vui lòng cung cấp khu lưu trú, tên loại phòng và mã phòng học.' });
    }

    const newRt: any = {
      id: 'rt_' + Math.random().toString(36).substr(2, 9),
      propertyId,
      name,
      code,
      shortDescription: shortDescription || '',
      longDescription: longDescription || '',
      basePrice: Number(basePrice) || 0,
      weekendPrice: Number(weekendPrice) || Number(basePrice) || 0,
      holidayPrice: Number(holidayPrice) || Number(basePrice) || 0,
      extraGuestFee: Number(extraGuestFee) || 0,
      depositAmount: Number(depositAmount) || 0,
      standardGuests: Number(standardGuests) || 2,
      maxGuests: Number(maxGuests) || 4,
      area: Number(area) || 30,
      bedType: bedType || '1 King Bed',
      amenities: Array.isArray(amenities) ? amenities : [],
      images: Array.isArray(images) ? images : [],
      cancellationPolicy: cancellationPolicy || '',
      checkInTime: checkInTime || '14:00',
      checkOutTime: checkOutTime || '12:00',
      status: 'ACTIVE'
    };

    FileDatabase.createRoomType(newRt);
    res.status(201).json(newRt);
  });

  app.put('/api/room-types/:id', authMiddleware, adminMiddleware, (req, res) => {
    const updated = FileDatabase.updateRoomType(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy loại phòng để cập nhật.' });
    }
    res.json(updated);
  });

  app.delete('/api/room-types/:id', authMiddleware, adminMiddleware, (req, res) => {
    const success = FileDatabase.deleteRoomType(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy loại phòng để xóa.' });
    }
    res.json({ message: 'Đã xóa loại phòng thành công.' });
  });

  // --- ROOMS MANAGEMENT ---

  // GET: Lấy danh sách phòng (kèm bộ lọc lịch trống)
  app.get('/api/rooms', (req, res) => {
    const { checkIn, checkOut, search, propertyType, maxGuests } = req.query;
    let rooms = FileDatabase.getRooms();

    // Lọc theo từ khóa tìm kiếm (tên phòng, khu lưu trú hoặc địa điểm)
    if (search) {
      const q = String(search).toLowerCase();
      rooms = rooms.filter(r => 
        r.name.toLowerCase().includes(q) || 
        (r.propertyName && r.propertyName.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    }

    // Lọc theo loại hình khu lưu trú
    if (propertyType) {
      rooms = rooms.filter(r => r.propertyType === propertyType);
    }

    // Lọc theo sức người
    if (maxGuests) {
      const minGuests = Number(maxGuests);
      if (!isNaN(minGuests)) {
        rooms = rooms.filter(r => r.maxGuests >= minGuests);
      }
    }

    // Lọc theo lịch trống quét qua lịch sử booking
    if (checkIn && checkOut) {
      const checkInStr = String(checkIn);
      const checkOutStr = String(checkOut);
      rooms = rooms.filter(room => FileDatabase.isRoomAvailable(room.id, checkInStr, checkOutStr));
    }

    res.json(rooms);
  });

  // GET: Chi tiết một phòng
  app.get('/api/rooms/:id', (req, res) => {
    const room = FileDatabase.getRoomById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng này.' });
    }
    res.json(room);
  });

  // POST: Tạo phòng mới (Admin)
  app.post('/api/rooms', authMiddleware, adminMiddleware, (req, res) => {
    const { propertyId, name, description, originalPrice, clientPrice, ctvPrice, commissionRate, images, videoUrl, maxGuests, quantity, priceByHour, priceByDay, priceByWeek, latitude, longitude, specialRates } = req.body;
    if (!propertyId || !name || originalPrice === undefined || clientPrice === undefined || ctvPrice === undefined) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ khu lưu trú, tên phòng, giá gốc, giá bán khách và giá cho CTV.' });
    }

    const newRoom: Room = {
      id: 'rm_' + Math.random().toString(36).substr(2, 9),
      propertyId,
      name,
      description: description || '',
      status: 'available',
      originalPrice: Number(originalPrice),
      clientPrice: Number(clientPrice),
      ctvPrice: Number(ctvPrice),
      commissionRate: commissionRate !== undefined ? Number(commissionRate) : 10,
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800'],
      videoUrl: videoUrl || '',
      maxGuests: maxGuests ? Number(maxGuests) : 4,
      blockedDates: [],
      quantity: quantity !== undefined ? Number(quantity) : 1,
      priceByHour: priceByHour !== undefined ? Number(priceByHour) : Math.round(Number(ctvPrice) * 0.3),
      priceByDay: priceByDay !== undefined ? Number(priceByDay) : Math.round(Number(ctvPrice) * 0.9),
      priceByWeek: priceByWeek !== undefined ? Number(priceByWeek) : Math.round(Number(ctvPrice) * 5.5),
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      specialRates: Array.isArray(specialRates) ? specialRates : [],
      createdAt: new Date().toISOString()
    };

    const saved = FileDatabase.createRoom(newRoom);
    res.status(201).json(saved);
  });

  // PUT: Sửa phòng (Admin)
  app.put('/api/rooms/:id', authMiddleware, adminMiddleware, (req, res) => {
    const updated = FileDatabase.updateRoom(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy phòng để cập nhật.' });
    }
    res.json(updated);
  });

  // DELETE: Xóa phòng (Admin)
  app.delete('/api/rooms/:id', authMiddleware, adminMiddleware, (req, res) => {
    const success = FileDatabase.deleteRoom(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy phòng để xóa.' });
    }
    res.json({ message: 'Đã xóa phòng thành công.' });
  });

  // --- BOOKING SYSTEM ---

  // GET: Xem đơn đặt phòng
  app.get('/api/bookings', authMiddleware, (req: any, res) => {
    let bookings = FileDatabase.getBookings();
    if (req.user.role === 'CTV') {
      bookings = bookings.filter(b => b.ctvId === req.user.id);
    }
    // Sắp xếp mới nhất lên đầu
    bookings.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(bookings);
  });

  // POST: Tạo đơn đặt phòng (Admin hoặc CTV)
  app.post('/api/bookings', authMiddleware, (req: any, res) => {
    const { roomId, customerName, customerPhone, checkIn, checkOut, guests, sellingPrice, note, services, referralCode } = req.body;
    if (!roomId || !customerName || !customerPhone || !checkIn || !checkOut || !guests || !sellingPrice) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin đặt phòng bắt buộc.' });
    }

    const room = FileDatabase.getRoomById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng.' });
    }

    // Kiểm tra trùng lịch bằng cách quét bookings hiện hữu
    const isAvailable = FileDatabase.isRoomAvailable(roomId, checkIn, checkOut);
    if (!isAvailable) {
      return res.status(400).json({ message: 'Lịch phòng đã bị trùng vào một số ngày đã chọn. Vui lòng chọn ngày khác.' });
    }

    // Tính toán số đêm
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights <= 0) {
      return res.status(400).json({ message: 'Ngày nhận phòng (Check-in) phải trước ngày trả phòng (Check-out).' });
    }

    const origPriceTotal = room.originalPrice * nights;
    const clientPriceTotal = room.clientPrice * nights;
    const ctvPriceTotal = room.ctvPrice * nights;
    const finalSellingPrice = Number(sellingPrice);

    const isCTV = req.user.role === 'CTV';
    const minPriceAllowed = isCTV ? ctvPriceTotal : origPriceTotal;

    if (finalSellingPrice < minPriceAllowed) {
      return res.status(400).json({ 
        message: `Giá bán không được thấp hơn giá sàn hệ thống quy định cho bạn (${minPriceAllowed.toLocaleString('vi-VN')} đ cho ${nights} đêm).` 
      });
    }

    // Hoa hồng của CTV = Giá bán thực tế - Giá sàn CTV (Nhận trọn tiền chênh lệch)
    const finalCommission = isCTV ? Math.max(0, finalSellingPrice - ctvPriceTotal) : 0;

    // Tự động tìm kiếm hoặc tạo phân hệ hồ sơ khách sỉ mới
    let customer = FileDatabase.getCustomers().find(c => c.phone === customerPhone);
    if (!customer) {
      const newCus: Customer = {
        id: 'cus_' + Math.random().toString(36).substr(2, 9),
        fullName: customerName,
        phone: customerPhone,
        email: req.body.customerEmail || '',
        identityNumber: req.body.customerIdentity || '',
        note: 'Hồ sơ được khởi tạo tự động từ quy trình đặt phòng.'
      };
      FileDatabase.createCustomer(newCus);
      customer = newCus;
    } else {
      let changed = false;
      if (!customer.identityNumber && req.body.customerIdentity) {
        customer.identityNumber = req.body.customerIdentity;
        changed = true;
      }
      if (!customer.email && req.body.customerEmail) {
        customer.email = req.body.customerEmail;
        changed = true;
      }
      if (changed) {
        FileDatabase.updateCustomer(customer.id, customer);
      }
    }

    const newBooking: Booking = {
      id: 'bk_' + Math.random().toString(36).substr(2, 9),
      customerId: customer.id,
      source: isCTV ? 'CTV' : 'DIRECT',
      roomId,
      roomName: room.name,
      propertyName: room.propertyName,
      propertyType: room.propertyType,
      ctvId: req.user.id,
      ctvName: req.user.name,
      customerName,
      customerPhone,
      checkIn,
      checkOut,
      guests: Number(guests),
      nights,
      originalPrice: origPriceTotal,
      clientPrice: clientPriceTotal,
      ctvPrice: ctvPriceTotal,
      sellingPrice: finalSellingPrice,
      commissionAmount: finalCommission,
      services: Array.isArray(services) ? services : [],
      status: req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING', // Đơn Admin tự tạo duyệt luôn, đơn CTV chờ duyệt
      note: note || '',
      referralCode: referralCode || undefined,
      createdAt: new Date().toISOString()
    };

    FileDatabase.createBooking(newBooking);

    if (referralCode) {
      FileDatabase.trackReferralBooking(referralCode, false);
    }

    // Live Alert Broadcast
    recentLiveAlerts.unshift({
      id: 'la_' + Math.random().toString(36).substr(2, 9),
      title: '🔥 Chốt Đơn Thành Công!',
      message: `${isCTV ? 'CTV ' + req.user.name : 'Ban quản trị'} vừa nhanh tay chốt phòng "${room.name}" (${nights} đêm)`,
      type: 'BOOKING_SUCCESS',
      timestamp: new Date().toISOString()
    });
    if (recentLiveAlerts.length > 50) recentLiveAlerts.length = 50;

    // Thông báo cho hệ thống
    if (isCTV) {
      FileDatabase.createNotification(
        'ADMIN', 
        'Đơn hàng mới chờ duyệt', 
        `CTV ${req.user.name} vừa lên đơn phòng "${room.name}" cho khách ${customerName} (${nights} đêm). Hoa hồng: ${finalCommission.toLocaleString('vi-VN')}đ`, 
        'INFO'
      );
    } else {
      FileDatabase.createNotification(
        'ALL',
        'Phòng đã được đặt trực tiếp 🏡',
        `Admin vừa chốt đặt nhanh phòng "${room.name}" trực tiếp từ ngày ${checkIn} đến ${checkOut}.`,
        'INFO'
      );
    }

    res.status(201).json(newBooking);
  });

  // PUT: Duyệt hoặc hủy đơn (Admin)
  app.put('/api/bookings/:id/status', authMiddleware, adminMiddleware, (req: any, res) => {
    const { status, rejectionReason } = req.body;
    if (!status || !['APPROVED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái truyền lên không hợp lệ.' });
    }

    const booking = FileDatabase.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn đặt phòng.' });
    }

    if (booking.status !== 'PENDING') {
      return res.status(400).json({ message: 'Đơn hàng này đã được xử lý trước đó.' });
    }

    const updated = FileDatabase.updateBookingStatus(req.params.id, status, rejectionReason);
    
    // If approved and has referralCode backlink, track completion
    if (status === 'APPROVED' && booking.referralCode) {
      FileDatabase.trackReferralBooking(booking.referralCode, true);
    }

    if (status === 'APPROVED' && booking.ctvId && booking.ctvId !== 'usr_admin') {
      recentLiveAlerts.unshift({
        id: 'la_' + Math.random().toString(36).substr(2, 9),
        title: '💸 Nhận Hoa Hồng Khủng!',
        message: `CTV ${booking.ctvName} vừa rút túi ngọt lịm +${booking.commissionAmount.toLocaleString('vi-VN')} đ hoa hồng thực tế!`,
        type: 'COMMISSION_EARNED',
        timestamp: new Date().toISOString()
      });
      if (recentLiveAlerts.length > 50) recentLiveAlerts.length = 50;
    }
    
    // Tạo thông báo cho CTV nếu đơn mua từ CTV
    if (booking.ctvId && booking.ctvId !== 'usr_admin') {
      const msg = status === 'APPROVED' 
        ? `Đơn đặt phòng "${booking.roomName}" của khách ${booking.customerName} đã được duyệt thành công! +${booking.commissionAmount.toLocaleString('vi-VN')}đ đã được chuyển vào ví khả dụng.`
        : `Đơn đặt phòng "${booking.roomName}" đã bị từ chối duyệt. Lý do: ${rejectionReason || 'Không có lý do chi tiết'}.`;
      
      FileDatabase.createNotification(
        booking.ctvId,
        status === 'APPROVED' ? 'Đơn hàng đã được duyệt 🎉' : 'Đơn hàng đã bị từ chối ❌',
        msg,
        status === 'APPROVED' ? 'SUCCESS' : 'WARNING'
      );
    }

    res.json(updated);
  });

  // PUT: Admin cập nhật đặt phòng toàn diện (Xác nhận cọc, dọn bàn cờ, trả phòng, đổi phòng...)
  app.put('/api/bookings/:id', authMiddleware, adminMiddleware, (req: any, res) => {
    const bookingId = req.params.id;
    const booking = FileDatabase.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn đặt phòng.' });
    }

    const { 
      customerName, 
      customerPhone, 
      checkIn, 
      checkOut, 
      guests, 
      sellingPrice, 
      paymentStatus, 
      bookingStatus, 
      note, 
      roomId, 
      status, 
      services, 
      commissionAmount,
      totalSurcharge
    } = req.body;

    const updates: any = {};
    if (customerName !== undefined) updates.customerName = customerName;
    if (customerPhone !== undefined) updates.customerPhone = customerPhone;
    if (checkIn !== undefined) updates.checkIn = checkIn;
    if (checkOut !== undefined) updates.checkOut = checkOut;
    if (guests !== undefined) updates.guests = Number(guests);
    if (sellingPrice !== undefined) updates.sellingPrice = Number(sellingPrice);
    if (paymentStatus !== undefined) updates.paymentStatus = paymentStatus;
    if (bookingStatus !== undefined) updates.bookingStatus = bookingStatus;
    if (note !== undefined) updates.note = note;
    if (status !== undefined) updates.status = status;
    if (services !== undefined) updates.services = services;
    if (commissionAmount !== undefined) updates.commissionAmount = Number(commissionAmount);
    if (totalSurcharge !== undefined) updates.totalSurcharge = Number(totalSurcharge);

    if (roomId !== undefined && roomId !== booking.roomId) {
      const room = FileDatabase.getRoomById(roomId);
      if (room) {
        updates.roomId = roomId;
        updates.roomName = room.roomName || room.name;
        updates.propertyName = room.propertyName;
        
        // Trả phòng cũ về trống
        FileDatabase.updateRoom(booking.roomId, { status: 'available' });
        // Đánh dấu phòng mới đã đặt
        FileDatabase.updateRoom(roomId, { status: 'booked' });
      }
    }

    // Đồng bộ buồng phòng theo vòng đời đặt phòng
    if (bookingStatus && bookingStatus !== booking.bookingStatus) {
      const targetRoomId = roomId || booking.roomId;
      if (bookingStatus === 'checked_in') {
        FileDatabase.updateRoom(targetRoomId, { status: 'checked_in' });
      } else if (bookingStatus === 'checked_out') {
        FileDatabase.updateRoom(targetRoomId, { status: 'available', housekeepingStatus: 'dirty' });
      } else if (bookingStatus === 'cancelled') {
        FileDatabase.updateRoom(targetRoomId, { status: 'available' });
      } else if (bookingStatus === 'confirmed') {
        FileDatabase.updateRoom(targetRoomId, { status: 'booked' });
      }
    }

    const updated = FileDatabase.updateBooking(bookingId, updates);
    res.json(updated);
  });

  // --- WALLET & COMMISSION ---

  // GET: Lấy ví & tài khoản ngân hàng của CTV
  app.get('/api/wallet', authMiddleware, (req: any, res) => {
    const wallet = FileDatabase.getWalletByCreator(req.user.id);
    res.json(wallet);
  });

  // PUT: Cập nhật tài khoản ngân hàng cá nhân
  app.put('/api/wallet/bank', authMiddleware, (req: any, res) => {
    const { bankName, bankAccount, bankHolder } = req.body;
    if (!bankName || !bankAccount || !bankHolder) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin tài khoản ngân hàng.' });
    }

    const updatedWallet = FileDatabase.updateWalletBankDetails(
      req.user.id,
      bankName,
      bankAccount.toUpperCase(),
      bankHolder.toUpperCase()
    );
    res.json(updatedWallet);
  });

  // POST: Tạo yêu cầu rút tiền
  app.post('/api/wallet/payout', authMiddleware, (req: any, res) => {
    const { amount } = req.body;
    const numericAmount = Number(amount);
    
    if (isNaN(numericAmount) || numericAmount < 50000) {
      return res.status(400).json({ message: 'Số tiền rút tối thiểu là 50,000 đ' });
    }

    const wallet = FileDatabase.getWalletByCreator(req.user.id);
    if (!wallet.bankName || !wallet.bankAccount || !wallet.bankHolder) {
      return res.status(400).json({ message: 'Vui lòng liên kết tài khoản ngân hàng trước khi gửi yêu cầu rút tiền.' });
    }

    if (wallet.balance < numericAmount) {
      return res.status(400).json({ message: `Số dư ví khả dụng không đủ. Hiện có: ${wallet.balance.toLocaleString('vi-VN')} đ` });
    }

    const payout: PayoutRequest = {
      id: 'po_' + Math.random().toString(36).substr(2, 9),
      ctvId: req.user.id,
      ctvName: req.user.name,
      amount: numericAmount,
      bankName: wallet.bankName,
      bankAccount: wallet.bankAccount,
      bankHolder: wallet.bankHolder,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    FileDatabase.createPayoutRequest(payout);

    // Thông báo cho Admin
    FileDatabase.createNotification(
      'ADMIN',
      'Yêu cầu thanh toán mới',
      `CTV ${req.user.name} vừa yêu cầu rút số tiền ${numericAmount.toLocaleString('vi-VN')}đ về ngân hàng ${payout.bankName}.`,
      'WARNING'
    );

    res.status(201).json({ message: 'Gửi yêu cầu thanh toán thành công! Sẽ được duyệt sớm.', payout });
  });

  // GET: Lấy lịch sử rút tiền
  app.get('/api/payouts', authMiddleware, (req: any, res) => {
    let payouts = FileDatabase.getPayouts();
    if (req.user.role === 'CTV') {
      payouts = payouts.filter(p => p.ctvId === req.user.id);
    }
    payouts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(payouts);
  });

  // PUT: Duyệt yêu cầu rút tiền (Admin)
  app.put('/api/payouts/:id/status', authMiddleware, adminMiddleware, (req, res) => {
    const { status } = req.body;
    if (!status || !['COMPLETED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái rút tiền truyền lên không hợp lệ.' });
    }

    const payout = FileDatabase.getPayouts().find(p => p.id === req.params.id);
    if (!payout) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu rút tiền.' });
    }

    if (payout.status !== 'PENDING') {
      return res.status(400).json({ message: 'Yêu cầu thanh toán này đã được xử lý trước đó.' });
    }

    const updated = FileDatabase.updatePayoutStatus(req.params.id, status);

    const msg = status === 'COMPLETED'
      ? `Yêu cầu rút tiền ${payout.amount.toLocaleString('vi-VN')}đ của bạn đã được chuyển khoản và hoàn thành.`
      : `Yêu cầu rút tiền ${payout.amount.toLocaleString('vi-VN')}đ của bạn bị từ chối duyệt. Số dư đã được hoàn lại ví.`;

    FileDatabase.createNotification(
      payout.ctvId,
      status === 'COMPLETED' ? 'Yêu cầu thanh toán thành công 💰' : 'Phát sinh lỗi giải ngân ❌',
      msg,
      status === 'COMPLETED' ? 'SUCCESS' : 'WARNING'
    );

    res.json(updated);
  });

  // --- ADMIN -> COLLABORATORS CONTROL ---

  // GET: Danh sách CTV (Admin)
  app.get('/api/admin/ctvs', authMiddleware, adminMiddleware, (req, res) => {
    try {
      const users = (FileDatabase.getUsers() || []).filter(u => String(u.role).toUpperCase() === 'CTV');
      const bookings = FileDatabase.getBookings() || [];
      
      const enrichedCTVs = users.map(ctv => {
        const wallet = FileDatabase.getWalletByCreator(ctv.id);
        const ctvBookings = bookings.filter(b => b.ctvId === ctv.id);
        
        return {
          ...ctv,
          wallet,
          stats: {
            totalBookings: ctvBookings.length,
            approvedBookings: ctvBookings.filter(b => b.status === 'APPROVED').length,
            pendingBookings: ctvBookings.filter(b => b.status === 'PENDING').length,
            cancelledBookings: ctvBookings.filter(b => b.status === 'CANCELLED').length,
            totalSales: ctvBookings.filter(b => b.status === 'APPROVED').reduce((sum, b) => sum + (Number(b.sellingPrice) || 0), 0)
          }
        };
      });

      res.json(enrichedCTVs);
    } catch (err: any) {
      console.error('Error in GET /api/admin/ctvs:', err);
      res.status(500).json({ message: 'Lỗi hệ thống khi lấy danh sách cộng tác viên', details: err.message });
    }
  });

  // PUT: Duyệt tài khoản CTV mới (Admin)
  app.put('/api/admin/ctvs/:id/approve', authMiddleware, adminMiddleware, (req, res) => {
    const user = FileDatabase.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy cộng tác viên.' });
    }

    FileDatabase.updateUser(req.params.id, { status: 'APPROVED' });
    
    // Gửi thông báo chào mừng
    FileDatabase.createNotification(
      req.params.id,
      'Tài khoản đã được kích hoạt 🌟',
      'Chúc mừng tài khoản CTV kinh doanh phòng của bạn đã chính thức được kích hoạt bởi Admin!',
      'SUCCESS'
    );

    res.json({ message: 'Đã phê duyệt tài khoản cộng tác viên thành công.' });
  });

  // PUT: Điều chỉnh tỷ lệ phần trăm hoa hồng nền tảng của CTV (Admin)
  app.put('/api/admin/ctvs/:id/commission', authMiddleware, adminMiddleware, (req, res) => {
    const { commissionRate } = req.body;
    const rate = Number(commissionRate);

    if (isNaN(rate) || rate < 1 || rate > 100) {
      return res.status(400).json({ message: 'Tỷ lệ hoa hồng phải nằm từ 1% đến 100%' });
    }

    const updated = FileDatabase.updateUser(req.params.id, { commissionRate: rate });
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy cộng tác viên.' });
    }

    res.json({ message: 'Đã thay đổi tỷ lệ hoa hồng nền của CTV thành: ' + rate + '%', user: updated });
  });

  // --- REFERRALS SYSTEM ENDPOINTS ---

  // GET: Lấy danh sách mã giới thiệu / link giới thiệu (Đo lường & tracking cho admin hoặc CTV)
  app.get('/api/referrals', authMiddleware, (req: any, res) => {
    const refs = FileDatabase.getReferrals();
    if (req.user.role === 'CTV') {
      const filtered = refs.filter(r => r.ctvId === req.user.id);
      return res.json(filtered);
    }
    res.json(refs);
  });

  // POST: Tạo mã giới thiệu mới (Cho CTV hoặc Admin)
  app.post('/api/referrals', authMiddleware, (req: any, res) => {
    const { code, targetType, targetId } = req.body;
    if (!code || !targetType || !targetId) {
      return res.status(400).json({ message: 'Vui lòng cung cấp mã code, loại đối tượng (ROOM/PROPERTY) và ID.' });
    }

    const cleanCode = code.trim().replace(/\s+/g, '_');
    const existing = FileDatabase.getReferralByCode(cleanCode);
    if (existing) {
      return res.status(400).json({ message: 'Mã giới thiệu này đã tồn tại trên hệ thống. Vui lòng chọn mã khác!' });
    }

    let targetName = '';
    if (targetType === 'ROOM') {
      const room = FileDatabase.getRoomById(targetId);
      if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng mục tiêu.' });
      targetName = room.name;
    } else {
      const prop = FileDatabase.getPropertyById(targetId);
      if (!prop) return res.status(404).json({ message: 'Không tìm thấy khu lưu trú mục tiêu.' });
      targetName = prop.name;
    }

    const newRef: ReferralLink = {
      id: 'ref_' + Math.random().toString(36).substr(2, 9),
      code: cleanCode,
      ctvId: req.user.id,
      ctvName: req.user.name,
      targetType,
      targetId,
      targetName,
      clicks: 0,
      bookingsCreated: 0,
      bookingsCompleted: 0,
      createdAt: new Date().toISOString()
    };

    FileDatabase.createReferral(newRef);
    res.status(201).json(newRef);
  });

  // POST: Tăng click khi truy cập link giới thiệu (Public endpoint, không cần auth)
  app.post('/api/referrals/public/:code/click', (req, res) => {
    const success = FileDatabase.trackReferralClick(req.params.code);
    if (!success) {
      return res.status(404).json({ message: 'Mã giới thiệu không tồn tại.' });
    }
    res.json({ message: 'Đã tracking click hoàn tất.' });
  });

  // GET: Lấy thông tin chi tiết qua mã giới thiệu (Public endpoint, không cần auth)
  app.get('/api/referrals/public/:code', (req, res) => {
    const referral = FileDatabase.getReferralByCode(req.params.code);
    if (!referral) {
      return res.status(404).json({ message: 'Không tìm thấy mã giới thiệu.' });
    }
    res.json(referral);
  });

  // --- LIVE ALERTS FEED ---
  app.get('/api/live-alerts', (req, res) => {
    res.json(recentLiveAlerts);
  });

  // --- GEMINI COLLABORATOR SALES RECOMMENDATIONS ---
  app.post('/api/recommendations/gemini', authMiddleware, async (req: any, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          message: 'Hệ thống chưa cấu hình Khóa API (GEMINI_API_KEY) trong Settings > Secrets. Vui lòng liên hệ Admin để thiết lập.' 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Get CTV's bookings
      const bookings = FileDatabase.getBookings().filter(b => b.ctvId === req.user.id && b.status === 'APPROVED');
      const allProperties = FileDatabase.getProperties();
      const allRooms = FileDatabase.getRooms();

      // Formulate behavior analysis
      const ctvName = req.user.name;
      const ctvCommissionRate = req.user.commissionRate;
      
      const prompt = `Bạn là trợ lý AI thông minh phân tích hiệu suất phòng và tối ưu hóa doanh thu StayHub / VietVilla.
Hãy phân tích tài nguyên hệ thống và hành vi đặt phòng lịch sử của Cộng tác viên (CTV) sau đây để cung cấp:
1. Đánh giá phân khúc khách hàng mục tiêu mà CTV này đang hướng tới (ví dụ: gia đình, cặp đôi phượt, khách nghỉ dưỡng hạng sang, nhóm bạn trẻ, v.v.).
2. Danh sách 3-4 khu lưu trú rải rác tối ưu nhất (trong kho có sẵn) mà CTV nên tập trung quảng bá kèm lý do chi tiết (giá CTV tốt, hoa hồng cao, xu hướng thị trường mùa hè, v.v.).
3. Lời khuyên/Chiến lược hành động tiếp theo để CTV chốt đơn (ví dụ: tận dụng link giới thiệu, đẩy mạnh chương trình gì, v.v.).

THÔNG TIN CTV:
- Tên CTV: ${ctvName}
- Tỷ lệ hoa hồng nền: ${ctvCommissionRate}%

ĐƠN ĐẶT PHÒNG THÀNH CÔNG GẦN ĐÂY CỦA CTV:
${JSON.stringify(bookings.map(b => ({
  roomName: b.roomName,
  propertyName: b.propertyName,
  propertyType: b.propertyType,
  nights: b.nights,
  guests: b.guests,
  sellingPrice: b.sellingPrice,
  commissionAmount: b.commissionAmount,
  createdAt: b.createdAt
})))}

DANH SÁCH TẤT CẢ KHU LƯU TRÚ CÓ SẴN (PROPERTIES):
${JSON.stringify(allProperties.map(p => ({
  id: p.id,
  name: p.name,
  type: p.type,
  location: p.address,
  description: p.description,
  facilities: p.facilities
})))}

KHO PHÒNG CHI TIẾT (ROOMS) KÈM CHÊNH LỆCH GIÁ:
${JSON.stringify(allRooms.map(r => ({
  id: r.id,
  propertyName: r.propertyName,
  name: r.name,
  originalPrice: r.originalPrice,
  ctvPrice: r.ctvPrice,
  clientPrice: r.clientPrice,
  maxGuests: r.maxGuests,
  marginMarkup: r.clientPrice - r.ctvPrice
})))}

Hãy trả lời ở định dạng JSON để ứng dụng hiển thị một cách đẹp mắt nhất với cấu trúc sau:
{
  "customerSegmentAnalysis": "Chuỗi phân tích chi tiết bằng Tiếng Việt về phân khúc khách hàng mục tiêu của CTV...",
  "recommendations": [
    {
      "propertyId": "Mã khu lưu trú phù hợp",
      "propertyName": "Tên khu lưu trú phù hợp",
      "type": "Loại hình",
      "location": "Địa chỉ",
      "reason": "Giải thích tại sao khu này siêu phù hợp cho CTV quảng bá và kiếm lợi nhuận từ tập khách đối tượng..."
    }
  ],
  "actionStrategy": "Chuỗi đề xuất bằng Tiếng Việt về các hành động thực tiễn..."
}
Chú ý: Luôn trả về thuần định dạng JSON đúng cấu trúc ở trên, KHÔNG bọc trong khối văn bản cỏ, KHÔNG bọc trong thẻ markdown \`\`\`json hoặc bất kỳ ký tự nào khác ngoài JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '{}';
      res.json(JSON.parse(responseText.trim()));

    } catch (err: any) {
      console.error('Lỗi Gemini API:', err);
      res.status(500).json({ message: 'Lỗi khi gọi trí tuệ nhân tạo Gemini để phân tích hành vi.', details: err.message });
    }
  });

  // --- NOTIFICATIONS ---

  app.get('/api/notifications', authMiddleware, (req: any, res) => {
    const notifs = FileDatabase.getNotifications(req.user.id);
    res.json(notifs);
  });

  app.post('/api/notifications/read', authMiddleware, (req: any, res) => {
    FileDatabase.markAllNotificationsAsRead(req.user.id);
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
  });

  // --- STATS OVERVIEW FOR ADMIN DASHBOARD ---
  app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
    try {
      const bookings = FileDatabase.getBookings() || [];
      const ctvs = (FileDatabase.getUsers() || []).filter(u => String(u.role).toUpperCase() === 'CTV');
      const rooms = FileDatabase.getRooms() || [];
      const payouts = FileDatabase.getPayouts() || [];
      const properties = FileDatabase.getProperties() || [];

      const todayStr = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Filter statuses correctly
      const approvedBookings = bookings.filter(b => b.status === 'APPROVED' || b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'COMPLETED');
      
      const totalSales = approvedBookings.reduce((sum, b) => sum + (Number(b.sellingPrice || b.clientPrice || 0)), 0);
      const totalPaidCommission = payouts.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      // Additional precise calculations
      const monthlyRevenue = approvedBookings
        .filter(b => {
          const d = new Date(b.createdAt || b.checkIn);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, b) => sum + (Number(b.sellingPrice || b.clientPrice || 0)), 0);

      const outstandingReceivables = approvedBookings
        .reduce((sum, b) => {
          const totalAmt = Number(b.sellingPrice || b.clientPrice || 0);
          const paidAmt = Number(b.paidAmount !== undefined ? b.paidAmount : totalAmt);
          const remain = Math.max(0, totalAmt - paidAmt);
          return sum + remain;
        }, 0);

      const bookingsToday = bookings.filter(b => b.checkIn === todayStr || (todayStr >= b.checkIn && todayStr <= b.checkOut));
      const bookingsPendingConfirm = bookings.filter(b => b.status === 'PENDING' || b.bookingStatus === 'PENDING_PAYMENT');
      const bookingsPendingPayment = bookings.filter(b => b.paymentStatus === 'unpaid' || b.paymentStatus === 'UNPAID' || b.status === 'PENDING');

      const availableRoomsTodayCount = rooms.filter(r => String(r.status).toLowerCase() === 'available').length;
      const onHoldRoomsCount = rooms.filter(r => String(r.status).toLowerCase() === 'hold' || String(r.status).toLowerCase() === 'on_hold').length;
      const maintenanceRoomsCount = rooms.filter(r => String(r.status).toLowerCase() === 'maintenance').length;

      // Occupancy Rate based on booked rooms today vs total physical rooms
      const totalRoomsCount = rooms.length || 1;
      const occupiedTodayCount = rooms.filter(r => String(r.status).toLowerCase() === 'booked' || String(r.status).toLowerCase() === 'checked_in').length;
      const occupancyRate = Math.min(100, Math.round((occupiedTodayCount / totalRoomsCount) * 100)) || 45; // default reasonable simulated rate if low

      // Top CTVs by generated approved revenue
      const ctvRevenueMap: Record<string, { name: string; email: string; revenue: number; count: number }> = {};
      approvedBookings.forEach(b => {
        if (b.ctvId) {
          if (!ctvRevenueMap[b.ctvId]) {
            ctvRevenueMap[b.ctvId] = {
              name: b.ctvName || 'Cộng tác viên',
              email: '',
              revenue: 0,
              count: 0
            };
          }
          ctvRevenueMap[b.ctvId].revenue += Number(b.sellingPrice || b.clientPrice || 0);
          ctvRevenueMap[b.ctvId].count += 1;
        }
      });
      // Match email
      Object.keys(ctvRevenueMap).forEach(id => {
        const matchingUser = FileDatabase.getUserById(id);
        if (matchingUser) {
          ctvRevenueMap[id].email = matchingUser.email;
        }
      });
      const topCtvs = Object.values(ctvRevenueMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Thống kê doanh thu theo phòng
      const roomRevenue: Record<string, number> = {};
      approvedBookings.forEach(b => {
        const key = b.roomName || 'Phòng không tên';
        roomRevenue[key] = (roomRevenue[key] || 0) + (Number(b.sellingPrice || b.clientPrice || 0));
      });

      const roomSalesChart = Object.entries(roomRevenue).map(([name, value]) => ({
        name,
        value
      }));

      // Operational Alerts
      const alertsList = [];
      
      // Booking sắp check-in (today or tomorrow)
      const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const upcomingCheckIns = bookings.filter(b => (b.checkIn === todayStr || b.checkIn === tomorrowStr) && b.status !== 'CANCELLED' && b.bookingStatus !== 'CANCELLED' && b.bookingStatus !== 'CHECKED_IN');
      upcomingCheckIns.forEach(b => {
        alertsList.push({
          id: `alert_ci_${b.id}`,
          type: 'CHECK_IN_SOON',
          title: `Khách ${b.customerName || 'Ẩn danh'} sắp check-in`,
          message: `Khách đặt phòng "${b.roomName}" vào ${b.checkIn}. LH: ${b.customerPhone || 'N/A'}.`,
          severity: 'HIGH'
        });
      });

      // Booking chưa thanh toán
      const unpaidOverdue = bookings.filter(b => (b.status === 'APPROVED' || b.bookingStatus === 'CONFIRMED') && (b.paymentStatus === 'UNPAID' || b.paymentStatus === 'unpaid'));
      unpaidOverdue.forEach(b => {
        alertsList.push({
          id: `alert_pay_${b.id}`,
          type: 'UNPAID_BOOKING',
          title: `Đơn chưa thanh toán: ${b.bookingCode || b.id}`,
          message: `Booking của ${b.customerName || 'N/A'} chưa hoàn tất thanh toán (${(b.sellingPrice || 0).toLocaleString('vi-VN')} đ)`,
          severity: 'WARNING'
        });
      });

      // Phòng chưa dọn (cleaning or housekeepingStatus is dirty)
      const dirtyRooms = rooms.filter(r => String(r.status).toLowerCase() === 'cleaning' || String(r.housekeepingStatus).toLowerCase() === 'dirty');
      dirtyRooms.forEach(r => {
        alertsList.push({
          id: `alert_clean_${r.id}`,
          type: 'ROOM_DIRTY',
          title: `Phòng chưa dọn: ${r.name || r.roomName || r.id}`,
          message: `Phòng tại cơ sở "${r.propertyName || 'Hệ thống'}" đang bẩn hoặc chờ nhân viên buồng dọn dẹp.`,
          severity: 'INFO'
        });
      });

      res.json({
        totalSales,
        totalPaidCommission,
        activeCTVs: ctvs.length,
        pendingCTVs: ctvs.filter(c => c.status === 'PENDING').length,
        totalRooms: rooms.length,
        pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
        recentBookings: bookings.slice(0, 5),
        roomSalesChart,
        
        // Extended operations statistics
        bookingsToday: bookingsToday.length,
        bookingsPendingConfirm: bookingsPendingConfirm.length,
        bookingsPendingPayment: bookingsPendingPayment.length,
        availableRoomsToday: availableRoomsTodayCount,
        onHoldRooms: onHoldRoomsCount,
        maintenanceRooms: maintenanceRoomsCount,
        monthlyRevenue,
        outstandingReceivables,
        occupancyRate,
        topCtvs,
        alertsList: alertsList.slice(0, 10)
      });
    } catch (err: any) {
      console.error('Error in GET /api/admin/stats:', err);
      res.status(500).json({ message: 'Lỗi hệ thống khi tải thống kê', details: err.message });
    }
  });

  // Mount Vite middleware for SPA development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
}

startServer();
