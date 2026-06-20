import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Wallet as WalletType, Booking, AppNotification, Property, Room, ReferralLink } from '../../types';
import { 
  TrendingUp, Award, Clock, DollarSign, Bell, CheckSquare, 
  ChevronRight, Sparkles, Building, CreditCard, ArrowRight, Wallet,
  Copy, ExternalLink, Link2, MousePointer, Check, ShieldCheck
} from 'lucide-react';

interface CtvDashboardProps {
  onNavigate: (view: string) => void;
}

export function CtvDashboard({ onNavigate }: CtvDashboardProps) {
  const { user, refreshUser } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Referrals marketing tools states
  const [referrals, setReferrals] = useState<ReferralLink[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newTargetType, setNewTargetType] = useState<'ROOM' | 'PROPERTY'>('PROPERTY');
  const [newTargetId, setNewTargetId] = useState('');
  const [creatingReferral, setCreatingReferral] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Bank fields for instant link
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [bankSuccess, setBankSuccess] = useState(false);

  // Deposit Allocation Routes States
  const [activeSetupTab, setActiveSetupTab] = useState<'payout' | 'deposit'>('payout');
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [depositSetup, setDepositSetup] = useState({
    activeChannel: 'PLATFORM',
    ctvAccount: { bankName: '', bankAccount: '', bankHolder: '', isVerified: true },
    platformAccount: { bankName: 'VIETINBANK', bankAccount: '1122334455', bankHolder: 'CONG TY CP LANG BINH YEN' },
    homeOwnerAccount: { bankName: 'MB BANK', bankAccount: '8888999911', bankHolder: 'HOANG LAM LAM (CHU HOME)' }
  });

  // Gemini AI Recommendation States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<{
    customerSegmentAnalysis: string;
    recommendations: {
      propertyId: string;
      propertyName: string;
      type: string;
      location: string;
      reason: string;
    }[];
    actionStrategy: string;
  } | null>(null);
  const [aiError, setAiError] = useState('');

  const handleFetchAiRecommendations = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await api.getGeminiRecommendations();
      setAiReport(res);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Không thể gọi trợ lý ảo Gemini. Vui lòng kiểm tra cấu hình hoặc liên hệ Admin.');
    } finally {
      setAiLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await refreshUser();
      const [walletData, bookingsData, notifData, referralsData, propertiesData, roomsData, depositData] = await Promise.all([
        api.getWallet(),
        api.getBookings(),
        api.getNotifications(),
        api.getReferrals(),
        api.getProperties(),
        api.getRooms(),
        api.getDepositAccounts()
      ]);
      setWallet(walletData);
      setBookings(bookingsData);
      setNotifications(notifData);
      setReferrals(referralsData || []);
      setProperties(propertiesData || []);
      setRooms(roomsData || []);
      if (depositData) {
        setDepositSetup(depositData);
      }
      
      if (walletData) {
        setBankName(walletData.bankName || '');
        setBankAccount(walletData.bankAccount || '');
        setBankHolder(walletData.bankHolder || '');
      }

      // Auto-select first target id if lists loaded
      if (propertiesData && propertiesData.length > 0) {
        setNewTargetId(propertiesData[0].id);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu CTV:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update target ID preset when target type toggles
  useEffect(() => {
    if (newTargetType === 'PROPERTY') {
      if (properties.length > 0) setNewTargetId(properties[0].id);
    } else {
      if (rooms.length > 0) setNewTargetId(rooms[0].id);
    }
  }, [newTargetType, properties, rooms]);

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTargetId) {
      setReferralError('Vui lòng nhập mã code giới thiệu và chọn đối tượng mục tiêu!');
      return;
    }
    setCreatingReferral(true);
    setReferralError('');
    try {
      const cleanCode = newCode.trim().replace(/\s+/g, '_');
      await api.createReferral({
        code: cleanCode,
        targetType: newTargetType,
        targetId: newTargetId
      });
      // reload referrals list
      const updatedRefs = await api.getReferrals();
      setReferrals(updatedRefs);
      setNewCode('');
      setReferralError('');
    } catch (err: any) {
      setReferralError(err.message || 'Lỗi khi tạo mã giới thiệu.');
    } finally {
      setCreatingReferral(false);
    }
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }).catch(err => {
      console.error('Không thể sao chép link:', err);
    });
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    setBankSuccess(false);
    try {
      const updated = await api.updateBankDetails({ bankName, bankAccount, bankHolder });
      setWallet(updated);
      setBankSuccess(true);
      setTimeout(() => setBankSuccess(false), 3000);
    } catch (err) {
      alert('Không thể cài đặt tài khoản ngân hàng. Vui lòng thử lại!');
    } finally {
      setSavingBank(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      // Reload notifications
      const notifData = await api.getNotifications();
      setNotifications(notifData);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <span className="loading-spinner p-4 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  // Derived stats
  const approvedBookings = bookings.filter(b => b.status === 'APPROVED');
  const pendingBookings = bookings.filter(b => b.status === 'PENDING');
  const completedSalesVal = approvedBookings.reduce((sum, b) => sum + b.sellingPrice, 0);

  return (
    <div className="space-y-6" id="ctv-dashboard">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-650 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-xl animate-fade-in">
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-150 text-[11px] font-semibold mb-3 border border-white/10 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 mr-1 text-yellow-300" />
            Cộng tác viên Bán hàng cấp cao ({user?.commissionRate}% hoa hồng nền)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white mb-2">Xin chào, {user?.name}!</h1>
          <p className="text-indigo-100/90 text-sm leading-relaxed font-sans font-light">
            Sẵn sàng kết nối khách hàng, chốt lịch phòng tiện lợi và nâng hoa hồng chênh lệch không giới hạn.
            Thay đổi giá bán linh hoạt ngay trên đơn đặt để hưởng trọn doanh thu thặng dư!
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
               onClick={() => onNavigate('ctv_rooms')}
               className="px-4 py-2 bg-white text-indigo-950 font-bold text-xs rounded-lg hover:bg-slate-50 transition-all shadow-sm cursor-pointer flex items-center gap-1.5 uppercase tracking-wide animate-scale-up"
            >
              🏡 Bán Phòng Ngay
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('ctv_wallet')}
              className="px-4 py-2 bg-white/10 text-indigo-100 hover:bg-white/20 border border-white/10 font-bold text-xs rounded-lg transition-all cursor-pointer uppercase tracking-wider text-center"
            >
              Ví & Giải Ngân
            </button>
          </div>
        </div>
      </div>

      {/* GEMINI AI CLIENT BEHAVIOR REVENUE RECOMMENDATIONS */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl border border-indigo-100 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-indigo-950 text-sm uppercase tracking-wider font-display flex items-center">
                Trợ lý bán hàng thông minh Gemini AI
                <span className="ml-2 bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest scale-95">PRO</span>
              </h3>
              <p className="text-xs text-indigo-700/80 mt-0.5 font-light">Phân tích hành vi chốt đơn lịch sử, định vị phân khúc khách lẻ và đề xuất rổ phòng độc quyền tối ưu tốt nhất!</p>
            </div>
          </div>
          
          <button
            onClick={handleFetchAiRecommendations}
            disabled={aiLoading}
            className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-lg disabled:bg-slate-300 cursor-pointer inline-flex items-center space-x-1.5 uppercase tracking-wider self-start sm:self-auto"
          >
            {aiLoading ? (
              <>
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1"></span>
                <span>Đang tính toán...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                <span>Gọi Trợ Lý Gemini AI</span>
              </>
            )}
          </button>
        </div>

        {aiError && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-medium">
            ❌ {aiError}
          </div>
        )}

        {aiLoading && (
          <div className="bg-white border border-indigo-50 rounded-xl p-8 text-center space-y-3 animate-pulse">
            <div className="flex justify-center">
              <div className="rounded-full bg-indigo-50 p-3">
                <Sparkles className="h-6 w-6 text-indigo-600 animate-spin" />
              </div>
            </div>
            <p className="text-xs text-indigo-650 font-bold">Lắng nghe nhịp chốt đơn, phân tích xu hướng thặng dư...</p>
            <p className="text-[11px] text-slate-400 font-light">Trợ lý AI đang so khớp hành vi khách lẻ với rổ kho phòng: Homestay, Villa, Bungalow, Glamping, Resort...</p>
          </div>
        )}

        {aiReport && !aiLoading && (
          <div className="bg-white border border-indigo-100 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xs animate-fade-in">
            {/* Demographic Profile Analysis */}
            <div className="space-y-2">
              <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">🎯 Đánh giá phân khúc khách lẻ mục tiêu</span>
              <p className="text-slate-700 text-xs leading-relaxed font-sans font-medium whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                {aiReport.customerSegmentAnalysis}
              </p>
            </div>

            {/* Smart Villa & Homestay Recommendations */}
            <div className="space-y-3">
              <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">⭐ Khu lưu trú đề xuất mang tiềm năng bán tốt nhất</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {aiReport.recommendations?.map((item, idx) => (
                  <div key={idx} className="bg-slate-50/50 hover:bg-indigo-50/20 border border-slate-100 hover:border-indigo-150 transition p-4 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full uppercase tracking-wide leading-none">{item.type}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Gợi ý {idx+1}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-xs mt-1.5 leading-snug">{item.propertyName}</h4>
                      <p className="text-[10px] text-slate-400 leading-normal mb-2 mt-0.5 truncate">{item.location}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-light">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Practical advice actionable strategy */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">💡 Đề xuất chiến lược hành động bứt phá doanh số</span>
              <div className="text-emerald-800 text-xs leading-relaxed whitespace-pre-line p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                {aiReport.actionStrategy}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Numerical Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Balance */}
        <div id="stat-balance" className="bg-white p-5 rounded-2xl border border-slate-205 border-slate-200 shadow-sm flex items-center justify-between transition-all hover:shadow duration-200">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ví Khả Dụng</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight block mt-1 font-mono">
              {(wallet?.balance || 0).toLocaleString('vi-VN')} <span className="text-sm font-normal text-slate-400">đ</span>
            </span>
            <span className="text-[9px] text-emerald-700 font-extrabold mt-1 inline-block bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wide">
              Có thể rút ngay
            </span>
          </div>
          <div className="h-11 w-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Pending Balance */}
        <div id="stat-pending" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:shadow duration-200">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chờ Admin Duyệt</span>
            <span className="text-2xl font-bold text-amber-600 tracking-tight block mt-1 font-mono">
              {(wallet?.pending || 0).toLocaleString('vi-VN')} <span className="text-sm font-normal text-slate-400">đ</span>
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Khóa trong <b className="text-amber-750 font-mono font-bold text-amber-600">{pendingBookings.length}</b> đơn hàng
            </span>
          </div>
          <div className="h-11 w-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Total Earned */}
        <div id="stat-earned" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:shadow duration-200">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tổng Thu Nhập</span>
            <span className="text-2xl font-bold text-emerald-600 tracking-tight block mt-1 font-mono">
              {(wallet?.totalEarned || 0).toLocaleString('vi-VN')} <span className="text-sm font-normal text-slate-400">đ</span>
            </span>
            <span className="text-[9px] text-emerald-750 font-bold block mt-1.5 uppercase tracking-wider">
              Đã nhận đầy đủ
            </span>
          </div>
          <div className="h-11 w-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Total Bookings */}
        <div id="stat-bookings" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:shadow duration-200">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Số Đơn Của Tôi</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight block mt-1 font-mono">
              {bookings.length} <span className="text-sm font-normal text-slate-400">đơn</span>
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block whitespace-nowrap">
              <span className="text-emerald-650 font-bold text-emerald-600">{approvedBookings.length} duyệt</span> • <span className="text-slate-400">{bookings.filter(b => b.status === 'CANCELLED').length} huỷ</span>
            </span>
          </div>
          <div className="h-11 w-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <CheckSquare className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* REFERRAL SYSTEM PANEL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-850 text-sm uppercase tracking-wider font-display text-slate-800">Tạo Mã & Link Giới Thiệu Bán Hàng</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Chia sẻ liên kết giới thiệu để tự động tracking click và đơn hàng thành công</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-start md:self-auto bg-indigo-50/50 p-2 rounded-xl border border-indigo-100 px-3 py-1.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span className="text-[10px] text-indigo-750 font-bold uppercase tracking-wide">Doanh thu đo lường chuẩn xác</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator form left side */}
          <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wide">Công cụ tạo mã nhanh</h4>
            
            {referralError && (
              <div className="p-2.5 text-xs text-rose-800 bg-rose-50 border border-rose-100 rounded-lg font-medium">
                {referralError}
              </div>
            )}

            <form onSubmit={handleCreateReferral} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mã giới thiệu tùy chọn (Code)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="Ví dụ: CTV1_ALOHAVILLA"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2.5 pl-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold uppercase tracking-wide bg-white"
                  />
                  <span className="absolute right-3 top-3 text-[9px] font-mono text-slate-400">MAX 20 kí tự</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Loại đối tượng</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTargetType('PROPERTY')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition ${
                      newTargetType === 'PROPERTY'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🏡 Cửa hàng / Khu lưu trú
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTargetType('ROOM')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition ${
                      newTargetType === 'ROOM'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ⭐ Dạng phòng cụ thể
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Chọn đối tượng đích</label>
                {newTargetType === 'PROPERTY' ? (
                  <select
                    value={newTargetId}
                    onChange={(e) => setNewTargetId(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium font-sans"
                  >
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={newTargetId}
                    onChange={(e) => setNewTargetId(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium font-sans"
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name} - {r.propertyName}</option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="submit"
                disabled={creatingReferral}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition uppercase tracking-wider cursor-pointer font-sans"
              >
                {creatingReferral ? 'Đang tạo mã...' : 'Kích hoạt mã marketing'}
              </button>
            </form>
          </div>

          {/* Table display right side (2 cols) */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wide mb-3 pl-1">Hiệu năng các chiến dịch đã liên kết</h4>
            
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    <th className="py-2.5 px-3">Mã Code</th>
                    <th className="py-2.5 px-2">Đích đến</th>
                    <th className="py-2.5 px-2 text-center">Lượt click</th>
                    <th className="py-2.5 px-2 text-center">Đơn đã lên</th>
                    <th className="py-2.5 px-2 text-center">Định mức</th>
                    <th className="py-2.5 px-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-sans">
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-normal">Bạn chưa tạo mã giới thiệu nào. Hãy tạo mã đầu tiên ở cột trái!</td>
                    </tr>
                  ) : (
                    referrals.map((ref) => (
                      <tr key={ref.id} className="hover:bg-slate-50/40 transition">
                        <td className="py-3 px-3 font-bold text-amber-700 font-mono select-all">
                          {ref.code}
                        </td>
                        <td className="py-3 px-2 text-slate-600 truncate max-w-[140px]" title={ref.targetName}>
                          <span className="font-semibold block truncate leading-tight text-slate-800">{ref.targetName}</span>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wide mt-0.5 inline-block">{ref.targetType === 'PROPERTY' ? '🏡 Cửa hàng' : '⭐ Dạng phòng'}</span>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700 font-mono">
                          {ref.clicks}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-indigo-600 font-mono">
                          {ref.bookingsCreated}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-emerald-600 font-mono">
                          {ref.bookingsCompleted}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleCopyLink(ref.code)}
                            className={`p-1.5 px-2.5 rounded-lg border inline-flex items-center space-x-1 text-[10px] font-bold transition cursor-pointer ${
                              copiedCode === ref.code
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                            title="Sao chép liên kết giới thiệu"
                          >
                            {copiedCode === ref.code ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Đã Copy!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-[10px] text-slate-400 leading-normal pl-1 flex items-center justify-between">
              <span><b>Mẹo copy link:</b> Khi khách click vào link, hệ hệ thống định danh giới thiệu CTV. Khi chốt mua, hoa hồng tự động gom về ví của bạn!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections: Grid 1/3 and 2/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Notifications & Bookings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Notifications Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                  <Bell className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider font-display">Thông Báo Mới Nhất</h3>
              </div>
              {notifications.some(n => !n.isRead) ? (
                <button 
                  onClick={handleMarkNotificationsRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  Đánh dấu đã đọc tất cả
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Không có thông báo mới</span>
              )}
            </div>

            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Hệ thống chưa có thông báo gửi tới bạn.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-3.5 rounded-xl border text-sm transition-all flex items-start space-x-3 ${
                      notif.isRead 
                        ? 'border-slate-100 bg-slate-50/40 text-slate-600' 
                        : 'border-indigo-150 bg-indigo-50/20 text-indigo-950 shadow-2xs'
                    }`}
                  >
                    <div className="mt-1">
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        notif.isRead ? 'bg-slate-350' : 'bg-indigo-600 animate-pulse'
                      }`}></span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{notif.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                          {new Date(notif.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-xs mt-1 font-normal leading-relaxed text-slate-500">{notif.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Bookings Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-850 text-sm uppercase tracking-wider font-display">Đơn Hàng Gần Đây</h3>
              <button 
                onClick={() => onNavigate('ctv_history')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer gap-0.5"
              >
                Xem chi tiết
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Bạn chưa có đơn hàng nào lên hệ thống.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                      <th className="py-3 px-1">Khách Hàng</th>
                      <th className="py-3 px-1">Tên Phòng</th>
                      <th className="py-3 px-1">Nhận / Trả</th>
                      <th className="py-3 px-1 text-right">Hoa Hồng</th>
                      <th className="py-3 px-1 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {bookings.slice(0, 4).map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-1 font-bold text-slate-800">
                          {b.customerName}
                          <span className="text-[10px] text-slate-400 font-normal block font-mono mt-0.5">{b.customerPhone}</span>
                        </td>
                        <td className="py-3 px-1 text-slate-600 font-medium">{b.roomName}</td>
                        <td className="py-3 px-1 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {b.checkIn} <span className="text-slate-350 px-0.5">→</span> {b.checkOut}
                        </td>
                        <td className="py-3 px-1 text-right font-bold text-indigo-600 font-mono">
                          {b.commissionAmount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-1 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'APPROVED' 
                              ? 'bg-green-100 text-green-700' 
                              : b.status === 'CANCELLED' 
                              ? 'bg-rose-100 text-rose-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {b.status === 'APPROVED' ? 'Thành công' : b.status === 'CANCELLED' ? 'Bị từ chối' : 'Chờ duyệt'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Bank account link Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            
            {/* Tab selector */}
            <div className="flex border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setActiveSetupTab('payout')}
                className={`flex-1 pb-2 text-xs font-bold text-center transition-all ${
                  activeSetupTab === 'payout'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 font-extrabold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                💳 Nhận Hoa Hồng
              </button>
              <button
                type="button"
                onClick={() => setActiveSetupTab('deposit')}
                className={`flex-1 pb-2 text-xs font-bold text-center transition-all ${
                  activeSetupTab === 'deposit'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 font-extrabold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                🏡 Kênh Nhận Cọc
              </button>
            </div>

            {activeSetupTab === 'payout' ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="h-7 w-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Cài Đặt Ví Giải Ngân</h3>
                </div>
                
                <p className="text-[11px] text-slate-400 leading-normal">
                  Vui lòng cung cấp chính xác tài khoản ngân hàng của bạn. Số tiền rút từ Ví Thưởng Hoa Hồng khả dụng sẽ được chuyển khoản tức thì 24/7 về thẻ này.
                </p>

                {bankSuccess && (
                  <div className="p-2 bg-emerald-50 text-emerald-800 text-[10px] font-semibold rounded-lg text-center animate-fade-in border border-emerald-100">
                    Đã đồng bộ ngân hàng thụ hưởng thành công!
                  </div>
                )}

                <form onSubmit={handleSaveBank} className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Tên ngân hàng</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: VIETCOMBANK, TECHCOMBANK"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase font-bold text-slate-800 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Số tài khoản (STK)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 1012345678"
                      value={bankAccount}
                      onChange={(e) => {
                        setBankAccount(e.target.value);
                        // Tự động đồng bộ sang CTV cọc nếu chưa thiết lập
                        if (!depositSetup.ctvAccount.bankAccount) {
                          setDepositSetup({
                            ...depositSetup,
                            ctvAccount: {
                              ...depositSetup.ctvAccount,
                              bankAccount: e.target.value
                            }
                          });
                        }
                      }}
                      className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-slate-800 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Chủ tài khoản (Không dấu)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: NGUYEN VAN A"
                      value={bankHolder}
                      onChange={(e) => {
                        setBankHolder(e.target.value);
                        if (!depositSetup.ctvAccount.bankHolder) {
                          setDepositSetup({
                            ...depositSetup,
                            ctvAccount: {
                              ...depositSetup.ctvAccount,
                              bankHolder: e.target.value
                            }
                          });
                        }
                      }}
                      className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase font-bold text-slate-800 bg-slate-50/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingBank}
                    className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition uppercase tracking-wider cursor-pointer"
                  >
                    {savingBank ? 'Đang cập nhật...' : 'Cập Nhật Tài Khoản Thụ Hưởng'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="h-7 w-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Cấu Hình Tài Khoản Nhận Cọc</h3>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-normal">
                  Khi khách đặt phòng, bạn có thể tự thiết lập tài khoản và kênh nhận tiền cọc cọc lẻ. Tiền cọc có thể chuyển về CTV, Nền tảng (Làng Bình Yên), hoặc Chủ Home.
                </p>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setSavingDeposit(true);
                  try {
                    // Sync CTV account from current general bank account if blank
                    const payload = { ...depositSetup };
                    if (!payload.ctvAccount.bankName) payload.ctvAccount.bankName = bankName;
                    if (!payload.ctvAccount.bankAccount) payload.ctvAccount.bankAccount = bankAccount;
                    if (!payload.ctvAccount.bankHolder) payload.ctvAccount.bankHolder = bankHolder;
                    
                    const res = await api.updateDepositAccounts(payload);
                    setDepositSetup(res);
                    alert('Cấu hình chia sẻ tuyến nhận cọc khách thành công!');
                  } catch (err) {
                    alert('Lỗi cập nhật cấu hình cọc.');
                  } finally {
                    setSavingDeposit(false);
                  }
                }} className="space-y-3.5">
                  
                  {/* Default active gateway channel */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Mặc định tài khoản thụ hưởng cọc</label>
                    <select
                      value={depositSetup.activeChannel}
                      onChange={(e) => setDepositSetup({ ...depositSetup, activeChannel: e.target.value })}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg font-bold text-indigo-950 bg-white"
                    >
                      <option value="CTV">Tài khoản CTV cá nhân (Đã Xác Minh)</option>
                      <option value="PLATFORM">Nền tảng chính (Làng Bình Yên)</option>
                      <option value="HOME_OWNER">Chủ Home (Chủ khu lưu trú)</option>
                    </select>
                  </div>

                  {/* Channel Tab Details boxes */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs font-medium text-slate-700">
                    
                    {/* CTV */}
                    <div className="border-b border-dashed border-slate-200 pb-2">
                      <span className="text-[9px] font-bold text-emerald-700 uppercase bg-emerald-50 px-1.5 py-0.5 rounded mr-1">CTV (Xác minh)</span>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        <input
                          type="text"
                          placeholder="Ngân hàng"
                          value={depositSetup.ctvAccount.bankName || bankName}
                          onChange={(e) => setDepositSetup({
                            ...depositSetup,
                            ctvAccount: { ...depositSetup.ctvAccount, bankName: e.target.value.toUpperCase() }
                          })}
                          className="p-1 px-2 border border-slate-200 text-xs rounded uppercase font-bold text-slate-800"
                        />
                        <input
                          type="text"
                          placeholder="Số tài khoản"
                          value={depositSetup.ctvAccount.bankAccount || bankAccount}
                          onChange={(e) => setDepositSetup({
                            ...depositSetup,
                            ctvAccount: { ...depositSetup.ctvAccount, bankAccount: e.target.value }
                          })}
                          className="p-1 px-2 border border-slate-200 text-xs rounded font-mono font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Platform Pre-filled details */}
                    <div className="border-b border-dashed border-slate-200 pb-2 bg-indigo-50/30 p-1.5 rounded">
                      <span className="text-[9px] font-bold text-blue-700 uppercase bg-blue-50 px-1.5 py-0.5 rounded mr-1">Nền tảng Làng Bình Yên (Mặc định)</span>
                      <p className="text-[9px] text-slate-600 font-mono mt-1 font-bold">
                        {depositSetup.platformAccount.bankName} | STK: {depositSetup.platformAccount.bankAccount}
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase font-semibold">Chủ sở hữu: {depositSetup.platformAccount.bankHolder}</p>
                    </div>

                    {/* Owner Customize box */}
                    <div>
                      <span className="text-[9px] font-bold text-purple-700 uppercase bg-purple-50 px-1.5 py-0.5 rounded mr-1">Chủ Biệt Thự / Chủ Home</span>
                      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                        <input
                          type="text"
                          placeholder="Ngân hàng"
                          value={depositSetup.homeOwnerAccount.bankName}
                          onChange={(e) => setDepositSetup({
                            ...depositSetup,
                            homeOwnerAccount: { ...depositSetup.homeOwnerAccount, bankName: e.target.value.toUpperCase() }
                          })}
                          className="p-1 px-2 border border-slate-200 text-xs rounded uppercase font-bold text-slate-800"
                        />
                        <input
                          type="text"
                          placeholder="Số tài khoản"
                          value={depositSetup.homeOwnerAccount.bankAccount}
                          onChange={(e) => setDepositSetup({
                            ...depositSetup,
                            homeOwnerAccount: { ...depositSetup.homeOwnerAccount, bankAccount: e.target.value }
                          })}
                          className="p-1 px-2 border border-slate-200 text-xs rounded font-mono font-bold text-slate-800"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Chủ tài khoản (Không dấu)"
                        value={depositSetup.homeOwnerAccount.bankHolder}
                        onChange={(e) => setDepositSetup({
                          ...depositSetup,
                          homeOwnerAccount: { ...depositSetup.homeOwnerAccount, bankHolder: e.target.value.toUpperCase() }
                        })}
                        className="w-full mt-1.5 p-1 px-2 border border-slate-200 text-xs rounded uppercase font-bold text-slate-800"
                      />
                    </div>

                  </div>

                  <button
                    type="submit"
                    disabled={savingDeposit}
                    className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition uppercase tracking-wider cursor-pointer"
                  >
                    {savingDeposit ? 'Đang lưu...' : 'Đăng Ký Tài Khoản Kênh Nhận Cọc'}
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* Quick FAQ / Guide */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-xs text-slate-500 shadow-sm leading-relaxed">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] font-display">Hướng Dẫn Cho CTV</h4>
            <div className="space-y-2">
              <p><b>1. Tìm phòng trống</b>: Vào tab phòng, nhập ngày check-in/checkout của khách để lọc các khu villa/homestay còn lịch trống chính xác.</p>
              <p><b>2. Đặt chênh nâng giá</b>: Khi tạo đơn, bạn được tự do đặt giá bán tăng cao hơn giá hệ thống. Phần thừa sẽ thuộc 100% về hoa hồng của bạn.</p>
              <p><b>3. Rút tiền</b>: Sau khi admin xác nhận khách đã cọc hoặc thanh toán đầy đủ, đơn chuyển thành "Thành công", tiền hoa hồng cộng ngay vào ví của bạn.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
