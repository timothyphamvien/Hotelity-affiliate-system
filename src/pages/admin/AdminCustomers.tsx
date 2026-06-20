import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Customer, Booking } from '../../types';
import { 
  Users, UserPlus, Search, Edit2, Trash2, Calendar, 
  DollarSign, Mail, Phone, FileText, ChevronRight, Tags, 
  User, UserCheck, Shield, Clock, FileUp, X, CheckSquare, ExternalLink,
  Sparkles, ArrowRight
} from 'lucide-react';

export function AdminCustomers({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [bookImmediately, setBookImmediately] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('ALL');

  // Interactive details modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailedCustomer, setDetailedCustomer] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    id: '',
    fullName: '',
    phone: '',
    email: '',
    identityNumber: '',
    gender: 'Nam',
    address: '',
    note: '',
    tagsText: ''
  });

  // Upload Dossier States
  const [newFileName, setNewFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const list = await api.getCustomers();
      setCustomers(list);
    } catch (err) {
      console.error('Lỗi tải danh sách khách hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const selectCustomerForDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      setSelectedCustomerId(id);
      const data = await api.getCustomerById(id);
      setDetailedCustomer(data);
    } catch (err) {
      console.error('Lỗi tải chi tiết khách hàng:', err);
      alert('Không nhận được hồ sơ chuyên sâu.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCustomerForm({
      id: '',
      fullName: '',
      phone: '',
      email: '',
      identityNumber: '',
      gender: 'Nam',
      address: '',
      note: '',
      tagsText: 'VIP'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setIsEditing(true);
    setCustomerForm({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      email: c.email || '',
      identityNumber: c.identityNumber || '',
      gender: c.gender || 'Nam',
      address: c.address || '',
      note: c.note || '',
      tagsText: c.tags?.join(', ') || ''
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.fullName || !customerForm.phone) {
      alert('Vui lòng điền đầy đủ Tên và SĐT.');
      return;
    }

    const payload = {
      fullName: customerForm.fullName,
      phone: customerForm.phone,
      email: customerForm.email,
      identityNumber: customerForm.identityNumber,
      gender: customerForm.gender,
      address: customerForm.address,
      note: customerForm.note,
      tags: customerForm.tagsText.split(',').map(t => t.trim()).filter(Boolean)
    };

    try {
      let savedCust;
      if (isEditing) {
        savedCust = await api.updateCustomer(customerForm.id, payload);
        alert('Cập nhật thông tin khách sỉ thành công!');
      } else {
        savedCust = await api.createCustomer(payload);
        alert('Đăng ký khách sỉ mới thành công!');
      }
      setIsModalOpen(false);
      fetchCustomers();
      if (detailedCustomer && detailedCustomer.id === customerForm.id) {
        selectCustomerForDetails(customerForm.id);
      }

      if (bookImmediately) {
        sessionStorage.setItem('pre_selected_booking_customer', JSON.stringify(savedCust || { ...payload, id: 'temp_' + Date.now() }));
        if (onNavigate) {
          onNavigate('admin_bookings_new');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu hồ sơ khách hàng.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn chắc chắn muốn xóa hồ sơ khách hàng này khỏi hệ thống quản lý? Các lịch sử đặt phòng cũ vẫn được bảo lưu.')) {
      try {
        await api.deleteCustomer(id);
        alert('Đã xóa hồ sơ khách thành công!');
        if (selectedCustomerId === id) {
          setSelectedCustomerId(null);
          setDetailedCustomer(null);
        }
        fetchCustomers();
      } catch (err: any) {
        alert(err.message || 'Không thể xóa khách.');
      }
    }
  };

  const handleAddDossierFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    if (!detailedCustomer) return;

    try {
      setUploading(true);
      const newFiles = [
        ...(detailedCustomer.files || []),
        {
          name: newFileName.trim(),
          url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80',
          uploadedAt: new Date().toISOString()
        }
      ];

      const updated = await api.updateCustomer(detailedCustomer.id, {
        files: newFiles
      });

      alert('Đính kèm file báo cáo/CCCD thành công!');
      setNewFileName('');
      setDetailedCustomer({
        ...detailedCustomer,
        files: updated.files
      });
      fetchCustomers();
    } catch (err: any) {
      alert('Không đăng tài liệu lên được: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDossierFile = async (fileName: string) => {
    if (!detailedCustomer) return;
    if (!confirm('Xóa file đính kèm này?')) return;

    try {
      const newFiles = (detailedCustomer.files || []).filter((f: any) => f.name !== fileName);
      const updated = await api.updateCustomer(detailedCustomer.id, {
        files: newFiles
      });
      setDetailedCustomer({
        ...detailedCustomer,
        files: updated.files
      });
      fetchCustomers();
    } catch (err: any) {
      alert('Lỗi khi xóa file.');
    }
  };

  // Compile unique tags for filter
  const allTags = Array.from(
    new Set(
      customers.flatMap(c => c.tags || [])
    )
  );

  const filteredCustomers = customers.filter(c => {
    const term = search.toLowerCase();
    const matchTxt = (c.fullName || '').toLowerCase().includes(term) ||
                     (c.phone || '').includes(term) ||
                     (c.email || '').toLowerCase().includes(term) ||
                     (c.identityNumber || '').includes(term);

    const matchTag = filterTag === 'ALL' ? true : c.tags?.includes(filterTag);
    return matchTxt && matchTag;
  });

  return (
    <div className="space-y-6" id="admin-customers-hub">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Users className="h-7 w-7 text-[#C58B5C]" />
            <span>👥 Quản Lý Khách Hàng Chuyên Sâu</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi tiểu sử khách sỉ, lịch sử đặt villa, thống kê doanh thu và xác định CTV mang nguồn khách đến.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-[#C58B5C] hover:bg-[#B3794D] text-white text-xs font-bold py-2.5 px-4 rounded-lg inline-flex items-center space-x-2 shadow cursor-pointer transition self-start md:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Thêm Mới Khách Hàng</span>
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/85 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên SĐT, email, CCCD..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C58B5C] font-semibold"
          />
        </div>

        <div>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C58B5C] font-bold text-slate-700"
          >
            <option value="ALL">🔖 Tất cả nhãn nhóm (Tags)</option>
            {allTags.map((t: any) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 flex items-center justify-end px-1 font-bold">
          Hiển thị: <span className="text-slate-800 ml-1 mr-1">{filteredCustomers.length}</span> khách sỉ
        </div>
      </div>

      {/* MASTER-DETAIL SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Customer Listing (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          <div className="bg-slate-50 border-b border-slate-100 p-3 px-4 flex justify-between items-center">
            <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">Danh sách hồ sơ</h2>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">Thực tế</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-bold animate-pulse">
                Đang nạp phân hệ khách hàng từ database...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Không tìm thấy khách hàng nào khớp với bộ lọc.
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = selectedCustomerId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => selectCustomerForDetails(c.id)}
                    className={`p-4 transition cursor-pointer text-left flex justify-between items-start ${
                      isSelected ? 'bg-amber-50/50 border-l-4 border-l-[#C58B5C]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-bold text-xs text-slate-800">{c.fullName}</h3>
                        {c.gender === 'Nữ' ? (
                          <span className="text-pink-500 text-[10px]">♀</span>
                        ) : c.gender === 'Nam' ? (
                          <span className="text-blue-500 text-[10px]">♂</span>
                        ) : null}
                      </div>

                      <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                        <div className="flex items-center space-x-1 text-slate-600 font-semibold">
                          <Phone className="h-3 w-3" />
                          <span>{c.phone}</span>
                        </div>
                        {c.email && (
                          <div className="text-[10px] text-slate-400">{c.email}</div>
                        )}
                      </div>

                      {/* Tags list */}
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {c.tags.slice(0, 3).map((tg: string) => (
                            <span 
                              key={tg} 
                              className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded-sm font-bold capitalize"
                            >
                              {tg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      {/* total dollars */}
                      {c.totalSpent !== undefined && (
                        <span className="block text-[11px] font-bold text-[#2F4A3D]">
                          {c.totalSpent.toLocaleString('vi-VN')} đ
                        </span>
                      )}
                      {c.totalOrders !== undefined && (
                        <span className="block text-[10px] text-slate-400 font-mono text-right">
                          {c.totalOrders} đơn
                        </span>
                      )}
                      
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sessionStorage.setItem('pre_selected_booking_customer', JSON.stringify(c));
                            if (onNavigate) onNavigate('admin_bookings_new');
                          }}
                          className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-1.5 py-1 rounded shadow-6xs transition"
                          title="Đặt phòng ngay"
                        >
                          ⚡ Đặt phòng
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(c);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold px-1.5 py-1 bg-slate-100 rounded"
                          title="Sửa thông tin"
                        >
                          Sửa
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Customer Dossier Detail Panel (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#C58B5C]/35 shadow-md overflow-hidden min-h-[500px]">
          {!selectedCustomerId ? (
            <div className="p-16 text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-amber-50 text-[#C58B5C]">
                <Users className="h-10 w-10" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Chọn Một Khách Sỉ Để Xem Hồ Sơ Chi Tiết</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Nhấp chuột vào danh sách khách sỉ bên trái để kiểm tra doanh thu lũy kế, tệp hồ sơ đính kèm và nhận diện CTV giới thiệu của khách.
              </p>
            </div>
          ) : loadingDetails ? (
            <div className="p-20 text-center animate-pulse space-y-3">
              <Clock className="w-8 h-8 text-[#C58B5C] mx-auto animate-spin" />
              <p className="text-xs text-slate-500 font-bold">Hãy đợi giây lát... Hệ thống đang kết xuất dữ liệu lịch sử</p>
            </div>
          ) : !detailedCustomer ? (
            <div className="p-8 text-center text-slate-400 text-xs">Phục hồi lỗi nạp dữ liệu.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              
              {/* Detailed Header Section */}
              <div className="p-6 bg-slate-50 relative">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[9px] bg-[#C58B5C] text-white px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest">
                      HỒ SƠ KHÁCH HÀNG CHUYÊN SÂU
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-800 flex items-center space-x-2">
                      <span>{detailedCustomer.fullName}</span>
                      <span className="text-slate-400 text-xs font-mono font-medium">({detailedCustomer.id})</span>
                    </h2>
                    <p className="text-xs text-slate-500 flex items-center space-x-1">
                      <span>Giới tính: <b>{detailedCustomer.gender || 'Khác'}</b></span>
                      {detailedCustomer.address && (
                        <span> | Địa chỉ: <b>{detailedCustomer.address}</b></span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    <button
                      onClick={() => {
                        sessionStorage.setItem('pre_selected_booking_customer', JSON.stringify(detailedCustomer));
                        if (onNavigate) onNavigate('admin_bookings_new');
                      }}
                      className="p-1.5 px-3 text-xs bg-emerald-600 font-extrabold text-white hover:bg-emerald-700 rounded-lg shadow-6xs transition flex items-center gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>Đặt Phòng Ngay</span>
                    </button>
                    <button
                      onClick={() => openEditModal(detailedCustomer)}
                      className="p-1.5 text-xs text-indigo-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-bold"
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => handleDelete(detailedCustomer.id)}
                      className="p-1.5 text-xs text-red-600 bg-white border border-slate-200 hover:bg-red-50 rounded-lg font-bold"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-left">
                    <span className="text-slate-400 block text-[10px]">Số điện thoại</span>
                    <span className="font-bold text-slate-700 font-mono">{detailedCustomer.phone}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-left">
                    <span className="text-slate-400 block text-[10px]">Căn cước công dân</span>
                    <span className="font-bold text-slate-700 font-mono text-[11px]">{detailedCustomer.identityNumber || 'Chưa cung cấp'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-left">
                    <span className="text-slate-400 block text-[10px]">Tổng lượt phòng</span>
                    <span className="font-extrabold text-slate-700 text-[13px]">{detailedCustomer.bookings?.length || 0} lần đặt</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-left">
                    <span className="text-slate-400 block text-[10px]">Doanh số chi trả</span>
                    <span className="font-extrabold text-emerald-800 text-[13px]">
                      {(detailedCustomer.bookings?.filter((b: any) => b.status === 'APPROVED' || b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed').reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0) || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                {detailedCustomer.note && (
                  <div className="mt-3 bg-amber-50 text-amber-900 border border-amber-200/50 rounded-lg p-2.5 text-xs text-left">
                    <b>Chú thích nội bộ:</b> {detailedCustomer.note}
                  </div>
                )}
              </div>

              {/* Dossier Files/Attachments section */}
              <div className="p-6">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-3 text-left">
                  📂 Tài liệu, CCCD & Giấy tờ đính kèm
                </h3>
                
                <div className="space-y-3">
                  <form onSubmit={handleAddDossierFile} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tên file tài liệu (ví dụ: CCCD_MatTruoc.jpg, ToTrinhSieuKhach.pdf)..."
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#C58B5C]"
                    />
                    <button
                      type="submit"
                      disabled={uploading || !newFileName.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 rounded-lg flex-shrink-0 cursor-pointer disabled:opacity-50 transition"
                    >
                      <FileUp className="h-4 w-4 inline mr-1" />
                      Lưu File
                    </button>
                  </form>

                  {(detailedCustomer.files && detailedCustomer.files.length > 0) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {detailedCustomer.files.map((file: any, index: number) => (
                        <div key={index} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100 text-xs">
                          <div className="flex items-center space-x-2 truncate">
                            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                            <a href={file.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline hover:text-indigo-800 text-xs font-bold truncate">
                              {file.name}
                            </a>
                          </div>
                          <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                            <span>{file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : ''}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDossierFile(file.name)}
                              className="text-red-500 hover:text-red-700 p-0.5"
                              title="Xóa tệp"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic text-left">Chưa có tài liệu đính kèm nào cho hồ sơ khách sỉ này.</p>
                  )}
                </div>
              </div>

              {/* BOOKINGS HISTORY WITH SOURCE ("Khách từ ai, đặt gì, bao nhiêu tiền") */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest text-left">
                    🛒 Lịch sử mua sắm & Thanh toán chi tiết
                  </h3>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                    Đã đồng bộ đơn hàng
                  </span>
                </div>

                <div className="space-y-3">
                  {!detailedCustomer.bookings || detailedCustomer.bookings.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                      Khách hàng sỉ này chưa có đơn đặt phòng nào hoàn tất hoặc đang xử lý.
                    </div>
                  ) : (
                    detailedCustomer.bookings.map((ord: any) => (
                      <div key={ord.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-left space-y-2.5 transition">
                        
                        {/* Title, Code and Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-black text-indigo-900">{ord.bookingCode || 'ĐƠN CHƯA CÓ MÃ'}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                                ord.status === 'APPROVED' || ord.status === 'confirmed' || ord.status === 'completed'
                                  ? 'bg-[#EAF5EE] text-[#2F4A3D]'
                                  : ord.status === 'CANCELLED' || ord.status === 'cancelled'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                {ord.status === 'APPROVED' || ord.status === 'confirmed' ? 'Đã duyệt' : ord.status === 'CANCELLED' || ord.status === 'cancelled' ? 'Hủy bỏ' : 'Chờ duyệt'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {ord.propertyName} - <b className="text-slate-700">{ord.roomName}</b>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black text-[#2F4A3D]">{(ord.totalAmount || 0).toLocaleString('vi-VN')} đ</span>
                            <div className="text-[9px] text-slate-400 font-bold font-mono">
                              Checkin: {new Date(ord.checkIn).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        </div>

                        {/* Order analysis: Referring source ("Khách từ ai") and order specifications */}
                        <div className="border-t border-slate-200/60 pt-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                          <div className="sm:col-span-4 space-y-0.5 text-left">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">CTV giới thiệu</span>
                            <span className="font-bold text-[#C58B5C] flex items-center space-x-1">
                              <UserCheck className="h-3 w-3 inline shrink-0" />
                              <span>{ord.ctvName || 'Admin Trực Tiếp'}</span>
                            </span>
                          </div>

                          <div className="sm:col-span-4 space-y-0.5 text-left">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Đặt ngày nào</span>
                            <span className="font-semibold text-slate-600 font-mono text-[11px]">
                              {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('vi-VN') : 'Lâu năm'}
                            </span>
                          </div>

                          <div className="sm:col-span-4 space-y-0.5 text-left">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Trạng thái thanh toán</span>
                            <span className={`font-extrabold text-[11px] ${
                              ord.paymentStatus === 'paid' || ord.paymentStatus === 'PAID'
                                ? 'text-green-600'
                                : ord.paymentStatus === 'deposit_paid' || ord.paymentStatus === 'DEPOSIT_PAID'
                                ? 'text-amber-600'
                                : 'text-red-600'
                            }`}>
                              {ord.paymentStatus === 'paid' || ord.paymentStatus === 'PAID' ? 'Đã thanh toán đủ' : ord.paymentStatus === 'deposit_paid' || ord.paymentStatus === 'DEPOSIT_PAID' ? 'Đợi thu nốt tiền cọc' : 'Chưa thanh toán'}
                            </span>
                          </div>
                        </div>

                        {/* Payment analytics ledger values */}
                        <div className="bg-slate-100 p-2.5 rounded-lg grid grid-cols-3 gap-2 text-center text-[10px] uppercase font-bold">
                          <div className="text-left text-slate-500">
                            Giá trị phòng: <span className="text-slate-800 font-mono block">{(ord.sellingPrice || 0).toLocaleString('vi-VN')}đ</span>
                          </div>
                          <div className="text-slate-500">
                            Phụ phí: <span className="text-slate-800 font-mono block">{(ord.surcharge || 0).toLocaleString('vi-VN')}đ</span>
                          </div>
                          <div className="text-right text-slate-500">
                            Khách đã chuyển: <span className="text-emerald-800 font-mono block font-black">{(ord.paidAmount || 0).toLocaleString('vi-VN')}đ</span>
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* FORM DIALOG MODAL (ADD / EDIT CUSTOMER) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-scale-up text-left space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5 uppercase">
                <Users className="h-5 w-5 text-[#C58B5C]" />
                <span>{isEditing ? 'Sửa thông tin khách sỉ' : 'Đăng ký thêm hồ sơ khách sỉ mới'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Đóng [x]
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Họ và tên khách *</label>
                  <input
                    type="text"
                    required
                    value={customerForm.fullName}
                    onChange={(e) => setCustomerForm({...customerForm, fullName: e.target.value})}
                    placeholder="Nguyễn Kỳ Duyên"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                    placeholder="0901..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Email liên hệ</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                    placeholder="kyduyen@gmail.com"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Căn cước công dân (CCCD)</label>
                  <input
                    type="text"
                    value={customerForm.identityNumber}
                    onChange={(e) => setCustomerForm({...customerForm, identityNumber: e.target.value})}
                    placeholder="079..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Giới tính</label>
                  <select
                    value={customerForm.gender}
                    onChange={(e) => setCustomerForm({...customerForm, gender: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C]"
                  >
                    <option value="Nam">Nam (♂)</option>
                    <option value="Nữ">Nữ (♀)</option>
                    <option value="Khác">Khác / Độc bản</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Nhãn nhóm (Phân cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={customerForm.tagsText}
                    onChange={(e) => setCustomerForm({...customerForm, tagsText: e.target.value})}
                    placeholder="VIP, Đoàn Gia Đình, Thân thiết"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block uppercase">Địa chỉ cư trú</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                  placeholder="Quận 1, TP. Hồ Chí Minh"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block uppercase">Yêu cầu đặc trưng / Chú thích khi nghỉ dưỡng</label>
                <textarea
                  rows={2}
                  value={customerForm.note}
                  onChange={(e) => setCustomerForm({...customerForm, note: e.target.value})}
                  placeholder="Khách siêu VIP, thích phòng nhiều cây cảnh, ưa sạch sẽ cực đoan."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg cursor-pointer transition text-xs"
                >
                  Bỏ Qua
                </button>
                <button
                  type="submit"
                  onClick={() => setBookImmediately(false)}
                  className="bg-[#C58B5C] hover:bg-[#B3794D] text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition text-xs"
                >
                  {isEditing ? 'Lưu Thay Đổi' : 'Đăng Ký Hồ Sơ'}
                </button>
                {!isEditing && (
                  <button
                    type="submit"
                    onClick={() => setBookImmediately(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition text-xs flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    ⚡ Đăng Ký & Đặt Phòng Ngay
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
