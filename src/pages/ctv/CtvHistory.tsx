import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Booking } from '../../types';
import { 
  Search, Calendar, BadgeCheck, XCircle, Clock, ShoppingBag, Eye, Copy, 
  Filter, Grid, List, Edit2, CheckCircle, AlertCircle, DollarSign, Users,
  MapPin, ClipboardCheck, ArrowRightLeft, MessageSquare, Plus, CheckSquare
} from 'lucide-react';

export function CtvHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Interactive filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'CANCELLED'>('ALL');
  const [filterDebt, setFilterDebt] = useState<'ALL' | 'UNPAID' | 'COMPLETED'>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>('ALL');

  // Selected booking detail modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [depositSetup, setDepositSetup] = useState<any>(null);

  // Quick edit form state
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    guests: 1,
    note: ''
  });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const list = await api.getBookings();
      setBookings(list);

      // Async loading of payment accounts
      const setup = await api.getDepositAccounts();
      if (setup) setDepositSetup(setup);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử giao dịch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    alert(`Đã sao chép vào bộ nhớ tạm: ${txt}`);
  };

  const handleOpenDetail = (b: Booking) => {
    setSelectedBooking(b);
    setIsEditing(false);
    setEditForm({
      customerName: b.customerName || '',
      customerPhone: b.customerPhone || '',
      guests: b.guests || 1,
      note: b.note || ''
    });
  };

  const handleSaveBasicUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    if (!editForm.customerName || !editForm.customerPhone) {
      alert('Vui lòng điền họ tên khách hàng và số điện thoại liên lạc!');
      return;
    }

    try {
      const updated = await api.updateBooking(selectedBooking.id, {
        customerName: editForm.customerName,
        customerPhone: editForm.customerPhone,
        guests: Number(editForm.guests),
        note: editForm.note
      });

      alert('Đồng bộ thông tin cơ bản đơn đặt hàng thành công!');
      setSelectedBooking(updated);
      setIsEditing(false);
      fetchBookings();
    } catch (err: any) {
      alert('Không sửa được thông tin đơn hàng này: ' + err.message);
    }
  };

  // Compile dynamic options
  const uniqueMonths = Array.from(new Set(bookings.map(b => (b.checkIn || '').slice(0, 7)))).sort();

  // Filter Logic
  const filteredBookings = bookings.filter(b => {
    // 1. Text Search
    const matchesSearch = (b.customerName || '').toLowerCase().includes(filterSearch.toLowerCase()) || 
                          (b.customerPhone || '').includes(filterSearch) || 
                          (b.roomName || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
                          (b.id || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
                          (b.bookingCode || '').toLowerCase().includes(filterSearch.toLowerCase());

    // 2. Status Filter
    const matchesStatus = filterStatus === 'ALL' ? true : b.status === filterStatus;

    // 3. Debt/Balance Filter
    const totalCost = (b.sellingPrice || 0) + (b.surcharge || 0);
    const paid = b.paidAmount || 0;
    const isDebt = totalCost - paid > 0 && b.status === 'APPROVED';
    const matchesDebt = filterDebt === 'ALL' ? true :
                        filterDebt === 'UNPAID' ? isDebt : !isDebt;

    // 4. Month filter
    const matchesMonth = filterMonth === 'ALL' ? true : b.checkIn.startsWith(filterMonth);

    return matchesSearch && matchesStatus && matchesDebt && matchesMonth;
  });

  return (
    <div className="space-y-6" id="ctv-transaction-history-suite">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center space-x-2">
            <ArrowRightLeft className="h-6 w-6 text-indigo-600 animate-pulse" />
            <span>📈 Sổ Cái Giao Dịch & Quản Lý Đơn Đặt</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Theo dõi chi tiết đại lý cọc phòng, xem phân tách doanh thu chênh lệch và sửa đổi nhanh thông tin khách lưu trú.
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Text input */}
          <div className="md:col-span-4 relative">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Tra đơn hàng</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm Mã đơn, Tên khách, SĐT, Homestay..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full text-xs pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
              />
              <Search className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Status Select */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Trạng thái duyệt cọc</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-705 focus:outline-none"
            >
              <option value="ALL">📋 Tất cả đơn hàng</option>
              <option value="PENDING">⏳ Chờ duyệt cọc</option>
              <option value="APPROVED">✅ Đã duyệt duyệt (Đã giữ phòng)</option>
              <option value="CANCELLED">❌ Bị từ chối / Đã hủy đơn</option>
            </select>
          </div>

          {/* Debt Balance Select */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Theo dõi công nợ đơn</label>
            <select
              value={filterDebt}
              onChange={(e) => setFilterDebt(e.target.value as any)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-705 focus:outline-none"
            >
              <option value="ALL">💰 Tất cả trạng thái công nợ</option>
              <option value="UNPAID">🔴 Đơn hàng còn nợ tiền</option>
              <option value="COMPLETED">🟢 Đơn hàng đã thu đủ</option>
            </select>
          </div>

          {/* Month selective filter */}
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Kỳ check-in</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-705 focus:outline-none"
            >
              <option value="ALL">📅 Tất cả kỳ</option>
              {uniqueMonths.map(m => {
                const mStr = String(m);
                return (
                  <option key={mStr} value={mStr}>Tháng {mStr.slice(5, 7)}/{mStr.slice(0, 4)}</option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Counts & view modes */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2 text-xs">
          <div className="text-slate-500 font-bold">
            Bộ lọc tìm thấy: <span className="text-indigo-600 font-black">{filteredBookings.length}</span> giao dịch đại lý
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg flex items-center space-x-1 font-bold ${
                viewMode === 'grid' 
                  ? 'bg-white text-indigo-650 shadow-xs border border-slate-200/40' 
                  : 'text-slate-500 hover:text-slate-750'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span className="text-[10px]">Dạng lưới</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg flex items-center space-x-1 font-bold ${
                viewMode === 'list' 
                  ? 'bg-white text-indigo-650 shadow-xs border border-slate-200/40' 
                  : 'text-slate-500 hover:text-slate-750'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="text-[10px]">Dạng bảng</span>
            </button>
          </div>
        </div>
      </div>

      {/* CORE TRANSACTIONS GRAPHIC PANEL */}
      {loading ? (
        <div className="p-20 text-center animate-pulse space-y-3 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <Clock className="h-10 w-10 text-indigo-600 mx-auto animate-spin" />
          <p className="text-xs text-slate-500 font-bold font-mono">Đang truy xuất ngân phiếu & cọc phòng sỉ...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-400">
          <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-3 animate-bounce" />
          <h3 className="text-sm font-extrabold text-slate-800">Không tìm thấy đơn hàng nào</h3>
          <p className="text-xs text-slate-450 max-w-md mx-auto mt-1">
            Không tìm thấy đơn giao dịch nào trùng khớp. Hoặc do bạn chưa tạo đặt phòng. Nhận khách du lịch ngay để trải nghiệm nhé!
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* GRID VIEW LAYOUT */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((b) => {
            const totalCost = (b.sellingPrice || 0) + (b.surcharge || 0);
            const paid = b.paidAmount || 0;
            const isOwe = totalCost - paid > 0 && b.status === 'APPROVED';

            return (
              <div 
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-left group"
              >
                <div className="space-y-3.5">
                  
                  {/* Status header */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-mono bg-indigo-50 font-black text-indigo-800 px-1.5 py-0.5 rounded tracking-wide">
                        MD: {b.bookingCode || b.id}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">
                        {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      b.status === 'APPROVED' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-250/50' 
                        : b.status === 'CANCELLED' 
                        ? 'bg-rose-50 text-rose-700 border border-rose-250/50' 
                        : 'bg-amber-50 text-amber-700 border border-amber-250/50'
                    }`}>
                      {b.status === 'APPROVED' ? 'Đã duyệt' : b.status === 'CANCELLED' ? 'Từ chối' : 'Chờ duyệt'}
                    </span>
                  </div>

                  {/* Customer / Room properties */}
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-black">Khách lưu trú</span>
                      <p className="font-extrabold text-slate-800">{b.customerName}</p>
                      <button 
                        onClick={() => handleCopy(b.customerPhone)}
                        className="text-[10px] font-mono text-indigo-650 hover:underline inline-flex items-center font-bold mt-0.5"
                      >
                        {b.customerPhone}
                      </button>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-black">Sản phẩm căn hộ</span>
                      <p className="font-bold text-indigo-950 truncate">{b.roomName}</p>
                      <span className="text-[11px] text-slate-500 font-bold block mt-0.5 font-mono">
                        📅 {b.checkIn} → {b.checkOut}
                      </span>
                    </div>

                    {b.guests && (
                      <div className="flex items-center space-x-1 font-semibold text-slate-500">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>Quy mô: <b>Lưu trú {b.guests} khách</b></span>
                      </div>
                    )}
                  </div>

                  {/* Pricing / Commission stats card */}
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Giá đại lý thu:</span>
                      <span className="font-black text-slate-800 font-mono">{totalCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Thực trả cọc:</span>
                      <span className="font-bold text-emerald-700 font-mono">{paid.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {isOwe && (
                      <div className="flex justify-between border-t border-dashed border-rose-200 pt-1 text-rose-600 font-bold">
                        <span>Cần thu hồi nợ:</span>
                        <span className="font-black font-mono">{(totalCost - paid).toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                      <span className="font-black text-slate-600">Hoa hồng bỏ túi:</span>
                      <span className="font-black text-indigo-650 font-mono">+{b.commissionAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  {/* Incase of denial, prompt with caution alert */}
                  {b.status === 'CANCELLED' && b.rejectionReason && (
                    <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-700 font-bold">
                      🔴 <b>Lỗi duyệt giữ phòng:</b> {b.rejectionReason}
                    </div>
                  )}

                </div>

                {/* Card actions */}
                <div className="pt-3.5 border-t border-slate-100 mt-4 flex items-center justify-end">
                  <button
                    onClick={() => handleOpenDetail(b)}
                    className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 border border-slate-250/20 text-indigo-705 font-bold text-[11px] rounded-lg cursor-pointer transition flex items-center gap-1 w-full justify-center"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Xem & Chỉnh Sửa Cơ Bản</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        
        /* TABLE LIST SPREADSHEET STYLE WORKFLOW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-semibold text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-4 font-black">Đặt phòng</th>
                  <th scope="col" className="p-4 font-black">Lưu trú / Homestay</th>
                  <th scope="col" className="p-4 font-black">Lịch check-in</th>
                  <th scope="col" className="p-4 font-black">Tài chính (đ)</th>
                  <th scope="col" className="p-4 font-black">Đại diện khách</th>
                  <th scope="col" className="p-4 font-black">Hoa hồng (đ)</th>
                  <th scope="col" className="p-4 font-black text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredBookings.map((b) => {
                  const grossTotal = (b.sellingPrice || 0) + (b.surcharge || 0);
                  const paidAmt = b.paidAmount || 0;
                  const leftAmt = Math.max(0, grossTotal - paidAmt);
                  
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4">
                        <span className="font-bold text-indigo-950 font-mono block">#{b.bookingCode || b.id}</span>
                        <span className="text-[10px] text-slate-400 block">{new Date(b.createdAt).toLocaleDateString('vi-VN')}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{b.roomName}</td>
                      <td className="p-4 font-mono text-slate-500">{b.checkIn} → {b.checkOut}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-900 font-mono">{grossTotal.toLocaleString('vi-VN')}</p>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                          Đã cọc: <span className="text-emerald-700 font-bold font-mono">{paidAmt.toLocaleString('vi-VN')}</span>
                          {leftAmt > 0 && b.status === 'APPROVED' && (
                            <span className="text-rose-500 font-bold font-mono ml-1">(Nợ: {leftAmt.toLocaleString('vi-VN')})</span>
                          )}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-extrabold text-slate-800">{b.customerName}</p>
                        <span className="text-[10px] text-slate-400 font-mono block font-bold">{b.customerPhone}</span>
                      </td>
                      <td className="p-4 text-emerald-700 font-black font-mono">+{b.commissionAmount.toLocaleString('vi-VN')}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(b)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1.5 px-2.5 rounded-lg font-bold text-[11px] transition inline-flex items-center space-x-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAILED LEDGER OVERLAY AND METADATA EDIT MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-250/50 flex flex-col text-left animate-in fade-in zoom-in-95 duration-150">
            
            {/* Overlay Header */}
            <div className="bg-indigo-650 text-white p-6 relative">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] bg-indigo-500/50 uppercase px-2.5 py-0.5 rounded-md font-extrabold tracking-widest text-indigo-100 font-mono">
                    MÃ ĐƠN GIAO DỊCH: {selectedBooking.id}
                  </span>
                  <p className="text-[10px] text-indigo-200 mt-1">Đăng ký vào kỳ: {new Date(selectedBooking.createdAt).toLocaleString('vi-VN')}</p>
                  <h2 className="text-lg font-black mt-1">Chi Tiết Bản Kế Toán & Giao Nhận Phòng</h2>
                </div>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer transition text-xs font-mono font-bold"
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            {/* Content Core Scroll pane */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] text-xs">
              
              {/* STATUS INDICATOR CARD */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[9px] text-slate-400 font-black uppercase block">Villa / Homestay tuyển dụng</span>
                  <span className="font-extrabold text-slate-800 text-sm block mt-0.5">{selectedBooking.roomName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-black uppercase block">Tiến độ phê duyệt cọc</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mt-1 ${
                    selectedBooking.status === 'APPROVED' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-250/50' 
                      : selectedBooking.status === 'CANCELLED' 
                      ? 'bg-rose-50 text-rose-700 border border-rose-250/50' 
                      : 'bg-amber-50 text-amber-700 border border-amber-250/50'
                  }`}>
                    {selectedBooking.status === 'APPROVED' ? 'Đã duyệt giữ phòng' : selectedBooking.status === 'CANCELLED' ? 'Hủy' : 'Chờ duyệt'}
                  </span>
                </div>
              </div>

              {/* DOCKET METADATA EDIT SUB-SECTION OR FORM DISPLAY */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-black text-slate-800 text-xs flex items-center space-x-1.5 uppercase">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                    <span>Hiệu chỉnh thông tin cọc phòng</span>
                  </h4>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-250/30 px-2.5 py-1.5 rounded-lg font-bold text-[10px]"
                    >
                      Sửa nhanh Khách / Ghi chú
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSaveBasicUpdates} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase">Đại diện khách</label>
                        <input
                          type="text"
                          required
                          value={editForm.customerName}
                          onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase">Số liên hệ (SĐT)</label>
                        <input
                          type="text"
                          required
                          value={editForm.customerPhone}
                          onChange={(e) => setEditForm({...editForm, customerPhone: e.target.value})}
                          className="w-full p-2 bg-white border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-505 font-mono font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase">Quy mô số khách</label>
                        <input
                          type="number"
                          min={1}
                          max={35}
                          required
                          value={editForm.guests}
                          onChange={(e) => setEditForm({...editForm, guests: Number(e.target.value)})}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase">Ghi chú đặc thù / dịch vụ</label>
                        <input
                          type="text"
                          value={editForm.note}
                          onChange={(e) => setEditForm({...editForm, note: e.target.value})}
                          placeholder="Yêu cầu set-up bàn trà..."
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="py-1 px-3 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="py-1 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
                      >
                        💾 Lưu thay đổi
                      </button>
                    </div>

                  </form>
                ) : (
                  <div className="space-y-2.5 font-medium text-slate-600">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">Họ tên khách</span>
                        <span className="font-bold text-slate-800 text-[13px]">{selectedBooking.customerName}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">SĐT liên lạc</span>
                        <span className="font-bold text-indigo-700 text-[13px] font-mono">{selectedBooking.customerPhone}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">Số lượng khách nghỉ</span>
                        <span className="font-bold text-slate-750 block">{selectedBooking.guests || 1} người lớn</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">Giao nhận phòng</span>
                        <span className="font-bold text-slate-750 block">{selectedBooking.checkIn} đến {selectedBooking.checkOut}</span>
                      </div>
                    </div>

                    {selectedBooking.note && (
                      <div className="p-2 border border-slate-200/50 rounded-xl bg-indigo-50/50">
                        <span className="text-[9px] text-slate-400 block font-bold leading-none">Lời dặn / Yêu cầu homestay:</span>
                        <p className="text-slate-700 italic block mt-1 font-semibold">{selectedBooking.note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* DETAILED GENERAL LEDGER SPECIFICATIONS */}
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <h4 className="font-black text-slate-400 uppercase tracking-widest text-[9px] text-left">Tổng quan cơ cấu dòng tiền</h4>
                
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-semibold">Giá bán hoàn thiện (Đại lý kê khai):</span>
                  <span className="font-black text-slate-800 font-mono text-sm">
                    {((selectedBooking.sellingPrice || 0) + (selectedBooking.surcharge || 0)).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-100/60">
                  <span className="text-slate-500 font-semibold">Giá sàn quy ước (Chuỗi biệt thự áp):</span>
                  <span className="font-bold text-slate-500 font-mono">
                    {((selectedBooking.ctvPrice ?? selectedBooking.basePrice) || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 font-bold">
                  <span className="text-slate-500 font-bold">Thực tế khách đã chuyển cọc:</span>
                  <span className="font-black text-emerald-700 font-mono">
                    {(selectedBooking.paidAmount || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {/* Calculate and render residual collection balance representing co-debts */}
                {((selectedBooking.sellingPrice || 0) + (selectedBooking.surcharge || 0) - (selectedBooking.paidAmount || 0)) > 0 && selectedBooking.status === 'APPROVED' && (
                  <div className="flex justify-between items-center p-2.5 bg-rose-50 border border-rose-100 rounded-xl font-bold text-rose-800">
                    <span>Số dư công nợ còn nợ cần thu:</span>
                    <span className="font-black font-mono">
                      {((selectedBooking.sellingPrice || 0) + (selectedBooking.surcharge || 0) - (selectedBooking.paidAmount || 0)).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center bg-indigo-50 p-3.5 rounded-2xl mt-3">
                  <span className="font-black text-indigo-950 text-xs">Hoa hồng thực nhận của CTV:</span>
                  <span className="text-lg font-black text-indigo-750 font-mono">
                    {selectedBooking.commissionAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Dynamic VietQR Payment Integration for Pending Reservations */}
              {selectedBooking.status === 'PENDING' && (() => {
                if (!depositSetup) return null;
                const ch = depositSetup.activeChannel || 'PLATFORM';
                let bank: any = null;
                let typeText = '';
                if (ch === 'CTV') {
                  bank = depositSetup.ctvAccount;
                  typeText = 'Tài khoản CTV cá nhân';
                } else if (ch === 'HOME_OWNER') {
                  bank = depositSetup.homeOwnerAccount;
                  typeText = 'Tài khoản Chủ Home';
                } else {
                  bank = depositSetup.platformAccount;
                  typeText = 'Đại diện chuỗi Làng Bình Yên';
                }

                if (!bank || !bank.bankAccount || !bank.bankName) {
                  return (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[10px] text-slate-500 leading-relaxed text-left">
                      💡 Thiếp lập sẵn <b>Kênh Nhận Cọc</b> thụ hưởng thụ động tại <span className="font-bold text-indigo-700">Trang chủ / Cài đặt</span> để hệ thống kết nối mã VietQR đặt chỗ thanh toán tự động cho đơn của khách nhé!
                    </div>
                  );
                }

                const suggestAmt = ((selectedBooking.sellingPrice || 0) + (selectedBooking.surcharge || 0)) >= 2000000 ? 1000000 : 500000;
                const qrSrc = `https://img.vietqr.io/image/${bank.bankName.replace(/\s+/g, '')}-${bank.bankAccount}-compact2.png?amount=${suggestAmt}&addInfo=${encodeURIComponent('YEU CAU COC PHONG ' + selectedBooking.id)}&accountName=${encodeURIComponent(bank.bankHolder)}`;

                return (
                  <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-3xl space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">⚡ Thanh toán nhận cọc qua dịch vụ VietQR</span>
                      <span className="text-[9px] bg-emerald-100/60 px-2 py-0.5 rounded text-emerald-800 font-extrabold">{typeText}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="bg-white border text-center border-slate-100 rounded-2xl p-2.5 max-w-[130px] shadow-sm shrink-0">
                        <img 
                          src={qrSrc} 
                          alt="VietQR code" 
                          className="w-full h-auto aspect-square object-contain mx-auto"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[8px] text-slate-400 font-mono font-bold block uppercase mt-1 font-sans">Quét nhanh</span>
                      </div>
                      <div className="flex-1 space-y-1 text-slate-705 leading-relaxed font-sans text-xs">
                        <p className="font-semibold">Ngân hàng: <span className="font-extrabold uppercase text-indigo-950">{bank.bankName}</span></p>
                        <p className="font-semibold">Số tài khoản: <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">{bank.bankAccount}</span></p>
                        <p className="font-semibold">Chủ sở hữu: <span className="font-bold text-slate-800 uppercase">{bank.bankHolder}</span></p>
                        <p className="font-extrabold text-slate-900 mt-2">Số tiền cọc cần chuyển: {suggestAmt.toLocaleString('vi-VN')} đ</p>
                        <button
                          type="button"
                          onClick={() => {
                            const clipStr = `Thông tin thanh toán cọc phòng ${selectedBooking.roomName}:\nNgân hàng: ${bank.bankName}\nSTK: ${bank.bankAccount}\nNgười nhận: ${bank.bankHolder}\nSố tiền: ${suggestAmt.toLocaleString('vi-VN')}đ\nNội dung CK: COC PHONG ${selectedBooking.id}`;
                            handleCopy(clipStr);
                          }}
                          className="mt-2 text-[9px] py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black transition cursor-pointer uppercase tracking-wider flex items-center gap-1.5 justify-center w-full"
                        >
                          📋 Sao chép thông tin chuyển khoản
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dynamic error / Cancellation alerts logs */}
              {selectedBooking.status === 'CANCELLED' && selectedBooking.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-slate-200 text-xs font-semibold rounded-lg text-rose-700 leading-relaxed text-left">
                  📍 <b>Nhật ký Admin từ chối duyệt:</b> {selectedBooking.rejectionReason}
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="bg-slate-50 p-4 px-6 flex justify-end shrink-0 border-t border-slate-100">
              <button
                onClick={() => setSelectedBooking(null)}
                className="py-1 px-4 bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold text-xs rounded-xl transition"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
