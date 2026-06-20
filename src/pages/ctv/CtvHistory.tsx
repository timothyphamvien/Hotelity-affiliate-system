import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Booking } from '../../types';
import { Search, Calendar, BadgeCheck, XCircle, Clock, ShoppingBag, Eye, Copy, Filter } from 'lucide-react';

export function CtvHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'CANCELLED'>('ALL');
  
  // Selected booking detail modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const list = await api.getBookings();
      setBookings(list);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử booking:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    alert(`Đã sao chép: ${txt}`);
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = (b.customerName || '').toLowerCase().includes(filterSearch.toLowerCase()) || 
                          (b.customerPhone || '').includes(filterSearch) || 
                          (b.roomName || '').toLowerCase().includes(filterSearch.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' ? true : b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" id="ctv-history-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📋 Lịch Sử Đơn Đặt Phòng</h1>
        <p className="text-sm text-slate-500 mt-1">
          Theo dõi tiến độ duyệt đơn, hoa hồng và các ghi chú hủy phòng trực tiếp từ phía Admin.
        </p>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên khách, phòng..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 flex items-center">
            <Filter className="h-3.5 w-3.5 mr-1" /> Trạng thái:
          </span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-xs p-2 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700"
          >
            <option value="ALL">Tất cả đơn hàng</option>
            <option value="PENDING">Chờ Admin duyệt</option>
            <option value="APPROVED">Thành công (Đã duyệt)</option>
            <option value="CANCELLED">Bị từ chối / Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Bookings layout */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <span className="p-3 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
          <ShoppingBag className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-sm">Chưa tìm thấy đơn hàng nào phù hợp.</p>
          <p className="text-xs text-slate-400 mt-1">Lên đơn ngay tại tab "Khảo sát phòng" nhé!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((b) => (
            <div 
              key={b.id}
              className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                    {b.id}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    b.status === 'APPROVED' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' 
                      : b.status === 'CANCELLED' 
                      ? 'bg-rose-50 text-rose-700 border border-rose-250' 
                      : 'bg-amber-50 text-amber-700 border border-amber-250'
                  }`}>
                    {b.status === 'PENDING' && <Clock className="h-3 w-3 mr-1 animate-spin" />}
                    {b.status === 'APPROVED' && <BadgeCheck className="h-3 w-3 mr-1" />}
                    {b.status === 'CANCELLED' && <XCircle className="h-3 w-3 mr-1" />}
                    {b.status === 'APPROVED' ? 'Thành công (Đã duyệt)' : b.status === 'CANCELLED' ? 'Bị từ chối' : 'Chờ duyệt cọc'}
                  </span>
                  <span className="text-xs font-medium text-slate-400 block sm:inline">
                    Lên đơn: {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-sm text-slate-700">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Khách Hàng</span>
                    <p className="font-bold text-slate-800">{b.customerName}</p>
                    <button 
                      onClick={() => handleCopy(b.customerPhone)}
                      className="text-xs font-mono text-indigo-600 hover:underline flex items-center font-medium mt-0.5"
                    >
                      {b.customerPhone} <Copy className="h-3 w-3 ml-1" />
                    </button>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Sản phẩm Homestay/Villa</span>
                    <p className="font-bold text-slate-800">{b.roomName}</p>
                    <span className="text-xs text-slate-500 font-medium block mt-0.5 leading-none">
                      {b.checkIn} đến {b.checkOut}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Tài chính đơn</span>
                    <p className="font-semibold text-xs text-slate-600">
                      Giá bán: <b className="text-slate-800">{(b.sellingPrice || 0).toLocaleString('vi-VN')} đ</b>
                    </p>
                    <p className="font-semibold text-xs text-slate-600 mt-0.5">
                      Giá sàn: {((b.ctvPrice ?? b.basePrice) || 0).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                </div>

                {/* If cancelled - show reason */}
                {b.status === 'CANCELLED' && b.rejectionReason && (
                  <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-lg text-xs text-rose-700 mt-2 block font-medium">
                    📍 <b>Lý do Admin hủy đơn:</b> {b.rejectionReason}
                  </div>
                )}
              </div>

              {/* Commission panel right */}
              <div className="md:text-right flex flex-row md:flex-col md:justify-center justify-between items-center sm:border-l sm:border-dashed sm:border-slate-100 md:pl-6 min-w-[150px] border-t pt-3 md:pt-0 md:border-t-0">
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Thưởng hoa hồng</span>
                  <span className="text-xl font-black text-emerald-600 block tracking-tight mt-0.5">
                    +{b.commissionAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <button
                  onClick={() => setSelectedBooking(b)}
                  className="mt-2 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold rounded-lg text-slate-700 transition cursor-pointer flex items-center"
                >
                  <Eye className="h-3 w-3 mr-1 text-slate-400" />
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail overlay Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-scale-up">
            <div className="bg-indigo-600 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-indigo-500/50 uppercase px-2 py-0.5 rounded font-extrabold font-mono tracking-widest text-indigo-100">
                  MÃ ĐƠN: {selectedBooking.id}
                </span>
                <h3 className="font-extrabold text-lg block mt-1">Thông Tin Hoàn Toàn Chi Tiết</h3>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="text-white bg-indigo-500/30 hover:bg-indigo-500/60 p-1.5 rounded-full text-xs font-bold font-mono h-8 w-8 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Khu Biệt Thự</span>
                  <span className="font-bold text-slate-800 block text-base mt-0.5">{selectedBooking.roomName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Trạng Thái</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${
                    selectedBooking.status === 'APPROVED' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : selectedBooking.status === 'CANCELLED' 
                      ? 'bg-rose-50 text-rose-700' 
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {selectedBooking.status === 'APPROVED' ? 'Đã duyệt thanh toán' : selectedBooking.status === 'CANCELLED' ? 'Đã hủy đơn' : 'Đang xử lý cọc'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Nhận phòng (Check-in)</span>
                  <span className="font-mono text-slate-800 font-semibold block">{selectedBooking.checkIn}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Trả phòng (Check-out)</span>
                  <span className="font-mono text-slate-800 font-semibold block">{selectedBooking.checkOut}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Khách hàng đại diện</span>
                  <span className="font-extrabold text-slate-800 block">{selectedBooking.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Số điện thoại</span>
                  <span className="font-mono text-indigo-600 font-semibold block">{selectedBooking.customerPhone}</span>
                </div>
              </div>

              <div className="space-y-1.5 pb-3 border-b border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Giá bán thực tế (CTV thu):</span>
                  <span className="font-extrabold text-slate-800">{(selectedBooking.sellingPrice || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Giá sàn gốc (Biệt thự thu):</span>
                  <span className="font-bold text-slate-500">{((selectedBooking.ctvPrice ?? selectedBooking.basePrice) || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Phần hoa hồng tỉ lệ gốc:</span>
                  <span className="font-bold text-slate-600">{(((selectedBooking.ctvPrice ?? selectedBooking.basePrice) || 0) * 0.1).toLocaleString('vi-VN')} đ (Ước lượng)</span>
                </div>
                {selectedBooking.sellingPrice > ((selectedBooking.ctvPrice ?? selectedBooking.basePrice) || 0) && (
                  <div className="flex justify-between text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">
                    <span>Lợi nhuận cộng thêm từ chênh lệch nâng giá:</span>
                    <span>+{((selectedBooking.sellingPrice || 0) - ((selectedBooking.ctvPrice ?? selectedBooking.basePrice) || 0)).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-xl">
                <span className="font-extrabold text-indigo-950">Tổng Thưởng CTV Thực Nhận:</span>
                <span className="text-xl font-black text-indigo-700 tracking-tight">
                  {selectedBooking.commissionAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>

              {selectedBooking.note && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs border border-slate-100 text-slate-600 leading-relaxed">
                  💬 <b>Yêu cầu đặc biệt:</b> {selectedBooking.note}
                </div>
              )}

              {selectedBooking.status === 'CANCELLED' && selectedBooking.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-slate-200 text-xs font-semibold rounded-lg text-rose-700 leading-relaxed">
                  ⚠️ <b>Lý do hủy từ Admin:</b> {selectedBooking.rejectionReason}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="py-1 px-4 bg-slate-200 hover:bg-slate-350 font-bold text-xs rounded-lg text-slate-700 transition cursor-pointer"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
