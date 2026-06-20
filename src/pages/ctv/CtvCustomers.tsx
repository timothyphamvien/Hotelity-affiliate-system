import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Customer, Booking } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, UserPlus, Search, Phone, Mail, FileText, 
  Clock, DollarSign, Plus, Sparkles, Grid, List, 
  ShieldAlert, BadgeCheck, XCircle, ChevronRight, 
  Trash2, Edit2, CreditCard, NotebookTabs, Info, FileUp, X, CheckSquare, Eye
} from 'lucide-react';

export function CtvCustomers({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Search & Filter State
  const [searchText, setSearchText] = useState('');
  const [filterDebt, setFilterDebt] = useState<'ALL' | 'DEBT' | 'PAID'>('ALL');
  const [filterTag, setFilterTag] = useState<string>('ALL');
  const [filterGender, setFilterGender] = useState<string>('ALL');

  // Selected customer for detail views
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailedCustomer, setDetailedCustomer] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailTab, setDetailTab] = useState<'basic' | 'history' | 'finance' | 'invoice' | 'docs'>('basic');

  // Edit / Add Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    id: '',
    fullName: '',
    phone: '',
    email: '',
    identityNumber: '',
    gender: 'Nam',
    address: '',
    note: '',
    tagsText: 'Thân thiết',
    companyName: '',
    taxCode: '',
    invoiceAddress: '',
    invoiceEmail: '',
    rating: 5,
    credibilityNote: ''
  });

  // Attachments State
  const [newFileName, setNewFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchCtvCustomers = async () => {
    try {
      setLoading(true);
      const list = await api.getCustomers();
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

  const selectCustomerForDetails = async (c: Customer) => {
    try {
      setLoadingDetails(true);
      setSelectedCustomer(c);
      setDetailTab('basic');
      const data = await api.getCustomerById(c.id);
      setDetailedCustomer(data);
    } catch (err) {
      console.error('Lỗi tải thông tin chi tiết khách hàng sỉ:', err);
      // Fallback local calculation
      setDetailedCustomer({
        ...c,
        bookings: []
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleQuickBook = (c: any) => {
    sessionStorage.setItem('pre_selected_booking_customer', JSON.stringify(c));
    if (onNavigate) {
      onNavigate('ctv_rooms');
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setForm({
      id: '',
      fullName: '',
      phone: '',
      email: '',
      identityNumber: '',
      gender: 'Nam',
      address: '',
      note: '',
      tagsText: 'Khách CTV',
      companyName: '',
      taxCode: '',
      invoiceAddress: '',
      invoiceEmail: '',
      rating: 5,
      credibilityNote: ''
    });
    setIsFormOpen(true);
  };

  const openEditModalFromDetails = (c: any) => {
    setIsEditing(true);
    setForm({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      email: c.email || '',
      identityNumber: c.identityNumber || '',
      gender: c.gender || 'Nam',
      address: c.address || '',
      note: c.note || '',
      tagsText: c.tags?.join(', ') || '',
      companyName: c.companyName || '',
      taxCode: c.taxCode || '',
      invoiceAddress: c.invoiceAddress || '',
      invoiceEmail: c.invoiceEmail || '',
      rating: c.rating || 5,
      credibilityNote: c.credibilityNote || ''
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone) {
      alert('Vui lòng điền Họ tên và Số điện thoại!');
      return;
    }

    const payload = {
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      identityNumber: form.identityNumber,
      gender: form.gender,
      address: form.address,
      note: form.note,
      tags: form.tagsText.split(',').map(t => t.trim()).filter(Boolean),
      companyName: form.companyName,
      taxCode: form.taxCode,
      invoiceAddress: form.invoiceAddress,
      invoiceEmail: form.invoiceEmail,
      rating: form.rating,
      credibilityNote: form.credibilityNote
    };

    try {
      if (isEditing) {
        const saved = await api.updateCustomer(form.id, payload);
        alert('Cập nhật thông tin khách sỉ thành công!');
        // Refresh details
        if (selectedCustomer && selectedCustomer.id === form.id) {
          selectCustomerForDetails(saved);
        }
      } else {
        await api.createCustomer(payload);
        alert('Đăng ký khách sỉ mới thành công! Khách hàng đã được lưu trữ an toàn.');
      }
      setIsFormOpen(false);
      fetchCtvCustomers();
    } catch (err: any) {
      alert('Không thể hoàn tất thao tác: ' + err.message);
    }
  };

  const handleUpdateBillingSubForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedCustomer) return;
    try {
      const saved = await api.updateCustomer(detailedCustomer.id, {
        companyName: detailedCustomer.companyName,
        taxCode: detailedCustomer.taxCode,
        invoiceAddress: detailedCustomer.invoiceAddress,
        invoiceEmail: detailedCustomer.invoiceEmail
      });
      alert('Đồng bộ hóa đơn thuế VAT cho công ty thành công!');
      setDetailedCustomer(saved);
      fetchCtvCustomers();
    } catch (err: any) {
      alert('Lỗi cập nhật hóa đơn: ' + err.message);
    }
  };

  const handleAddFileAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !detailedCustomer) return;

    try {
      setUploading(true);
      const newFiles = [
        ...(detailedCustomer.files || []),
        {
          name: newFileName.trim(),
          url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80',
          uploadedAt: new Date().toISOString()
        }
      ];

      const updated = await api.updateCustomer(detailedCustomer.id, {
        files: newFiles
      });

      alert('Đính kèm file căn cước / tài liệu giao lưu khách hàng thành công!');
      setNewFileName('');
      setDetailedCustomer({
        ...detailedCustomer,
        files: updated.files
      });
      fetchCtvCustomers();
    } catch (err: any) {
      alert('Lỗi đính kèm: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFileAttachment = async (filename: string) => {
    if (!detailedCustomer || !confirm('Bạn chắc chắn muốn gỡ tài liệu đính kèm này?')) return;
    try {
      const newFiles = (detailedCustomer.files || []).filter((f: any) => f.name !== filename);
      const updated = await api.updateCustomer(detailedCustomer.id, {
        files: newFiles
      });
      setDetailedCustomer({
        ...detailedCustomer,
        files: updated.files
      });
      fetchCtvCustomers();
    } catch (err: any) {
      alert('Lỗi gỡ tệp tài liệu.');
    }
  };

  // Compile local metrics for lists
  const processedList = customers.map(c => {
    // We compute total spent and bookings history client-side for immediate filter response
    const tags = c.tags || [];
    return {
      ...c,
      tags
    };
  });

  // Filter Logic
  const filtered = processedList.filter(c => {
    // 1. Text Search
    const term = searchText.toLowerCase();
    const matchesText = (c.fullName || '').toLowerCase().includes(term) ||
                        (c.phone || '').includes(term) ||
                        (c.email || '').toLowerCase().includes(term) ||
                        (c.identityNumber || '').includes(term);

    // 2. Gender Filter
    const matchesGender = filterGender === 'ALL' ? true : c.gender === filterGender;

    // 3. Tag Filter
    const matchesTag = filterTag === 'ALL' ? true : c.tags?.includes(filterTag);
    
    return matchesText && matchesGender && matchesTag;
  });

  // Extract unique tags for dropdown
  const uniqueTags = Array.from(new Set(customers.flatMap(c => c.tags || [])));

  return (
    <div className="space-y-6" id="ctv-customers-deep-portal">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-600 animate-pulse" />
            <span>🤝 Hệ Quản Trị Khách Hàng Gửi Quốc Phục</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Phân hệ độc quyền bảo mật dữ liệu. Khách của bạn chỉ bạn mới có quyền tra cứu, cập nhật thông tin hóa đơn và theo dõi công nợ chi tiết.
          </p>
        </div>
        
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2.5 px-4 rounded-xl inline-flex items-center space-x-1.5 shadow-lg shadow-indigo-600/15 cursor-pointer transition"
        >
          <UserPlus className="h-4 w-4" />
          <span>Đăng Ký Khách Hàng Mới</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Quick Search */}
          <div className="md:col-span-6 relative">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Tìm kiếm hồ sơ</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm nhanh theo Họ tên, SĐT, Email hoặc số CCCD..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full text-xs pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
              />
              <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Tag Select */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Nhóm thẻ (Tag)</label>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-705 focus:outline-none"
            >
              <option value="ALL">📌 Tất cả thẻ danh bạ</option>
              {uniqueTags.map(t => (
                <option key={t} value={t}>🔖{t}</option>
              ))}
            </select>
          </div>

          {/* Gender filter */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Giới tính</label>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-705 focus:outline-none"
            >
              <option value="ALL">👥 Tất cả giới tính</option>
              <option value="Nam">Nam (♂)</option>
              <option value="Nữ">Nữ (♀)</option>
              <option value="Khác">Khác / Không tiết lộ</option>
            </select>
          </div>
        </div>

        {/* View Switcher and Total Counts */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2 text-xs">
          <div className="text-slate-500 font-bold">
            Bộ lọc tìm thấy: <span className="text-indigo-600 font-black">{filtered.length}</span> hồ sơ khách hàng gửi
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

      {/* MAIN DATA STREAM */}
      {loading ? (
        <div className="p-20 text-center animate-pulse space-y-3 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <Clock className="h-10 w-10 text-indigo-600 mx-auto animate-spin" />
          <p className="text-xs text-slate-500 font-bold">Vui lòng đón chờ dữ liệu bảo mật từ máy chủ biệt thự...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-400">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3 animate-bounce" />
          <h3 className="text-sm font-extrabold text-slate-800">Không Tìm Thấy Hồ Sơ Khách Hàng Nào</h3>
          <p className="text-xs text-slate-450 max-w-md mx-auto mt-1">
            Không tìm thấy hồ sơ nào trùng khớp với bộ lọc dữ liệu. Đừng quên bạn chỉ được xem các khách hàng sỉ do chính tài khoản của bạn đặt chỗ hoặc đăng ký trước.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* GRID VIEW MODE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div 
              key={c.id} 
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-left group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-xs text-indigo-950 flex items-center gap-1.5">
                      <span>{c.fullName}</span>
                      {c.gender === 'Nữ' && <span className="text-pink-500 font-black text-xs shrink-0 font-mono">♀</span>}
                      {c.gender === 'Nam' && <span className="text-blue-500 font-black text-xs shrink-0 font-mono">♂</span>}
                    </h3>
                    
                    {/* Stars rating rendering */}
                    <div className="flex items-center space-x-0.5 pt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span 
                          key={star} 
                          className={`text-sm ${
                            star <= (c.rating || 5) ? 'text-amber-400 font-bold' : 'text-slate-200'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>

                    <p className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">Mã số hồ sơ: {c.id}</p>
                  </div>
                  <span className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[9px] px-2 py-0.5 rounded-md tracking-wider">
                    Chính chủ CTV
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-bold text-slate-750 font-mono">{c.phone}</span>
                  </div>
                  {c.email && (
                    <div className="flex items-center space-x-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.identityNumber && (
                    <div className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-500">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      <span>CCCD: {c.identityNumber}</span>
                    </div>
                  )}
                </div>

                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {c.tags.map(t => (
                      <span key={t} className="text-[9px] bg-slate-100 border border-slate-200/50 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {c.note && (
                  <p className="text-[10px] bg-indigo-50/45 text-slate-600 border border-slate-150 p-2 rounded-lg italic">
                    <b>Lưu ý:</b> {c.note}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectCustomerForDetails(c)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] rounded-lg cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Eye className="h-3 w-3" />
                  <span>Hồ Sơ Chi Tiết</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleQuickBook(c)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-lg flex items-center justify-center space-x-1 shadow-md shadow-indigo-600/10 cursor-pointer"
                  title="Đặt phòng ngay cho vị khách này"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                  <span>⚡ Đơn Nhanh</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        
        /* TABLE LIST VIEW MODE (TABULAR EXCEL STYLE) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-semibold text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-4 font-black">Khách hàng</th>
                  <th scope="col" className="p-4 font-black">Số điện thoại</th>
                  <th scope="col" className="p-4 font-black">Địa chỉ Email</th>
                  <th scope="col" className="p-4 font-black">Căn cước công dân</th>
                  <th scope="col" className="p-4 font-black">Nhóm phân loại</th>
                  <th scope="col" className="p-4 font-black">Xếp hạng uy tín</th>
                  <th scope="col" className="p-4 font-black text-right">Quản lý thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4">
                      <div className="font-extrabold text-slate-800 flex items-center space-x-1.5">
                        <span>{c.fullName}</span>
                        {c.gender === 'Nam' && <span className="text-blue-500 font-black">♂</span>}
                        {c.gender === 'Nữ' && <span className="text-pink-500 font-black">♀</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">ID: {c.id}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-650 font-bold">{c.phone}</td>
                    <td className="p-4 text-slate-500 truncate max-w-[150px]">{c.email || <span className="italic text-slate-350">Trống</span>}</td>
                    <td className="p-4 font-mono text-slate-500">{c.identityNumber || <span className="italic text-slate-350">Chưa cung cấp</span>}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[170px]">
                        {c.tags && c.tags.length > 0 ? (
                          c.tags.map(t => (
                            <span key={t} className="text-[9px] bg-slate-100 border text-slate-605 font-bold px-1 rounded-sm capitalize">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="italic text-slate-400 text-[10px]">Chưa gắn tag</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {/* Stars display */}
                      <div className="flex items-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span 
                            key={star} 
                            className={`text-slate-200 text-xs ${
                              star <= (c.rating || 5) ? 'text-amber-400' : ''
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      {c.credibilityNote && (
                        <span className="text-[9px] text-slate-400 block font-normal italic truncate max-w-[140px] mt-0.5" title={c.credibilityNote}>
                          {c.credibilityNote}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => selectCustomerForDetails(c)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1.5 px-2.5 rounded-lg font-bold text-[11px] transition inline-flex items-center space-x-1"
                        >
                          <NotebookTabs className="h-3.5 w-3.5" />
                          <span>Mở hồ sơ sâu</span>
                        </button>
                        <button
                          onClick={() => handleQuickBook(c)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-2 rounded-lg font-black text-[11px] transition inline-flex items-center"
                          title="Đặt phòng ngay"
                        >
                          ⚡ Đặt phòng
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE TABS DETAILED MODAL */}
      {selectedCustomer && detailedCustomer && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-250/50 flex flex-col max-h-[95vh] text-left animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header bar */}
            <div className="bg-slate-900 text-white p-6 pb-4 relative border-b border-indigo-950/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] bg-indigo-500/30 uppercase px-2.5 py-0.5 rounded-md font-extrabold tracking-widest text-indigo-200 font-mono">
                      Hồ sơ mật: {detailedCustomer.id}
                    </span>
                    {detailedCustomer.gender && (
                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded font-bold text-slate-300">
                        Giới tính: {detailedCustomer.gender}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white">{detailedCustomer.fullName}</h2>
                  <p className="text-xs text-slate-300 font-semibold flex items-center space-x-2">
                    <span>Sđt: <b>{detailedCustomer.phone}</b></span>
                    {detailedCustomer.email && <span> | Email: <b>{detailedCustomer.email}</b></span>}
                  </p>
                </div>
                
                <button
                  onClick={() => { setSelectedCustomer(null); setDetailedCustomer(null); }}
                  className="text-white hover:text-slate-300 bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer transition text-xs font-mono font-bold"
                >
                  ✕ Đóng
                </button>
              </div>

              {/* TAB SELECTOR TRAY */}
              <div className="flex items-center space-x-1 mt-6 overflow-x-auto scrollbar-none pb-1">
                <button
                  onClick={() => setDetailTab('basic')}
                  className={`py-2 px-3.5 rounded-lg text-xs font-black shrink-0 transition ${
                    detailTab === 'basic' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  👤 1. Thông Tin Cơ Bản
                </button>
                <button
                  onClick={() => setDetailTab('history')}
                  className={`py-2 px-3.5 rounded-lg text-xs font-black shrink-0 transition ${
                    detailTab === 'history' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  📅 2. Đặt Phòng & Lưu Trú
                </button>
                <button
                  onClick={() => setDetailTab('finance')}
                  className={`py-2 px-3.5 rounded-lg text-xs font-black shrink-0 transition ${
                    detailTab === 'finance' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  💳 3. Thanh Toán & Công Nợ
                </button>
                <button
                  onClick={() => setDetailTab('invoice')}
                  className={`py-2 px-3.5 rounded-lg text-xs font-black shrink-0 transition ${
                    detailTab === 'invoice' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  🧾 4. Hóa Đơn Doanh Nghiệp
                </button>
                <button
                  onClick={() => setDetailTab('docs')}
                  className={`py-2 px-3.5 rounded-lg text-xs font-black shrink-0 transition ${
                    detailTab === 'docs' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  📂 5. Giấy Tờ & Files
                </button>
              </div>
            </div>

            {/* Tab contents scroll pane */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-700 max-h-[65vh]">
              
              {loadingDetails ? (
                <div className="py-20 text-center animate-pulse space-y-2">
                  <Clock className="h-8 w-8 text-indigo-600 mx-auto animate-spin" />
                  <p className="text-xs text-slate-500 font-bold">Vui lòng đợi giây lát... Đang truy vết hồ sơ cọc phòng, công nợ</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: BASIC INFORMATION */}
                  {detailTab === 'basic' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">Thông tin tiểu sử & Ghi chú nhanh</h3>
                        <button
                          onClick={() => openEditModalFromDetails(detailedCustomer)}
                          className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1 bg-indigo-50 py-1.5 px-3 rounded-lg"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Chỉnh Sửa Toàn Diện</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase font-black">Họ và tên khách hàng</span>
                          <span className="font-extrabold text-slate-800 block text-sm">{detailedCustomer.fullName}</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase font-black">Số điện thoại liên lạc</span>
                          <span className="font-bold text-slate-800 font-mono block text-sm">{detailedCustomer.phone}</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase font-black">Địa chỉ Email cá nhân</span>
                          <span className="font-medium text-slate-800 block text-sm">{detailedCustomer.email || 'Chưa quy hoạch'}</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase font-black">Căn cước công dân (CCCD)</span>
                          <span className="font-bold text-slate-850 font-mono block text-sm">{detailedCustomer.identityNumber || 'Chưa điền thông tin'}</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 sm:col-span-2">
                          <span className="text-[10px] text-slate-400 uppercase font-black">Địa chỉ lưu trú thường trú</span>
                          <span className="font-semibold text-slate-700 block text-sm">{detailedCustomer.address || 'Chưa cung cấp'}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl text-left space-y-1.5">
                        <span className="text-[9px] text-amber-800 uppercase font-black tracking-widest block">Đặc trưng & Lưu ý của khách sỉ</span>
                        <p className="text-xs text-slate-700 tracking-wide leading-relaxed font-medium">
                          {detailedCustomer.note || 'Không có ghi chú đặc biệt nào dành cho quý vị khách này.'}
                        </p>
                      </div>

                      {/* Display Credibility Stars in Details Modal */}
                      <div className="p-4 bg-teal-50/40 border border-teal-100 rounded-2xl text-left space-y-2">
                        <span className="text-[9px] text-teal-800 uppercase font-black tracking-widest block flex items-center gap-1">⭐ ĐÁNH GIÁ ĐỘ UY TÍN KHÁCH HÀNG</span>
                        <div className="flex items-center space-x-1.5">
                          <div className="flex items-center space-x-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span 
                                key={star} 
                                className={`text-sm ${
                                  star <= (detailedCustomer.rating || 5) ? 'text-amber-400' : 'text-slate-200'
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 font-mono">({detailedCustomer.rating || 5}/5 sao)</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          <span className="font-bold text-slate-700">Lịch sử đánh giá:</span> {detailedCustomer.credibilityNote || 'Chưa có chú thích phản hồi uy tín.'}
                        </p>
                      </div>

                      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                        <div className="space-y-1">
                          <h4 className="font-black text-xs text-indigo-950 flex items-center gap-1">
                            <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                            <span>Vào Đặt Phòng Hộ Nhanh Chóng</span>
                          </h4>
                          <p className="text-[11px] text-indigo-800 leading-tight">
                            Mã khách hàng và thông tin liên hệ được lưu tạm vào máy, hệ thống tự điền khi chuyển sang tab giữ phòng.
                          </p>
                        </div>
                        <button
                          onClick={() => handleQuickBook(detailedCustomer)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2 px-4 rounded-xl flex items-center space-x-1 shadow shadow-indigo-600/15"
                        >
                          <span>Lên Giữ Phòng Ngay</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: LODGING & BOOKING TIMELINE */}
                  {detailTab === 'history' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">Phân kỳ lưu trú & Booking đã đồng bộ</h3>
                        <span className="text-[10px] text-slate-400 block font-bold">Lũy kế: {detailedCustomer.bookings?.length || 0} lần đặt</span>
                      </div>

                      {!detailedCustomer.bookings || detailedCustomer.bookings.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs italic">
                          Chưa có lịch trình lưu trú hay lịch sử giao dịch nghỉ dưỡng nào được ghi nhận cho vị khách này.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {detailedCustomer.bookings.map((bk: any) => {
                            // Calculate lodging status based on date and booking status
                            const todayStr = new Date().toISOString().split('T')[0];
                            let lodgingState = 'Sắp nhận phòng (Chưa check-in)';
                            let badgeStyle = 'bg-slate-100 border border-slate-200 text-slate-700';

                            if (bk.status === 'CANCELLED' || bk.status === 'cancelled') {
                              lodgingState = 'Đã hủy dịch vụ';
                              badgeStyle = 'bg-rose-50 border border-rose-100 text-rose-700';
                            } else {
                              if (todayStr < bk.checkIn) {
                                lodgingState = 'Sắp nhận phòng (Tương lai)';
                                badgeStyle = 'bg-amber-50 border border-amber-100 text-amber-700';
                              } else if (todayStr >= bk.checkIn && todayStr <= bk.checkOut) {
                                lodgingState = '🔥 Đang trong kỳ lưu trú';
                                badgeStyle = 'bg-indigo-50 border border-indigo-150 text-indigo-700 animate-pulse';
                              } else {
                                lodgingState = '✅ Hoàn tất lưu trú (Đã check-out)';
                                badgeStyle = 'bg-emerald-50 border border-emerald-100 text-emerald-700';
                              }
                            }

                            return (
                              <div key={bk.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl text-left space-y-2">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                                  <div>
                                    <span className="text-[10px] font-mono bg-indigo-50 font-black text-indigo-800 px-1.5 py-0.5 rounded">
                                      {bk.bookingCode || bk.id}
                                    </span>
                                    <h4 className="font-extrabold text-xs text-slate-800 block mt-1">{bk.roomName}</h4>
                                  </div>
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${badgeStyle}`}>
                                    {lodgingState}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-slate-500 pt-1">
                                  <span>Thời gian cư trú: <b>{bk.checkIn} đến {bk.checkOut}</b></span>
                                  <span>Số đêm nghỉ: <b>Ngủ ở lại {bk.id === 'bk_demo_1' ? '2' : '1'} đêm</b></span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: PAYMENTS & FINANCIAL LEDGER (CO-DEBT) */}
                  {detailTab === 'finance' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs text-left">Đại lý cân đối kế toán & Công nợ phải thu</h3>
                      </div>

                      {(() => {
                        const stays = detailedCustomer.bookings || [];
                        const validStays = stays.filter((b: any) => b.status !== 'CANCELLED' && b.status !== 'cancelled');
                        const totalSpent = validStays.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
                        const totalPaid = validStays.reduce((sum: number, b: any) => sum + (b.paidAmount || 0), 0);
                        const totalDebt = Math.max(0, totalSpent - totalPaid);

                        return (
                          <div className="space-y-4">
                            {/* Summary cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3 bg-slate-50 rounded-xl text-left border border-slate-100">
                                <span className="text-[10px] text-slate-400 uppercase font-black block">Doanh số phòng</span>
                                <span className="text-sm font-black text-slate-800 font-mono block mt-1">{totalSpent.toLocaleString('vi-VN')} đ</span>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-xl text-left border border-slate-105">
                                <span className="text-[10px] text-slate-400 uppercase font-black block">Khách đã chuyển khoản</span>
                                <span className="text-sm font-black text-emerald-700 font-mono block mt-1">{totalPaid.toLocaleString('vi-VN')} đ</span>
                              </div>
                              <div className={`p-4 rounded-xl text-left border ${
                                totalDebt > 0 
                                  ? 'bg-rose-50 border-rose-200 text-rose-800' 
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              }`}>
                                <span className="text-[10px] block uppercase font-black">Khách sỉ đang nợ (Công nợ)</span>
                                <span className="text-base font-black font-mono block mt-1">{totalDebt.toLocaleString('vi-VN')} đ</span>
                                <span className="text-[9px] block font-bold mt-0.5">
                                  {totalDebt > 0 ? '📍 Đại lý cần liên hệ thu hồi sớm' : '✅ Đã tất toán dịch vụ sạch sẽ'}
                                </span>
                              </div>
                            </div>

                            {/* Detailed receipts */}
                            <div className="space-y-3 pt-2">
                              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider text-left">Bản kê thanh toán chi tiết các dịch vụ</h4>
                              {stays.length === 0 ? (
                                <p className="text-xs text-slate-405 italic py-3 text-left">Không có bản kê hóa đơn.</p>
                              ) : (
                                <div className="space-y-2">
                                  {stays.map((b: any) => {
                                    const bDebt = Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0));
                                    return (
                                      <div key={b.id} className="p-3 bg-slate-50 rounded-lg text-xs flex justify-between items-center text-left">
                                        <div>
                                          <p className="font-extrabold text-slate-850">{b.roomName}</p>
                                          <p className="text-[10px] text-slate-400 font-bold font-mono">Đơn gốc ID: {b.id}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-bold">Tổng: <span className="font-bold text-slate-900 font-mono">{(b.totalAmount || 0).toLocaleString('vi-VN')} đ</span></p>
                                          <p className="text-[11px] font-bold">
                                            Đã chuyển: <span className="text-emerald-705 font-bold font-mono">{(b.paidAmount || 0).toLocaleString('vi-VN')}đ</span>
                                            {bDebt > 0 && <span className="text-rose-500 font-bold font-mono ml-1">(Nợ: {bDebt.toLocaleString('vi-VN')}đ)</span>}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TAB 4: CORPORATE TAX VAT INVOICE CONFIG */}
                  {detailTab === 'invoice' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs text-left">Cơ chế Hóa đơn Thuế GTGT doanh nghiệp (VAT Invoice)</h3>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed text-left font-medium">
                        Khi xuất hóa đơn bán sỉ nghỉ dưỡng cho khách hàng công ty, thông tin hóa đơn lưu sẵn tại đây sẽ tự động kế thừa sang biểu mẫu làm tờ khai hoàn thuế của ban quản trị chuỗi StayHub.
                      </p>

                      <form onSubmit={handleUpdateBillingSubForm} className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 uppercase block text-left">Tên pháp nhân công ty mua hàng</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: Công Ty TNHH Du Lịch Và Truyền Thông Quốc Tế KingTravel"
                            value={detailedCustomer.companyName || ''}
                            onChange={(e) => setDetailedCustomer({ ...detailedCustomer, companyName: e.target.value })}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-505 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1 text-left">
                            <label className="font-bold text-slate-600 uppercase block">Mã số thuế doanh nghiệp (GST/Tax ID)</label>
                            <input
                              type="text"
                              placeholder="Mã số thuế..."
                              value={detailedCustomer.taxCode || ''}
                              onChange={(e) => setDetailedCustomer({ ...detailedCustomer, taxCode: e.target.value })}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-505 font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1 text-left">
                            <label className="font-bold text-slate-600 uppercase block">Thư điện tử (Email) đón hóa đơn điện tử</label>
                            <input
                              type="email"
                              placeholder="invoices@corporate.com"
                              value={detailedCustomer.invoiceEmail || ''}
                              onChange={(e) => setDetailedCustomer({ ...detailedCustomer, invoiceEmail: e.target.value })}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-505"
                            />
                          </div>
                        </div>

                        <div className="space-y-1 text-left">
                          <label className="font-bold text-slate-600 uppercase block">Địa chỉ đăng ký doanh nghiệp xuất hóa đơn</label>
                          <input
                            type="text"
                            placeholder="Địa chỉ công ty ghi trên đăng ký kinh doanh..."
                            value={detailedCustomer.invoiceAddress || ''}
                            onChange={(e) => setDetailedCustomer({ ...detailedCustomer, invoiceAddress: e.target.value })}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-505"
                          />
                        </div>

                        <div className="pt-2 text-right">
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-lg text-xs"
                          >
                            💾 Lưu Thông Tin Hóa Đơn VAT
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* TAB 5: PAPER DOSSIERS & FILES ATTACHMENT */}
                  {detailTab === 'docs' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs text-left">Tài liệu và hình ảnh căn cước đính kèm (CCCD)</h3>
                      </div>

                      <div className="space-y-4">
                        <form onSubmit={handleAddFileAttachment} className="flex gap-2 text-xs">
                          <input
                            type="text"
                            required
                            placeholder="Tên văn bản (ví dụ: CCCD_MatTruoc.jpg, HopDongBaoLanh.pdf)..."
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={uploading || !newFileName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 rounded-lg flex-shrink-0 disabled:opacity-50 transition"
                          >
                            <FileUp className="h-4 w-4 inline mr-1" />
                            Đính File
                          </button>
                        </form>

                        {detailedCustomer.files && detailedCustomer.files.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {detailedCustomer.files.map((file: any, index: number) => (
                              <div key={index} className="flex justify-between items-center bg-slate-50 p-2 text-xs rounded border border-slate-100 text-left">
                                <div className="flex items-center space-x-2 truncate">
                                  <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                                  <a href={file.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline hover:text-indigo-800 text-xs font-black truncate">
                                    {file.name}
                                  </a>
                                </div>
                                <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                                  <span>{file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString('vi-VN') : ''}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFileAttachment(file.name)}
                                    className="text-rose-500 hover:text-rose-700 p-0.5"
                                    title="Xóa tệp đính kèm này"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic text-left">Chưa có văn bản đính kèm nào được đăng ký trong danh bạ khách sỉ này.</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 p-4 px-6 flex justify-end gap-2 shrink-0 border-t border-slate-100">
              <button
                onClick={() => { setSelectedCustomer(null); setDetailedCustomer(null); }}
                className="py-1 px-4 bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold text-xs rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW/EDIT REGISTRATION MODAL FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 text-left space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5 uppercase">
                <Users className="h-5 w-5 text-indigo-600" />
                <span>{isEditing ? 'Cập Nhật Hồ Sơ Khách Sỉ' : 'Đăng Ký Hồ Sơ Khách Sỉ Gửi StayHub'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-650 font-bold text-xs"
              >
                Hủy [X]
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Họ và tên khách *</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({...form, fullName: e.target.value})}
                    placeholder="Nguyễn Kỳ Duyên"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1 font-medium">
                  <label className="font-bold text-slate-600 block uppercase">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({...form, phone: e.target.value})}
                    placeholder="0901..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Email cá nhân</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})}
                    placeholder="kyduyen@gmail.com"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Căn cước công dân (CCCD)</label>
                  <input
                    type="text"
                    value={form.identityNumber}
                    onChange={(e) => setForm({...form, identityNumber: e.target.value})}
                    placeholder="Số thẻ căn cước..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Giới tính</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({...form, gender: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-slate-800 font-semibold"
                  >
                    <option value="Nam">Nam (♂)</option>
                    <option value="Nữ">Nữ (♀)</option>
                    <option value="Khác">Khác / Không tiết lộ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Tags phân tách bằng dấu phẩy</label>
                  <input
                    type="text"
                    value={form.tagsText}
                    onChange={(e) => setForm({...form, tagsText: e.target.value})}
                    placeholder="Khách CTV, VIP, Sát biển"
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block uppercase">Địa chỉ cư trú</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({...form, address: e.target.value})}
                  placeholder="Quận 1, Thành phố Hồ Chí Minh"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-slate-800 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block uppercase">Yêu cầu đặc trưng / Chú thích nghỉ dưỡng</label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({...form, note: e.target.value})}
                  placeholder="Ghi chú thói quen ăn uống, sở thích phòng cao/thấp tầng..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-slate-850 leading-relaxed font-semibold"
                />
              </div>

              {/* Rating Credibility Edit Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Độ uy tín khách hàng (Nhằm phân loại tiềm năng)</label>
                  <div className="flex items-center space-x-2 py-1 bg-slate-50 px-3 rounded-xl border border-slate-100">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setForm({ ...form, rating: star })}
                        className="text-lg focus:outline-none transition-all scale-100 active:scale-95 cursor-pointer"
                      >
                        <span className={star <= (form.rating || 5) ? 'text-amber-400 font-bold' : 'text-slate-200'}>★</span>
                      </button>
                    ))}
                    <span className="text-[10px] text-slate-500 font-bold font-mono">({form.rating || 5}/5 sao)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block uppercase">Chú thích / Lý do độ uy tín</label>
                  <input
                    type="text"
                    value={form.credibilityNote || ''}
                    onChange={(e) => setForm({...form, credibilityNote: e.target.value})}
                    placeholder="Ví dụ: Lịch đặt uy tín, không yêu cầu hủy sát ngày..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl cursor-pointer transition"
                >
                  Bỏ Qua
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl cursor-pointer transition"
                >
                  {isEditing ? 'Lưu Thay Đổi' : 'Đăng Ký Khách'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
