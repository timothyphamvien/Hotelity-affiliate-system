import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Customer, Booking } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, UserPlus, Search, Phone, Mail, FileText, 
  Clock, DollarSign, ArrowRight, CornerDownRight, CheckSquare, Plus, Sparkles
} from 'lucide-react';

export function CtvCustomers({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [bookImmediately, setBookImmediately] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State for New Customer Pre-Registration
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    identityNumber: '',
    note: ''
  });

  const fetchCtvCustomers = async () => {
    try {
      setLoading(true);
      const list = await api.getCustomers();
      // Filter list so CTV only sees customers that are theirs (this field is flagged 'isMine' inside the mock endpoint)
      setCustomers(list);
    } catch (err) {
      console.error('Lỗi tải tệp khách hàng CTV:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCtvCustomers();
  }, []);

  const handleHandleQuickBook = (c: any) => {
    sessionStorage.setItem('pre_selected_booking_customer', JSON.stringify(c));
    if (onNavigate) {
      onNavigate('ctv_rooms');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone) {
      alert('Vui lòng điền Họ tên và Số điện thoại!');
      return;
    }

    try {
      const saved = await api.createCustomer({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        identityNumber: form.identityNumber,
        note: form.note || 'Tạo trước bởi CTV.',
        gender: 'Khác',
        tags: ['Khách CTV'],
        files: []
      });

      alert('Đăng ký trước thông tin khách sỉ thành công! Quý khách đã có trong danh bạ.');
      setIsModalOpen(false);
      setForm({ fullName: '', phone: '', email: '', identityNumber: '', note: '' });
      fetchCtvCustomers();

      if (bookImmediately) {
        sessionStorage.setItem('pre_selected_booking_customer', JSON.stringify(saved || { fullName: form.fullName, phone: form.phone, email: form.email, identityNumber: form.identityNumber }));
        if (onNavigate) {
          onNavigate('ctv_rooms');
        }
      }
    } catch (err: any) {
      alert('Không thể tạo mới hồ sơ: ' + err.message);
    }
  };

  // Filter list
  const filtered = customers.filter(c => {
    const isMatched = (c.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
                     (c.phone || '').includes(search) ||
                     (c.email || '').toLowerCase().includes(search.toLowerCase());
    return isMatched;
  });

  // Calculate my customers vs other customers (basic dashboard)
  const myCustomers = filtered.filter(c => c.isMine);
  const guestDirectory = filtered.filter(c => !c.isMine);

  return (
    <div className="space-y-6" id="ctv-customers-view">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-600" />
            <span>🤝 Danh Phân Hệ Khách Hàng Gửi Tại StayHub</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem lịch trình đặt chỗ cũ, tổng giá trị đơn, số tiền chênh lệch hoa hồng bạn từng kiếm được từ tệp khách quen của mình.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg inline-flex items-center space-x-2 shadow cursor-pointer transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Đăng Ký Trước Thông Tin Khách</span>
        </button>
      </div>

      {/* SEARCH BOX */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase">Tìm nhanh khách hàng</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Nhập tên số điện thoại hoặc email để lọc danh bạ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-3 pr-10 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
          />
          <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#2F4A3D] text-white p-4 rounded-xl shadow-sm text-left relative overflow-hidden">
          <span className="text-[10px] text-zinc-300 font-extrabold uppercase block tracking-wider">Khách Sỉ Của Bạn</span>
          <span className="text-2xl font-black block mt-1">{myCustomers.length} người</span>
          <p className="text-[11px] text-zinc-300 mt-1">Là những khách đã có đơn hàng thành công do bạn giới thiệu.</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm text-left">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Khách Khác Trong Hệ Thống</span>
          <span className="text-2xl font-black text-slate-700 block mt-1">{guestDirectory.length} người</span>
          <p className="text-[11px] text-slate-400 mt-1">Các khách sỉ chung của chuỗi. Bạn vẫn có thể chọn đặt phòng hộ cho họ.</p>
        </div>
      </div>

      {/* DIRECTORY SECTION */}
      <div className="space-y-4">
        
        {/* Section 1: My introduced Customers */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest text-left">
            ⭐ Khách quen do chính bạn trực tiếp khai thác ({myCustomers.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <p className="text-xs text-slate-400 italic py-6">Đang truy vấn dữ liệu từ bộ lưu trữ...</p>
            ) : myCustomers.length === 0 ? (
              <div className="col-span-2 p-10 text-center bg-white border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                Chưa có hồ sơ khách sỉ nào thuộc quyền quản lý của bạn. Bấm tạo đơn hoặc đăng ký trước khách quen ở trên nhé!
              </div>
            ) : (
              myCustomers.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-left space-y-3">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800">{c.fullName}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">ID: {c.id}</p>
                    </div>
                    {c.tags && c.tags.length > 0 && (
                      <span className="bg-indigo-50 text-indigo-700 font-extrabold uppercase text-[9px] px-2 py-0.5 rounded-full">
                        {c.tags[0]}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600">
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-mono font-bold text-slate-700">{c.phone}</span>
                    </div>
                    {c.email && (
                      <div className="flex items-center space-x-1 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                  </div>

                  {c.note && (
                    <p className="text-[11px] bg-slate-50 border border-slate-100 p-2 rounded text-slate-500">
                      <b>Lưu ý sở thích:</b> {c.note}
                    </p>
                  )}

                  {/* Booking details linked to this CTV showing order history */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">🛒 Lịch sử chốt đơn với bạn:</span>
                    
                    {/* Basic view of orders with you */}
                    <div className="bg-[#FAF8F5]/80 p-2.5 rounded-lg border border-orange-100 space-y-2">
                      <div className="flex justify-between items-center text-xs text-slate-700">
                        <span className="font-semibold block">Đồng bộ tự động</span>
                        <span className="text-[10px] text-emerald-700 font-bold font-mono">Đã ghi nhận</span>
                      </div>
                      <p className="text-[11px] text-slate-500 italic block">
                        Để tra cứu doanh thu và xem thông tin chi tiết hóa đơn thanh toán, vui lòng truy vấn "Lịch Sử Đơn Đặt" trên thanh trình đơn.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleHandleQuickBook(c)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg shadow-6xs transition flex items-center justify-center space-x-1.5 text-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                    <span>⚡ Đặt Phòng Cho Khách Này</span>
                  </button>

                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: General system directory */}
        <div className="space-y-3 pt-4">
          <h2 className="text-xs font-extrabold text-[#2F4A3D] uppercase tracking-widest text-left">
            👥 Danh bạ khách chung trong toàn chuỗi ({guestDirectory.length})
          </h2>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {guestDirectory.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400 italic">Trống.</p>
            ) : (
              guestDirectory.map((c) => (
                <div key={c.id} className="p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between text-left gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">{c.fullName}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">SĐT: {c.phone} | email: {c.email || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleHandleQuickBook(c)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded text-[10px] shadow-6xs transition"
                    >
                      ⚡ Giữ Chỗ Ngay
                    </button>
                    <span className="bg-slate-100 text-slate-650 font-bold py-0.5 px-2 rounded text-[9px] uppercase tracking-wider block self-start sm:self-auto">
                      Trong danh bạ
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* NEW CUSTOMER REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/55 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 text-left space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase flex items-center space-x-1">
                <Users className="h-5 w-5 text-indigo-600" />
                <span>Đăng Ký Trước Thông Tin Khách Gửi</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold font-mono"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase block">Họ và tên khách hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Anh Nguyễn Quốc Trung"
                  value={form.fullName}
                  onChange={(e) => setForm({...form, fullName: e.target.value})}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase block">Số điện thoại khách hàng *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ví dụ: 0948******"
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase block">Thư điện tử (Email)</label>
                  <input
                    type="email"
                    placeholder="khachhang@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase block">Căn cước công dân (CCCD)</label>
                  <input
                    type="text"
                    placeholder="Số CCCD..."
                    value={form.identityNumber}
                    onChange={(e) => setForm({...form, identityNumber: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase block">Ghi chú sở thích hoặc lưu ý phòng hờ</label>
                <textarea
                  placeholder="Khách hay hút thuốc, thích phòng sạch, không tầng cao..."
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({...form, note: e.target.value})}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 text-slate-600 py-2 px-4 rounded-lg font-bold hover:bg-slate-200 text-xs"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  onClick={() => setBookImmediately(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 py-2 px-4 rounded-lg font-bold text-xs"
                >
                  Lưu Thông Tin
                </button>
                <button
                  type="submit"
                  onClick={() => setBookImmediately(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-bold text-xs flex items-center gap-1"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  ⚡ Đăng Ký & Đặt Phòng Ngay
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
