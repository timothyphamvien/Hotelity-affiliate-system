import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Property, PropertyType, Room, RoomType } from '../../types';
import { 
  Building2, Plus, Edit2, Trash2, MapPin, Eye, X, BookOpen, Layers, 
  Video, Compass, Image, DollarSign, Home, Key, ExternalLink, Sliders, PlayCircle, Map, Info, FileText
} from 'lucide-react';
import { AdminRoomTypes } from './AdminRoomTypes';
import { AdminRooms } from './AdminRooms';

export function AdminProperties({ initialTab }: { initialTab?: 'properties' | 'room_types' | 'rooms' }) {
  const [activeTab, setActiveTab] = useState<'properties' | 'room_types' | 'rooms'>(initialTab || 'properties');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters for properties tab
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('ALL');
  
  // Interactive deep-dive modal
  const [selectedPropertyDetail, setSelectedPropertyDetail] = useState<Property | null>(null);
  
  // Property Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [city, setCity] = useState('Đà Lạt');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [facilitiesText, setFacilitiesText] = useState('');
  const [policies, setPPolicies] = useState('');
  const [internalNote, setInternalNote] = useState('');
  
  // Enhanced fields for Requirement 2
  const [videoUrl, setVideoUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [albumText, setAlbumText] = useState(''); // Comma-separated list of image urls

  const fetchHubData = async () => {
    try {
      setLoading(true);
      const [propList, rtList, rmList] = await Promise.all([
        api.getProperties(),
        api.getRoomTypes(),
        api.getRooms()
      ]);
      setProperties(propList);
      setRoomTypes(rtList);
      setRooms(rmList);
    } catch (err) {
      console.error('Lỗi tải dữ liệu hệ thống nghỉ dưỡng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, []);

  const openAddModal = () => {
    setEditingProperty(null);
    setName('');
    setBrand('StayHub Premium');
    setCity('Đà Lạt');
    setDistrict('');
    setAddress('');
    setDescription('');
    setCoverImage('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800');
    setStatus('ACTIVE');
    setFacilitiesText('Wifi tốc độ cao, Bếp nướng BBQ, Chỗ đỗ xe miễn phí');
    setPPolicies('Không hút thuốc trong phòng, Hủy trước 3 ngày nhận lại cọc.');
    setInternalNote('');
    setVideoUrl('');
    setLatitude('11.9404');
    setLongitude('108.4583');
    setAlbumText('');
    setIsModalOpen(true);
  };

  const openEditModal = (prop: Property) => {
    setEditingProperty(prop);
    setName(prop.name);
    setBrand(prop.brand || 'StayHub Premium');
    setCity(prop.city || 'Đà Lạt');
    setDistrict(prop.district || '');
    setAddress(prop.address || '');
    setDescription(prop.description || '');
    setCoverImage(prop.coverImage || '');
    setStatus(prop.status === 'ACTIVE' || prop.status === 'active' ? 'ACTIVE' : 'INACTIVE');
    setFacilitiesText(prop.facilities?.join(', ') || '');
    setPPolicies(prop.policies || '');
    setInternalNote(prop.internalNote || '');
    setVideoUrl(prop.videoUrl || '');
    setLatitude(prop.latitude !== undefined ? String(prop.latitude) : '11.9404');
    setLongitude(prop.longitude !== undefined ? String(prop.longitude) : '108.4583');
    setAlbumText(prop.images?.join(', ') || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      alert('Vui lòng nhập Tên cơ sở nghỉ dưỡng và Địa chỉ!');
      return;
    }

    const payload = {
      name,
      brand,
      city,
      district,
      address,
      description,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
      status,
      facilities: facilitiesText.split(',').map(s => s.trim()).filter(Boolean),
      policies,
      internalNote,
      videoUrl: videoUrl.trim(),
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      images: albumText.split(',').map(s => s.trim()).filter(Boolean),
      type: 'VILLA' as PropertyType
    };

    try {
      setSubmitting(true);
      if (editingProperty) {
        await api.updateProperty(editingProperty.id, payload as any);
        alert('Cập nhật cơ sở lưu trú thành công!');
      } else {
        await api.createProperty(payload as any);
        alert('Tạo cơ sở lưu trú mới thành công!');
      }
      setIsModalOpen(false);
      fetchHubData();
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu dữ liệu cơ sở.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn chắc chắn muốn xóa cơ sở này? Toàn bộ các thiết kế template và kho phòng trực thuộc sẽ tạm hủy.')) {
      try {
        await api.deleteProperty(id);
        alert('Đã xóa dữ liệu cơ sở!');
        fetchHubData();
      } catch (err: any) {
        alert(err.message || 'Lỗi không xóa được.');
      }
    }
  };

  const uniqueCities = Array.from(new Set(properties.map(p => p.city).filter(Boolean)));

  const filteredProperties = properties.filter(p => {
    const term = search.toLowerCase();
    const matchSearch = (p.name || '').toLowerCase().includes(term) || 
                        (p.address || '').toLowerCase().includes(term) ||
                        (p.brand && p.brand.toLowerCase().includes(term));
    const matchCity = filterCity === 'ALL' ? true : p.city === filterCity;
    return matchSearch && matchCity;
  });

  return (
    <div className="space-y-6" id="properties-consolidated-hub">
      
      {/* HUB HEADER */}
      <div className="bg-[#2F4A3D] text-white p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left relative overflow-hidden">
        <div className="z-10 space-y-1">
          <span className="text-[10px] bg-[#C58B5C] text-white px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
            TRUNG TÂM PHÂN PHỐI QUẢN TRỊ 
          </span>
          <h1 className="text-2xl font-black tracking-tight">🏫 Bản Đồ Cơ Sở & Tài Nguyên Kho Phòng</h1>
          <p className="text-xs text-emerald-100 max-w-xl">
            Cấu trúc quản trị hợp nhất: Cho phép cấu hình thuộc tính Cơ Sở nghỉ dưỡng, can thiệp Bản Thiết Kế Loại Phòng (Template), và triển khai Kho Phòng Vật Lý trực tiếp theo nhóm.
          </p>
        </div>

        {/* TABS SELECTOR */}
        <div className="bg-slate-900/40 p-1 rounded-xl flex gap-1 self-start md:self-auto border border-emerald-800/50 z-10 shrink-0">
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition flex items-center space-x-1.5 ${
              activeTab === 'properties' ? 'bg-[#C58B5C] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>🏫 Cơ Sở ({properties.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('room_types')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition flex items-center space-x-1.5 ${
              activeTab === 'room_types' ? 'bg-[#C58B5C] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>🛌 Templates Loại Phòng</span>
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition flex items-center space-x-1.5 ${
              activeTab === 'rooms' ? 'bg-[#C58B5C] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>🚪 Phòng Vật Lý ({rooms.length})</span>
          </button>
        </div>
      </div>

      {/* RENDER THE SELECTED TAB */}
      {activeTab === 'properties' && (
        <div className="space-y-6">
          
          {/* SEARCH AND CONTROL ROW */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 w-full gap-3">
              <input
                type="text"
                placeholder="Tìm biệt thự nghỉ dưỡng, địa chỉ, chuỗi lưu trú..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C58B5C] font-semibold text-slate-800"
              />
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-bold text-slate-700 cursor-pointer min-w-[140px]"
              >
                <option value="ALL">Tất cả Thành phố</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <button
              onClick={openAddModal}
              className="w-full md:w-auto bg-[#C58B5C] hover:bg-[#B3794D] text-white text-xs font-bold py-2.5 px-4 rounded-lg inline-flex items-center justify-center space-x-1.5 cursor-pointer shadow transition"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm Cơ Sở Nghỉ Dưỡng Mới</span>
            </button>
          </div>

          {/* PROPERTIES LISTING (Requirement 2 & 3) */}
          {filteredProperties.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-16 text-center text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-sm">Chưa có cơ sở nào được phân phối.</p>
              <button onClick={openAddModal} className="text-xs text-[#C58B5C] font-bold mt-2 hover:underline">Hãy tạo ngay</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="properties-grid">
              {filteredProperties.map(prop => {
                // Compute physical rooms count and price scale
                const myRoomTypes = roomTypes.filter(rt => rt.propertyId === prop.id);
                const myPhysRooms = rooms.filter(r => r.propertyId === prop.id);
                
                const prices = myRoomTypes.flatMap(rt => [rt.basePrice, rt.weekendPrice || rt.basePrice, rt.holidayPrice || rt.basePrice]).filter(Boolean);
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

                return (
                  <div key={prop.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden text-left flex flex-col justify-between">
                    
                    <div>
                      {/* Image cover container */}
                      <div className="h-48 w-full relative bg-slate-100">
                        <img
                          src={prop.coverImage || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800'}
                          alt={prop.name}
                          className="w-full h-full object-cover"
                        />
                        <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                          (prop.status === 'ACTIVE' || prop.status === 'active') ? 'bg-emerald-100 text-[#2F4A3D]' : 'bg-slate-150 text-slate-500'
                        }`}>
                          {(prop.status === 'ACTIVE' || prop.status === 'active') ? 'Đang hoạt động' : 'Tạm ẩn'}
                        </span>
                        
                        {prop.brand && (
                          <span className="absolute bottom-4 left-4 bg-slate-900/80 text-white backdrop-blur-xs px-2.5 py-0.5 rounded text-[10px] font-bold">
                            🌐 {prop.brand}
                          </span>
                        )}
                      </div>

                      {/* Content details */}
                      <div className="p-5 space-y-3.5">
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-slate-800 text-base">{prop.name}</h3>
                          <div className="flex items-center text-slate-500 text-xs mt-1 space-x-1 font-medium">
                            <MapPin className="h-4 w-4 text-rose-500 flex-shrink-0" />
                            <span className="truncate">{prop.address}</span>
                          </div>
                        </div>

                        {/* ROOMS COUNT AND PRICE RANGE SCALE */}
                        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                          <div className="border-r border-slate-200/60 pr-2">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Số lượng phòng:</span>
                            <span className="font-extrabold text-slate-700 block mt-0.5 font-mono">
                              🚪 {myPhysRooms.length} phòng thực tế ({myRoomTypes.length} loại)
                            </span>
                          </div>
                          <div className="pl-2">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Khung giá dao động:</span>
                            <span className="font-extrabold text-emerald-800 block mt-0.5">
                              💰 {minPrice > 0 ? `${(minPrice/1000).toFixed(0)}k` : 'Chưa nhập'} - {maxPrice > 0 ? `${(maxPrice/1000).toFixed(0)}k` : 'Chưa nhập'}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                          {prop.description || 'Chưa cung cấp bài viết mô tả chi tiết cho khách sạn.'}
                        </p>

                        {prop.facilities && prop.facilities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {prop.facilities.slice(0, 4).map(f => (
                              <span key={f} className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-slate-200/50">
                                {f}
                              </span>
                            ))}
                            {prop.facilities.length > 4 && (
                              <span className="text-slate-400 text-[10px] font-bold self-center">+{prop.facilities.length - 4} tiện ích</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Section */}
                    <div className="p-5 pt-0 border-t border-slate-100 mt-auto flex justify-between items-center bg-slate-50/30">
                      <span className="text-[9px] text-slate-400 font-mono">
                        MÃ: {prop.id}
                      </span>
                      
                      <div className="flex items-center space-x-2 pt-2">
                        <button
                          onClick={() => setSelectedPropertyDetail(prop)}
                          className="bg-[#2F4A3D] text-white hover:bg-[#1E3027] text-xs font-bold py-1.5 px-3 rounded-lg flex items-center space-x-1 cursor-pointer transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Chi Tiết Chuyên Sâu</span>
                        </button>
                        <button
                          onClick={() => openEditModal(prop)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prop.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-650 hover:bg-red-50 cursor-pointer"
                          title="Xóa cơ sở"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'room_types' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-scale-up">
          <AdminRoomTypes />
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-scale-up">
          <AdminRooms />
        </div>
      )}

      {/* PROPERTY IN-DEEP DETAIL MODAL (Requirement 2) */}
      {selectedPropertyDetail && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex justify-center items-center p-4 z-[9990] overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up text-left my-8">
            
            {/* Banner details */}
            <div className="h-56 w-full relative bg-slate-100">
              <img
                src={selectedPropertyDetail.coverImage || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800'}
                alt={selectedPropertyDetail.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-950/40 to-transparent" />
              
              <button 
                onClick={() => setSelectedPropertyDetail(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/85 text-white p-2 rounded-full cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="absolute bottom-4 left-6 text-white space-y-1">
                <span className="text-[9px] bg-[#C58B5C] text-white px-2 py-0.5 rounded-full font-extrabold uppercase">
                  HỒ SƠ CƠ SỞ CHUYÊN SÂU
                </span>
                <h2 className="text-xl font-extrabold">{selectedPropertyDetail.name}</h2>
                <p className="text-slate-300 text-xs">{selectedPropertyDetail.address}</p>
              </div>
            </div>

            {/* Dossier contents info */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto text-xs">
              
              {/* DESCRIPTION */}
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider text-left flex items-center space-x-1">
                  <Info className="h-4 w-4 text-[#C58B5C]" />
                  <span>Bài giới thiệu cơ sở lưu trú</span>
                </h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 text-left">
                  {selectedPropertyDetail.description || 'Chưa cập nhật mô tả.'}
                </p>
              </div>

              {/* MEDIA WORK ALBUM (Requirement 2) */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider text-left flex items-center space-x-1">
                  <Image className="h-4 w-4 text-emerald-600" />
                  <span>Album ảnh thực tế & Nội thất biệt thự</span>
                </h4>
                
                {selectedPropertyDetail.images && selectedPropertyDetail.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedPropertyDetail.images.map((imgUrl, index) => (
                      <div key={index} className="h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                        <img src={imgUrl} alt="Album" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-left pl-1">Chưa thiết lập Album ảnh phụ nào.</p>
                )}
              </div>

              {/* VIDEO TOUR (Requirement 2) */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider text-left flex items-center space-x-1">
                  <Video className="h-4 w-4 text-rose-500" />
                  <span>Thước Phim Tour Video Thực Tế</span>
                </h4>
                {selectedPropertyDetail.videoUrl ? (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-700">
                      <PlayCircle className="h-5 w-5 text-rose-600" />
                      <span className="font-bold truncate">{selectedPropertyDetail.videoUrl}</span>
                    </div>
                    <a 
                      href={selectedPropertyDetail.videoUrl}
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-rose-50 text-rose-700 hover:bg-rose-100 py-1 px-3 ml-2 rounded-md font-bold shrink-0 flex items-center space-x-1"
                    >
                      <span>Xem clip</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-left pl-1">Chưa liên kết tour video thực tế nào.</p>
                )}
              </div>

              {/* MAP CO-ORDINATES (Requirement 2) */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider text-left flex items-center space-x-1">
                  <Compass className="h-4 w-4 text-indigo-500" />
                  <span>Vị Trí Tọa Độ Google Maps</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-left">
                    <span className="text-slate-400 block text-[9px]">Kinh độ (Latitude)</span>
                    <span className="font-mono font-bold text-slate-800">{selectedPropertyDetail.latitude || '11.9404'}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-left">
                    <span className="text-slate-400 block text-[9px]">Vĩ độ (Longitude)</span>
                    <span className="font-mono font-bold text-slate-800">{selectedPropertyDetail.longitude || '108.4583'}</span>
                  </div>
                </div>

                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedPropertyDetail.latitude || 11.9404},${selectedPropertyDetail.longitude || 108.4583}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full text-center bg-indigo-55 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 py-2 rounded-lg font-bold block mt-2"
                >
                  📍 Mở bản đồ định hướng Google Maps ngoài tab mới
                </a>
              </div>

              {/* LIST OF PHYSICAL ROOMS STATUS (Requirement 2) */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider text-left flex items-center space-x-1">
                  <Home className="h-4 w-4 text-amber-500" />
                  <span>Trạng thái hoạt động tức thời của các phòng</span>
                </h4>
                <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-36 overflow-y-auto">
                  {rooms.filter(r => r.propertyId === selectedPropertyDetail.id).length === 0 ? (
                    <p className="p-3 text-center text-slate-400">Không có phòng vật lý nào.</p>
                  ) : (
                    rooms
                      .filter(r => r.propertyId === selectedPropertyDetail.id)
                      .map((room) => (
                        <div key={room.id} className="p-2.5 px-3 flex justify-between items-center bg-slate-50 text-left">
                          <div>
                            <span className="font-bold text-slate-800">{room.name}</span>
                            <span className="text-slate-400 text-[10px] ml-2">Type: {room.roomTypeName || room.name}</span>
                          </div>
                          
                          {/* occupancy mock status tag */}
                          <span className="text-[9px] bg-emerald-100 text-[#2F4A3D] font-extrabold px-2 py-0.5 rounded uppercase">
                            Trống sạch
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* SUB-RULES / AMENITIES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="text-left space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Quy định và Điều khoản:</span>
                  <p className="text-slate-600 leading-relaxed font-semibold">{selectedPropertyDetail.policies || 'Quy định nội bộ cơ bản.'}</p>
                </div>
                <div className="text-left space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Chi tiết Tiện nghi:</span>
                  <p className="text-slate-600 leading-relaxed font-semibold">{selectedPropertyDetail.facilities?.join(', ')}</p>
                </div>
              </div>

            </div>

            <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPropertyDetail(null)}
                className="bg-slate-950 text-white hover:bg-slate-800 font-bold py-2 px-5 rounded-xl cursor-pointer"
              >
                Đã hiểu [Đóng]
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PROPERTY ADD / EDIT MODAL (WITH ALBUMS, VIDEOS AND MAP CO-ORDINATES) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-[9991] overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden py-1 my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center space-x-1">
                <Building2 className="h-5 w-5 text-[#C58B5C]" />
                <span>{editingProperty ? '✏️ Hiệu Chỉnh Thiết Lập Cơ Sở' : '🏢 Đăng Ký Thêm Cơ Sở Nghỉ Dưỡng'}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 p-1 rounded-full cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-600 uppercase">Tên cơ sở biệt thự *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="StayHub Villa Sườn Đồi"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-600 uppercase">Chuỗi / Thuộc thương hiệu</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="StayHub Luxury Group"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-600 uppercase">Thành phố/Tỉnh *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-700"
                  >
                    <option value="Đà Lạt">Đà Lạt</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Phú Quốc">Phú Quốc</option>
                    <option value="Sa Pa">Sa Pa</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Vũng Tàu">Vũng Tàu</option>
                    <option value="Hội An">Hội An</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-600 uppercase">Quận / Phường / Huyện *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Ví dụ: Phường 5"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="font-bold text-slate-600 uppercase">Địa chỉ cụ thể bàn giao *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ví dụ: 15 Triệu Việt Vương, Đà Lạt"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-medium"
                />
              </div>

              {/* CORE AMENITIES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-600 uppercase">Doanh mục tiện nghi (Phân tách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={facilitiesText}
                    onChange={(e) => setFacilitiesText(e.target.value)}
                    placeholder="Bể bơi nước nóng, Phòng karaoke, Đồ ăn sáng"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-medium"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-600 uppercase">Ghi chú nội bộ cho Nhà Phân Phối</label>
                  <input
                    type="text"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Tiền hoa hồng thanh toán ngay 24h"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-medium"
                  />
                </div>
              </div>

              {/* ENHANCED REQUIREMENT 2 SPECIFIC FIELDS */}
              <div className="p-4 rounded-xl border border-dashed border-indigo-200/60 bg-indigo-50/20 space-y-3">
                <span className="text-[9px] bg-indigo-150 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">
                  ⚙️ TRÌNH KIỂM SOÁT MARKETING & ALUBUM CHUYÊN SÂU
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="font-bold text-slate-600 uppercase">Vĩ độ GPS (Latitude)</label>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="Latitude (vd: 11.9404)"
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-mono"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="font-bold text-slate-600 uppercase">Kinh độ GPS (Longitude)</label>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="Longitude (vd: 108.4583)"
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-600 uppercase">Đường dẫn thước phim thực tế (YouTube URL)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full p-2.5 border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-[#C58B5C]"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-600 uppercase">Album hình ảnh thực tế phụ (Phân tách bằng dấu phẩy)</label>
                  <textarea
                    rows={2}
                    value={albumText}
                    onChange={(e) => setAlbumText(e.target.value)}
                    placeholder="URL_Anh_1.jpg, URL_Anh_2.jpg..."
                    className="w-full p-2 border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-[#C58B5C] leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400">Các ảnh này hiển thị slide đẹp mắt ở modal chi tiết chuyên sâu.</p>
                </div>
              </div>

              {/* OVERALL POLICIES */}
              <div className="space-y-1 text-left">
                <label className="font-bold text-slate-600 uppercase">Nội quy & Điều khoản cơ bản chung</label>
                <textarea
                  value={policies}
                  onChange={(e) => setPPolicies(e.target.value)}
                  rows={2}
                  placeholder="Giờ quy định Check-in sau 14h, không nuôi thú cưng..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-medium text-slate-750"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-600 uppercase">Ảnh bìa diện rộng chính (URL)</label>
                  <input
                    type="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-bold text-slate-600 uppercase">Trạng thái vận hành biệt thự</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-700"
                  >
                    <option value="ACTIVE">Đang hoạt động (Hiển thị ngay)</option>
                    <option value="INACTIVE">Tạm ẩn (Bảo trì/Dự án mới)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="font-bold text-slate-600 uppercase">Mô tả bài viết giới thiệu chi tiết</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Villa có vị trí đồi thông yên tĩnh tuyệt đối..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C58B5C] font-medium"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#C58B5C] hover:bg-[#B3794D] text-white font-bold py-2 px-5 rounded-lg shadow cursor-pointer transition"
                >
                  {submitting ? 'Đang lưu trữ...' : 'Hoàn Tất Lưu'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
