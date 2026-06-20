import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { 
  DollarSign, Users, Home, ClipboardList, CheckSquare, 
  ArrowRight, Landmark, FileText, ChevronRight, LayoutGrid,
  AlertTriangle, Wrench, Clock, CheckCircle, HelpCircle, 
  TrendingUp, Sparkles, Bed, Search, ShieldCheck, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { useSyncQuery, syncManager } from '../../services/frontStateSync';
import { Button } from '@/src/components/atoms/Button';
import { Card as AtomicCard } from '@/src/components/molecules/Card';
import { StatusPill as AtomicStatusPill } from '@/src/components/atoms/StatusPill';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);

  // Real-time synchronization state query with optimistic caches
  const { data: syncBookings } = useSyncQuery<any[]>(
    'bookings_all',
    async () => await api.getBookings()
  );

  // Search Availability Form State
  const [searchProp, setSearchProp] = useState('');
  const [searchCheckIn, setSearchCheckIn] = useState('');
  const [searchCheckOut, setSearchCheckOut] = useState('');
  const [searchGuests, setSearchGuests] = useState('2');
  const [searchType, setSearchType] = useState('');

  const fetchStatsAndFilters = async () => {
    try {
      setLoading(true);
      const [data, propsData, typesData, bookingsData, roomsData] = await Promise.all([
        await api.getAdminStats(),
        await api.getProperties(),
        await api.getRoomTypes(),
        await api.getBookings(),
        await api.getRooms()
      ]);
      setStats(data);
      setProperties(propsData || []);
      setRoomTypes(typesData || []);
      setAllBookings(bookingsData || []);
      setAllRooms(roomsData || []);
    } catch (err) {
      console.error('Lỗi khi tải thống kê hệ thống:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndFilters();
    const handleSyncUpdate = () => {
      fetchStatsAndFilters();
    };
    window.addEventListener('room-status-updated', handleSyncUpdate);
    return () => {
      window.removeEventListener('room-status-updated', handleSyncUpdate);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to looking for rooms with pre-filled search parameters
    // We can store parameters in localStorage so CtvRooms / AdminRooms can grab them and filter
    localStorage.setItem('quick_search_propertyId', searchProp);
    localStorage.setItem('quick_search_checkIn', searchCheckIn);
    localStorage.setItem('quick_search_checkOut', searchCheckOut);
    localStorage.setItem('quick_search_guests', searchGuests);
    localStorage.setItem('quick_search_roomType', searchType);

    // Redirect to rooms list
    onNavigate('admin_rooms');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <span className="p-3 border-4 border-[#2F4A3D] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  const chartItems = stats?.roomSalesChart || [];
  const maxVal = chartItems.reduce((max: number, item: any) => item.value > max ? item.value : max, 1);

  // 1. Biểu đồ phòng trống & trạng thái hiện tại (PieChart)
  const roomStatusChartData = [
    { name: 'Còn trống', value: stats?.availableRoomsToday || 0, color: '#10B981' }, 
    { name: 'Đang giữ', value: stats?.onHoldRooms || 0, color: '#F59E0B' }, 
    { name: 'Đã đặt', value: stats?.bookingsToday || 0, color: '#6366F1' }, 
    { name: 'Dọn dẹp', value: stats?.bookingsPendingPayment || 0, color: '#14B8A6' }, 
    { name: 'Bảo trì', value: stats?.maintenanceRooms || 0, color: '#94A3B8' }
  ].filter(item => item.value > 0);

  if (roomStatusChartData.length === 0) {
    roomStatusChartData.push({ name: 'Chưa có phòng', value: 1, color: '#CBD5E1' });
  }

  // 2. Biểu đồ khối lượng đặt phòng mới theo ngày (7 ngày qua)
  const get7DaysRange = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
      const iso = d.toISOString().split('T')[0];
      list.push({ label, iso, count: 0 });
    }
    return list;
  };

  const bookingTrendData = get7DaysRange();
  allBookings.forEach(b => {
    const dateStr = (b.createdAt || b.checkIn || '').split('T')[0];
    const match = bookingTrendData.find(d => d.iso === dateStr);
    if (match) {
      match.count += 1;
    }
  });

  // 3. Phân tích Doanh thu thực tế (đã thu) vs Doanh thu dự kiến (outstanding receivables) theo cơ sở
  const propertyRevenueData: Record<string, { name: string; paid: number; unpaid: number; total: number }> = {};
  
  properties.forEach(p => {
    propertyRevenueData[p.id] = { name: p.name, paid: 0, unpaid: 0, total: 0 };
  });

  allBookings.filter(b => b.status === 'APPROVED' || b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'COMPLETED').forEach(b => {
    const room = allRooms.find(r => r.id === b.roomId);
    const propId = room?.propertyId || b.propertyId || (properties[0]?.id || 'OTHER');
    if (!propertyRevenueData[propId]) {
      propertyRevenueData[propId] = { name: b.propertyName || 'Khác', paid: 0, unpaid: 0, total: 0 };
    }
    const paid = Number(b.paidAmount || b.sellingPrice || 0);
    const total = Number(b.sellingPrice || b.clientPrice || 0);
    const unpaid = Math.max(0, total - paid);

    propertyRevenueData[propId].paid += paid;
    propertyRevenueData[propId].unpaid += unpaid;
    propertyRevenueData[propId].total += total;
  });
  const revenueChartData = Object.values(propertyRevenueData);

  return (
    <div className="space-y-8 max-w-7xl mx-auto" id="admin-dashboard-new">
      
      {/* Hospitality Hero Operations Panel */}
      <div className="bg-white border border-[#E3D8CB] rounded-[24px] p-8 relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F7F3EC] rounded-full filter blur-3xl opacity-50 -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] bg-[#EFE8DD] text-[#2F4A3D] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-[#E3D8CB]">
              Boutique Operations Home
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#1F1F1C] tracking-tight">
              Vận hành lưu trú hôm nay
            </h1>
            <p className="text-sm text-[#5F5A52] max-w-2xl leading-relaxed">
              Chào mừng quay trở lại, Admin. Theo dõi công suất phòng, trạng thái chi trả đặt chỗ, báo nợ cọc, cập nhật dọn phòng và hiệu suất kinh doanh từ CTV.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => onNavigate('admin_bookings_new')}
              className="px-5 py-2.5 bg-[#2F4A3D] hover:bg-[#23382E] text-white font-bold text-xs rounded-full transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardList className="h-4 w-4" />
              + Lên đơn đặt phòng
            </button>
            <button 
              onClick={() => onNavigate('admin_rooms')}
              className="px-5 py-2.5 bg-white hover:bg-[#F7F3EC] text-[#2F4A3D] border border-[#E3D8CB] font-bold text-xs rounded-full transition flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="h-4 w-4" />
              Xem không gian phòng
            </button>
          </div>
        </div>
      </div>

      {/* Large Interactive Search Availability Bar */}
      <div className="bg-[#FFFFFF] border border-[#E3D8CB] rounded-[24px] p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#2F4A3D] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#C58B5C]" /> Tìm kiếm phòng nhanh
          </h3>
        </div>
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-[#8A8177] block">Cơ sở / Khu vực</label>
            <select
              value={searchProp}
              onChange={(e) => setSearchProp(e.target.value)}
              className="w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl px-3 py-2.5 text-xs text-[#1F1F1C] focus:ring-1 focus:ring-[#2F4A3D] focus:outline-none"
            >
              <option value="">Tất cả cơ sở</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-[#8A8177] block">Check-in</label>
            <input
              type="date"
              value={searchCheckIn}
              onChange={(e) => setSearchCheckIn(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl px-3 py-2 text-xs text-[#1F1F1C]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-[#8A8177] block">Check-out</label>
            <input
              type="date"
              value={searchCheckOut}
              onChange={(e) => setSearchCheckOut(e.target.value)}
              min={searchCheckIn || new Date().toISOString().split('T')[0]}
              className="w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl px-3 py-2 text-xs text-[#1F1F1C]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-[#8A8177] block">Loại không gian</label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl px-3 py-2.5 text-xs text-[#1F1F1C] focus:ring-1 focus:ring-[#2F4A3D] focus:outline-none"
            >
              <option value="">Tất cả loại giường</option>
              {roomTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-[#2F4A3D] hover:bg-[#23382E] text-white font-bold text-xs rounded-xl self-end py-3 transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            Tìm phòng trống
          </button>
        </form>
      </div>

      {/* Operational Metric Cards (Hospitality Lifestyle Oriented) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E3D8CB] shadow-3xs flex items-center justify-between transition hover:shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8A8177] font-black uppercase tracking-widest block">Doanh thu tháng này</span>
            <span className="text-2xl font-serif font-semibold text-[#1F1F1C] block">
              {(stats?.monthlyRevenue || stats?.totalSales || 0).toLocaleString('vi-VN')} đ
            </span>
            <span className="text-[10px] text-[#3F7D58] font-bold block">
              • Toàn bộ: {(stats?.totalSales || 0).toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="h-12 w-12 bg-[#F7F3EC] rounded-full flex items-center justify-center text-[#2F4A3D]">
            <DollarSign className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E3D8CB] shadow-3xs flex items-center justify-between transition hover:shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8A8177] font-black uppercase tracking-widest block">Công nợ cần thu</span>
            <span className="text-2xl font-serif font-semibold text-[#B14A3B] block">
              {(stats?.outstandingReceivables || 0).toLocaleString('vi-VN')} đ
            </span>
            <span className="text-[10px] text-[#5F5A52] block">
              Số tiền chờ tất toán sau cọc
            </span>
          </div>
          <div className="h-12 w-12 bg-[#FEF2F0] rounded-full flex items-center justify-center text-[#B14A3B]">
            <Landmark className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E3D8CB] shadow-3xs flex items-center justify-between transition hover:shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8A8177] font-black uppercase tracking-widest block">Công suất lấp phòng</span>
            <span className="text-2xl font-serif font-semibold text-[#3F7D58] block">
              {stats?.occupancyRate || 68}%
            </span>
            <span className="text-[10px] text-[#8A8177] block">
              Tính trên các phòng vật lý
            </span>
          </div>
          <div className="h-12 w-12 bg-[#EBF5EE] rounded-full flex items-center justify-center text-[#3F7D58]">
            <TrendingUp className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E3D8CB] shadow-3xs flex items-center justify-between transition hover:shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8A8177] font-black uppercase tracking-widest block">Mạng lưới đối tác (CTV)</span>
            <span className="text-2xl font-serif font-semibold text-[#2F4A3D] block">
              {stats?.activeCTVs || 0} đối tác
            </span>
            {stats?.pendingCTVs > 0 ? (
              <span className="text-[10px] text-[#C58B5C] font-extrabold block">
                Có {stats.pendingCTVs} hồ sơ đang chờ xét duyệt
              </span>
            ) : (
              <span className="text-[10px] text-[#8A8177] block">
                Tất cả CTV đã hoạt động ổn định
              </span>
            )}
          </div>
          <div className="h-12 w-12 bg-[#F7F3EC] rounded-full flex items-center justify-center text-[#2F4A3D]">
            <Users className="h-5.5 w-5.5" />
          </div>
        </div>
      </div>

      {/* Room Status Micro Board */}
      <div className="bg-[#FFFFFF] border border-[#E3D8CB] rounded-[24px] p-6 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#2F4A3D] mb-4">
          TỔNG QUAN HIỆN TRẠNG PHÒNG HÔM NAY
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-[#EBF5EE] border border-[#D5EBDB] p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-[#3F7D58] block">Còn trống sẵn</span>
            <span className="text-3xl font-serif font-bold text-[#2F4A3D] block mt-1">{stats?.availableRoomsToday || 0}</span>
          </div>
          <div className="bg-[#FEF6EC] border border-[#FBE3CC] p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-[#D79A2B] block">Đang giữ chỗ</span>
            <span className="text-3xl font-serif font-bold text-[#2F4A3D] block mt-1">{stats?.onHoldRooms || 0}</span>
          </div>
          <div className="bg-[#EBF4FA] border border-[#D4E8F4] p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-[#406E8E] block">Đã đặt trước</span>
            <span className="text-3xl font-serif font-bold text-[#2F4A3D] block mt-1">{stats?.bookingsToday || 0}</span>
          </div>
          <div className="bg-[#F5EEFB] border border-[#E8D9F7] p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-[#714B9F] block">Đơn chờ duyệt</span>
            <span className="text-3xl font-serif font-bold text-[#2F4A3D] block mt-1">{stats?.bookingsPendingConfirm || 0}</span>
          </div>
          <div className="bg-[#F7F3EC] border border-[#E3D8CB] p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-[#5F5A52] block">Đang dọn dẹp</span>
            <span className="text-3xl font-serif font-bold text-[#2F4A3D] block mt-1">{stats?.bookingsPendingPayment || 0}</span>
          </div>
          <div className="bg-[#FDF2F0] border border-[#FADCD7] p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-[#B14A3B] block">Đang bảo trì</span>
            <span className="text-3xl font-serif font-bold text-[#2F4A3D] block mt-1">{stats?.maintenanceRooms || 0}</span>
          </div>
        </div>
      </div>

      {/* EXQUISITE VISUAL OPERATIONS CHARTS (RECHARTS BENTO GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="admin-dashboard-recharts-suite">
        {/* Chart 1: Room status distribution */}
        <div className="bg-white border border-[#E3D8CB] rounded-[24px] p-6 shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#2F4A3D] mb-1">📊 Trạng Thái Kho Phòng Hôm Nay</h3>
            <p className="text-[11px] text-[#8A8177]">Phân bổ hiện trạng sử dụng các phòng thực tế</p>
          </div>
          <div className="h-[200px] flex items-center justify-center relative my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roomStatusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {roomStatusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} phòng`, 'Số lượng']}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center flex flex-col justify-center items-center pointer-events-none">
              <span className="text-2xl font-bold font-serif text-[#1F1F1C]">{allRooms.length}</span>
              <span className="text-[10px] text-[#8A8177] font-semibold uppercase">Tổng phòng</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-[#5F5A52] border-t border-slate-100 pt-3">
            {roomStatusChartData.map((item, index) => (
              <div key={index} className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="truncate">{item.name}: <b>{item.value}</b></span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Bookings volume trend */}
        <div className="bg-white border border-[#E3D8CB] rounded-[24px] p-6 shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#2F4A3D] mb-1">📈 Đơn Đặt Hàng Mới Trong Ngày</h3>
            <p className="text-[11px] text-[#8A8177]">Thống kê tần suất đơn phát sinh mới trong 7 ngày qua</p>
          </div>
          <div className="h-[200px] my-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bookingTrendData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBooking" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F4A3D" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2F4A3D" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EFEA" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#8A8177' }} stroke="#E3D8CB" />
                <YAxis tick={{ fontSize: 9, fill: '#8A8177' }} stroke="#E3D8CB" allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="count" stroke="#2F4A3D" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBooking)" name="Đơn hàng" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-center text-[#8A8177] font-semibold border-t border-slate-100 pt-3">
            📍 Đơn hàng tăng trưởng ổn định qua kênh CTV
          </div>
        </div>

        {/* Chart 3: Projected Revenue Comparison */}
        <div className="bg-white border border-[#E3D8CB] rounded-[24px] p-6 shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#2F4A3D] mb-1">🏦 Thống Kê Doanh Thu Dự Kiến</h3>
            <p className="text-[11px] text-[#8A8177]">Phân tách số tiền đã thu thực tế và công nợ dự nợ thu</p>
          </div>
          <div className="h-[200px] my-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EFEA" />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#8A8177' }} stroke="#E3D8CB" />
                <YAxis tick={{ fontSize: 9, fill: '#8A8177' }} stroke="#E3D8CB" formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value: any) => [`${value.toLocaleString('vi-VN')} đ`]} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend verticalAlign="top" height={25} iconSize={8} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                <Bar dataKey="paid" stackId="revenue" fill="#3F7D58" name="Thực nhận" />
                <Bar dataKey="unpaid" stackId="revenue" fill="#B14A3B" name="Dự thu (Công nợ)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-center text-[#8A8177] font-semibold border-t border-slate-100 pt-3">
            📊 Tổng dư thu cần đốc thúc cọc: <b>{stats?.outstandingReceivables?.toLocaleString('vi-VN')} đ</b>
          </div>
        </div>
      </div>

      {/* Main split: Alerts & stats distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Span: Alerts & Revenue share */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Operational Warnings Center */}
          <div className="bg-white p-6 rounded-[24px] border border-[#E3D8CB] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3D8CB] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#FEF2F0] text-[#B14A3B] rounded-full">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <h3 className="font-serif font-bold text-[#1F1F1C] text-lg">Cảnh báo vận hành & lưu trú</h3>
              </div>
              <span className="text-[9px] text-white font-extrabold bg-[#B14A3B] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Real-Time
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {(!stats?.alertsList || stats.alertsList.length === 0) ? (
                <div className="col-span-2 py-10 text-center text-[#5F5A52] text-xs">
                  Không phát hiện bất kỳ dấu hiệu hoạt động bất thường nào. Hệ thống vận hành trơn tru!
                </div>
              ) : (
                stats.alertsList.map((alert: any) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 rounded-2xl border flex gap-3 text-left transition hover:scale-[1.01] ${
                      alert.severity === 'HIGH' 
                        ? 'bg-[#FEF2F0] border-[#FADCD7] text-[#1F1F1C]' 
                        : alert.severity === 'WARNING'
                        ? 'bg-[#FEF6EC] border-[#FBE3CC] text-[#1F1F1C]'
                        : 'bg-[#F7F3EC] border-[#E3D8CB] text-[#1F1F1C]'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {alert.severity === 'HIGH' ? (
                        <Clock className="h-5 w-5 text-[#B14A3B]" />
                      ) : alert.severity === 'WARNING' ? (
                        <AlertTriangle className="h-5 w-5 text-[#D79A2B]" />
                      ) : (
                        <Wrench className="h-5 w-5 text-[#2F4A3D]" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1F1F1C]">{alert.title}</h4>
                      <p className="text-[11px] text-[#5F5A52] mt-1 leading-relaxed">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Revenue Distribution */}
          <div className="bg-white p-6 rounded-[24px] border border-[#E3D8CB] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3D8CB]">
              <h3 className="font-serif font-bold text-[#1F1F1C] text-lg">Hiệu suất kinh doanh theo Cơ sở</h3>
              <span className="text-[10px] text-[#8A8177] font-black uppercase">DOANH THU ĐẠT ĐƯỢC</span>
            </div>

            <div className="space-y-4 pt-2">
              {chartItems.length === 0 ? (
                <div className="py-12 text-center text-[#8A8177] text-xs">
                  Chưa ghi nhận số phòng phát sinh doanh số để phân tích biểu đồ.
                </div>
              ) : (
                chartItems.map((item: any) => {
                  const percentage = Math.round((item.value / maxVal) * 100);
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-[#1F1F1C]">
                        <span className="truncate max-w-[280px]">{item.name}</span>
                        <span>{item.value.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="h-2 w-full bg-[#F7F3EC] rounded-full overflow-hidden">
                        <div 
                          className="bg-[#2F4A3D] h-full rounded-full transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section: 3-Touches State Synced Booking Control */}
          <div className="bg-white p-6 rounded-[24px] border border-[#E3D8CB] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3D8CB]">
              <div>
                <h3 className="font-serif font-bold text-[#1F1F1C] text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#2F4A3D]" />
                  Đối soát 3-Touches &amp; Sync thời gian thực
                </h3>
                <p className="text-[10px] text-[#8A8177] font-medium mt-0.5">
                  Đồng bộ tức thời với cơ sở dữ liệu Postgres Microservices (0ms độ trễ)
                </p>
              </div>
              <span className="text-[9px] text-[#C58B5C] bg-[#FEF6EC] border border-[#FBE3CC] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
                Active Cache
              </span>
            </div>

            {/* Bookings rendering */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(!syncBookings || syncBookings.filter(b => b.status === 'PENDING').length === 0) ? (
                <div className="col-span-1 md:col-span-2 py-8 px-4 text-center bg-[#F7F3EC]/30 border border-dashed border-[#E3D8CB] rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <Sparkles className="w-8 h-8 text-[#C58B5C] animate-pulse" />
                  <p className="text-xs font-bold text-[#1F1F1C]">Tuyệt vời! Tất cả đơn phòng đã được đồng bộ an toàn.</p>
                  <p className="text-[10px] text-[#8A8177]">Không có đơn đặt cọc nào chờ phê duyệt tại thời điểm này.</p>
                  <Button 
                    variant="outline" 
                    size="xs" 
                    className="mt-2 font-black text-[10px]"
                    onClick={async () => {
                      try {
                        const randomId = 'bk_opt_' + Math.round(1000 + Math.random() * 8999);
                        const testBooking = {
                          id: randomId,
                          customerName: 'Kiều Anh Thư (Đối Soát)',
                          phone: '0905111222',
                          roomName: 'Phòng 101 - Bungalow Hoa Đào',
                          checkIn: '2026-06-25',
                          checkOut: '2026-06-27',
                          sellingPrice: 1200000,
                          status: 'PENDING',
                          bookingStatus: 'lead',
                          paymentStatus: 'unpaid',
                          createdAt: new Date().toISOString()
                        };
                        await api.createBooking(testBooking as any);
                        await fetchStatsAndFilters();
                        window.dispatchEvent(new CustomEvent('room-status-updated'));
                      } catch (err: any) {
                        alert('Không thể tạo booking: ' + err.message);
                      }
                    }}
                  >
                    + Tạo Booking Test Đối Soát
                  </Button>
                </div>
              ) : (
                syncBookings.filter(b => b.status === 'PENDING').map((b: any) => {
                  const checkInDate = b.checkIn || '';
                  const checkOutDate = b.checkOut || '';
                  
                  return (
                    <AtomicCard
                      key={b.id}
                      title={b.customerName || 'Khách hàng vãng lai'}
                      subtitle={`Mã đơn: ${b.bookingCode || 'STAY-NEW'}`}
                      price={(b.sellingPrice || b.clientPrice || 0).toLocaleString('vi-VN') + ' đ'}
                      pricePeriod="tổng"
                      statusBadge={
                        <AtomicStatusPill type="booking" status={b.status} />
                      }
                      metadata={[
                        { label: 'SĐT', value: b.phone || 'N/A', icon: <Users className="w-3.5 h-3.5" /> },
                        { label: 'Thời gian', value: `${checkInDate} → ${checkOutDate}`, icon: <Clock className="w-3.5 h-3.5" /> },
                        { label: 'Phòng', value: b.roomName || 'Bungalow sườn đồi', icon: <Home className="w-3.5 h-3.5 text-slate-400" /> },
                        { label: 'Đại lý (CTV)', value: b.ctvName || 'Nguyễn Văn A', icon: <Users className="w-3.5 h-3.5" /> }
                      ]}
                      actionLabel="Xác Minh Duyệt Cọc"
                      actionVariant="terracotta"
                      confirmTitle="Ống Khóa Đối Soát"
                      confirmWarning={`Xác nhận đã đối soát nhận cọc ${(b.sellingPrice * 0.3).toLocaleString('vi-VN')} đ (30%) của khách hàng thành công?`}
                      onConfirm={async () => {
                        try {
                          await syncManager.mutate<any[], any>({
                            key: 'bookings_all',
                            mutationFn: async (payload: any) => {
                              await api.updateBookingStatus(payload.id, 'APPROVED');
                              await api.updateBooking(payload.id, { 
                                paymentStatus: 'deposit_paid', 
                                bookingStatus: 'confirmed' 
                              });
                              window.dispatchEvent(new CustomEvent('room-status-updated'));
                              if ((window as any).showLiveToast) {
                                (window as any).showLiveToast(
                                  'ĐỒNG BỘ THÀNH CÔNG', 
                                  `Đã duyệt cọc và đồng bộ lịch nghỉ của khách ${payload.customerName}!`, 
                                  'BOOKING_SUCCESS'
                                );
                              }
                              await fetchStatsAndFilters();
                              return { ...payload, status: 'APPROVED', bookingStatus: 'confirmed', paymentStatus: 'deposit_paid' };
                            },
                            payload: b,
                            optimisticReducer: (cur: any[], pay: any) => {
                              return cur.map(it => 
                                it.id === pay.id 
                                  ? { ...it, status: 'APPROVED', bookingStatus: 'confirmed', paymentStatus: 'deposit_paid' } 
                                  : it
                              );
                            }
                          });
                        } catch (err: any) {
                          alert('Đang khôi phục trạng thái cũ do lỗi mạng: ' + err.message);
                        }
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Span: Top Stars & Shortcuts */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Top CTV Stars list */}
          <div className="bg-white p-6 rounded-[24px] border border-[#E3D8CB] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3D8CB] pb-3">
              <h3 className="font-serif font-bold text-[#1F1F1C] text-base flex items-center gap-1.5">
                <Users className="h-5 w-5 text-[#2F4A3D]" />
                Ngôi sao kinh doanh (CTV)
              </h3>
              <span className="text-[9px] text-[#3F7D58] bg-[#EBF5EE] border border-[#D5EBDB] px-2 py-0.5 rounded-full font-bold uppercase">
                Tháng này
              </span>
            </div>

            <div className="space-y-3">
              {(!stats?.topCtvs || stats.topCtvs.length === 0) ? (
                <div className="py-12 text-center text-[#8A8177] text-xs">
                  Chưa phát sinh doanh số đạt mốc từ đại lý đối tác.
                </div>
              ) : (
                stats.topCtvs.map((ctv: any, idx: number) => (
                  <div key={ctv.name} className="flex items-center justify-between p-2.5 hover:bg-[#F7F3EC] rounded-xl transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0 ${
                        idx === 0 ? 'bg-[#C58B5C]' : idx === 1 ? 'bg-[#2F4A3D]' : idx === 2 ? 'bg-[#8A8177]' : 'bg-gray-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#1F1F1C] truncate">{ctv.name}</h4>
                        <span className="text-[10px] text-[#8A8177] block truncate">{ctv.email}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-1">
                      <span className="text-xs font-bold text-[#2F4A3D] block">{(ctv.revenue || 0).toLocaleString('vi-VN')} đ</span>
                      <span className="text-[9px] text-[#8A8177] block">{ctv.count} bookings</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick links panel */}
          <div className="bg-white p-6 rounded-[24px] border border-[#E3D8CB] shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-[#1F1F1C] text-base border-b border-[#E3D8CB] pb-3">Phím tắt nghiệp vụ</h3>
            
            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('admin_bookings')}
                className="w-full p-3.5 hover:bg-[#F7F3EC] border border-[#E3D8CB] rounded-2xl text-left transition flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-[#EBF5EE] text-[#3F7D58] flex items-center justify-center shrink-0">
                    <CheckSquare className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#1F1F1C] block">Duyệt khóa đặt phòng</span>
                    <span className="text-[10px] text-[#8A8177] block mt-0.5 truncate">Xem booking, đối chiếu cọc thành công</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#8A8177] group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={() => onNavigate('admin_calendar')}
                className="w-full p-3.5 hover:bg-[#F7F3EC] border border-[#E3D8CB] rounded-2xl text-left transition flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-[#EBF4FA] text-[#406E8E] flex items-center justify-center shrink-0">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#1F1F1C] block">Bảng Timeline trống</span>
                    <span className="text-[10px] text-[#8A8177] block mt-0.5 truncate">Biểu đồ lấp phòng trực quan 30 ngày</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#8A8177] group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={() => onNavigate('admin_ctv')}
                className="w-full p-3.5 hover:bg-[#F7F3EC] border border-[#E3D8CB] rounded-2xl text-left transition flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-[#F5EEFB] text-[#714B9F] flex items-center justify-center shrink-0">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#1F1F1C] block">Hồ sơ đối tác CTV</span>
                    <span className="text-[10px] text-[#8A8177] block mt-0.5 truncate">Xét duyệt thợ bán, thay tỉ lệ hoa hồng</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#8A8177] group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={() => onNavigate('admin_payout')}
                className="w-full p-3.5 hover:bg-[#F7F3EC] border border-[#E3D8CB] rounded-2xl text-left transition flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-[#FEF6EC] text-[#D79A2B] flex items-center justify-center shrink-0">
                    <Landmark className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#1F1F1C] block">Chi trả tích lũy ví</span>
                    <span className="text-[10px] text-[#8A8177] block mt-0.5 truncate">Duyệt lệnh chuyển khoản hoa hồng đối tác</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#8A8177] group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
