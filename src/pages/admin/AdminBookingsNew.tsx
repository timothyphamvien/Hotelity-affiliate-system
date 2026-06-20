import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Room, Property, Customer } from '../../types';
import { Calendar, User, DollarSign, CheckCircle, Copy, ArrowRight, ArrowLeft, Search, Layers, Sparkles, Check } from 'lucide-react';

export function AdminBookingsNew() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Customers data for Step 3 auto-selection
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // STEP 1 & 2 Configs
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [propertyId, setPropertyId] = useState('ALL');
  const [search, setSearch] = useState('');

  // Selected Room
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // STEP 3 Client Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerIdentity, setCustomerIdentity] = useState('');
  const [guests, setGuests] = useState('2');
  const [note, setNote] = useState('');

  // STEP 4 Surcharges / Adjustments
  const [priceOverride, setPriceOverride] = useState('0');
  const [surcharge, setSurcharge] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [servicesSelected, setServicesSelected] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('bank_transfer');

  // STEP 5 Created Booking Receipt
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Populate properties and customers list
    api.getProperties().then(setProperties).catch(console.error);
    api.getCustomers().then(setAvailableCustomers).catch(console.error);
    
    // Set default check-in/out to today/tomorrow
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    setCheckIn(today.toISOString().split('T')[0]);
    setCheckOut(tomorrow.toISOString().split('T')[0]);

    // Handle quick-booking customer redirect from Customer Dossier page
    const raw = sessionStorage.getItem('pre_selected_booking_customer');
    if (raw) {
      try {
        const c = JSON.parse(raw);
        if (c && c.fullName) {
          setCustomerName(c.fullName);
          setCustomerPhone(c.phone || '');
          setCustomerEmail(c.email || '');
          setCustomerIdentity(c.identityNumber || '');
          setCustomerSearchQuery(c.fullName);
          alert(`⚡ Chế độ Đặt Phòng Nhanh: Đã tự động đối chiếu thông tin cho Khách Hàng: "${c.fullName}". Vui lòng chọn Ngày nghỉ và Phòng trống để trực tiếp lên đơn!`);
        }
        sessionStorage.removeItem('pre_selected_booking_customer');
      } catch (err) {
        console.error('Lỗi phân tích cú pháp liên kết khách sỉ:', err);
      }
    }
  }, []);

  // Filter available rooms in Step 1/2
  const handleSearchAvailableRooms = async () => {
    if (!checkIn || !checkOut) {
      alert('Vui lòng chọn ngày Check-in và Check-out hợp lệ.');
      return;
    }
    const days = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) {
      alert('Giờ check-out phải lớn hơn giờ check-in ít nhất 1 đêm!');
      return;
    }

    try {
      setLoadingRooms(true);
      // Calls rooms lookup with dates to resolve real-time availability filters
      const list = await api.getRooms({
        checkIn,
        checkOut,
        search: propertyId !== 'ALL' ? getPropertyName(propertyId) : search
      });
      setRooms(list);
      setStep(2);
    } catch (err: any) {
      alert(err.message || 'Lỗi kiểm tra lịch phòng trống.');
    } finally {
      setLoadingRooms(false);
    }
  };

  const getPropertyName = (pId: string) => {
    const p = properties.find(x => x.id === pId);
    return p ? p.name : '';
  };

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setPriceOverride(String(room.clientPrice));
    setStep(3);
  };

  const calculateDays = () => {
    if (!checkIn || !checkOut) return 1;
    const diff = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const calculateTotal = () => {
    const override = Number(priceOverride) || (selectedRoom ? selectedRoom.clientPrice : 0);
    const nights = calculateDays();
    const baseTotal = override * nights;
    const addOns = Number(surcharge) - Number(discount);
    return Math.max(0, baseTotal + addOns);
  };

  const handleCreateBooking = async () => {
    if (!customerName || !customerPhone) {
      alert('Vui lòng nhập tên khách hàng và số điện thoại liên hệ!');
      setStep(3);
      return;
    }

    const nights = calculateDays();
    const baseTotal = calculateTotal();

    const payload = {
      roomId: selectedRoom!.id,
      customerName,
      customerPhone,
      checkIn,
      checkOut,
      guests: Number(guests),
      sellingPrice: baseTotal,
      note: `${note} - CCCD: ${customerIdentity}`.trim(),
      services: servicesSelected,
      paymentMethod: paymentMethod.toUpperCase() as any
    };

    try {
      setSubmitting(true);
      
      // Double check active overlap on the client-side for immediate visual warning
      const allBookings = await api.getBookings();
      const targetStart = new Date(checkIn);
      const targetEnd = new Date(checkOut);
      
      const overlap = allBookings.find(b => {
        if (b.status === 'CANCELLED' || b.bookingStatus === 'CANCELLED') return false;
        if (b.roomId !== selectedRoom!.id) return false;
        
        const bStart = new Date(b.checkIn);
        const bEnd = new Date(b.checkOut);
        return targetStart < bEnd && bStart < targetEnd;
      });
      
      if (overlap) {
        alert(`🚨 Trùng lịch đặt phòng! Phòng này đã được đặt trong khoảng bạn chọn bởi khách "${overlap.customerName}" (${overlap.customerPhone}) từ ngày ${overlap.checkIn} đến ${overlap.checkOut}. Vui lòng quay lại bước 1 chọn ngày hoặc phòng trống khác.`);
        setSubmitting(false);
        setStep(1);
        return;
      }

      const booking = await api.createBooking(payload);
      setCreatedBooking({
        ...booking,
        bookingCode: `STAY2026-${Math.round(1000 + Math.random() * 8999)}`
      });
      setStep(5);
      window.dispatchEvent(new CustomEvent('room-status-updated'));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo lịch đặt phòng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyTicket = (ticketText: string) => {
    navigator.clipboard.writeText(ticketText);
    alert('Đã sao chép mẫu xác nhận đặt phòng thành công!');
  };

  const getTicketString = () => {
    if (!createdBooking) return '';
    return `=== VIETVILLA BOOKING TICKET ===
Mã Giữ Chỗ: ${createdBooking.bookingCode}
Cơ Sở: ${createdBooking.propertyName || selectedRoom?.propertyName}
Phòng: ${createdBooking.roomName || selectedRoom?.name}
Khách Hàng: ${customerName} (${customerPhone})
Thời Gian: ${checkIn} -> ${checkOut} (${calculateDays()} Đêm)
Số Khách: ${guests} Người Lớn
Phương Thức Thanh Toán: ${paymentMethod.toUpperCase()}
Số Tiền Cần Cọc/Thanh Toán: ${calculateTotal().toLocaleString('vi-VN')} đ
Xin quý khách vui lòng thanh toán theo thời gian quy định để giữ phòng.
================================`;
  };

  const getStepClass = (s: number) => {
    if (step === s) return 'bg-indigo-600 text-white font-black';
    if (step > s) return 'bg-emerald-500 text-white';
    return 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="admin-booking-wizard-workspace">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">⚡ Lên Đơn Đặt Phòng Trực Tiếp</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quy trình 5 bước thông minh kiểm tra lịch trống, báo giá, phụ thu và tạo mã booking chốt giữ chỗ nhanh cho CTV.
        </p>
      </div>

      {/* Steps Visual Progress Tracker */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
        {[
          { label: 'Kiểm lịch', icon: Calendar },
          { label: 'Chọn phòng', icon: Layers },
          { label: 'Thông tin khách', icon: User },
          { label: 'Báo giá phụ thu', icon: DollarSign },
          { label: 'Chốt đơn', icon: CheckCircle }
        ].map((item, idx) => {
          const sNum = idx + 1;
          const Icon = item.icon;
          return (
            <React.Fragment key={idx}>
              <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 text-center sm:text-left">
                <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs transition duration-200 ${getStepClass(sNum)}`}>
                  {step > sNum ? '✓' : sNum}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${step === sNum ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </div>
              {idx < 4 && <span className="h-0.5 w-6 sm:w-12 bg-slate-100"></span>}
            </React.Fragment>
          );
        })}
      </div>

      {/* Real form step views */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        
        {/* STEP 1: Check Dates and Property Availability */}
        {step === 1 && (
          <div className="space-y-5 animate-scale-up">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <span>Bước 1: Chọn Lịch Trống & Cơ Sở Nghỉ Dưỡng</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Ngày nhận phòng (Check-in)</label>
                <input
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Ngày trả phòng (Check-out)</label>
                <input
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Cơ sở lưu trú</label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-bold"
                >
                  <option value="ALL">Tất cả Cơ sở nghỉ dưỡng</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Mã hoặc từ khóa</label>
                <input
                  type="text"
                  placeholder="Ví dụ: BUNGALOW..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSearchAvailableRooms}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg inline-flex items-center space-x-2 transition cursor-pointer"
              >
                <span>Kiểm Tra Lịch Trống</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Choose Room physically */}
        {step === 2 && (
          <div className="space-y-5 animate-scale-up">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                <span>Bước 2: Tìm Thấy ({rooms.length}) Phòng Trống Phù Hợp</span>
              </h3>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded">
                Lịch: {checkIn} ➔ {checkOut} ({calculateDays()} đêm)
              </span>
            </div>

            {rooms.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="font-semibold text-xs">Rất tiếc! Mọi căn phòng/biệt thự vào thời gian đã chọn đều đã bị lấp kín.</p>
                <button onClick={() => setStep(1)} className="text-xs font-bold text-indigo-600 mt-2 hover:underline">Hãy đổi dải ngày tìm kiếm</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map(room => (
                  <div key={room.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold block">🏠 {room.propertyName}</span>
                      <h4 className="font-bold text-slate-800 text-sm">{room.roomName || room.name}</h4>
                      <p className="text-slate-500 text-xs line-clamp-1">{room.description}</p>
                      
                      <div className="text-[10px] font-mono text-slate-500 pt-1 space-x-2">
                        <span>Max {room.maxGuests} người</span>
                        <span>|</span>
                        <span>Sàn CTV {room.ctvPrice?.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between items-center">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-medium">Bán khách tiêu chuẩn</span>
                        <b className="text-slate-800 text-sm font-mono">{room.clientPrice.toLocaleString('vi-VN')}đ</b>
                      </div>
                      <button
                        onClick={() => handleSelectRoom(room)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-colors"
                      >
                        Chọn phòng 🔑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-lg inline-flex items-center space-x-2 cursor-pointer transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Trở Về</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Client detailed profile information */}
        {step === 3 && (
          <div className="space-y-5 animate-scale-up">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <User className="h-5 w-5 text-indigo-600" />
              <span>Bước 3: Ghi Nhận Hồ Sơ Thông Tin Khách Hàng</span>
            </h3>

            {selectedRoom && (
              <div className="bg-indigo-50/80 p-3 px-4 rounded-lg text-xs text-indigo-900 font-medium">
                Sản phẩm đang chọn: <b>{selectedRoom.roomName || selectedRoom.name}</b> trực thuộc <b>{selectedRoom.propertyName}</b>
              </div>
            )}

            {/* Quick Customer Search Suggestion box */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 relative">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-700 uppercase block">🔍 Chọn nhanh khách hàng cũ từ danh bạ</label>
                {customerName && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setCustomerName('');
                      setCustomerPhone('');
                      setCustomerEmail('');
                      setCustomerIdentity('');
                      setCustomerSearchQuery('');
                    }}
                    className="text-[10px] text-red-500 hover:underline font-bold"
                  >
                    Xóa Trống Điền Mới
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nhập tên hoặc số điện thoại khách hàng cũ..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium"
                />
                
                 {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 shadow-lg rounded-md z-30 divide-y divide-slate-100">
                    {(customerSearchQuery.trim() === '' ? availableCustomers.slice(0, 5) : availableCustomers.filter(c => 
                      c.fullName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                      c.phone.includes(customerSearchQuery)
                    )).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCustomerName(c.fullName);
                          setCustomerPhone(c.phone);
                          setCustomerEmail(c.email || '');
                          setCustomerIdentity(c.identityNumber || '');
                          setCustomerSearchQuery(c.fullName);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left p-2 hover:bg-slate-100 text-xs flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{c.fullName}</span>
                          <span className="text-slate-400 text-[10px] ml-2">({c.phone})</span>
                        </div>
                        {c.tags && c.tags.length > 0 && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                            {c.tags[0]}
                          </span>
                        )}
                      </button>
                    ))}
                    {customerSearchQuery.trim() !== '' && availableCustomers.filter(c => 
                      c.fullName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                      c.phone.includes(customerSearchQuery)
                    ).length === 0 && (
                      <div className="p-2 text-center text-slate-400 text-xs">
                        Không tìm thấy dữ liệu. Hệ thống sẽ tạo liên kết khách này khi tạo đơn!
                      </div>
                    )}
                  </div>
                )}
              </div>
              {showCustomerDropdown && (
                <button
                  type="button"
                  onClick={() => setShowCustomerDropdown(false)}
                  className="absolute right-2 top-2 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                >
                  Đóng [x]
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Họ và tên khách hàng *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Hải"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Số điện thoại liên lạc *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0912..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Thư điện tử (Email)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="khachhang@gmail.com"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Căn cước công dân (Xác thực check-in)</label>
                <input
                  type="text"
                  value={customerIdentity}
                  onChange={(e) => setCustomerIdentity(e.target.value)}
                  placeholder="CCCD/Hộ chiếu phòng hờ..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Tổng số khách</label>
                <input
                  type="number"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Yêu cầu/Ghi chú vận hành hành khách sạn</label>
                <input
                  type="text"
                  placeholder="Cần giường phụ, trà chiều, đón muộn..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-lg inline-flex items-center space-x-2 cursor-pointer transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Trở Về</span>
              </button>
              <button
                onClick={() => {
                  if (!customerName || !customerPhone) {
                    alert('Bạn phải điền Họ tên và Số điện thoại khách!');
                    return;
                  }
                  setStep(4);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg inline-flex items-center space-x-2 transition cursor-pointer"
              >
                <span>Thiết Lập Giá bán & Surcharge</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Pricing breakdown adjusting */}
        {step === 4 && (
          <div className="space-y-5 animate-scale-up">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              <span>Bước 4: Thiết Lập Báo Giá Bán & Sức Thu Thêm Phí</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs font-medium text-slate-600">
              <p>Khách hàng: <span className="font-bold text-slate-800">{customerName}</span> | Điện thoại: <span className="font-bold font-mono text-slate-800">{customerPhone}</span></p>
              <p>Lịch: <span className="font-bold text-slate-800">{checkIn} ➔ {checkOut}</span> ({calculateDays()} đêm) | Phòng: <span className="font-bold text-slate-800">{selectedRoom?.name}</span></p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Override giá phòng / đêm *</label>
                <input
                  type="number"
                  value={priceOverride}
                  onChange={(e) => setPriceOverride(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Phụ thu dịch vụ khác (Surcharge)</label>
                <input
                  type="number"
                  value={surcharge}
                  onChange={(e) => setSurcharge(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono text-emerald-600 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Chiết khấu/Giảm giá (Discount)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono text-rose-600 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Phương thức thanh toán thương lượng</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-bold"
                >
                  <option value="bank_transfer">Chuyển khoản (Ưu tiên)</option>
                  <option value="cash">Tiền mặt khi check-in</option>
                  <option value="card">Thẻ tín dụng/POS</option>
                </select>
              </div>

              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-indigo-700 block uppercase font-bold">Tổng tiền báo khách</span>
                  <span className="text-lg font-black text-indigo-950 font-mono">{calculateTotal().toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="text-right text-[10px] text-indigo-700 font-medium">
                  <p>Mức cọc phòng ước tính: {(calculateTotal() * 0.3).toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-lg inline-flex items-center space-x-2 cursor-pointer transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Trở Về</span>
              </button>
              <button
                onClick={handleCreateBooking}
                disabled={submitting}
                className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-6 rounded-lg inline-flex items-center space-x-2 transition cursor-pointer shadow-md"
              >
                <span>{submitting ? 'Vui lòng chờ...' : 'Duyệt Chốt Đơn Đặt'}</span>
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Creation success and Invoice copy templates */}
        {step === 5 && createdBooking && (
          <div className="space-y-5 animate-scale-up text-center max-w-lg mx-auto py-4">
            <div className="h-14 w-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-2xl mx-auto shadow-sm">
              ✓
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-lg">Chốt Giữ Chỗ Thành Công! 🎉</h3>
              <p className="text-xs text-slate-500">Mã đơn hàng và vé đã được tạo thành công trên hệ thống đồng bộ.</p>
            </div>

            <div className="bg-slate-50/90 p-4.5 rounded-xl border border-slate-150/70 text-left font-mono text-[11px] text-slate-700 whitespace-pre overflow-x-auto leading-relaxed max-h-56">
              {getTicketString()}
            </div>

            <div className="pt-2 flex justify-center space-x-3 text-xs">
              <button
                onClick={() => handleCopyTicket(getTicketString())}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg inline-flex items-center space-x-2 transition cursor-pointer shadow"
              >
                <Copy className="h-4 w-4" />
                <span>Copy Vé Gửi Khách/CTV</span>
              </button>

              <button
                onClick={() => {
                  // RESET STATE
                  setStep(1);
                  setSelectedRoom(null);
                  setCustomerName('');
                  setCustomerPhone('');
                  setCustomerEmail('');
                  setCustomerIdentity('');
                  setNote('');
                  setCreatedBooking(null);
                }}
                className="bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                Thêm đơn mới 🔄
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
