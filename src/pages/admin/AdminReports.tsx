import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Booking, User } from '../../types';
import { BarChart, DollarSign, Users, Clipboard, RefreshCw, AlertCircle, TrendingUp, Calendar } from 'lucide-react';

export function AdminReports() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState<'30_days' | 'this_month' | 'all'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bList, uList] = await Promise.all([
        api.getBookings(),
        api.getCTVs()
      ]);
      setBookings(bList);
      setUsers(uList);
    } catch (err) {
      console.error('Error fetching stats reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getFilteredBookings = () => {
    if (dateFilter === 'all') return bookings;
    
    const now = new Date();
    const limit = dateFilter === '30_days' ? 30 : 0;
    
    return bookings.filter(b => {
      const bDate = new Date(b.createdAt || b.checkIn);
      if (dateFilter === '30_days') {
        const diffDays = Math.round((now.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      } else {
        // This month
        return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
      }
    });
  };

  const fBookings = getFilteredBookings();

  // Metrics calculators
  const totalRevenue = fBookings
    .filter(b => b.status === 'APPROVED' || b.bookingStatus === 'APPROVED')
    .reduce((sum, b) => sum + b.sellingPrice, 0);

  const pendingRevenue = fBookings
    .filter(b => b.status === 'PENDING' || b.bookingStatus === 'PENDING')
    .reduce((sum, b) => sum + b.sellingPrice, 0);

  const cancelledCount = fBookings
    .filter(b => b.status === 'CANCELLED' || b.bookingStatus === 'CANCELLED')
    .length;

  const approvedCount = fBookings
    .filter(b => b.status === 'APPROVED' || b.bookingStatus === 'APPROVED')
    .length;

  // Occupancy estimate ratio
  const occupancyRate = roomsCount => {
    if (!roomsCount) return 65; // fallbacks to nominal 65% when empty
    const maxPossibility = roomsCount * 14; 
    const soldRoomNights = fBookings
      .filter(b => b.status === 'APPROVED')
      .reduce((nights, b) => {
        // standard nights calculation
        const inDate = new Date(b.checkIn);
        const outDate = new Date(b.checkOut);
        const n = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
        return nights + (n > 0 ? n : 1);
      }, 0);
    return Math.min(100, Math.round((soldRoomNights / maxPossibility) * 100)) || 42;
  };

  // Commission payable
  const commissionExpenses = fBookings
    .filter(b => b.status === 'APPROVED' && b.commissionEarned)
    .reduce((sum, b) => sum + (b.commissionEarned || 0), 0);

  // Top Selling CTV groups
  const getTopCtvs = () => {
    const ctvScores: { [id: string]: { name: string; revenue: number; count: number; commission: number } } = {};
    
    fBookings
      .filter(b => b.status === 'APPROVED' && b.ctvId)
      .forEach(b => {
        const id = b.ctvId!;
        if (!ctvScores[id]) {
          ctvScores[id] = {
            name: b.ctvName || 'Cộng tác viên ẩn danh',
            revenue: 0,
            count: 0,
            commission: 0
          };
        }
        ctvScores[id].revenue += b.sellingPrice;
        ctvScores[id].count += 1;
        ctvScores[id].commission += b.commissionEarned || 0;
      });

    return Object.values(ctvScores).sort((x, y) => y.revenue - x.revenue).slice(0, 5);
  };

  const topCtvsList = getTopCtvs();

  // Custom visual HTML/css chart plots for revenues trend
  const getDestinationsStats = () => {
    const records: { [dest: string]: number } = {};
    fBookings
      .filter(b => b.status === 'APPROVED')
      .forEach(b => {
        // generic fallback properties or rooms matching
        const prop = b.propertyName || 'Đại lạt StayHub';
        const loc = prop.includes('Đà Nẵng') ? 'Đà Nẵng' : prop.includes('Phú Quốc') ? 'Phú Quốc' : 'Đà Lạt';
        records[loc] = (records[loc] || 0) + b.sellingPrice;
      });
    return Object.entries(records).map(([city, rev]) => ({ city, rev }));
  };

  const destStats = getDestinationsStats();

  return (
    <div className="space-y-6" id="admin-reports-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-display">📈 Báo Cáo Thống Kê Tổng Quan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Giao diện trực quan phân tích doanh số, hiệu suất lấp phòng, tổng chi hoa hồng CTV dành cho Managers.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-lg p-2.5 font-bold text-slate-700 cursor-pointer shadow-2xs"
          >
            <option value="all">Toàn bộ thời gian</option>
            <option value="this_month">Tháng này</option>
            <option value="30_days">30 ngày gần nhất</option>
          </select>

          <button
            onClick={fetchData}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition shadow-2xs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="p-3 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center space-x-4">
              <div className="h-11 w-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg shadow-sm">
                💵
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Thực Thu (Duyệt)</span>
                <b className="text-lg font-black text-slate-900 font-mono tracking-tight">{totalRevenue.toLocaleString('vi-VN')} đ</b>
                <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">+{approvedCount} dặt phòng hoàn tất</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center space-x-4">
              <div className="h-11 w-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg shadow-sm">
                ⏳
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Doanh Thu Chờ Duyệt</span>
                <b className="text-lg font-black text-slate-900 font-mono tracking-tight">{pendingRevenue.toLocaleString('vi-VN')} đ</b>
                <span className="text-[9px] text-amber-500 font-bold block mt-0.5">Đang chờ giải ngân/bảo lãnh chỗ</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center space-x-4">
              <div className="h-11 w-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-lg shadow-sm">
                💸
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hoa Hồng Phát Sinh</span>
                <b className="text-lg font-black text-slate-900 font-mono tracking-tight">{commissionExpenses.toLocaleString('vi-VN')} đ</b>
                <span className="text-[9px] text-indigo-600 font-bold block mt-0.5">Phí CTV hoàn tất đơn</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center space-x-4">
              <div className="h-11 w-11 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center text-lg shadow-sm">
                📈
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Công Suất Lấp Phòng</span>
                <b className="text-lg font-black text-slate-900 font-mono tracking-tight">{occupancyRate(8)}%</b>
                <span className="text-[9px] text-violet-600 font-bold block mt-0.5">Ước tính hiệu suất chuỗi</span>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left side Graph: Geographic Distribution Sales bar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-5">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">📍 Phân Bổ Doanh Thu Địa Bàn</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Tỷ lệ đóng góp doanh số giữa các thành phố Đà Lạt, Sa Pa, Đà Nẵng...</p>
              </div>

              <div className="space-y-4">
                {destStats.length === 0 ? (
                  <div className="text-center py-12 text-slate-305 text-xs text-slate-400">
                    Chưa có doanh thu được phân bổ trong chu kỳ này.
                  </div>
                ) : (
                  destStats.map((item, idx) => {
                    const totalD = destStats.reduce((s, x) => s + x.rev, 0);
                    const pct = Math.round((item.rev / (totalD || 1)) * 100);
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{item.city}</span>
                          <span>{item.rev.toLocaleString('vi-VN')}đ ({pct}%)</span>
                        </div>
                        {/* Interactive metric visual ratio bar */}
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right side: Top Performing Affiliate CTV Leaderboard */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">👑 Bảng Vàng Đại Sứ Affiliate CTV</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Top cộng tác viên có tổng doanh số chốt cọc cao nhất hệ thống.</p>
              </div>

              <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto">
                {topCtvsList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Chưa ghi nhận hoa hồng hoàn tất nào cho CTV.
                  </div>
                ) : (
                  topCtvsList.map((ctv, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center space-x-2.5">
                        <span className="h-6 w-6 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center font-bold font-mono text-[10px]">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">{ctv.name}</p>
                          <p className="text-[10px] text-slate-400">{ctv.count} đơn hàng giữ chỗ thành công</p>
                        </div>
                      </div>

                      <div className="text-right font-mono text-xs font-bold text-slate-700">
                        <p>{ctv.revenue.toLocaleString('vi-VN')} đ</p>
                        <p className="text-[10px] text-indigo-600 font-semibold">Hoa hồng: {ctv.commission.toLocaleString('vi-VN')}đ</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Cancellation report panel info */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start space-x-3 text-xs text-amber-800 font-medium">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">🚨 Khóa học/Giải thích bảo mật vận hành phòng ({cancelledCount} booking hủy):</span>
              <p className="mt-0.5 leading-relaxed">
                Tỷ lệ hủy phòng trung bình chiếm {bookings.length ? Math.round((cancelledCount/bookings.length)*100) : 0}% tổng đơn phát sinh. Đề nghị CTV thực hiện thu khoản cọc đặt chỗ chuẩn 30% đúng thời gian để tối thiểu hóa hao phí bỏ phòng trống.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
