import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Room, Property, RoomType } from '../../types';
import { 
  Plus, Edit2, Trash2, Home, Wrench, Sparkles, Clipboard, X, Search,
  Building2, Grid, List, Layers, Activity, CheckCircle2, UserCheck, Compass, Eye, EyeOff, Sparkle, Calendar, Users
} from 'lucide-react';

export function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterProperty, setFilterProperty] = useState('ALL');
  const [filterRoomType, setFilterRoomType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterHousekeeping, setFilterHousekeeping] = useState('ALL');

  // Quick search indication
  const [isQuickFiltered, setIsQuickFiltered] = useState(false);
  const [quickCheckIn, setQuickCheckIn] = useState('');
  const [quickCheckOut, setQuickCheckOut] = useState('');

  // Modal setup
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'base' | 'pricing' | 'status' | 'media'>('base');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [propertyId, setPropertyId] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [floor, setFloor] = useState('1');
  const [standardGuests, setStandardGuests] = useState('2');
  const [maxGuests, setMaxGuests] = useState('4');
  const [priceOverride, setPriceOverride] = useState('');
  const [status, setStatus] = useState<any>('available');
  const [housekeepingStatus, setHousekeepingStatus] = useState<any>('clean');
  const [imagesText, setImagesText] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsList, propsList, typesList] = await Promise.all([
        api.getRooms(),
        api.getProperties(),
        api.getRoomTypes()
      ]);
      setRooms(roomsList);
      setProperties(propsList);
      setRoomTypes(typesList);

      if (propsList.length > 0 && !propertyId) {
        setPropertyId(propsList[0].id);
      }
      if (typesList.length > 0 && !roomTypeId) {
        setRoomTypeId(typesList[0].id);
      }

      // Check for quick search triggers from Dashboard
      const quickProp = localStorage.getItem('quick_search_propertyId');
      const quickType = localStorage.getItem('quick_search_roomType');
      const qCheckIn = localStorage.getItem('quick_search_checkIn');
      const qCheckOut = localStorage.getItem('quick_search_checkOut');

      if (quickProp || quickType || qCheckIn || qCheckOut) {
        setIsQuickFiltered(true);
        if (quickProp) setFilterProperty(quickProp);
        if (quickType) setFilterRoomType(quickType);
        if (qCheckIn) setQuickCheckIn(qCheckIn);
        if (qCheckOut) setQuickCheckOut(qCheckOut);
      }
    } catch (err) {
      console.error('Error loading rooms manager:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearQuickFilters = () => {
    localStorage.removeItem('quick_search_propertyId');
    localStorage.removeItem('quick_search_roomType');
    localStorage.removeItem('quick_search_checkIn');
    localStorage.removeItem('quick_search_checkOut');
    localStorage.removeItem('quick_search_guests');
    setIsQuickFiltered(false);
    setFilterProperty('ALL');
    setFilterRoomType('ALL');
    setQuickCheckIn('');
    setQuickCheckOut('');
  };

  const openAddModal = () => {
    setEditingRoom(null);
    setPropertyId(properties[0]?.id || '');
    setRoomTypeId(roomTypes[0]?.id || '');
    setRoomCode('');
    setRoomName('');
    setFloor('1');
    setStandardGuests('2');
    setMaxGuests('4');
    setPriceOverride('');
    setStatus('available');
    setHousekeepingStatus('clean');
    setImagesText('https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800');
    setInternalNote('');
    setIsVisible(true);
    setActiveFormTab('base');
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setPropertyId(room.propertyId || '');
    setRoomTypeId(room.roomTypeId || '');
    setRoomCode(room.roomCode || '');
    setRoomName(room.roomName || room.name || '');
    setFloor(room.floor || '1');
    setStandardGuests(String(room.standardGuests || 2));
    setMaxGuests(String(room.maxGuests || 4));
    setPriceOverride(room.priceOverride ? String(room.priceOverride) : '');
    setStatus(room.status || 'available');
    setHousekeepingStatus(room.housekeepingStatus || 'clean');
    setImagesText(room.images?.join(', ') || '');
    setInternalNote(room.internalNote || '');
    setIsVisible(room.isVisible !== false);
    setActiveFormTab('base');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !roomTypeId || !roomCode || !roomName) {
      alert('Vui lòng hoàn chỉnh các trường thông tin bắt buộc: Cơ sở, Loại phòng, Mã phòng và Tên phòng!');
      return;
    }

    const payload = {
      propertyId,
      roomTypeId,
      roomCode: roomCode.trim().toUpperCase(),
      name: roomName, // for backwards compatibility
      roomName: roomName,
      floor,
      standardGuests: Number(standardGuests),
      maxGuests: Number(maxGuests),
      priceOverride: priceOverride ? Number(priceOverride) : undefined,
      status,
      housekeepingStatus,
      images: imagesText.split(',').map(img => img.trim()).filter(Boolean),
      internalNote,
      isVisible,
      description: internalNote || 'Phòng vật lý chất lượng cao.'
    };

    try {
      setSubmitting(true);
      if (editingRoom) {
        await api.updateRoom(editingRoom.id, payload as any);
        alert('Cập nhật thông tin phòng vật lý thành công!');
      } else {
        await api.createRoom(payload as any);
        alert('Tạo phòng vật lý mới thành công!');
      }
      setIsModalOpen(false);
      loadData();
      window.dispatchEvent(new CustomEvent('room-status-updated'));
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu dữ liệu phòng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn chắc chắn muốn xóa phòng vật lý này? Khách hàng sẽ không thể đặt phòng này nữa.')) {
      try {
        await api.deleteRoom(id);
        alert('Đã xóa phòng thành công!');
        loadData();
        window.dispatchEvent(new CustomEvent('room-status-updated'));
      } catch (err: any) {
        alert(err.message || 'Lỗi khi xóa phòng.');
      }
    }
  };

  // Filter computation
  const filteredRooms = rooms.filter(r => {
    const matchedProp = properties.find(p => p.id === r.propertyId);
    const matchedRt = roomTypes.find(rt => rt.id === r.roomTypeId);

    const matchesSearch = !search || 
      (r.roomName || r.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.roomCode || '').toLowerCase().includes(search.toLowerCase()) ||
      (matchedProp?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (matchedRt?.name || '').toLowerCase().includes(search.toLowerCase());

    const matchesProp = filterProperty === 'ALL' || r.propertyId === filterProperty;
    const matchesRt = filterRoomType === 'ALL' || r.roomTypeId === filterRoomType;
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesHousekeeping = filterHousekeeping === 'ALL' || r.housekeepingStatus === filterHousekeeping;

    return matchesSearch && matchesProp && matchesRt && matchesStatus && matchesHousekeeping;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto" id="admin-rooms-page">
      
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white border border-[#E3D8CB] p-8 rounded-[24px] shadow-xs">
        <div className="space-y-1">
          <span className="text-[10px] bg-[#EFE8DD] text-[#2F4A3D] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-[#E3D8CB]">
            Property Inventory
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1F1F1C] tracking-tight">
            Quản lý kho phòng thực tế
          </h1>
          <p className="text-sm text-[#5F5A52] max-w-xl">
            Đăng ký phòng nghỉ vật lý, kiểm soát chu kỳ dọn phòng dẹp, thiết lập trạng thái lưu trú và theo dõi giá bán đặc thù.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-[#2F4A3D] hover:bg-[#23382E] text-white text-xs font-bold py-3 px-6 rounded-full inline-flex items-center space-x-2 shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm phòng nghỉ vật lý</span>
        </button>
      </div>

      {/* Quick Search Filtering Banner */}
      {isQuickFiltered && (
        <div className="bg-[#FEF6EC] border border-[#FBE3CC] text-[#865615] rounded-[16px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-scale-up">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-[#FEE9CE] rounded-full text-[#C58B5C]">
              <Sparkle className="w-5 h-5 animate-spin-slow" />
            </span>
            <div className="text-left text-xs">
              <p className="font-black">Đang áp bộ lọc từ Tìm Kiếm Trống Nhanh</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[#5F401A]">
                {quickCheckIn && <span className="flex items-center gap-1"><Calendar className="w-3 w-3" /> Check-in: <strong>{quickCheckIn}</strong></span>}
                {quickCheckOut && <span className="flex items-center gap-1"><Calendar className="w-3 w-3" /> Check-out: <strong>{quickCheckOut}</strong></span>}
              </div>
            </div>
          </div>
          <button
            onClick={handleClearQuickFilters}
            className="px-4 py-1.5 bg-white border border-[#EAC294] text-[#865615] hover:bg-amber-50 font-bold text-xs rounded-full transition cursor-pointer"
          >
            Xóa lọc tìm kiếm
          </button>
        </div>
      )}

      {/* Modern Filter Frame */}
      <div className="bg-white border border-[#E3D8CB] rounded-[24px] p-6 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#8A8177]" />
            <input
              type="text"
              placeholder="Tìm mã số hoặc tên phòng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs w-full pl-10 pr-4 py-3 bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl focus:ring-1 focus:ring-[#2F4A3D] focus:outline-none text-[#1F1F1C] font-semibold"
            />
          </div>

          {/* Property Selector */}
          <div>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="text-xs w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl p-3 font-semibold text-[#1F1F1C] cursor-pointer focus:ring-1 focus:ring-[#2F4A3D] focus:outline-none"
            >
              <option value="ALL">Tất cả Cơ sở</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Room Type Selector */}
          <div>
            <select
              value={filterRoomType}
              onChange={(e) => setFilterRoomType(e.target.value)}
              className="text-xs w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl p-3 font-semibold text-[#1F1F1C] cursor-pointer focus:ring-1 focus:ring-[#2F4A3D] focus:outline-none"
            >
              <option value="ALL">Mọi loại không gian</option>
              {roomTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>

          {/* State Selector */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl p-3 font-semibold text-[#1F1F1C] cursor-pointer focus:ring-1 focus:ring-[#2F4A3D] focus:outline-none"
            >
              <option value="ALL">Mọi trạng thái phòng</option>
              <option value="available">available (Phòng trống)</option>
              <option value="hold">hold (Giữ chỗ)</option>
              <option value="booked">booked (Đã đặt)</option>
              <option value="checked_in">checked_in (Đang cư trú)</option>
              <option value="checked_out">checked_out (Đã check-out)</option>
              <option value="cleaning">cleaning (Đang làm buồng)</option>
              <option value="maintenance">maintenance (Đang bảo trì)</option>
              <option value="hidden">hidden (Ẩn kho)</option>
            </select>
          </div>

          {/* Cleanliness Selector */}
          <div>
            <select
              value={filterHousekeeping}
              onChange={(e) => setFilterHousekeeping(e.target.value)}
              className="text-xs w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl p-3 font-semibold text-[#1F1F1C] cursor-pointer focus:ring-1 focus:ring-[#2F4A3D] focus:outline-none"
            >
              <option value="ALL">Mọi dọn dẹp</option>
              <option value="clean">Sạch sẽ (Clean)</option>
              <option value="dirty">Chưa dọn (Dirty)</option>
              <option value="inspecting">Đang kiểm soát (Inspecting)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main rooms boutique grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <span className="p-3 border-4 border-[#2F4A3D] border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white border border-[#E3D8CB] rounded-[24px] p-20 text-center text-[#8A8177]">
          <Layers className="h-12 w-12 mx-auto mb-4 text-[#C58B5C]" />
          <p className="font-serif font-semibold text-lg text-[#1F1F1C]">Không tìm thấy phòng vật lý tương thích</p>
          <p className="text-xs text-[#8A8177] mt-1">Vui lòng điều chỉnh lại bộ lọc tìm kiếm hoặc ghi đè nhanh bộ lọc hiện có.</p>
          <button onClick={openAddModal} className="text-xs text-[#2F4A3D] font-black underline mt-4 hover:text-[#23382E]">
            Thêm phòng vật lý mới ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map(room => {
            const prop = properties.find(p => p.id === room.propertyId);
            const rt = roomTypes.find(t => t.id === room.roomTypeId);
            const basePrice = rt ? rt.basePrice : 0;
            const displayedPrice = room.priceOverride || room.clientPrice || basePrice;

            return (
              <div key={room.id} className="bg-white rounded-[24px] border border-[#E3D8CB] hover:border-[#C58B5C] shadow-3xs hover:shadow-sm transition-all duration-300 overflow-hidden flex flex-col justify-between">
                <div>
                  
                  {/* Card head image banner */}
                  <div className="h-52 w-full relative bg-[#F7F3EC] overflow-hidden">
                    <img 
                      src={room.images?.[0] || 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800'} 
                      alt={room.roomName} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800';
                      }}
                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                    />
                    
                    <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 items-center">
                      <span className="bg-[#1F1F1C]/70 backdrop-blur-md text-[#FFFFFF] px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest font-mono">
                        FL {room.floor || 1}
                      </span>
                      <span className="bg-[#2F4A3D] text-white px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest">
                        {room.roomCode}
                      </span>
                    </div>

                    <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end">
                      {/* Operational room state badge */}
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black shadow-xs tracking-wider border ${
                        String(room.status).toLowerCase() === 'available' ? 'bg-[#EBF5EE] border-[#D5EBDB] text-[#3F7D58]' :
                        String(room.status).toLowerCase() === 'hold' ? 'bg-[#FEF6EC] border-[#FBE3CC] text-[#D79A2B]' :
                        String(room.status).toLowerCase() === 'cleaning' ? 'bg-[#FEF6EC] border-[#E3D8CB] text-[#5F5A52]' :
                        String(room.status).toLowerCase() === 'maintenance' ? 'bg-[#FDF2F0] border-[#FADCD7] text-[#B14A3B]' :
                        'bg-slate-100 border-slate-200 text-slate-800'
                      }`}>
                        {String(room.status).toUpperCase()}
                      </span>

                      {/* Housekeeping badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border tracking-wide shadow-xs ${
                        room.housekeepingStatus === 'clean' ? 'bg-[#EBF5EE] border-[#D5EBDB] text-[#3F7D58]' :
                        room.housekeepingStatus === 'dirty' ? 'bg-[#FEF2F0] border-[#FADCD7] text-[#B14A3B]' :
                        'bg-[#F7F3EC] border-[#E3D8CB] text-[#5F5A52]'
                      }`}>
                        🧹 {room.housekeepingStatus === 'clean' ? 'SẠCH' : room.housekeepingStatus === 'dirty' ? 'BẨN' : 'SOÁT'}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4 text-left">
                    {/* Header */}
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-[#8A8177] tracking-widest block">
                        📍 {prop ? prop.name : 'Chưa cập nhật Cơ sở'}
                      </span>
                      <h3 className="font-serif font-black text-[#1F1F1C] text-lg mt-1">{room.roomName || room.name}</h3>
                      <span className="text-[11px] text-[#2F4A3D] font-bold mt-1.5 bg-[#EFE8DD] px-2.5 py-1 roundedinline-block inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#C58B5C]" /> {rt ? rt.name : 'Loại phòng dùng chung'}
                      </span>
                    </div>

                    {/* Room capacities and spec info */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-[#E3D8CB] text-center">
                      <div>
                        <span className="text-[9px] font-extrabold text-[#8A8177] block uppercase tracking-wider">Tiêu chuẩn</span>
                        <span className="text-[11px] font-bold text-[#1F1F1C] mt-0.5 block">{room.standardGuests || 2} khách</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-[#8A8177] block uppercase tracking-wider">Tối đa</span>
                        <span className="text-[11px] font-bold text-[#1F1F1C] mt-0.5 block">{room.maxGuests || 4} khách</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-[#8A8177] block uppercase tracking-wider">Hiển thị</span>
                        <span className="text-[11px] font-semibold mt-0.5 inline-flex items-center justify-center gap-0.5">
                          {room.isVisible !== false ? (
                            <><Eye className="h-3 w-3 text-[#3F7D58]" /> Mở bán</>
                          ) : (
                            <><EyeOff className="h-3 w-3 text-[#B14A3B]" /> Khóa</>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex justify-between items-center bg-[#F7F3EC] p-3 rounded-xl border border-[#E3D8CB]">
                      <div>
                        <span className="text-[9px] text-[#8A8177] font-black uppercase tracking-wider block">Mức giá niêm yết</span>
                        <span className="text-sm font-black text-[#1F1F1C] mt-0.5 block">
                          {(displayedPrice || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      {room.priceOverride ? (
                        <span className="bg-[#FEE9CE] text-[#865615] text-[9px] font-black px-2.5 py-1 rounded-md border border-[#EAC294]">
                          GHI ĐÈ GIÁ RIÊNG
                        </span>
                      ) : (
                        <span className="bg-[#FFFFFF] text-[#8A8177] text-[9px] font-bold px-2.5 py-1 rounded-md border border-[#E3D8CB]">
                          KẾ THỪA CHUNG
                        </span>
                      )}
                    </div>

                    {room.internalNote && (
                      <div className="bg-[#FFFDF9] p-3 rounded-xl border border-[#E3D8CB] text-[11px] text-[#5F5A52] leading-relaxed">
                        <strong className="text-[#C58B5C] font-black text-[10px] block mb-0.5 uppercase tracking-wider">GHI CHÚ HẬU CẦN:</strong>
                        <p className="line-clamp-2 italic">{room.internalNote}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-[#E3D8CB] flex items-center justify-between bg-[#F7F3EC]/50">
                  <span className="text-[10px] text-[#8A8177] font-mono font-bold">UID: {room.id}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(room)}
                      className="p-2 rounded-full bg-white hover:bg-[#EFE8DD] text-[#5F5A52] hover:text-[#2F4A3D] cursor-pointer transition border border-[#E3D8CB]"
                      title="Sửa phòng"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      className="p-2 rounded-full bg-white hover:bg-[#FEF2F0] text-[#5F5A52] hover:text-[#B14A3B] cursor-pointer transition border border-[#E3D8CB]"
                      title="Xóa phòng"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Multi-tab form for Room Asset creation & Editing */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1F1F1C]/70 backdrop-blur-sm flex justify-center items-center p-4 z-[9991] overflow-y-auto">
          <div className="bg-white rounded-[24px] w-full max-w-xl shadow-2xl overflow-hidden animate-scale-up py-1 my-8 border border-[#E3D8CB]">
            <div className="p-6 border-b border-[#E3D8CB] flex items-center justify-between bg-[#F7F3EC]">
              <h3 className="font-serif font-black text-[#1F1F1C] text-md">
                {editingRoom ? `✏️ Sửa số hiệu phòng vật lý ${editingRoom.roomCode}` : '🔑 Thiết lập không gian phòng vật lý mới'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#8A8177] hover:text-[#1F1F1C] p-1.5 rounded-full cursor-pointer bg-white border border-[#E3D8CB]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Multi-Tab Picker */}
            <div className="flex border-b border-[#E3D8CB] bg-[#F7F3EC]/50 p-1">
              <button
                type="button"
                onClick={() => setActiveFormTab('base')}
                className={`py-2 px-3 text-xs font-black transition-all rounded-lg cursor-pointer ${
                  activeFormTab === 'base' ? 'bg-[#2F4A3D] text-white' : 'text-[#8A8177] hover:bg-[#EFE8DD]'
                }`}
              >
                1. Thông số cốt lõi
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('pricing')}
                className={`py-2 px-3 text-xs font-black transition-all rounded-lg cursor-pointer ${
                  activeFormTab === 'pricing' ? 'bg-[#2F4A3D] text-white' : 'text-[#8A8177] hover:bg-[#EFE8DD]'
                }`}
              >
                2. Sửa giá bán
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('status')}
                className={`py-2 px-3 text-xs font-black transition-all rounded-lg cursor-pointer ${
                  activeFormTab === 'status' ? 'bg-[#2F4A3D] text-white' : 'text-[#8A8177] hover:bg-[#EFE8DD]'
                }`}
              >
                3. Buồng phòng dọn dẹp
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('media')}
                className={`py-2 px-3 text-xs font-black transition-all rounded-lg cursor-pointer ${
                  activeFormTab === 'media' ? 'bg-[#2F4A3D] text-white' : 'text-[#8A8177] hover:bg-[#EFE8DD]'
                }`}
              >
                4. Ảnh chụp góc phòng
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
                {/* TAB 1: BASE INFO */}
                {activeFormTab === 'base' && (
                  <div className="space-y-4 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-11">
                        <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Cở sở sở hữu *</label>
                        <select
                          value={propertyId}
                          onChange={(e) => setPropertyId(e.target.value)}
                          className="text-xs w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl p-3 font-semibold text-[#1F1F1C] cursor-pointer"
                        >
                          <option value="">-- Chọn Cơ sở --</option>
                          {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-11">
                        <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Template Loại phòng liên đới *</label>
                        <select
                          value={roomTypeId}
                          onChange={(e) => setRoomTypeId(e.target.value)}
                          className="text-xs w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl p-3 font-semibold text-[#1F1F1C] cursor-pointer"
                        >
                          <option value="">-- Chọn Loại phòng --</option>
                          {roomTypes.map(rt => (
                            <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-11">
                        <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Mã khóa phòng *</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: L2-302"
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value)}
                          className="w-full text-xs p-3 bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl"
                        />
                      </div>

                      <div className="space-y-11 sm:col-span-2">
                        <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Đặt tên phòng hiển thị *</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Garden Suite Premier 302"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          className="w-full text-xs p-3 bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-11">
                        <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Vị trí Tầng</label>
                        <input
                          type="text"
                          value={floor}
                          onChange={(e) => setFloor(e.target.value)}
                          className="w-full text-xs p-3 bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl"
                        />
                      </div>

                      <div className="space-y-11">
                        <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Sức chứa tc</label>
                        <input
                          type="number"
                          value={standardGuests}
                          onChange={(e) => setStandardGuests(e.target.value)}
                          className="w-full text-xs p-3 bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl"
                        />
                      </div>

                      <div className="space-y-11">
                        <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Sức chứa max</label>
                        <input
                          type="number"
                          value={maxGuests}
                          onChange={(e) => setMaxGuests(e.target.value)}
                          className="w-full text-xs p-3 bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: PRICING OVERRIDE */}
                {activeFormTab === 'pricing' && (
                  <div className="space-y-4 text-left">
                    <div className="bg-[#FFFDF9] p-4 rounded-xl border border-[#E3D8CB] text-xs text-[#5F5A52] leading-relaxed">
                      💡 <strong>Giá bán đặc thù:</strong> Bỏ trống trường này nếu muốn phòng này tự động áp dụng giá bán công khai định nghĩa trong Template Loại phòng (ví dụ: Deluxe, Standard). Chỉ điền giá trị nếu đây là phòng đặc biệt có giá bán riêng biệt hơn các phòng cùng loại khác.
                    </div>

                    <div className="space-y-11">
                      <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Giá bán ghi đè cụ thể (VNĐ)</label>
                      <input
                        type="number"
                        placeholder="Đặt trống hoặc nhập giá..."
                        value={priceOverride}
                        onChange={(e) => setPriceOverride(e.target.value)}
                        className="w-full text-xs p-3 bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl font-bold text-[#2F4A3D]"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: HOUSEKEEPING AND ROOM STATE */}
                {activeFormTab === 'status' && (
                  <div className="space-y-4 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Operational Status */}
                      <div className="space-y-11">
                        <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Hiện trạng đặt phòng</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="text-xs w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl p-3 font-semibold text-[#1F1F1C] cursor-pointer"
                        >
                          <option value="available">available (Trống sẵn sàng đón khách)</option>
                          <option value="hold">hold (Giữ chỗ đột xuất)</option>
                          <option value="booked">booked (Đã cọc khóa đơn)</option>
                          <option value="checked_in">checked_in (Khách đang ở)</option>
                          <option value="checked_out">checked_out (Khách đã trả phòng)</option>
                          <option value="cleaning">cleaning (Đang dọn dẹp phòng)</option>
                          <option value="maintenance">maintenance (Đang bảo trì/thu dọn kỹ thuật)</option>
                          <option value="hidden">hidden (Ẩn giấu kho)</option>
                        </select>
                      </div>

                      {/* Housekeeping Status */}
                      <div className="space-y-11">
                        <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Dọn phòng buồng</label>
                        <select
                          value={housekeepingStatus}
                          onChange={(e) => setHousekeepingStatus(e.target.value)}
                          className="text-xs w-full bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl p-3 font-semibold text-[#1F1F1C] cursor-pointer"
                        >
                          <option value="clean">🧹 Phòng Sạch (Clean)</option>
                          <option value="dirty">❌ Chưa dọn (Dirty)</option>
                          <option value="inspecting">🔍 Đang rà soát chất lượng (Inspecting)</option>
                        </select>
                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 4: MEDIA & INTERNAL NOTE */}
                {activeFormTab === 'media' && (
                  <div className="space-y-4 text-left">
                    <div className="space-y-11">
                      <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Đường dẫn ảnh chụp thực tế (URLs phân tách bởi dấu phẩy)</label>
                      <textarea
                        rows={3}
                        placeholder="Đặt liên kết ảnh Unsplash..."
                        value={imagesText}
                        onChange={(e) => setImagesText(e.target.value)}
                        className="w-full text-xs p-3 bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl font-medium"
                      />
                    </div>

                    <div className="space-y-11">
                      <label className="text-[10px] font-black text-[#2F4A3D] uppercase tracking-wider block">Ghi chú vận hành / Mô tả sự cố</label>
                      <textarea
                        rows={3}
                        placeholder="Có hỏng hóc kỹ thuật hay dọn dẹp dở dang..."
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        className="w-full text-xs p-3 bg-[#F7F3EC] border border-[#E3D8CB] rounded-xl font-medium"
                      />
                    </div>

                    <div className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id="form-isVisible"
                        checked={isVisible}
                        onChange={(e) => setIsVisible(e.target.checked)}
                        className="rounded text-[#2F4A3D] h-4.5 w-4.5 cursor-pointer accent-[#2F4A3D]"
                      />
                      <label htmlFor="form-isVisible" className="text-xs font-black text-[#1F1F1C] cursor-pointer select-none">
                        Chấp nhận mở bán hiển thị qua cộng tác viên (isVisible)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#F7F3EC] p-5 border-t border-[#E3D8CB] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white hover:bg-[#EFE8DD] text-[#5F5A52] text-xs font-bold rounded-full border border-[#E3D8CB] cursor-pointer transition shadow-3xs"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#2F4A3D] hover:bg-[#23382E] text-white text-xs font-bold rounded-full cursor-pointer transition shadow-[#2F4A3D]/10 text-center"
                >
                  {submitting ? 'Đang lưu...' : (editingRoom ? 'Cập Nhật Phòng' : 'Tạo Phòng Mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
