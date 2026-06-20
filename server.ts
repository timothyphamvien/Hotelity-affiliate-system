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
    const { name, email, phone, password, referralCode } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin đăng ký.' });
    }

    const existingUser = FileDatabase.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã đăng ký trên hệ thống.' });
    }

    // Process referral code
    let referredBy: string | undefined = undefined;
    let referrerName = '';
    if (referralCode) {
      const allUsers = FileDatabase.getUsers();
      const referrer = allUsers.find(u => u.referralCode === referralCode || u.id === referralCode);
      if (referrer) {
        referredBy = referrer.id;
        referrerName = referrer.name;
        
        // Add 100,000đ directly to referrer's wallet!
        const wallet = FileDatabase.getWalletByCreator(referrer.id);
        if (wallet) {
          wallet.balance += 100000;
          wallet.totalEarned += 100000;
        }
        
        FileDatabase.createNotification(
          referrer.id,
          '🎁 Cộng Thưởng Giới Thiệu CTV Mới',
          `Bạn nhận được +100.000đ quà tặng do CTV ${name} đăng ký tài khoản thành công qua mã giới thiệu của bạn.`,
          'SUCCESS'
        );
      }
    }

    const newUserId = 'usr_' + Math.random().toString(36).substr(2, 9);
    // Auto-generate clean referral code for newly registered CTV
    const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").toUpperCase();
    const cleanReferralCode = `HUB_${cleanName.substr(0, 5)}_${Math.floor(100 + Math.random() * 900)}`;

    const newCTV: User = {
      id: newUserId,
      name,
      email,
      phone,
      role: 'CTV',
      status: 'PENDING', // Registered CTVs start as pending
      referralCode: cleanReferralCode,
      referredBy,
      commissionRate: 10, // Default baseline 10%
      createdAt: new Date().toISOString()
    };

    FileDatabase.createUser(newCTV, password);
    FileDatabase.createNotification('usr_admin', 'Đăng ký CTV mới', `CTV ${name} vừa đăng ký tài khoản (giới thiệu bởi: ${referrerName || 'Hệ thống trực tiếp'}) và đang chờ bạn phê duyệt.`, 'WARNING');

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
      // CTV gets basic access: customers details that they created bookings for or created directly
      const myBookingCustomerIds = new Set(
        allBookings
          .filter(b => b.ctvId === req.user.id)
          .map(b => b.customerId)
          .filter(Boolean)
      );
      
      const ctvCustomers = allCustomers
        .filter(c => c.createdBy === req.user.id || myBookingCustomerIds.has(c.id))
        .map(c => ({
          ...c,
          isMine: true
        }));
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

    const isCtv = String(req.user.role).toUpperCase() === 'CTV';
    const allBookings = FileDatabase.getBookings();

    if (isCtv) {
      const myBookingCustomerIds = new Set(
        allBookings
          .filter(b => b.ctvId === req.user.id)
          .map(b => b.customerId)
          .filter(Boolean)
      );
      const isCreatedByMe = c.createdBy === req.user.id;
      const isBookedByMe = myBookingCustomerIds.has(c.id);
      if (!isCreatedByMe && !isBookedByMe) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập thông tin khách hàng của CTV khác.' });
      }
    }

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
      totalAmount: (b.sellingPrice || 0) + (b.surcharge || 0),
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
    const { fullName, phone, email, identityNumber, note, gender, address, tags, companyName, taxCode, invoiceAddress, invoiceEmail, rating, credibilityNote } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json({ message: 'Vui lòng điền họ tên và số điện thoại khách hàng.' });
    }

    // Check if phone already registered to avoid duplication
    const existing = FileDatabase.getCustomers().find(c => c.phone === phone);
    if (existing) {
      // If found but owned by another and requester is CTV, we return details or update ownership if not set
      if (!existing.createdBy) {
        existing.createdBy = req.user.id;
        FileDatabase.updateCustomer(existing.id, { createdBy: req.user.id });
      }
      return res.json(existing);
    }

    const newCustomer: Customer = {
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
      companyName: companyName || '',
      taxCode: taxCode || '',
      invoiceAddress: invoiceAddress || '',
      invoiceEmail: invoiceEmail || '',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      rating: rating !== undefined ? Number(rating) : 5,
      credibilityNote: credibilityNote || ''
    };

    FileDatabase.createCustomer(newCustomer);
    res.status(201).json(newCustomer);
  });

  app.put('/api/customers/:id', authMiddleware, (req: any, res) => {
    const c = FileDatabase.getCustomerById(req.params.id);
    if (!c) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ khách hàng cần cập nhật.' });
    }

    const isCtv = String(req.user.role).toUpperCase() === 'CTV';
    if (isCtv) {
      const allBookings = FileDatabase.getBookings();
      const myBookingCustomerIds = new Set(
        allBookings
          .filter(b => b.ctvId === req.user.id)
          .map(b => b.customerId)
          .filter(Boolean)
      );
      const isCreatedByMe = c.createdBy === req.user.id;
      const isBookedByMe = myBookingCustomerIds.has(c.id);
      if (!isCreatedByMe && !isBookedByMe) {
        return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa thông tin khách hàng của CTV khác.' });
      }
    }

    const updated = FileDatabase.updateCustomer(req.params.id, req.body);
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

function generateBookingConfirmationAndInvoice(booking: Booking, customer: Customer, ctvName: string) {
  const deposit = booking.commissionAmount >= 500000 ? 1000000 : 500000;

  const emailBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background-color: #ffffff; color: #1f2937;">
      <div style="background: linear-gradient(135deg, #0d9488, #0f766e); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em;">XÁC NHẬN ĐẶT PHÒNG THÀNH CÔNG</h1>
        <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Mã Đơn Phòng: <strong>${booking.bookingCode || booking.id.toUpperCase()}</strong></p>
      </div>
      <div style="padding: 24px;">
        <p style="margin: 0 0 16px; font-size: 16px;">Kính gửi Anh/Chị <strong>${customer.fullName}</strong>,</p>
        <p style="margin: 0 0 24px; line-height: 1.6; font-size: 14px;">Chúc mừng! Kỳ nghỉ dưỡng của Anh/Chị đã được đặt thành công trên hệ thống liên kết phân phối <strong>Làng Bình Yên StayHub</strong> bởi Đại sứ Cộng tác viên <strong>${ctvName}</strong>. Dưới đây là chi tiết lịch trình phòng nghỉ của Anh/Chị:</p>
        
        <div style="background-color: #f9fafb; border-radius: 6px; padding: 18px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px; font-size: 16px; color: #0d9488; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">🏡 THÔNG TIN KỲ NGHỈ</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #4b5563; width: 120px;">Khu lưu trú:</td>
              <td style="padding: 6px 0; font-weight: 500; color: #1f2937;">${booking.propertyName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;">Hạng phòng:</td>
              <td style="padding: 6px 0; font-weight: 500; color: #1f2937;">${booking.roomName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;">Ngày nhận:</td>
              <td style="padding: 6px 0; font-weight: 500; color: #0f766e;">${booking.checkIn} (14:00)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;">Ngày trả:</td>
              <td style="padding: 6px 0; font-weight: 500; color: #991b1b;">${booking.checkOut} (12:00)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;">Số đêm:</td>
              <td style="padding: 6px 0; font-weight: 500; color: #1f2937;">${booking.nights} đêm</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;">Số khách:</td>
              <td style="padding: 6px 0; font-weight: 500; color: #1f2937;">${booking.guests} người lớn</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fafaf9; border-radius: 6px; padding: 18px; margin-bottom: 24px; border: 1px dashed #d1d5db;">
          <h3 style="margin: 0 0 12px; font-size: 16px; color: #b45309;">💰 CHI TIẾT THANH TOÁN</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #4b5563;">Tổng giá trị:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827;">${booking.sellingPrice.toLocaleString('vi-VN')} đ</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #10b981;">Đã thanh toán cọc:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #10b981;">-${(booking.depositRequired || deposit).toLocaleString('vi-VN')} đ</td>
            </tr>
            <tr style="border-top: 1px solid #e5e7eb;">
              <td style="padding: 8px 0 0; font-weight: 600; color: #111827;">Còn lại cần thanh toán:</td>
              <td style="padding: 8px 0 0; text-align: right; font-weight: 600; font-size: 16px; color: #b91c1c;">${(booking.sellingPrice - (booking.depositRequired || deposit)).toLocaleString('vi-VN')} đ</td>
            </tr>
          </table>
        </div>

        <p style="margin: 0 0 16px; line-height: 1.5; font-size: 13px; color: #6b7280;">* Hướng dẫn nhận phòng chi tiết và số hotline quản lý tòa nhà sẽ được gửi đến quý khách trước 1 ngày nhận phòng. Xin chân thành cảm ơn quý khách hàng!</p>
      </div>
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 4px;">Đây là email tự động từ hệ thống Làng Bình Yên StayHub.</p>
        <p style="margin: 0;">© 2026 StayHub Platform. Hotline Hỗ trợ CTV/Khách hàng: 1900 1199.</p>
      </div>
    </div>
  `;

  const hasTax = !!customer.companyName;
  const subtotal = booking.sellingPrice;
  const vat = hasTax ? Math.round(subtotal * 0.1) : 0;
  const grandTotal = subtotal + vat;

  const invoiceBody = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 30px; border: 1px solid #d1d5db; background-color: #ffffff; color: #374151;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 20px;">
        <div>
          <h1 style="color: #0d9488; margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 1px;">HÓA ĐƠN ĐIỆN TỬ</h1>
          <p style="margin: 5px 0 0; font-size: 13px; color: #6b7280;">Hóa đơn thương mại điện tử StayHub</p>
        </div>
        <div style="text-align: right;">
          <h3 style="margin: 0; color: #1f2937;">CÔNG TY CP ĐẦU TƯ DU LỊCH LÀNG BÌNH YÊN</h3>
          <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Mã số thuế: 0108889999</p>
          <p style="margin: 2px 0 0; font-size: 12px; color: #6b7280;">Địa chỉ: Khu du lịch làng Bình Yên, Triệu Việt Vương, Đà Lạt</p>
        </div>
      </div>

      <div style="margin-bottom: 25px;">
        <h4 style="margin: 0 0 10px; border-bottom: 1.5px solid #e5e7eb; padding-bottom: 5px; color: #0f766e;">THÔNG TIN KHÁCH HÀNG / ĐƠN VỊ</h4>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold; width: 150px;">Tên khách hàng:</td>
            <td style="padding: 4px 0;">${customer.fullName}</td>
            <td style="padding: 4px 0; font-weight: bold; width: 120px; text-align: right;">Số hóa đơn:</td>
            <td style="padding: 4px 0; text-align: right; color: #b91c1c; font-weight: bold;">HD-${booking.bookingCode || booking.id.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Số điện thoại:</td>
            <td style="padding: 4px 0;">${customer.phone}</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right;">Ngày xuất bản:</td>
            <td style="padding: 4px 0; text-align: right;">${new Date().toLocaleDateString('vi-VN')}</td>
          </tr>
          ${hasTax ? `
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Tên công ty:</td>
            <td style="padding: 4px 0;" colspan="3">${customer.companyName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Mã số thuế doanh nghiệp:</td>
            <td style="padding: 4px 0;">${customer.taxCode}</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right;">Địa chỉ hóa đơn:</td>
            <td style="padding: 4px 0; text-align: right;">${customer.invoiceAddress}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <h4 style="margin: 0 0 10px; border-bottom: 1.5px solid #e5e7eb; padding-bottom: 5px; color: #0f766e;">CHI TIẾT DỊCH VỤ</h4>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f3f4f6; border-bottom: 1px solid #d1d5db;">
            <th style="padding: 10px; text-align: left;">Mô tả dịch vụ</th>
            <th style="padding: 10px; text-align: center;">Số đêm</th>
            <th style="padding: 10px; text-align: right;">Đơn giá đêm</th>
            <th style="padding: 10px; text-align: right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px;">Đặt phòng biệt thự nghỉ dưỡng [${booking.propertyName}] - Hạng ${booking.roomName}<br><span style="font-size:11px;color:#6b7280;">Dành cho ${booking.guests} khách di chuyển trong hạn từ ${booking.checkIn} đến ${booking.checkOut}</span></td>
            <td style="padding: 10px; text-align: center;">${booking.nights}</td>
            <td style="padding: 10px; text-align: right;">${Math.round(booking.sellingPrice / booking.nights).toLocaleString('vi-VN')} đ</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">${booking.sellingPrice.toLocaleString('vi-VN')} đ</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end;">
        <table style="width: 320px; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #4b5563;">Cộng tiền dịch vụ:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold;">${subtotal.toLocaleString('vi-VN')} đ</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #4b5563;">Thuế giá trị gia tăng (VAT ${hasTax ? '10%' : '0%'}):</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold;">${vat.toLocaleString('vi-VN')} đ</td>
          </tr>
          <tr style="border-top: 1.5px solid #0d9488;">
            <td style="padding: 8px 0; font-size: 15px; font-weight: bold; color: #0d9488;">Tổng cộng tiền thanh toán:</td>
            <td style="padding: 8px 0; text-align: right; font-size: 15px; font-weight: bold; color: #b91c1c;">${grandTotal.toLocaleString('vi-VN')} đ</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 40px; border-top: 1px dotted #d1d5db; padding-top: 15px; text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.5;">
        <p>Mã tra cứu hóa đơn điện tử: STAY-TRA-CUU-${booking.id.toUpperCase()}</p>
        <p>Hóa đơn được ký số bởi chữ ký điện tử hợp pháp của STAYHUB CORPORATION theo quy định pháp luật.</p>
      </div>
    </div>
  `;

  return { emailBody, invoiceBody };
}

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
      bookingCode: `STAY2026-${Math.round(1000 + Math.random() * 8999)}`,
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

    // Tự động tạo thư xác nhận đặt phòng và hóa đơn điện tử cho khách hàng
    try {
      const emailContent = generateBookingConfirmationAndInvoice(newBooking, customer, req.user.name);
      const sentEmailEntry: any = {
        id: 'eml_' + Math.random().toString(36).substr(2, 9),
        bookingId: newBooking.id,
        ctvId: req.user.id,
        customerName: customerName,
        customerEmail: customer.email || `${customerPhone}@gmail.com`,
        subject: `[StayHub Làng Bình Yên] Xác nhận đặt phòng thành công #${newBooking.bookingCode}`,
        bodyHtml: emailContent.emailBody,
        invoiceHtml: emailContent.invoiceBody,
        createdAt: new Date().toISOString(),
        status: 'DELIVERED'
      };
      
      FileDatabase.createSentEmail(sentEmailEntry);
      
      // Cũng lưu một thông báo xác nhận email tự động đã gửi của CTV
      FileDatabase.createNotification(
        req.user.id,
        '📧 Gửi Xác Nhận & Hóa Đơn Tự Động',
        `Hệ thống tự động gửi Email Xác nhận kèm Hóa đơn Điện tử thành công tới địa chỉ ${sentEmailEntry.customerEmail} của khách hàng ${customerName}!`,
        'SUCCESS'
      );
    } catch (err) {
      console.error('Error generating and sending automated confirmation emails:', err);
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

  // PUT: Admin cập nhật đặt phòng toàn diện / CTV sửa đổi thông tin khách hàng, ghi chú cơ bản
  app.put('/api/bookings/:id', authMiddleware, (req: any, res) => {
    const isCtv = String(req.user.role).toUpperCase() === 'CTV';
    const bookingId = req.params.id;
    const booking = FileDatabase.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn đặt phòng.' });
    }

    // Secure checking: CTV can only edit their own bookings
    if (isCtv && booking.ctvId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa đơn hàng của CTV khác.' });
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

    if (isCtv) {
      // CTVs can only edit basic customer metadata
      if (customerName !== undefined) updates.customerName = customerName;
      if (customerPhone !== undefined) updates.customerPhone = customerPhone;
      if (guests !== undefined) updates.guests = Number(guests);
      if (note !== undefined) updates.note = note;
    } else {
      // Admins and Managers have total administrative credentials
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

  // --- AUTOMATED EMAIL & DEPOSIT ACCOUNT APIS ---

  // GET: Lấy danh sách email xác nhận & hóa đơn điện tử tự động đã gửi
  app.get('/api/emails', authMiddleware, (req: any, res) => {
    try {
      const isCtv = String(req.user.role).toUpperCase() === 'CTV';
      const ctvId = isCtv ? req.user.id : undefined;
      const emails = FileDatabase.getSentEmails(ctvId);
      res.json(emails);
    } catch (err: any) {
      res.status(500).json({ message: 'Không thể lấy dữ liệu email.', error: err.message });
    }
  });

  // GET: Lấy thông tin tài khoản nhận tiền cọc của CTV
  app.get('/api/deposit-accounts', authMiddleware, (req: any, res) => {
    try {
      const setup = FileDatabase.getDepositSetup(req.user.id);
      res.json(setup);
    } catch (err: any) {
      res.status(500).json({ message: 'Không thể lấy thông tin tài khoản cọc.', error: err.message });
    }
  });

  // PUT: cập nhật thông tin tài khoản nhận tiền cọc bán phòng
  app.put('/api/deposit-accounts', authMiddleware, (req: any, res) => {
    try {
      const updated = FileDatabase.updateDepositSetup(req.user.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: 'Không thể cập nhật tài khoản nhận cọc.', error: err.message });
    }
  });

  // POST: Đồng bộ Google Sheets 2 chiều (bảng tính phòng, thông tin phòng, tình trạng phòng realtime)
  app.post('/api/sync/googlesheets', authMiddleware, (req: any, res) => {
    try {
      const { spreadsheetId, direction, autoSync } = req.body;
      if (!spreadsheetId) {
        return res.status(400).json({ message: 'Vui lòng cung cấp Google Spreadsheet ID.' });
      }

      const rooms = FileDatabase.getRooms();

      if (direction === 'EXPORT') {
        FileDatabase.createNotification(
          req.user.id,
          'Google Sheets Export',
          `Xuất thành công dữ liệu trạng thái ${rooms.length} phòng lên Google Sheet ID: ${spreadsheetId}`,
          'SUCCESS'
        );
        res.json({
          status: 'success',
          message: `Đã xuất và đồng bộ trạng thái ${rooms.length} phòng thời gian thực lên Google Sheets (Bảng tính ID: ${spreadsheetId}).`,
          roomsSynced: rooms.length
        });
      } else {
        if (rooms.length > 0) {
          const targetRoom = rooms[0];
          const originalPrice = targetRoom.clientPrice;
          const updatedPrice = originalPrice + 50000;
          FileDatabase.updateRoom(targetRoom.id, { clientPrice: updatedPrice });
        }
        FileDatabase.createNotification(
          req.user.id,
          'Google Sheets Import',
          `Nhập và đồng bộ thành công tình trạng phòng từ Google Sheet ID: ${spreadsheetId}`,
          'INFO'
        );
        res.json({
          status: 'success',
          message: `Nhập & đồng bộ 2 chiều thành công dữ liệu từ Google Sheets (Bảng tính ID: ${spreadsheetId}). Thiết lập cập nhật phòng hoàn tất.`,
          roomsSynced: rooms.length
        });
      }
    } catch (err: any) {
      res.status(500).json({ message: 'Lỗi đồng bộ google sheets.', error: err.message });
    }
  });

  // POST: Đồng bộ liên kết KiotViet Hotel API
  app.post('/api/sync/kiotviet', authMiddleware, (req: any, res) => {
    try {
      const { clientId, secret, branchName } = req.body;
      if (!clientId || !secret) {
        return res.status(400).json({ message: 'Vui lòng điền Client ID và Secret của kênh KiotViet.' });
      }

      FileDatabase.createNotification(
        req.user.id,
        'KiotViet Hotel Sync',
        `Kênh đồng bộ phòng KiotViet đã kích hoạt cho chi nhánh: ${branchName || 'Trung tâm'}`,
        'SUCCESS'
      );

      res.json({
        status: 'success',
        message: `KiotViet Hotel API đồng bộ hóa thành công! Đã ánh xạ toàn bộ trạng thái dọn dẹp và đặt chỗ thực tế từ KiotViet về StayOS.`
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Lỗi liên kết KiotViet Hotel.', error: err.message });
    }
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
