import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Booking, Room, Property } from '../../types';
import { 
  CheckCircle, XCircle, Clock, Search, Eye, AlertCircle, Calendar,
  HelpCircle, Copy, FileSpreadsheet, ListTodo, UserCheck, CheckSquare, 
  Sparkles, DollarSign, RefreshCw, Bookmark, CreditCard, ChevronRight, Edit3, X, HelpCircle as HelpIcon
} from 'lucide-react';

export function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterProperty, setFilterProperty] = useState('ALL');
  const [filterBookingStatus, setFilterBookingStatus] = useState('ALL');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('ALL');

  // Selected Booking Details modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Interactive 3-touches active confirmation modal
  const [activeActionModal, setActiveActionModal] = useState<{
    type: 'approve' | 'full_payment' | 'checkout' | 'cancel' | 'checkin';
    booking: Booking;
  } | null>(null);

  // Rejection modal
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  
  // Quick Edit Form (Change Room/Change Dates)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editRoomId, setEditRoomId] = useState('');
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('0');
  const [editPaidAmount, setEditPaidAmount] = useState('0');
  const [editTotalSurcharge, setEditTotalSurcharge] = useState('0');
  const [editNote, setEditNote] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [bList, rList, pList] = await Promise.all([
        api.getBookings(),
        api.getRooms(),
        api.getProperties()
      ]);
      setBookings(bList);
      setRooms(rList);
      setProperties(pList);
    } catch (err) {
      console.error('Error fetching admin bookings stack:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    alert(`Đã sao chép: ${txt}`);
  };

  // 3-Touches Operations Confirmer (Zero-popup client execution)
  const executeActiveAction = async () => {
    if (!activeActionModal) return;
    const { type, booking } = activeActionModal;
    const id = booking.id;

    try {
      setSubmitting(true);
      if (type === 'approve') {
        await api.updateBookingStatus(id, 'APPROVED');
        await api.updateBooking(id, { 
          paymentStatus: 'deposit_paid', 
          bookingStatus: 'confirmed' 
        });
        alert('🎉 Duyệt cọc đặt phòng và giải ngân hoa hồng thành phần công!');
      } else if (type === 'full_payment') {
        await api.updateBooking(id, { 
          paymentStatus: 'paid',
          paidAmount: booking.sellingPrice + (booking.surcharge || 0)
        });
        alert('💰 Tất toán hóa đơn (Đã thu đủ 100%) thành công!');
      } else if (type === 'checkin') {
        await api.updateBooking(id, { bookingStatus: 'checked_in' });
        alert('🔑 Làm thủ tục nhận phòng (Check-in) thành công!');
      } else if (type === 'checkout') {
        await api.updateBooking(id, { bookingStatus: 'checked_out' });
        alert('🚪 Thủ tục trả phòng (Check-out) thành công! Kho phòng đã chuyển sang trạng thái chờ dọn dẹp.');
      } else if (type === 'cancel') {
        await api.updateBooking(id, { 
          bookingStatus: 'cancelled', 
          paymentStatus: 'unpaid' 
        });
        alert('❌ Hủy bỏ đơn hàng thành công, lịch phòng đã được giải phóng.');
      }

      setActiveActionModal(null);
      setSelectedBooking(null);
      await fetchAllData();
      window.dispatchEvent(new CustomEvent('room-status-updated'));
    } catch (err: any) {
      alert('Không thể thực thi lệnh: ' + (err.message || 'Lỗi kết nối database'));
    } finally {
      setSubmitting(false);
    }
  };

  // Operation 2: Confirm Từ Chối Duyệt Cọc
  const handleRejectDeposit = async (id: string) => {
    if (!rejectionReasonInput.trim()) {
      alert('Vui lòng cung cấp lý do từ chối cho CTV!');
      return;
    }
    try {
      setSubmitting(true);
      await api.updateBookingStatus(id, 'CANCELLED', rejectionReasonInput);
      await api.updateBooking(id, {
        bookingStatus: 'cancelled',
        paymentStatus: 'unpaid'
      });
      setSelectedBooking(null);
      setRejectionReasonInput('');
      setShowRejectForm(false);
      await fetchAllData();
      window.dispatchEvent(new CustomEvent('room-status-updated'));
      alert('Đã từ chối duyệt đơn thành công.');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xử lý từ chối.');
    } finally {
      setSubmitting(false);
    }
  };

  // Operation 7: Mở bảng thay đổi dọn bàn cờ (Đổi phòng, đổi ngày, cập nhật sỉ lẻ)
  const openEditModal = (b: Booking) => {
    setEditingBooking(b);
    setEditRoomId(b.roomId);
    setEditCheckIn(b.checkIn);
    setEditCheckOut(b.checkOut);
    setEditCustomerName(b.customerName);
    setEditCustomerPhone(b.customerPhone);
    setEditSellingPrice(String(b.sellingPrice || 0));
    setEditPaidAmount(String(b.paidAmount || 0));
    setEditTotalSurcharge(String(b.surcharge || 0));
    setEditNote(b.note || '');
    setIsEditModalOpen(true);
  };

  // Operation 8: Lưu thông số sửa đặt phòng (Đổi phòng, đổi sỉ)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    try {
      setSubmitting(true);

      const checkInDate = new Date(editCheckIn);
      const checkOutDate = new Date(editCheckOut);
      const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (nights <= 0) {
        alert('Yêu cầu ngày nhận (Check-in) phải trước ngày trả (Check-out)!');
        return;
      }

      const updates: any = {
        roomId: editRoomId,
        checkIn: editCheckIn,
        checkOut: editCheckOut,
        nights,
        customerName: editCustomerName,
        customerPhone: editCustomerPhone,
        sellingPrice: Number(editSellingPrice),
        paidAmount: Number(editPaidAmount),
        totalSurcharge: Number(editTotalSurcharge),
        note: editNote
      };

      await api.updateBooking(editingBooking.id, updates);
      setIsEditModalOpen(false);
      setEditingBooking(null);
      await fetchAllData();
      window.dispatchEvent(new CustomEvent('room-status-updated'));
      alert('Cập nhật thay đổi dọn dẹp thông tin đặt phòng thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi xử lý lưu chỉnh sửa.');
    } finally {
      setSubmitting(false);
    }
  };

  // Computed Filters
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = !search ||
      (b.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.customerPhone || '').includes(search) ||
      (b.roomName || b.roomId || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.ctvName || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.id || '').toLowerCase().includes(search.toLowerCase());

    const matchedRoom = rooms.find(r => r.id === b.roomId);
    const matchesProp = filterProperty === 'ALL' || (matchedRoom && matchedRoom.propertyId === filterProperty);

    // Filter Booking Statuses
    const realBookingStatus = b.bookingStatus || (b.status === 'APPROVED' ? 'confirmed' : 'pending');
    const matchesBookingStatus = filterBookingStatus === 'ALL' || realBookingStatus === filterBookingStatus;

    // Filter Payment Statuses
    const realPaymentStatus = b.paymentStatus || (b.status === 'APPROVED' ? 'paid' : 'unpaid');
    const matchesPaymentStatus = filterPaymentStatus === 'ALL' || realPaymentStatus === filterPaymentStatus;

    return matchesSearch && matchesProp && matchesBookingStatus && matchesPaymentStatus;
  });

  return (
    <div className="space-y-6" id="admin-bookings-operations-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🛒 Quản Lý Đơn Đặt Phòng & Vận Hành</h1>
          <p className="text-sm text-slate-500 mt-1">
            Điều phối toàn bộ vòng đời đặt phòng: Duyệt cọc CTV, Check-In, Check-Out tự động dọn dẹp, đổi phòng (dọn bàn cờ) và kiểm toán công nợ còn thiếu.
          </p>
        </div>
      </div>

      {/* Control filters bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Keyword searching */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="🔍 Tìm nhanh: Số điện thoại, ID, Tên người dùng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-450 hover:text-slate-650 text-xs font-bold cursor-pointer"
              >
                ✕ Xóa
              </button>
            )}
          </div>

          {/* Properties selecting */}
          <div>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="text-xs w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-700 cursor-pointer"
            >
              <option value="ALL">🏢 Tất cả Cơ sở / Homestay</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Booking State Selection */}
          <div>
            <select
              value={filterBookingStatus}
              onChange={(e) => setFilterBookingStatus(e.target.value)}
              className="text-xs w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-700 cursor-pointer"
            >
              <option value="ALL">🛎️ Tất cả trạng thái Booking</option>
              <option value="pending">Chờ phê duyệt (Pending)</option>
              <option value="confirmed">Đã đặt cọc (Confirmed)</option>
              <option value="checked_in">Đang lưu trú (Checked In)</option>
              <option value="checked_out">Đã rời phòng (Checked Out)</option>
              <option value="cancelled">Đã hủy bỏ (Cancelled)</option>
            </select>
          </div>

          {/* Payment State Selection */}
          <div>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="text-xs w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-700 cursor-pointer"
            >
              <option value="ALL">💰 Mọi tình trạng thanh toán</option>
              <option value="unpaid">Chưa thanh toán</option>
              <option value="deposit_paid">Đã cọc một phần</option>
              <option value="paid">Đã tất toán toàn bộ</option>
              <option value="refunded">Đã hoàn cọc trả lại</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Badges (3-Touches Interactive Model) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100/70">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3F7D58]"></span> Chọn nhanh trạng thái đơn cấu hình:
          </span>
          {[
            { value: 'ALL', label: '📋 Hết mọi trạng thái' },
            { value: 'pending', label: '⏳ Chờ duyệt cọc' },
            { value: 'confirmed', label: '✅ Đã đặt cọc' },
            { value: 'checked_in', label: '🛎️ Đang lưu trú' },
            { value: 'checked_out', label: '🧹 Đã rời phòng & Dọn' },
            { value: 'cancelled', label: '❌ Đã hủy' },
          ].map(chip => (
            <button
              key={chip.value}
              onClick={() => setFilterBookingStatus(chip.value)}
              className={`px-3 py-1 text-[11px] font-black rounded-full transition cursor-pointer ${
                filterBookingStatus === chip.value 
                  ? 'bg-indigo-650 text-white shadow-xs' 
                  : 'bg-slate-100 hover:bg-slate-250 text-slate-650'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <span className="p-3 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-400">
          <ListTodo className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-sm">Chưa có hồ sơ đặt phòng nào phù hợp.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const realStatus = b.bookingStatus || (b.status === 'APPROVED' ? 'confirmed' : 'pending');
            const realPayStatus = b.paymentStatus || (b.status === 'APPROVED' ? 'paid' : 'unpaid');
            const paid = b.paidAmount || (realPayStatus === 'paid' ? b.sellingPrice + (b.surcharge || 0) : realPayStatus === 'deposit_paid' ? Math.round(b.sellingPrice * 0.5) : 0);
            const totalBill = b.sellingPrice + (b.surcharge || 0);
            const unpaidDebt = Math.max(0, totalBill - paid);

            return (
              <div 
                key={b.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-3xs p-6 hover:shadow-xs transition duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Visual info column */}
                <div className="space-y-3.5 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-650 px-2.5 py-0.5 rounded">
                      ID: {b.id.toUpperCase()}
                    </span>
                    
                    {/* Booking Status badges */}
                    <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      realStatus === 'checked_in' ? 'bg-orange-100 text-orange-850' :
                      realStatus === 'checked_out' ? 'bg-slate-100 text-slate-700' :
                      realStatus === 'confirmed' ? 'bg-emerald-100 text-emerald-800 animate-pulse' :
                      realStatus === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      🛰️ {realStatus === 'checked_in' ? 'ĐANG LƯU TRÚ' : 
                          realStatus === 'checked_out' ? 'ĐA CHECKOUT' :
                          realStatus === 'confirmed' ? 'ĐÃ CỌC' :
                          realStatus === 'cancelled' ? 'ĐÃ HỦY ĐƠN' : 'CHỜ DUYỆT CỌC'}
                    </span>

                    {/* Payment Status badges */}
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                      realPayStatus === 'paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                      realPayStatus === 'deposit_paid' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      💰 {realPayStatus === 'paid' ? 'ĐÃ ĐỦ TIỀN' : realPayStatus === 'deposit_paid' ? 'ĐÃ ĐẶT CỌC' : 'CHƯA THANH TOÁN'}
                    </span>

                    <span className="text-xs text-slate-400">
                      Đại lý: <strong className="text-indigo-600 font-bold">{b.ctvName || 'Admin'}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-medium text-xs text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Biểu trưng đại diện</span>
                      <p className="font-extrabold text-slate-800 text-sm mt-0.5">{b.customerName}</p>
                      <button 
                        onClick={() => handleCopy(b.customerPhone)}
                        className="text-xs font-mono text-indigo-650 hover:underline inline-flex items-center mt-1"
                      >
                        📞 {b.customerPhone} <Copy className="h-3 w-3 ml-1 text-slate-400" />
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Mã nền tảng homestay</span>
                      <p className="font-extrabold text-slate-850 text-sm mt-0.5">{b.roomName}</p>
                      <p className="text-slate-500 font-mono mt-0.5">🗓️ {b.checkIn} đến {b.checkOut} ({b.nights || 1} đêm)</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Toán học tổng bill</span>
                      <p className="font-extrabold text-slate-850 text-sm mt-0.5">{totalBill.toLocaleString('vi-VN')} đ</p>
                      <div className="mt-1 flex flex-col space-y-0.5 text-[11px] text-slate-500">
                        <span>Đã thu: <strong className="text-emerald-600">{(paid || 0).toLocaleString('vi-VN')} đ</strong></span>
                        {unpaidDebt > 0 && (
                          <span>Còn thiếu (Cơ hữu nợ): <strong className="text-rose-600">{(unpaidDebt).toLocaleString('vi-VN')} đ</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {b.note && (
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 text-[11px] text-slate-500 leading-normal">
                      📌 Ghi chú: {b.note}
                    </div>
                  )}
                </div>

                {/* Operations active buttons sidebar */}
                <div className="flex flex-wrap md:flex-col items-stretch justify-end gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-6 min-w-[200px] border-t pt-4 md:pt-0">
                  <div className="text-center md:text-right mb-2 font-medium">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hoa hồng CTV</span>
                    <span className="text-base font-black text-emerald-600 block mt-0.5">
                      +{b.commissionAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2 w-full">
                    {/* Operation check: Review PENDING CTV booking */}
                    {realStatus === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowRejectForm(false);
                          setRejectionReasonInput('');
                        }}
                        className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase rounded-lg transition text-center cursor-pointer shadow-2xs items-center justify-center inline-flex"
                      >
                        <CheckSquare className="h-3.5 w-3.5 mr-1" />
                        Duyệt cọc đơn
                      </button>
                    )}

                    {/* Operation check: Check-in */}
                    {realStatus === 'confirmed' && (
                      <button
                        onClick={() => setActiveActionModal({ type: 'checkin', booking: b })}
                        className="py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] uppercase rounded-lg transition text-center cursor-pointer"
                      >
                        🔑 Check-in
                      </button>
                    )}

                    {/* Operation check: Check-out */}
                    {realStatus === 'checked_in' && (
                      <button
                        onClick={() => setActiveActionModal({ type: 'checkout', booking: b })}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] uppercase rounded-lg transition text-center cursor-pointer"
                      >
                        🚪 Check-out
                      </button>
                    )}

                    {/* Operation check: Fulfill full payment */}
                    {realPayStatus !== 'paid' && realStatus !== 'cancelled' && (
                      <button
                        onClick={() => setActiveActionModal({ type: 'full_payment', booking: b })}
                        className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-350 font-bold text-[10px] uppercase rounded-lg transition text-center cursor-pointer"
                      >
                        💸 Thu Đủ Tiền
                      </button>
                    )}

                    {/* Edit Room/Dates (dọn bàn cờ / đổi ngày) */}
                    {realStatus !== 'cancelled' && realStatus !== 'checked_out' && (
                      <button
                        onClick={() => openEditModal(b)}
                        className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-250 font-bold text-[10px] uppercase rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Sửa / Đổi Phòng</span>
                      </button>
                    )}

                    {/* Cancel booking option */}
                    {realStatus !== 'cancelled' && realStatus !== 'checked_out' && (
                      <button
                        onClick={() => setActiveActionModal({ type: 'cancel', booking: b })}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-medium text-[10px] uppercase rounded-lg transition text-center cursor-pointer"
                      >
                        Hủy đơn
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Dual review & verify PENDING deposit cọc */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-scale-up">
            
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider bg-rose-700 p-1 px-2.5 rounded font-bold text-rose-100 block w-max">
                  Đối soát tiền cọc: {selectedBooking.id}
                </span>
                <h3 className="font-extrabold text-lg mt-1 block">Xác Minh Booking Chờ Duyệt</h3>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="text-white hover:bg-rose-700 rounded-full h-8 w-8 text-xs flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-800 text-left">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-rose-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[9px]">Cộng tác viên dán nhãn</span>
                  <p className="font-extrabold text-rose-700 text-sm mt-0.5">{selectedBooking.ctvName}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[9px]">Thông tin khách hàng</span>
                  <p className="font-extrabold text-slate-850 text-sm mt-0.5">{selectedBooking.customerName}</p>
                  <p className="font-mono text-slate-500">{selectedBooking.customerPhone}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Cơ sở thuê</span>
                  <span className="font-extrabold text-slate-850 mt-1 block">{selectedBooking.roomName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Check-in / Out</span>
                  <span className="font-mono font-semibold text-slate-800 mt-1 block">
                    {selectedBooking.checkIn} → {selectedBooking.checkOut}
                  </span>
                </div>
              </div>

              {/* Enhanced Pricing analysis block */}
              <div className="p-4 bg-rose-50/20 border border-slate-150 rounded-xl space-y-2.5 text-xs">
                <div className="pb-1 border-b border-rose-100">
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Báo cáo tài chính nội bộ đặt chỗ</span>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-rose-100/50 pb-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold text-[10px]">Tiền vốn (Original):</span>
                    <span className="font-bold text-slate-600 font-mono">{(selectedBooking.originalPrice || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold text-[10px]">Kịch sàn CTV (Wholesale):</span>
                    <span className="font-bold text-slate-800 font-mono">{((selectedBooking.ctvPrice ?? selectedBooking.basePrice) || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-600">Đơn giá CTV thu của khách:</span>
                    <span className="font-mono font-black text-rose-600 text-sm">{(selectedBooking.sellingPrice || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-800 bg-emerald-50 p-2.5 border border-emerald-100 rounded-lg font-extrabold text-[11px]">
                    <span className="flex items-center">💸 Hoa hồng CTV giải ngân sau duyệt:</span>
                    <span className="text-sm font-black font-mono">+{(selectedBooking.commissionAmount || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              </div>

              {/* Rejection input box */}
              {showRejectForm ? (
                <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-xl space-y-2.5 block animate-scale-up">
                  <label className="text-[10px] text-rose-800 font-bold uppercase block">Lý do từ chối (Gửi tin báo tới CTV)</label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: Không nhận được hóa đơn cọc, phòng bị sự cố kỹ thuật..."
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="py-1 px-3 bg-slate-200 hover:bg-slate-300 rounded font-medium text-slate-700"
                    >
                      Hủy và Quay lại
                    </button>
                    <button
                      onClick={() => handleRejectDeposit(selectedBooking.id)}
                      disabled={submitting}
                      className="py-1 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold"
                    >
                      {submitting ? 'Xử lý...' : 'Xác nhận khước từ'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-700 font-bold rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    Không duyệt & Từ chối
                  </button>
                  <button
                    onClick={() => setActiveActionModal({ type: 'approve', booking: selectedBooking })}
                    disabled={submitting}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    {submitting ? 'Đang duyệt...' : '✓ Duyệt Đơn (Nhận cọc)'}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="py-1.5 px-4 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold text-slate-650"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: Change Room / Change Dates (Dọn Bàn Cờ Cổ Điển) */}
      {isEditModalOpen && editingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-scale-up my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                ✏️ Biên Thiết Đổi Phòng & Đổi Ngày (Đơn {editingBooking.id})
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingBooking(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-left text-xs">
                
                {/* Switch room picker (dọn bàn cờ) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-650 uppercase block">Chọn Phòng Vật Lý Thay Thế</label>
                  <select
                    value={editRoomId}
                    onChange={(e) => setEditRoomId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-700"
                  >
                    {rooms.map(r => {
                      const prop = properties.find(p => p.id === r.propertyId);
                      return (
                        <option key={r.id} value={r.id}>
                          🏢 {prop?.name || 'Cơ sở'} - Phòng {r.roomCode} ({r.roomName || r.name}) - Status: {r.status}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Change dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-650 uppercase block">Check-In</label>
                    <input
                      type="date"
                      value={editCheckIn}
                      onChange={(e) => setEditCheckIn(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-650 uppercase block">Check-Out</label>
                    <input
                      type="date"
                      value={editCheckOut}
                      onChange={(e) => setEditCheckOut(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Customer descriptors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-650 uppercase block">Họ Tên Khách</label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-650 uppercase block">Số Điện Thoại</label>
                    <input
                      type="text"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Pricing structure */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-650 uppercase block">Giá bán ban đầu</label>
                    <input
                      type="number"
                      value={editSellingPrice}
                      onChange={(e) => setEditSellingPrice(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-rose-600 font-extrabold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-650 uppercase block">Phụ thu phát sinh</label>
                    <input
                      type="number"
                      value={editTotalSurcharge}
                      onChange={(e) => setEditTotalSurcharge(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-indigo-750 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-650 uppercase block">Thực tế đã thu</label>
                    <input
                      type="number"
                      value={editPaidAmount}
                      onChange={(e) => setEditPaidAmount(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-emerald-700 font-extrabold"
                    />
                  </div>
                </div>

                {/* Additional Note */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-650 uppercase block">Yêu Cầu / Ghi chú đặt phòng</label>
                  <textarea
                    rows={2}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
                  />
                </div>

              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingBooking(null);
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-2xs"
                >
                  {submitting ? 'Đơn lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: 3-Touches Zero-popup Interactive Operation Verifier */}
      {activeActionModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-100/90 animate-scale-up text-left">
            
            {/* Header branding */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-450 animate-ping"></div>
                <span className="text-[10px] font-black tracking-widest text-[#EAC294] uppercase font-mono">
                  Mô hình 3-Touches
                </span>
              </div>
              <button 
                onClick={() => setActiveActionModal(null)}
                className="text-slate-400 hover:text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Validation Panel Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wide">Yêu cầu ủy thác</h4>
                  <p className="text-sm font-extrabold text-slate-800">
                    {activeActionModal.type === 'approve' && 'Phê duyệt cọc đặt chỗ'}
                    {activeActionModal.type === 'full_payment' && 'Xác nhận thu đủ 100%'}
                    {activeActionModal.type === 'checkin' && 'Kích hoạt nhận phòng'}
                    {activeActionModal.type === 'checkout' && 'Xác nhận trả phòng'}
                    {activeActionModal.type === 'cancel' && 'Hủy đơn hoàn trả phòng trống'}
                  </p>
                </div>
              </div>

              {/* Progress Stepper indicators (Atomic Touchpoints) */}
              <div className="p-3 bg-slate-50/85 border border-slate-150 rounded-xl space-y-2">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  Trạng thái xử lý 3 bước:
                </span>
                <div className="flex items-center justify-between font-bold text-[10px] text-slate-500">
                  <div className="flex items-center gap-1 text-emerald-600">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px]">1</span>
                    Chọn lệnh
                  </div>
                  <div className="w-6 h-px bg-slate-200"></div>
                  <div className="flex items-center gap-1 text-indigo-600">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[9px]">2</span>
                    Đối soát
                  </div>
                  <div className="w-6 h-px bg-slate-200"></div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[9px]">3</span>
                    Hoàn tất
                  </div>
                </div>
              </div>

              {/* Info details */}
              <div className="space-y-2.5 text-xs">
                <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Tên khách hàng:</span>
                  <span className="font-extrabold text-slate-800">{activeActionModal.booking.customerName}</span>
                </div>
                <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Cơ sở / Homestay:</span>
                  <span className="font-extrabold text-indigo-750">{activeActionModal.booking.roomName}</span>
                </div>
                <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Quỹ thời gian:</span>
                  <span className="font-semibold text-slate-700 font-mono">
                    {activeActionModal.booking.checkIn} → {activeActionModal.booking.checkOut}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold bg-[#FEF6EC]/30 p-2 border border-[#EAC294]/30 rounded-lg">
                  <span className="text-[#3F7D58] font-extrabold">Giá trị đơn hàng:</span>
                  <span className="font-mono font-black text-rose-600 text-base">
                    {(activeActionModal.booking.sellingPrice || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-450 text-center font-semibold italic bg-slate-50 p-2 rounded-lg">
                * Hành động sẽ cập nhật tức thời dữ liệu an toàn trên hệ thống.
              </p>
            </div>

            {/* Decision panel actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5">
              <button
                onClick={() => setActiveActionModal(null)}
                className="w-1/2 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-650 font-bold rounded-xl text-xs transition cursor-pointer text-center"
              >
                Hủy bỏ
              </button>
              <button
                onClick={executeActiveAction}
                disabled={submitting}
                className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition cursor-pointer text-center shadow-md shadow-slate-900/10 flex items-center justify-center gap-1.5"
              >
                {submitting ? '...' : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>✓ Xác nhận</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
