import express, { Request, Response } from 'express';

// ============================================================================
// STAYOS MICROSERVICES BACKEND SKELETON
// ============================================================================
// Express & TypeScript router representing the decoupled microservice REST handlers
// with robust transactional integrity and event-driven architectures.
// ============================================================================

const router = express.Router();

// Mock Internal database for API demonstration 
interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'staff' | 'ctv';
  status: 'active' | 'suspended';
  referralCode?: string;
}

interface Room {
  id: string;
  roomCode: string;
  roomName: string;
  currentStatus: 'available' | 'hold' | 'booked' | 'cleaning' | 'maintenance';
  basePrice: number;
}

interface Booking {
  id: string;
  bookingCode: string;
  customerName: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  sellingPrice: number;
  status: 'PENDING' | 'APPROVED' | 'CANCELLED';
  paymentStatus: 'unpaid' | 'deposit_paid' | 'paid';
}

// ----------------------------------------------------------------------------
// MODULE 1: IAM SERVICE (Auth, registration, CTV controls)
// ----------------------------------------------------------------------------

/**
 * CTV Registration via Referral Link Code
 */
router.post('/api/users/ctv/register', (req: Request, res: Response) => {
  const { email, password, fullName, referralCode } = req.body;
  
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Missing mandatory account credentials.' });
  }

  // Simulated relational integrity check
  const generatedReferralCode = 'CTV' + Math.floor(Math.random() * 100000);
  const newUser: User = {
    id: `usr_${Math.random().toString(36).substr(2, 9)}`,
    email,
    fullName,
    role: 'ctv',
    status: 'active',
    referralCode: generatedReferralCode
  };

  return res.status(201).json({
    message: 'CTV Account created successfully. Welcome to StayOS Partner network!',
    user: newUser,
    referralCodeUsed: referralCode || null
  });
});

/**
 * Access JWT verification simulation
 */
router.get('/api/users/profile', (req: Request, res: Response) => {
  res.json({
    id: 'usr_admin123',
    email: 'admin@stayos.vn',
    fullName: 'Quản trị viên StayOS',
    role: 'admin',
    status: 'active'
  });
});


// ----------------------------------------------------------------------------
// MODULE 2: PMS / ROOM CATALOG SERVICE
// ----------------------------------------------------------------------------

const mockRooms: Room[] = [
  { id: 'r1', roomCode: 'R101', roomName: 'Bungalow Hoa Đào', currentStatus: 'available', basePrice: 1200000 },
  { id: 'r2', roomCode: 'R102', roomName: 'Bungalow Sườn Đồi', currentStatus: 'hold', basePrice: 1500000 },
  { id: 'r3', roomCode: 'R103', roomName: 'Deluxe Room', currentStatus: 'cleaning', basePrice: 850000 }
];

/**
 * GET current snapshot of rooms
 */
router.get('/api/rooms', (req: Request, res: Response) => {
  res.json({
    success: true,
    total: mockRooms.length,
    data: mockRooms
  });
});

/**
 * PATCH Room state (e.g. Clean complete, Maintenance locked)
 */
router.patch('/api/rooms/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'available' | 'hold' | 'booked' | 'cleaning' | 'maintenance'

  const foundRoom = mockRooms.find(r => r.id === id);
  if (!foundRoom) {
    return res.status(404).json({ success: false, error: 'Target room code was not found.' });
  }

  // Pessimistic transaction lock simulation
  foundRoom.currentStatus = status;

  return res.json({
    success: true,
    message: `Room ${foundRoom.roomCode} state updated to ${status}. Broadcasted CDC event to Kafka topics.`,
    room: foundRoom
  });
});


// ----------------------------------------------------------------------------
// MODULE 3: RESERVATIONS / BOOKINGS SERVICE
// ----------------------------------------------------------------------------

const mockBookings: Booking[] = [
  {
    id: 'b1',
    bookingCode: 'STAY-179830',
    customerName: 'Kiều Anh Thư',
    roomId: 'r1',
    checkIn: '2026-06-25',
    checkOut: '2026-06-27',
    sellingPrice: 2400000,
    status: 'PENDING',
    paymentStatus: 'unpaid'
  }
];

/**
 * GET current reservations (Filterable by Role)
 */
router.get('/api/bookings', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockBookings
  });
});

/**
 * POST reservation under strict availability checks
 */
router.post('/api/bookings', (req: Request, res: Response) => {
  const { customerName, roomId, checkIn, checkOut, sellingPrice } = req.body;

  if (!customerName || !roomId || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'Missing mandatory reservation details.' });
  }

  // Simulation of PostgreSQL double booking transaction check:
  // SELECT EXISTS(SELECT 1 FROM bookings WHERE room_id = roomId AND check_out > checkIn AND check_in < checkOut AND booking_status != 'CANCELLED')
  const isConflict = false; // Simulated response

  if (isConflict) {
    return res.status(409).json({
      error: 'Room occupancy conflict. Dates already occupied by another tenant lock.'
    });
  }

  const newBooking: Booking = {
    id: `bk_${Math.random().toString(36).substr(2, 9)}`,
    bookingCode: 'STAY-' + Math.floor(100000 + Math.random() * 899999),
    customerName,
    roomId,
    checkIn,
    checkOut,
    sellingPrice,
    status: 'PENDING',
    paymentStatus: 'unpaid'
  };

  mockBookings.push(newBooking);

  res.status(201).json({
    success: true,
    message: 'Booking hold created successfully. Pending deposit verification payment payload',
    data: newBooking
  });
});


// ----------------------------------------------------------------------------
// MODULE 4: PAYMENT AND INVOICES SERVICE
// ----------------------------------------------------------------------------

/**
 * POST Process Webhook payload (Bank Transfer / Momo Callback API)
 */
router.post('/api/payments/webhook', (req: Request, res: Response) => {
  const { transactionId, amount, transactionContent, code } = req.body;

  // 1. Audit transaction log persistence
  // INSERT INTO payments (transaction_reference, amount, verified_at, is_successful) VALUES (...)

  // 2. Correlate booking from description content (e.g., STAY-179830)
  const matchedBooking = mockBookings.find(b => b.bookingCode === code);
  if (!matchedBooking) {
    return res.status(404).json({
      success: false,
      error: `Could not correlate payment transaction for content ${transactionContent}. Logged to orphan transactions.`
    });
  }

  // 3. Mark invoice and state paid
  matchedBooking.paymentStatus = 'paid';
  matchedBooking.status = 'APPROVED';

  // 4. Trigger Outbox CDC point allocation in db_loyalty as downstream event
  
  return res.json({
    success: true,
    transactionId,
    amountProcessed: amount,
    bookingAssociated: matchedBooking.bookingCode,
    status: 'APPROVED_AND_SYNCED'
  });
});

export default router;
