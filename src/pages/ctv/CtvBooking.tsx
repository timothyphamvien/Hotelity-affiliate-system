import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Room, Property } from '../../types';
import { 
  ArrowLeft, CheckCircle, ShieldAlert, Sparkles, 
  Calendar, User, Phone, Users, Wallet, FileText, Check, Plus, HelpCircle, ArrowRight, Coins
} from 'lucide-react';

interface CtvBookingProps {
  selectedRoom: Room | null;
  initialCheckIn: string;
  initialCheckOut: string;
  onNavigate: (view: string) => void;
}

export function CtvBooking({ selectedRoom, initialCheckIn, initialCheckOut, onNavigate }: CtvBookingProps) {
  if (!selectedRoom) {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800">Chưa Chọn Phòng Đặt</h3>
        <p className="text-slate-500 text-xs mt-1">Vui lòng quay lại trang danh sách phòng và chọn phòng cụ thể để tiếp tục.</p>
        <button
          onClick={() => onNavigate('ctv_rooms')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-700"
        >
          Quay lại Xem Phòng trống
        </button>
      </div>
    );
  }

  // Fetch parent property to display genuine facilities & cancellation policies
  const [property, setProperty] = useState<Property | null>(null);

  // Wizard state: 1 = Dates & Pricing Compare, 2 = Customer details & Services, 3 = Margins & Final Confirmation
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [guests, setGuests] = useState(2);
  const [checkIn, setCheckIn] = useState(initialCheckIn || '');
  const [checkOut, setCheckOut] = useState(initialCheckOut || '');
  
  // Custom selling price. Ground defaults after nights computed.
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Dynamic deposit routing & QR display states
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [depositSetup, setDepositSetup] = useState<any>(null);
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<'CTV' | 'PLATFORM' | 'HOME_OWNER'>('PLATFORM');
  const [customDepositAmount, setCustomDepositAmount] = useState<number>(0);

  // Quick Customer Search & Session integration variables
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    // Populate client database for instant search
    api.getCustomers().then(setAvailableCustomers).catch(console.error);

    // Fetch deposit setup allocation
    api.getDepositAccounts().then((accounts) => {
      if (accounts) {
        setDepositSetup(accounts);
        if (accounts.activeChannel) {
          setSelectedPaymentChannel(accounts.activeChannel);
        }
      }
    }).catch(console.error);

    // Parse preselected client from CRM click redirect
    const raw = sessionStorage.getItem('pre_selected_booking_customer');
    if (raw) {
      try {
        const c = JSON.parse(raw);
        if (c && c.fullName) {
          setCustomerName(c.fullName);
          setCustomerPhone(c.phone || '');
          setCustomerSearchQuery(c.fullName);
          if (c.note) setNote(c.note);
          alert(`⚡ Chế độ Liên Kết Khách Hàng: Đã tự động điền hồ sơ khách sỉ "${c.fullName}". Vui lòng hoàn chỉnh thời gian nghỉ và bước chốt hoa hồng!`);
        }
        sessionStorage.removeItem('pre_selected_booking_customer');
      } catch (err) {
        console.error('Error pre-populating customer in CTV booking:', err);
      }
    }
  }, []);

  // Stay nights & pricing math
  const [nights, setNights] = useState(1);
  const [totalMinCtvCost, setTotalMinCtvCost] = useState(0);
  const [totalSuggestedClientCost, setTotalSuggestedClientCost] = useState(0);
  const [commissionAmount, setCommissionAmount] = useState(0);

  // Load parent property
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const list = await api.getProperties();
        const found = list.find(p => p.id === selectedRoom.propertyId);
        if (found) {
          setProperty(found);
        }
      } catch (err) {
        console.error('Không tải được thông tin khu nghỉ tương ứng:', err);
      }
    };
    fetchProperty();
  }, [selectedRoom]);

  // Recalculate duration & base totals
  useEffect(() => {
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      if (start < end) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setNights(calculatedNights);
        
        const minCtv = selectedRoom.ctvPrice * calculatedNights;
        const suggestRetail = selectedRoom.clientPrice * calculatedNights;
        
        setTotalMinCtvCost(minCtv);
        setTotalSuggestedClientCost(suggestRetail);
        
        // Auto initialize sellingPrice to suggestion price but let CTV adjust it
        setSellingPrice(suggestRetail);
      } else {
        setNights(0);
        setTotalMinCtvCost(0);
        setTotalSuggestedClientCost(0);
        setSellingPrice(0);
      }
    } else {
      setNights(0);
      setTotalMinCtvCost(0);
      setTotalSuggestedClientCost(0);
      setSellingPrice(0);
    }
  }, [checkIn, checkOut, selectedRoom]);

  // Sync real-time commission earnings
  useEffect(() => {
    const earnings = Math.max(0, sellingPrice - totalMinCtvCost);
    setCommissionAmount(earnings);
  }, [sellingPrice, totalMinCtvCost]);

  const handleServiceToggle = (facilityName: string) => {
    if (selectedServices.includes(facilityName)) {
      setSelectedServices(selectedServices.filter(s => s !== facilityName));
    } else {
      setSelectedServices([...selectedServices, facilityName]);
    }
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!checkIn || !checkOut) {
        setErrorMsg('Vui lòng chọn đầy đủ ngày nhận phòng (Check-in) và trả phòng (Check-out).');
        return;
      }
      if (nights <= 0) {
        setErrorMsg('Ngày check-out trả phòng phải diễn ra sau ngày check-in ít nhất 1 đêm.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!customerName.trim()) {
        setErrorMsg('Vui lòng bổ sung họ tên Khách hàng đại diện.');
        return;
      }
      if (!customerPhone.trim()) {
        setErrorMsg('Vui lòng bổ sung Số điện thoại liên lạc chính xác.');
        return;
      }
      if (guests < 1) {
        setErrorMsg('Số lượng khách nghỉ tối thiểu là 1 người.');
        return;
      }
      if (guests > selectedRoom.maxGuests) {
        setErrorMsg(`Sức chứa tối đa của phòng này là ${selectedRoom.maxGuests} người. Không vượt ngưỡng để đảm bảo an ninh phòng.`);
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (nights <= 0) {
      setErrorMsg('Vui lòng cấu hình hợp lệ ngày Check-in trước ngày Check-out.');
      setLoading(false);
      return;
    }

    if (sellingPrice < totalMinCtvCost) {
      setErrorMsg(`Giá bán cho khách hàng không được thấp hơn giá CTV sỉ (${totalMinCtvCost.toLocaleString('vi-VN')} đ) để bảo toàn giá sườn đại lý.`);
      setLoading(false);
      return;
    }

    if (guests > selectedRoom.maxGuests) {
      setErrorMsg(`Số lượng khách hàng (${guests} người) vượt quá sức chứa tối đa thiết kế của phòng (${selectedRoom.maxGuests} người).`);
      setLoading(false);
      return;
    }

    try {
      const resp = await api.createBooking({
        roomId: selectedRoom.id,
        customerName,
        customerPhone,
        checkIn,
        checkOut,
        guests: Number(guests),
        sellingPrice: Number(sellingPrice),
        note,
        services: selectedServices
      });
      
      setCreatedBooking(resp);
      const standardDeposit = Number(sellingPrice) >= 2000000 ? 1000000 : 500000;
      setCustomDepositAmount(standardDeposit);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi gửi yêu cầu đặt chỗ lên hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  // Add margin presets safely
  const adjustPriceByValue = (extra: number) => {
    setSellingPrice(prev => {
      const target = totalMinCtvCost + extra;
      return target >= totalMinCtvCost ? target : totalMinCtvCost;
    });
  };

  const setPriceToSuggested = () => {
    setSellingPrice(totalSuggestedClientCost);
  };

  const setPriceToWholesale = () => {
    setSellingPrice(totalMinCtvCost);
  };

  // Human steps metadata
  const wizardSteps = [
    { num: 1, title: 'Ngày nghỉ & Giá sỉ', desc: 'Chọn ngày & Đối chiếu tỷ suất sỉ/lẻ' },
    { num: 2, title: 'Hồ sơ khách', desc: 'Thông tin đại diện & dịch vụ phụ trợ' },
    { num: 3, title: 'Giá chốt & Gửi đơn', desc: 'Định lượng lợi nhuận hoa hồng' }
  ];

  return (
    <div className="space-y-6" id="ctv-booking-view">
      
      {/* Back button */}
      <div>
        <button
          onClick={() => onNavigate('ctv_rooms')}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Quay lại Bảng khảo sát phòng trống
        </button>
      </div>

      {/* Sleek Step Wizard Indicator */}
      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:divide-x md:divide-slate-200">
          {wizardSteps.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <div 
                key={s.num} 
                className={`flex items-center gap-3 px-3 py-1 text-xs transition ${
                  isActive ? 'text-indigo-805 opacity-100 font-extrabold' : isCompleted ? 'text-emerald-700 opacity-90' : 'text-slate-400 opacity-60'
                }`}
              >
                <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] border shrink-0 ${
                  isCompleted 
                    ? 'bg-emerald-600 text-white border-emerald-650' 
                    : isActive 
                    ? 'bg-indigo-600 text-white border-indigo-650 shadow-sm' 
                    : 'bg-white text-slate-400 border-slate-200'
                }`}>
                  {isCompleted ? '✓' : s.num}
                </div>
                <div>
                  <h4 className="font-extrabold flex items-center gap-1">
                    {s.title}
                    {isActive && <span className="inline-block h-1.5 w-1.5 bg-rose-500 rounded-full animate-ping" />}
                  </h4>
                  <p className="text-[10px] text-slate-405 font-medium leading-tight mt-0.5">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {success ? (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/60 shadow-xl max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-indigo-950 font-display">Gửi Yêu Cầu Đặt Phòng Thành Công!</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Hệ thống đã tạm thời khóa block phòng trên trang chủ để tránh xung đột lịch. Vui lòng hướng dẫn khách thanh toán cọc dưới đây để kích hoạt hóa đơn điện tử tự động!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Booking Details Left Column */}
            <div className="md:col-span-6 space-y-5">
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 text-left">
                <h3 className="text-xs font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <FileText className="h-4 w-4 text-indigo-650" />
                  Thông Tin Hóa Đơn Trị Giá: {Number(sellingPrice).toLocaleString('vi-VN')} đ
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-semibold">Mã đơn phòng:</span>
                    <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{createdBooking?.id || 'Đang tạo...'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-semibold">Khu vực / Biệt thự:</span>
                    <span className="font-bold text-slate-800">{selectedRoom.propertyName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-semibold">Phòng nghỉ:</span>
                    <span className="font-bold text-slate-800">{selectedRoom.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-semibold">Đại diện lưu trú:</span>
                    <span className="font-bold text-slate-800">{customerName} ({customerPhone})</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-650">
                    <span className="font-semibold">Nights check-in:</span>
                    <span className="font-mono font-bold text-indigo-905">{checkIn} ➔ {checkOut}</span>
                  </div>
                </div>
              </div>

              {/* Deposit Customizer */}
              <div className="p-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-4 text-left">
                <span className="text-[10px] text-indigo-700 uppercase font-black tracking-widest block">💰 Điểu Chỉnh Số Tiền Khách Cần Cọc</span>
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCustomDepositAmount(Number(sellingPrice) * 0.3)}
                      className="flex-1 min-w-[70px] py-1 px-2 border border-indigo-200 text-indigo-800 bg-white hover:bg-slate-50 rounded-lg text-[9px] font-bold"
                    >
                      30% ({Math.round(Number(sellingPrice) * 0.3).toLocaleString('vi-VN')}đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDepositAmount(Number(sellingPrice) * 0.5)}
                      className="flex-1 min-w-[70px] py-1 px-2 border border-indigo-200 text-indigo-800 bg-white hover:bg-slate-50 rounded-lg text-[9px] font-bold"
                    >
                      50% ({Math.round(Number(sellingPrice) * 0.5).toLocaleString('vi-VN')}đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDepositAmount(Number(sellingPrice))}
                      className="flex-1 min-w-[70px] py-1 px-2 border border-indigo-200 text-indigo-800 bg-white hover:bg-slate-50 rounded-lg text-[9px] font-bold"
                    >
                      100% Full (Đủ)
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Số tiền cọc tùy biến (đ)</label>
                    <input
                      type="number"
                      step={50000}
                      value={customDepositAmount}
                      onChange={(e) => setCustomDepositAmount(Number(e.target.value))}
                      className="w-full p-2.5 text-xs border border-slate-200 bg-white rounded-lg font-mono font-black text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payee Selection & QR Code Right Column */}
            <div className="md:col-span-6 space-y-4">
              <div className="p-5 border border-slate-200 rounded-3xl space-y-4 text-left shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block text-center">⭐ CHỌN TÀI KHOẢN NHẬN TIỀN CỌC CHUYỂN KHOẢN</span>
                
                {/* Dynamically toggle accounts */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {['CTV', 'PLATFORM', 'HOME_OWNER'].map((ch) => {
                    const isActive = selectedPaymentChannel === ch;
                    const label = ch === 'CTV' ? 'Ví CTV' : ch === 'PLATFORM' ? 'Đại diện' : 'Chủ Home';
                    return (
                      <button
                        type="button"
                        key={ch}
                        onClick={() => setSelectedPaymentChannel(ch as any)}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition ${
                          isActive 
                            ? 'bg-white text-indigo-950 shadow-xs scale-100' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Account card details display */}
                {(() => {
                  let bankName = '';
                  let bankAccount = '';
                  let bankHolder = '';
                  let typeText = '';

                  if (selectedPaymentChannel === 'CTV') {
                    bankName = depositSetup?.ctvAccount?.bankName || '';
                    bankAccount = depositSetup?.ctvAccount?.bankAccount || '';
                    bankHolder = depositSetup?.ctvAccount?.bankHolder || '';
                    typeText = 'Tài khoản cá nhân của bạn (Cộng tác viên)';
                  } else if (selectedPaymentChannel === 'PLATFORM') {
                    bankName = depositSetup?.platformAccount?.bankName || 'VIETINBANK';
                    bankAccount = depositSetup?.platformAccount?.bankAccount || '1122334455';
                    bankHolder = depositSetup?.platformAccount?.bankHolder || 'CONG TY CP LANG BINH YEN';
                    typeText = 'Tài khoản đại diện Nền tảng thương mại';
                  } else {
                    bankName = depositSetup?.homeOwnerAccount?.bankName || '';
                    bankAccount = depositSetup?.homeOwnerAccount?.bankAccount || '';
                    bankHolder = depositSetup?.homeOwnerAccount?.bankHolder || '';
                    typeText = 'Tài khoản chủ khu nghỉ dưỡng / homestay sở tại';
                  }

                  const qrSrc = bankAccount && bankName 
                    ? `https://img.vietqr.io/image/${bankName.replace(/\s+/g, '')}-${bankAccount}-compact2.png?amount=${customDepositAmount}&addInfo=${encodeURIComponent('YEU CAU COC PHONG ' + (createdBooking?.id || ''))}&accountName=${encodeURIComponent(bankHolder)}`
                    : null;

                  return (
                    <div className="space-y-4 font-sans">
                      <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-[11px] text-slate-700 font-medium">
                        <div className="flex justify-between"><b className="text-slate-400">Tuyến đi:</b> <span>{typeText}</span></div>
                        <div className="flex justify-between"><b>Ngân hàng:</b> <span className="font-bold text-indigo-900 uppercase">{bankName || 'Chưa thiết lập'}</span></div>
                        <div className="flex justify-between"><b>Số tài khoản:</b> <span className="font-mono font-bold text-slate-800">{bankAccount || 'Chưa thiết lập'}</span></div>
                        <div className="flex justify-between"><b>Người thụ hưởng:</b> <span className="font-bold uppercase text-slate-800">{bankHolder || 'Chưa thiết lập'}</span></div>
                      </div>

                      {/* QR Display */}
                      {qrSrc ? (
                        <div className="bg-white border rounded-2xl p-4 text-center space-y-2 max-w-[245px] mx-auto shadow-inner">
                          <img 
                            src={qrSrc} 
                            alt="VietQR code" 
                            className="w-full h-auto aspect-square object-contain mx-auto"
                            referrerPolicy="no-referrer"
                          />
                          <p className="text-[10px] text-slate-400 font-mono font-bold leading-tight uppercase">VietQR Quét Mã Tự Động Điền</p>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-semibold">
                          ❌ Bạn chưa cấu hình tài khoản thụ hưởng cho kênh này trong mục "Kênh nhận cọc" tại Trang chủ. Vui lòng thiết lập để kích hoạt VietQR tự động!
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            </div>

          </div>

          {/* Navigation Action Buttons footer */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap justify-center items-center gap-4">
            <button
              onClick={() => onNavigate('ctv_history')}
              className="px-6 py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer uppercase tracking-wider shadow-md"
            >
              📋 Quản lý lịch sử giao dịch
            </button>
            <button
              onClick={() => {
                // Clear state & reload for a fresh order
                setCustomerName('');
                setCustomerPhone('');
                setNote('');
                setSuccess(false);
                setCreatedBooking(null);
                setCurrentStep(1);
              }}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer uppercase tracking-wider"
            >
              ➕ Tạo tiếp đơn khách mới
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
          
          {/* Main reservation workspace wizard */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center">
                <ShieldAlert className="h-4 w-4 mr-1.5 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* STEP 1: Dates & pricing policies auto compare */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">BƯỚC 1 TRONG 3</span>
                  <h3 className="text-lg font-bold text-slate-800">Cấu hình thời gian & Đối chiếu giá sỉ đặc quyền</h3>
                  <p className="text-xs text-slate-450">Chọn thời gian check-in/out và kiểm tra tính chênh lệch so với giá bán lẻ niêm yết của phòng nghỉ.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Check-In Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-650 block mb-1">Ngày check-in (Nhận phòng)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full text-xs pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Check-Out Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-650 block mb-1">Ngày check-out (Trả phòng)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="date"
                        required
                        min={checkIn || new Date().toISOString().split('T')[0]}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full text-xs pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {nights > 0 && (
                  <div className="bg-indigo-50/50 p-2 text-center rounded-lg border border-indigo-100 font-semibold text-xs text-indigo-805">
                    ⏱ Tổng quỹ nghỉ: <strong className="text-indigo-900">{nights} đêm</strong> liên tục
                  </div>
                )}

                {/* AUTOMATIC CTV VS CUSTOMER RATE COMPARISON BOX */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wide block">So sánh Biểu giá Tự động (Hàng ngày & Tích lũy)</span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* CTV wholesale Column */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[10px] font-black uppercase text-indigo-700 block">Ưu đãi CTV Phân Phối Sỉ</span>
                      <p className="text-xs text-slate-500 font-medium">Bản giá gốc áp dụng đại lý sỉ</p>
                      <div className="pt-1.5">
                        <span className="text-slate-400 text-[10px] font-normal">Giá mỗi đêm:</span>
                        <p className="font-extrabold text-slate-800 text-sm font-mono">{selectedRoom.ctvPrice.toLocaleString('vi-VN')} đ</p>
                        {nights > 0 && (
                          <div className="pt-1 border-t border-dashed border-slate-200 mt-1">
                            <span className="text-slate-400 text-[9px] block">Tích lũy {nights} đêm:</span>
                            <span className="font-black text-indigo-700 text-[11px] font-mono">{totalMinCtvCost.toLocaleString('vi-VN')} đ</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Standard Retail Customer Rate Column */}
                    <div className="p-3.5 bg-indigo-50/20 border border-indigo-100 rounded-xl space-y-1">
                      <span className="text-[10px] font-black uppercase text-rose-700 block">Giá Bán Lẻ Kiến Nghị Khách</span>
                      <p className="text-xs text-slate-500 font-medium">Bản giá tiêu chuẩn niêm yết</p>
                      <div className="pt-1.5">
                        <span className="text-slate-400 text-[10px] font-normal">Giá mỗi đêm:</span>
                        <p className="font-extrabold text-slate-800 text-sm font-mono">{selectedRoom.clientPrice.toLocaleString('vi-VN')} đ</p>
                        {nights > 0 && (
                          <div className="pt-1 border-t border-dashed border-slate-200 mt-1">
                            <span className="text-slate-400 text-[9px] block">Tích lũy {nights} đêm:</span>
                            <span className="font-black text-rose-600 text-[11px] font-mono">{totalSuggestedClientCost.toLocaleString('vi-VN')} đ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-150/80 text-xs">
                    <div className="flex gap-2">
                      <Coins className="h-5 w-5 text-amber-500 shrink-0" />
                      <div>
                        <span className="font-black text-emerald-900 block">✨ Biên hoa hồng mặc định thặng dư:</span>
                        <p className="text-[11px] font-medium leading-relaxed mt-0.5">
                          Mức chênh lệch tự nhiên giữa sỉ & lẻ của phòng này là{' '}
                          <strong className="text-emerald-900 font-mono">{(selectedRoom.clientPrice - selectedRoom.ctvPrice).toLocaleString('vi-VN')} đ/đêm</strong>.{' '}
                          {nights > 0 && (
                            <span>
                              Tổng lợi nhuận chênh lệch mặc định nếu giữ giá niêm yết là{' '}
                              <strong className="text-rose-600 font-mono">{(totalSuggestedClientCost - totalMinCtvCost).toLocaleString('vi-VN')} đ</strong>.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-indigo-600 font-bold text-white hover:bg-indigo-750 rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    Tiếp tục: Bổ sung khách hàng <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Customer Details & Accessory Services */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">BƯỚC 2 TRONG 3</span>
                  <h3 className="text-lg font-bold text-slate-800">Điền thông tin Trưởng đoàn & Dịch vụ đi kèm</h3>
                  <p className="text-xs text-slate-450">Thông tin liên hệ của khách hàng dùng để đối soát hợp đồng villa, chìa khóa phòng.</p>
                </div>

                {/* Quick Customer Search Suggestion box for CTV */}
                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/50 space-y-2 relative text-xs text-left">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-black text-slate-700 tracking-wider block">
                      🔍 Chọn nhanh từ danh bạ khách sỉ
                    </label>
                    {customerName && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setCustomerName('');
                          setCustomerPhone('');
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
                      className="w-full text-xs p-2.5 border border-slate-205 rounded-lg bg-white font-medium text-slate-800"
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
                              setCustomerSearchQuery(c.fullName);
                              if (c.note) setNote(c.note);
                              setShowCustomerDropdown(false);
                            }}
                            className="w-full text-left p-2 hover:bg-slate-100 text-xs flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{c.fullName}</span>
                              <span className="text-slate-400 text-[10px] ml-2">({c.phone})</span>
                            </div>
                            {c.tags && c.tags.length > 0 && (
                              <span className="bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                                {c.tags[0]}
                              </span>
                            )}
                          </button>
                        ))}
                        {availableCustomers.filter(c => 
                          c.fullName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                          c.phone.includes(customerSearchQuery)
                        ).length === 0 && customerSearchQuery.trim() !== '' && (
                          <div className="p-2 text-center text-slate-400 text-xs">
                            Không tìm thấy dữ liệu. Hệ thống sẽ tạo liên kết khách này khi chốt khóa lịch!
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-xs font-bold text-slate-655 block mb-1">Tên Trưởng đoàn / Người đại diện lưu trú</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.7 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Nguyễn Văn A..."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full text-xs pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-655 block mb-1">Số điện thoại khách hàng đại biểu</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.7 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="Nhập SĐT sành khách..."
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full text-xs pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-655 block mb-1">
                    Số lượng người trong đoàn lưu trú (Tối đa: {selectedRoom.maxGuests} người)
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-2.7 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedRoom.maxGuests}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-full text-xs pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                  {guests > selectedRoom.maxGuests && (
                    <p className="text-[10px] text-rose-600 font-semibold mt-1">⚠️ Số người đã vượt sức chứa tiêu chuẩn của phòng!</p>
                  )}
                </div>

                {/* Dynamic services list from property details */}
                {property && property.facilities && property.facilities.length > 0 && (
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] uppercase font-black tracking-wide text-indigo-700 block">Yêu cầu thêm dịch vụ / dịch vụ tiện nghi sẵn có:</span>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                      {property.facilities.map((fac) => {
                        const isSelected = selectedServices.includes(fac);
                        return (
                          <button
                            type="button"
                            key={fac}
                            onClick={() => handleServiceToggle(fac)}
                            className={`flex items-center space-x-2 p-2 rounded-lg text-left border text-[11px] font-semibold transition ${
                              isSelected 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-750' 
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                              isSelected ? 'bg-indigo-600 text-white border-indigo-650' : 'bg-white border-slate-300'
                            }`}>
                              {isSelected && '✓'}
                            </span>
                            <span className="truncate">{fac}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-3 flex justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    Quay lại bước 1
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-indigo-600 font-bold text-white hover:bg-indigo-750 rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    Đến bước 3: Định giá bán <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Profit Margin Adjuster & Submission */}
            {currentStep === 3 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">BƯỚC 3 TRONG 3 (BƯỚC CHỐT)</span>
                  <h3 className="text-lg font-bold text-slate-800">Định lượng giá bán khách hàng & Chốt hoa hồng</h3>
                  <p className="text-xs text-slate-450">Tự do nâng thặng dư thù lao theo thỏa thuận đàm phán cụ thể của bạn với khách nghỉ.</p>
                </div>

                <div className="bg-gradient-to-tr from-indigo-50/50 to-indigo-100/10 p-5 rounded-xl border border-indigo-150 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-slate-800 block text-xs">
                      💰 Tổng giá bán chốt của cả đoàn ({nights} đêm)
                    </label>
                    <span className="font-bold text-indigo-700 bg-white border border-indigo-100 px-2.5 py-0.5 rounded text-[10px] font-mono">
                      Vốn CTV sỉ: {totalMinCtvCost.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono font-bold text-sm">
                      đ
                    </span>
                    <input
                      type="number"
                      required
                      min={totalMinCtvCost}
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                      className="w-full text-lg font-black text-slate-900 pl-8 pr-32 py-2.5 border border-slate-250 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-650 bg-white"
                    />
                    <div className="absolute right-2 top-1.5 flex gap-1">
                      <button
                        type="button"
                        onClick={setPriceToSuggested}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[9px] font-black text-slate-700 rounded transition cursor-pointer"
                        title="Đặt về giá bán lẻ niêm yết mặc định"
                      >
                        = Giá Lẻ
                      </button>
                      <button
                        type="button"
                        onClick={setPriceToWholesale}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-[9px] font-black text-rose-700 rounded transition cursor-pointer"
                        title="Bán sỉ hòa vốn không lấy chênh lệch"
                      >
                        = Giá CTV
                      </button>
                    </div>
                  </div>

                  {/* PRESET CHÊNH LỆCH BUTTONS */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Công cụ cộng nhanh chênh lệch thặng dư:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => adjustPriceByValue(100000)}
                        className="px-2.5 py-1 bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-100 text-[10px] text-indigo-750 font-bold rounded-lg transition"
                      >
                        + 100K đ
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustPriceByValue(200000)}
                        className="px-2.5 py-1 bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-100 text-[10px] text-indigo-750 font-bold rounded-lg transition"
                      >
                        + 200K đ
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustPriceByValue(500000)}
                        className="px-2.5 py-1 bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-100 text-[10px] text-indigo-750 font-bold rounded-lg transition"
                      >
                        + 500K đ
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustPriceByValue(1000000)}
                        className="px-2.5 py-1 bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-100 text-[10px] text-indigo-750 font-bold rounded-lg transition"
                      >
                        + 1M đ
                      </button>
                    </div>
                  </div>
                  
                  {/* REALTIME HARVEST MARGIN SHOWDOWN */}
                  {commissionAmount > 0 ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center justify-between text-emerald-800">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-amber-500 animate-bounce" />
                        <span className="text-[11px] font-bold">Thù lao Hoa hồng của bạn thực lãnh:</span>
                      </div>
                      <span className="font-black font-mono text-base text-emerald-700 animate-pulse">
                        + {commissionAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-semibold text-center">
                      Bạn đang đặt giá bán đúng bằng giá CTV sỉ. Thù lao hoa hồng thặng dư của đơn này = 0đ.
                    </div>
                  )}

                  <p className="text-[9px] text-slate-400">
                    * Ghi chú: Giá bán lẻ chuẩn khuyên dùng là {totalSuggestedClientCost.toLocaleString('vi-VN')} đ. Bạn nên chốt giá quanh khoảng này để vừa thuyết phục khách hàng vừa thặng dư lớn.
                  </p>
                </div>

                {/* Ghi chú */}
                <div className="text-xs">
                  <label className="text-xs font-bold text-slate-600 block mb-1">Yêu cầu đặc biệt của khách hàng hoặc nội dung cần chú ý</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <textarea
                      rows={2}
                      placeholder="Ví dụ: Cung cấp thêm nệm phụ cho trẻ em, nhận phòng muộn sau 20h..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg font-medium text-slate-700"
                    />
                  </div>
                </div>

                {/* Final Booking Details summary box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-650">
                  <span className="font-black uppercase text-[10px] block text-slate-700">🔎 Hồ sơ tóm tắt đơn lưu trữ</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 block leading-relaxed">
                    <div>👤 Trưởng đoàn: <strong className="text-slate-800">{customerName}</strong></div>
                    <div>📞 Số điện thoại: <strong className="text-slate-800 font-mono">{customerPhone}</strong></div>
                    <div>📅 Nhận phòng: <strong className="text-indigo-850 font-mono">{checkIn}</strong></div>
                    <div>📅 Trả phòng: <strong className="text-indigo-850 font-mono">{checkOut}</strong></div>
                    <div>👥 Quy mô đoàn: <strong className="text-slate-800">{guests} khách</strong></div>
                    <div>🛒 Dịch vụ phụ trợ: <strong className="text-indigo-800">{selectedServices.length > 0 ? selectedServices.join(', ') : 'Không'}</strong></div>
                  </div>
                </div>

                <div className="pt-3 flex justify-between gap-3 text-xs">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-lg cursor-pointer"
                  >
                    Quay lại bước 2
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-lg transition cursor-pointer shadow-md flex items-center justify-center space-x-1.5 grow"
                  >
                    {loading ? (
                      <span className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>Khóa lịch trống & Xác minh gửi đơn</span>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Pricing detail sidebar panel */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="h-36 bg-slate-100 relative">
                <img 
                  src={selectedRoom.images[0]} 
                  alt={selectedRoom.name}
                  className="w-full h-full object-cover" 
                />
                
                {property && (
                  <span className="absolute top-3 right-3 bg-slate-900/95 text-white text-[10px] py-1 px-2.5 rounded-full font-bold uppercase tracking-wide">
                    {property.type}
                  </span>
                )}
              </div>

              <div className="p-5 space-y-5 text-xs text-slate-600 font-medium">
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-650 tracking-wider">Căn biệt thự lưu trú</span>
                  <h4 className="font-extrabold text-base text-slate-800 leading-snug mt-0.5">{selectedRoom.name}</h4>
                  <p className="text-slate-405 text-xs mt-1">📍 {selectedRoom.propertyName || 'Thuộc khu nghỉ dưỡng'}</p>
                </div>

                <div className="py-3 border-y border-slate-100 grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-slate-400 block font-normal">Quỹ thời gian</span>
                    <strong className="text-slate-800 text-sm block mt-0.5">{nights} đêm lưu trú</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-normal">Giá đại lý CTV sỉ</span>
                    <strong className="text-indigo-700 text-sm block mt-0.5">{selectedRoom.ctvPrice.toLocaleString('vi-VN')} đ/đêm</strong>
                  </div>
                </div>

                {/* Live commission earnings report */}
                <div className="space-y-2.5">
                  <div className="flex justify-between text-slate-650 text-xs text-indigo-800">
                    <span>Tổng hóa đơn đại lý (CTV cost):</span>
                    <span className="font-semibold font-mono">{totalMinCtvCost.toLocaleString('vi-VN')} đ</span>
                  </div>

                  <div className="flex justify-between text-slate-650 text-xs">
                    <span>Sàn niêm yết bán lẻ khuyên dùng (Standard cost):</span>
                    <span className="font-semibold font-mono">{totalSuggestedClientCost.toLocaleString('vi-VN')} đ</span>
                  </div>

                  {commissionAmount > 0 ? (
                    <div className="bg-emerald-50 border border-emerald-110 p-3 rounded-xl flex items-center justify-between text-emerald-805">
                      <div className="flex items-center space-x-1">
                        <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                        <span className="text-[11px] font-bold">Chênh lệch thù lao của bạn:</span>
                      </div>
                      <span className="font-extrabold font-mono text-base text-emerald-700">
                        {commissionAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  ) : null}

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                    <span className="font-extrabold text-slate-800">Doanh số quyết toán chủ villa</span>
                    <span className="font-extrabold font-mono text-indigo-700">
                      {sellingPrice.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick policies info */}
            {property && property.policies && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-2 text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wide block">Chính sách chung của Villa</span>
                <p className="text-slate-405 leading-relaxed font-normal whitespace-pre-line">{property.policies}</p>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
