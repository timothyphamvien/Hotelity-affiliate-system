import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { RoomType, Property } from '../../types';
import { Plus, Edit2, Trash2, Layers, Key, Copy, X, List, Grid, Check } from 'lucide-react';

export function AdminRoomTypes() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterProperty, setFilterProperty] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRt, setEditingRt] = useState<RoomType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [propertyId, setPropertyId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [basePrice, setBasePrice] = useState('1000000');
  const [weekendPrice, setWeekendPrice] = useState('1200000');
  const [holidayPrice, setHolidayPrice] = useState('1500000');
  const [extraGuestFee, setExtraGuestFee] = useState('150000');
  const [depositAmount, setDepositAmount] = useState('500000');
  const [standardGuests, setStandardGuests] = useState('2');
  const [maxGuests, setMaxGuests] = useState('4');
  const [area, setArea] = useState('30');
  const [bedType, setBedType] = useState('1 Double Bed');
  const [amenitiesText, setAmenitiesText] = useState('Wifi, Điều hòa, Bồn tắm, Tủ lạnh, Máy pha Cafe');
  const [cancellationPolicy, setCancellationPolicy] = useState('Hủy trước 48 giờ miễn phí');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('12:00');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rtList, propList] = await Promise.all([
        api.getRoomTypes(),
        api.getProperties()
      ]);
      setRoomTypes(rtList);
      setProperties(propList);
      if (propList.length > 0 && !propertyId) {
        setPropertyId(propList[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu loại phòng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingRt(null);
    setPropertyId(properties[0]?.id || '');
    setName('');
    setCode('');
    setShortDescription('');
    setLongDescription('');
    setBasePrice('1000000');
    setWeekendPrice('1200000');
    setHolidayPrice('1500000');
    setExtraGuestFee('150000');
    setDepositAmount('500000');
    setStandardGuests('2');
    setMaxGuests('4');
    setArea('30');
    setBedType('1 King Bed');
    setAmenitiesText('Wifi, Điều hòa, Bồn tắm, Tủ lạnh');
    setCancellationPolicy('Hủy trước 3 ngày nhận lại cọc');
    setCheckInTime('14:00');
    setCheckOutTime('12:00');
    setImageUrl('https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800');
    setIsModalOpen(true);
  };

  const openEditModal = (rt: RoomType) => {
    setEditingRt(rt);
    setPropertyId(rt.propertyId);
    setName(rt.name);
    setCode(rt.code);
    setShortDescription(rt.shortDescription || '');
    setLongDescription(rt.longDescription || '');
    setBasePrice(String(rt.basePrice));
    setWeekendPrice(String(rt.weekendPrice || rt.basePrice));
    setHolidayPrice(String(rt.holidayPrice || rt.basePrice));
    setExtraGuestFee(String(rt.extraGuestFee || 0));
    setDepositAmount(String(rt.depositAmount || 0));
    setStandardGuests(String(rt.standardGuests || 2));
    setMaxGuests(String(rt.maxGuests || 4));
    setArea(String(rt.area || 30));
    setBedType(rt.bedType || '1 King Bed');
    setAmenitiesText(rt.amenities?.join(', ') || '');
    setCancellationPolicy(rt.cancellationPolicy || '');
    setCheckInTime(rt.checkInTime || '14:00');
    setCheckOutTime(rt.checkOutTime || '12:00');
    setImageUrl(rt.images?.[0] || '');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (rt: RoomType) => {
    if (confirm(`Bạn chắc chắn muốn nhân bản template loại phòng: "${rt.name}"?`)) {
      try {
        setSubmitting(true);
        const payload = {
          ...rt,
          name: `${rt.name} (Nhân Bản)`,
          code: `${rt.code}-COPY`,
        };
        delete (payload as any).id;
        await api.createRoomType(payload);
        alert('Đã nhân bản phong phú thành công!');
        fetchData();
      } catch (err: any) {
        alert(err.message || 'Lỗi khi nhân bản phòng.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !name || !code) {
      alert('Vui lòng hoàn thành các trường thông tin quan trọng bắt buộc!');
      return;
    }

    const payload = {
      propertyId,
      name,
      code: code.trim().toUpperCase(),
      shortDescription,
      longDescription,
      basePrice: Number(basePrice),
      weekendPrice: Number(weekendPrice),
      holidayPrice: Number(holidayPrice),
      extraGuestFee: Number(extraGuestFee),
      depositAmount: Number(depositAmount),
      standardGuests: Number(standardGuests),
      maxGuests: Number(maxGuests),
      area: Number(area),
      bedType,
      amenities: amenitiesText.split(',').map(s => s.trim()).filter(Boolean),
      images: [imageUrl].filter(Boolean),
      cancellationPolicy,
      checkInTime,
      checkOutTime,
      status: 'ACTIVE' as const
    };

    try {
      setSubmitting(true);
      if (editingRt) {
        await api.updateRoomType(editingRt.id, payload);
        alert('Cập nhật template loại phòng thành công!');
      } else {
        await api.createRoomType(payload);
        alert('Tạo template loại phòng mới thành công!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Không thể lưu loại phòng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Lưu ý đặc biệt: Xóa loại phòng (RoomType template) này sẽ tự dọn các phòng vật lý có liên quan. Bạn có đồng ý?')) {
      try {
        await api.deleteRoomType(id);
        alert('Đã xóa loại phòng thành công!');
        fetchData();
      } catch (err: any) {
        alert(err.message || 'Lỗi khi xóa loại phòng.');
      }
    }
  };

  const getPropertyName = (pId: string) => {
    const p = properties.find(prop => prop.id === pId);
    return p ? p.name : 'Cơ sở lưu trú';
  };

  const filteredRoomTypes = roomTypes.filter(rt => {
    const matchesSearch = (rt.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (rt.code || '').toLowerCase().includes(search.toLowerCase());
    const matchesProp = filterProperty === 'ALL' ? true : rt.propertyId === filterProperty;
    return matchesSearch && matchesProp;
  });

  return (
    <div className="space-y-6" id="admin-roomtypes-workspace">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🛏️ Catalog Thiết Lập Loại Phòng</h1>
          <p className="text-sm text-slate-500 mt-1">
            Loại phòng hoạt động như template định mức giá chung, tiện nghi và sức người cho nhiều phòng vật lý cụ thể.
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={properties.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg inline-flex items-center space-x-2 shadow-sm transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm Loại Phòng</span>
        </button>
      </div>

      {properties.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium mt-1">
          ⚠️ Hệ thống đang trống cơ sở nghỉ dưỡng. Bạn hãy tạo ít nhất một <b>Cơ sở lưu trú</b> trước khi thiết kế các Loại phòng catalog template.
        </div>
      )}

      {/* Filter and search box */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Tìm theo tên loại phòng, mã code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả Cơ sở nghỉ dưỡng</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="p-3 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : filteredRoomTypes.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-16 text-center text-slate-400">
          <Layers className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-sm">Không tìm thấy loại phòng nào</p>
          <p className="text-xs text-slate-400 mt-1">Tạo template loại phòng để nhân viên dễ vẽ mã giường phòng hàng loạt.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoomTypes.map(rt => (
            <div key={rt.id} className="bg-white rounded-xl border border-slate-100 shadow-2xs hover:shadow-sm transition flex flex-col overflow-hidden">
              <div className="h-44 bg-slate-100 relative">
                <img
                  src={rt.images?.[0] || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800'}
                  alt={rt.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-4 left-4 bg-indigo-600 text-white px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono">
                  {rt.code}
                </span>
                <span className="absolute bottom-4 right-4 bg-slate-900/80 text-white px-2.5 py-0.5 rounded text-[10px] font-semibold">
                  {rt.area} m² / {rt.bedType}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wide">
                    🏫 {getPropertyName(rt.propertyId)}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{rt.name}</h3>
                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                    {rt.shortDescription || 'Chưa cung cấp tóm tắt.'}
                  </p>

                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100/60 text-center font-mono text-[10px]">
                    <div>
                      <span className="text-slate-400 block font-sans text-[9px] uppercase font-bold">Thường</span>
                      <b className="text-slate-700 block mt-0.5">{rt.basePrice.toLocaleString('vi-VN')}đ</b>
                    </div>
                    <div className="border-x border-slate-200">
                      <span className="text-amber-600 block font-sans text-[9px] uppercase font-bold">Cuối Tuần</span>
                      <b className="text-slate-700 block mt-0.5">{(rt.weekendPrice || rt.basePrice).toLocaleString('vi-VN')}đ</b>
                    </div>
                    <div>
                      <span className="text-rose-600 block font-sans text-[9px] uppercase font-bold">Lễ Hội</span>
                      <b className="text-slate-700 block mt-0.5">{(rt.holidayPrice || rt.basePrice).toLocaleString('vi-VN')}đ</b>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Sức chứa: <b>{rt.standardGuests} - max {rt.maxGuests} khách</b></span>
                    <span>Đặt cọc: <b className="text-indigo-600 font-mono">{(rt.depositAmount || 0).toLocaleString('vi-VN')}đ</b></span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
                  <button
                    onClick={() => handleDuplicate(rt)}
                    className="text-slate-500 hover:text-indigo-600 font-semibold inline-flex items-center space-x-1 hover:underline cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Nhân bản</span>
                  </button>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(rt)}
                      className="p-1.5 rounded-md hover:bg-slate-50 text-slate-500 hover:text-indigo-600 cursor-pointer"
                      title="Chỉnh sửa template"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rt.id)}
                      className="p-1.5 rounded-md hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer"
                      title="Xóa loại phòng"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RoomType Modal popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-[9992] overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden py-1 my-5 animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingRt ? '⚙️ Hiệu Chỉnh Thiết Lập Loại Phòng' : '🛏️ Tạo Mẫu Loại Phòng Mới'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Thuộc Cơ sở lưu trú *</label>
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-700"
                  >
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Mã loại phòng (RoomType Code) *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ví dụ: VILLA-OCEAN"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Tên mẫu loại phòng *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Superior Beachfront Double"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Giá ngày trong tuần *</label>
                  <input
                    type="number"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="1000000"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Giá rằm/Cuối tuần *</label>
                  <input
                    type="number"
                    required
                    value={weekendPrice}
                    onChange={(e) => setWeekendPrice(e.target.value)}
                    placeholder="1200000"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Giá Lễ hội / Ngày Tết *</label>
                  <input
                    type="number"
                    required
                    value={holidayPrice}
                    onChange={(e) => setHolidayPrice(e.target.value)}
                    placeholder="1500000"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Phí phụ thu thêm người quá số lượng</label>
                  <input
                    type="number"
                    value={extraGuestFee}
                    onChange={(e) => setExtraGuestFee(e.target.value)}
                    placeholder="150000"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Tiền đặt cọc giữ phòng bắt buộc</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="500000"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Số người chuẩn *</label>
                  <input
                    type="number"
                    required
                    value={standardGuests}
                    onChange={(e) => setStandardGuests(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Max người *</label>
                  <input
                    type="number"
                    required
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Diện tích (m²)</label>
                  <input
                    type="number"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Loại giường</label>
                  <input
                    type="text"
                    value={bedType}
                    onChange={(e) => setBedType(e.target.value)}
                    placeholder="1 King Bed"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Tiện ích cụ thể (Ngăn cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={amenitiesText}
                  onChange={(e) => setAmenitiesText(e.target.value)}
                  placeholder="Wifi, Máy lạnh, Tủ lạnh, Smart TV"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Giờ Check-in lý tưởng</label>
                  <input
                    type="text"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Giờ Check-out quy định</label>
                  <input
                    type="text"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Mô tả ngắn</label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">URL mô tả ảnh phòng chính</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-lg cursor-pointer transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Loại Phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
