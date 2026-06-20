import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Room, Property, Booking } from '../../types';
import { 
  Search, Calendar, MapPin, Percent, ArrowRight, Layers, 
  Video, Eye, HeartHandshake, UserCheck, Sparkles, Building2,
  Lock, CheckCircle2, XCircle, ChevronDown, ChevronUp
} from 'lucide-react';

interface CtvRoomsProps {
  onBookRoom: (room: Room, checkIn: string, checkOut: string) => void;
}

export function CtvRooms({ onBookRoom }: CtvRoomsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'ROOMS' | 'PROPERTIES'>('ROOMS');

  // Interactive View Modes & Detail Popups
  const [roomViewMode, setRoomViewMode] = useState<'LIST' | 'MATRIX_CALENDAR'>('LIST');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activeDetailsImageIndices, setActiveDetailsImageIndices] = useState<{ [propId: string]: number }>({});
  const [activeRoomImageIndices, setActiveRoomImageIndices] = useState<{ [roomId: string]: number }>({});

  // Custom Filter State
  const [search, setSearch] = useState('');
  const [rType, setRType] = useState<string>('ALL');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [priceMinFilter, setPriceMinFilter] = useState<string>('');
  const [priceMaxFilter, setPriceMaxFilter] = useState<string>('');
  const [guestsFilter, setGuestsFilter] = useState<string>('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('ALL');
  
  // Visual Calendar States
  const [expandedCalendarRoomId, setExpandedCalendarRoomId] = useState<string | null>(null);
  const [roomCheckIn, setRoomCheckIn] = useState<{ [roomId: string]: string }>({});
  const [roomCheckOut, setRoomCheckOut] = useState<{ [roomId: string]: string }>({});
  const [calendarMonth, setCalendarMonth] = useState<string>('2026-06'); // Default June 2026 (based on current 2026-06-10 metadata)
  const [calendarStartDate, setCalendarStartDate] = useState<string>('2026-06-10');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Video popup
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const [datesError, setDatesError] = useState('');

  // 1. Dynamic Client Side Rooms Filtering (for instant sub-filtering)
  const filteredRooms = rooms.filter(room => {
    // Search keyword
    const matchedProp = properties.find(p => p.id === room.propertyId);
    const parentName = matchedProp?.name || '';
    const parentLoc = matchedProp?.location || matchedProp?.address || '';
    const matchesKeyword = !search || 
      (room.name || room.roomName || '').toLowerCase().includes(search.toLowerCase()) || 
      parentName.toLowerCase().includes(search.toLowerCase()) || 
      parentLoc.toLowerCase().includes(search.toLowerCase());

    // Accommodation/Property type
    const roomPropertyType = room.propertyType || matchedProp?.type || 'HOMESTAY';
    const matchesType = rType === 'ALL' || roomPropertyType === rType;

    // Price brackets (filter on clientPrice / suggestion retail price)
    const price = room.clientPrice;
    const matchesMinPrice = !priceMinFilter || price >= Number(priceMinFilter);
    const matchesMaxPrice = !priceMaxFilter || price <= Number(priceMaxFilter);

    // Capacity guest requirement
    const matchesGuests = !guestsFilter || room.maxGuests >= Number(guestsFilter);

    // Amenities filtering with alternative keyword checking
    let matchesAmenities = true;
    if (selectedAmenities.length > 0) {
      const roomAmenities = room.amenities || [];
      matchesAmenities = selectedAmenities.every(selectedItem => {
        return roomAmenities.some(roomItem => {
          const roomLower = (roomItem || '').toLowerCase();
          const selectedLower = (selectedItem || '').toLowerCase();
          if (selectedLower === 'wifi') {
            return roomLower.includes('wifi');
          }
          if (selectedLower === 'pool' || selectedLower === 'hồ bơi') {
            return roomLower.includes('bơi') || roomLower.includes('pool') || roomLower.includes('bể bơi');
          }
          if (selectedLower === 'ac' || selectedLower === 'máy lạnh' || selectedLower === 'điều hòa') {
            return roomLower.includes('lạnh') || roomLower.includes('hòa') || roomLower.includes('ac') || roomLower.includes('air');
          }
          if (selectedLower === 'bath' || selectedLower === 'bồn tắm') {
            return roomLower.includes('tắm') || roomLower.includes('bath') || roomLower.includes('tub');
          }
          if (selectedLower === 'kitchen' || selectedLower === 'bếp') {
            return roomLower.includes('bếp') || roomLower.includes('cook') || roomLower.includes('kitchen') || roomLower.includes('bát');
          }
          return roomLower.includes(selectedLower);
        });
      });
    }

    // Room Type structure matcher
    let matchesRoomType = true;
    if (roomTypeFilter !== 'ALL') {
      const rName = (room.name || '').toLowerCase();
      const rtName = (room.roomTypeName || '').toLowerCase();
      const combo = `${rName} ${rtName}`;
      
      if (roomTypeFilter === 'STUDIO') {
        matchesRoomType = combo.includes('studio') || combo.includes('cabin') || combo.includes('cozy') || combo.includes('tiêu chuẩn') || combo.includes('đơn');
      } else if (roomTypeFilter === '1_BEDROOM') {
        matchesRoomType = combo.includes('1-bedroom') || combo.includes('one bedroom') || combo.includes('1 phòng ngủ') || combo.includes('1pn') || combo.includes('bungalow') || combo.includes('homestay');
      } else if (roomTypeFilter === '2_BEDROOM') {
        matchesRoomType = combo.includes('2-bedroom') || combo.includes('three') || combo.includes('two bedroom') || combo.includes('2 phòng ngủ') || combo.includes('2pn') || combo.includes('villa') || combo.includes('luxury') || combo.includes('biệt thự') || combo.includes('resort');
      }
    }

    return matchesKeyword && matchesType && matchesMinPrice && matchesMaxPrice && matchesGuests && matchesAmenities && matchesRoomType;
  });

  const filteredProperties = properties.filter(p => {
    const matchesSearch = !search || 
      (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.location || p.address || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = rType === 'ALL' || p.type === rType;
    return matchesSearch && matchesType;
  });

  const fetchRoomsAndProperties = async () => {
    try {
      setLoading(true);
      setDatesError('');
      
      if (checkIn && checkOut) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        if (start >= end) {
          setDatesError('Ngày nhận phòng (Check-in) phải bé hơn ngày trả phòng (Check-out).');
          setLoading(false);
          return;
        }
      }

      // Fetch
      const [roomsList, propsList, bookingsList] = await Promise.all([
        api.getRooms({
          checkIn: checkIn || undefined,
          checkOut: checkOut || undefined,
          search: search || undefined,
          propertyType: rType !== 'ALL' ? rType : undefined
        }),
        api.getProperties(),
        api.getBookings()
      ]);

      setRooms(roomsList);
      setProperties(propsList);
      setBookings(bookingsList);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu trang CTV Rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomsAndProperties();
  }, [search, rType, checkIn, checkOut]);

  const isDateOccupied = (roomId: string, dateStr: string) => {
    return bookings.some(b => {
      if (b.roomId !== roomId) return false;
      if (b.status === 'CANCELLED') return false;
      return dateStr >= b.checkIn && dateStr < b.checkOut;
    });
  };

  const isRangeOverlapped = (roomId: string, startStr: string, endStr: string) => {
    if (!startStr || !endStr) return false;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (start >= end) return true; // Block invalid inputs

    return bookings.some(b => {
      if (b.roomId !== roomId) return false;
      if (b.status === 'CANCELLED') return false;
      const bStart = new Date(b.checkIn);
      const bEnd = new Date(b.checkOut);
      return start < bEnd && end > bStart;
    });
  };

  const getCalendarDays = () => {
    const [yrStr, moStr] = (calendarMonth || '2026-06').split('-');
    const year = parseInt(yrStr, 10);
    const month = parseInt(moStr, 10) - 1; // 0-based index

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startOffset = firstDay.getDay(); // Sun = 0, Mon = 1, etc.

    // Pad space
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }

    // Days in current month
    const totalDays = lastDay.getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr
      });
    }

    return days;
  };

  const getNext10Days = () => {
    const days = [];
    const baseDate = new Date(calendarStartDate || '2026-06-10');
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 0; i < 10; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateVal}`;
      const weekday = dayLabels[d.getDay()];
      days.push({
        dateStr,
        label: `${weekday} ${dateVal}/${month}`
      });
    }
    return days;
  };

  const handleQuickBookFromMatrix = (room: Room, dateStr: string) => {
    const dIn = dateStr;
    const tomorrow = new Date(dateStr);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowYear = tomorrow.getFullYear();
    const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
    const dOut = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
    onBookRoom(room, dIn, dOut);
  };

  const handleClearFilters = () => {
    setSearch('');
    setRType('ALL');
    setCheckIn('');
    setCheckOut('');
    setPriceMinFilter('');
    setPriceMaxFilter('');
    setGuestsFilter('');
    setSelectedAmenities([]);
    setRoomTypeFilter('ALL');
    setDatesError('');
  };

  return (
    <div className="space-y-6" id="ctv-rooms-directory">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🏡 Hệ Thống Tìm Kiếm & Khảo Sát Lịch Trống</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu quỹ phòng, gạn lọc theo nhu cầu lưu trú, kiểm soát hoa hồng ưu đãi đặc quyền cho đại lý bán phòng.
          </p>
        </div>

        <div className="flex space-x-2 bg-slate-100 border border-slate-200 p-1.5 rounded-xl text-xs font-bold text-slate-600 font-mono">
          <span>🎯 {filteredRooms.length} phòng phù hợp</span>
        </div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 font-sans">
        {/* Unified Search Row (Agoda/Airbnb Style) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          
          {/* Col 1: Text Search (5/12 cols) */}
          <div className="md:col-span-4 relative text-left">
            <label className="text-[10px] uppercase font-black text-slate-500 block mb-1">Cơ sở & Địa danh</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Nha Trang, Đà Lạt, Villa biển..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Col 2: Date Picker Combo (4/12 cols) */}
          <div className="md:col-span-4 text-left">
            <label className="text-[10px] uppercase font-black text-slate-500 block mb-1">Thời gian lưu trú (Check-in ➜ Out)</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-50/50 p-1 border border-slate-200 rounded-xl">
              <div className="relative">
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full text-[10px] p-2 bg-transparent font-mono font-black text-slate-800 border-0 focus:ring-0"
                  placeholder="Nhận phòng"
                  title="Ngày nhận phòng"
                />
              </div>
              <div className="relative border-l border-slate-200 pl-1">
                <input
                  type="date"
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full text-[10px] p-2 bg-transparent font-mono font-black text-slate-800 border-0 focus:ring-0"
                  placeholder="Trả phòng"
                  title="Ngày trả phòng"
                />
              </div>
            </div>
          </div>

          {/* Col 3: Capacity guests (2/12 cols) */}
          <div className="md:col-span-2 text-left">
            <label className="text-[10px] uppercase font-black text-slate-500 block mb-1">Số lượng khách</label>
            <select
              value={guestsFilter}
              onChange={(e) => setGuestsFilter(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">👤 Mọi sức chứa</option>
              <option value="1">1+ khách</option>
              <option value="2">2+ khách</option>
              <option value="4">4+ khách</option>
              <option value="6">6+ khách</option>
              <option value="10">10+ khách (Đoàn)</option>
            </select>
          </div>

          {/* Col 4: Quick Buttons (2/12 cols) */}
          <div className="md:col-span-2 flex space-x-1.5">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                showAdvancedFilters || rType !== 'ALL' || priceMinFilter || priceMaxFilter || roomTypeFilter !== 'ALL' || selectedAmenities.length > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
              }`}
            >
              🎛️ {showAdvancedFilters ? 'Đóng' : 'Lọc thêm'}
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              title="Làm mới bộ lọc về mặc định"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            >
              🧹
            </button>
          </div>

        </div>

        {/* Collapsible Row: Advanced sub-filtering (Price Range, Property Type, Room Types, Amenities) */}
        {showAdvancedFilters && (
          <div className="pt-4 border-t border-dashed border-slate-200 animate-slide-in space-y-4 text-left">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Loai hinh selection (3/12 cols) */}
              <div className="md:col-span-4">
                <label className="text-[10px] uppercase font-black text-slate-500 block mb-1">Loại hình lưu trú</label>
                <select
                  value={rType}
                  onChange={(e) => setRType(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">Tất cả loại hình du lịch</option>
                  <option value="VILLA">🏠 Biệt thự Villa</option>
                  <option value="HOMESTAY">🌻 Homestay bản địa</option>
                  <option value="BUNGALOW">⛰️ Bungalow sinh thái</option>
                  <option value="RESORT">🌴 Resort nghỉ dưỡng cao cấp</option>
                  <option value="HOTEL">🏢 Khách sạn Hotel</option>
                </select>
              </div>

              {/* Price bracket (4/12 cols) */}
              <div className="md:col-span-4">
                <label className="text-[10px] uppercase font-black text-slate-500 block mb-1">Khoảng giá bán CTV đề xuất (đ/đêm)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Từ (đ)"
                    value={priceMinFilter}
                    onChange={(e) => setPriceMinFilter(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-slate-700 bg-white"
                  />
                  <input
                    type="number"
                    placeholder="Đến (đ)"
                    value={priceMaxFilter}
                    onChange={(e) => setPriceMaxFilter(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-indigo-700 bg-white"
                  />
                </div>
              </div>

              {/* Room Structure Filters (5/12 cols) */}
              <div className="md:col-span-4">
                <label className="text-[10px] uppercase font-black text-slate-500 block mb-1.5">Cấu trúc chính dạng phòng</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'STUDIO', label: 'Studio / Đơn' },
                    { id: '1_BEDROOM', label: '1 PN / Bungalow' },
                    { id: '2_BEDROOM', label: 'Biệt thự / 2+ PN' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setRoomTypeFilter(type.id)}
                      className={`text-[11px] py-1.5 px-2.5 rounded-lg border font-bold transition-all cursor-pointer ${
                        roomTypeFilter === type.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Amenities Multi-select checklist */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">⚡ Tiện ích đặc thù yêu cầu (Chọn nhiều):</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'Wifi', label: '📶 Wifi căn hộ' },
                  { id: 'Pool', label: '🏊 Hồ bơi riêng' },
                  { id: 'AC', label: '❄️ Máy điều hòa' },
                  { id: 'Bath', label: '🛁 Bồn tắm sành' },
                  { id: 'Kitchen', label: '🍳 Bếp nấu ăn' }
                ].map((amenity) => {
                  const isSelected = selectedAmenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedAmenities(selectedAmenities.filter(item => item !== amenity.id));
                        } else {
                          setSelectedAmenities([...selectedAmenities, amenity.id]);
                        }
                      }}
                      className={`text-xs py-1.5 px-3 rounded-lg border font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-55'
                      }`}
                    >
                      <span>{amenity.label}</span>
                      {isSelected && <span className="text-[9px] bg-emerald-800 text-white px-1 rounded-full">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {datesError && (
          <p className="text-xs text-rose-600 font-semibold mt-1 text-left">
            ⚠️ {datesError}
          </p>
        )}

        {checkIn && checkOut && !datesError && (
          <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg flex items-center font-semibold text-left">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse mr-2"></span>
            Tổng quan đã lọc lịch bận trong tầm lưu trú: <b className="font-mono mx-1">{checkIn}</b> tới <b className="font-mono mx-1">{checkOut}</b>
          </p>
        )}
      </div>

      {/* Visual Workspace Sub-navigation Tab Selector */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-6xs">
        <button
          onClick={() => setActiveTab('ROOMS')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'ROOMS'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>⭐ Phân Loại Dạng Phòng ({filteredRooms.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('PROPERTIES')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'PROPERTIES'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🏡 Kho Hệ Thống Khu Lưu Trú ({properties.length})</span>
        </button>
      </div>

      {activeTab === 'ROOMS' && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-xl animate-fade-in">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1.5 flex items-center">
            <Calendar className="h-3.5 w-3.5 text-indigo-600 mr-2" />
            Chế độ hiển thị dạng phòng:
          </span>
          <div className="flex space-x-1 bg-white p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setRoomViewMode('LIST')}
              className={`py-1.5 px-3 text-xs font-bold rounded-md transition cursor-pointer ${
                roomViewMode === 'LIST'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              📋 Danh Sách Thẻ
            </button>
            <button
              onClick={() => setRoomViewMode('MATRIX_CALENDAR')}
              className={`py-1.5 px-3 text-xs font-bold rounded-md transition cursor-pointer ${
                roomViewMode === 'MATRIX_CALENDAR'
                  ? 'bg-indigo-650 text-white'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              📅 Lịch Tổng Quan (Day-by-Day)
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <span className="p-3 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : activeTab === 'PROPERTIES' ? (
        /* ==================== PROPERTIES (KHO LƯU TRÚ) TAB ==================== */
        filteredProperties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-450 max-w-4xl mx-auto shadow-sm">
            <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-sm text-slate-700">Không tìm thấy cơ sở lưu trú nào!</p>
            <p className="text-xs text-slate-400 mt-1">Vui lòng thử từ khóa gạn lọc khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8" id="properties-warehouse-view">
            {filteredProperties.map((p) => {
              const matchedRooms = rooms.filter(r => r.propertyId === p.id);
              const propertyImages = p.images && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop'];
              
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 font-sans">
                  {/* Property Left Column - Album Carousel / Media */}
                  <div className="lg:col-span-5 p-5 bg-slate-50 border-r border-slate-200 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Badge and Type */}
                      <div className="flex items-center justify-between">
                        <span className="bg-indigo-100 text-indigo-700 font-black text-[10px] py-1 px-3 rounded-full uppercase tracking-wider">
                          {p.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold font-mono">ID: {p.id}</span>
                      </div>

                      {/* Main Album / Image list */}
                      <div className="space-y-2">
                        <div className="h-48 rounded-xl overflow-hidden relative group">
                          <img 
                            src={propertyImages[0]} 
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                          {p.videoUrl && (
                            <button
                              onClick={() => setActiveVideo(p.videoUrl || null)}
                              className="absolute inset-0 bg-black/30 hover:bg-black/40 flex items-center justify-center text-white backdrop-blur-2xs transition group-hover:scale-105 cursor-pointer"
                            >
                              <div className="h-10 w-10 bg-white/20 hover:bg-indigo-600 hover:scale-110 transition-all rounded-full flex items-center justify-center border border-white/20 shadow-md">
                                <Video className="h-5 w-5 text-white" />
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Thumbnail album row */}
                        {propertyImages.length > 1 && (
                          <div className="grid grid-cols-4 gap-1.5 overflow-x-auto">
                            {propertyImages.slice(0, 4).map((img, index) => (
                              <div key={index} className="h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                <img src={img} alt={`Album ${index}`} className="w-full h-full object-cover hover:opacity-85 cursor-pointer"/>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Property overview details */}
                      <div 
                        className="group cursor-pointer bg-indigo-50/25 hover:bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100/40 transition-all shadow-6xs" 
                        onClick={() => setSelectedPropertyId(p.id)}
                        title="Click để xem giao diện Agoda/Booking chi tiết của khu này"
                      >
                        <h3 className="text-base font-extrabold text-slate-950 leading-snug group-hover:text-indigo-700 transition flex items-center justify-between">
                          <span>{p.name}</span>
                          <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center shadow-7xs">
                            <Eye className="h-3 w-3 mr-1" /> Agoda Detail 👁️
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center mt-1 font-semibold">
                          <MapPin className="h-3 w-3 text-rose-500 mr-1 flex-shrink-0" />
                          {p.location}
                        </p>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">{p.description}</p>
                      </div>

                      {/* Facilities list */}
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tiện ích khuôn viên:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.facilities.map((fac, idx) => (
                            <span key={idx} className="bg-indigo-50/75 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-100">
                              ✨ {fac}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Geolocation visualizer coordinates */}
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Vị trí địa lý & Bản đồ:</span>
                      <div className="bg-slate-200/50 p-2 rounded-lg border border-slate-200 text-[10px] font-mono flex items-center justify-between">
                        <span className="text-slate-600">Vĩ độ: {p.latitude || 11.94} | Kinh độ: {p.longitude || 108.44}</span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${p.latitude || 11.94},${p.longitude || 108.44}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-slate-100 p-1 px-2 border border-slate-300 rounded text-[9px] font-bold text-indigo-700 inline-flex items-center space-x-0.5 shadow-6xs"
                        >
                          <MapPin className="h-2.5 w-2.5 text-rose-500" />
                          <span>Mở Bản Đồ</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Property Right Column - Room Variants belonging to this warehouse */}
                  <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <span className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">Cấu trúc dạng phòng trong kho ({matchedRooms.length})</span>
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">Tồn kho: {matchedRooms.reduce((sum, r) => sum + (r.quantity || 1), 0)} phòng</span>
                      </div>

                      {matchedRooms.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-xs">
                          Chưa có hoặc không tìm thấy dạng phòng nào khả dụng thuộc khuôn viên này.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                          {matchedRooms.map((room) => (
                            <div key={room.id} className="p-3 bg-slate-50 hover:bg-indigo-50/10 border border-slate-200 hover:border-indigo-150 transition-all rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                              {/* Small thumb */}
                              <div className="sm:col-span-3 h-14 rounded-lg overflow-hidden border border-slate-200">
                                <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                              </div>

                              {/* Room content details */}
                              <div className="sm:col-span-5 space-y-0.5">
                                <h4 className="font-bold text-slate-800 text-xs leading-snug">{room.name}</h4>
                                <div className="text-[10px] text-slate-400 font-bold">
                                  Sức chứa: {room.maxGuests} khách | <span className="text-indigo-600 font-extrabold">Kho: {room.quantity || 1} phòng</span>
                                </div>
                                <div className="text-[10px] text-emerald-600 font-semibold">
                                  H.Hồng: {(room.clientPrice - room.ctvPrice).toLocaleString('vi-VN')}đ / đêm
                                </div>
                              </div>

                              {/* Price and Action of this room inside property */}
                              <div className="sm:col-span-4 text-right space-y-1 bg-white p-2 rounded-lg border border-slate-150">
                                <div>
                                  <span className="text-[8px] text-slate-400 block uppercase font-bold tracking-wider leading-none">Giá CTV bán</span>
                                  <strong className="text-indigo-700 text-xs font-mono">{room.ctvPrice.toLocaleString('vi-VN')} đ</strong>
                                </div>
                                
                                <button
                                  onClick={() => {
                                    onBookRoom(room, checkIn, checkOut);
                                  }}
                                  className="w-full py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition tracking-wide flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  <span>Chọn bán ngay</span>
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Shared Booking refer link tools */}
                    <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 leading-normal flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span>Bạn muốn tạo link affiliate nhanh cho toàn bộ khu lưu trú này?</span>
                      <button
                        onClick={() => {
                          const safeCode = `REF_${p.type}_${p.name.toUpperCase().replace(/\s+/g, '_').slice(0, 10)}`;
                          localStorage.setItem('booking_referral_code', safeCode);
                          const link = `${window.location.origin}?ref=${safeCode}`;
                          navigator.clipboard.writeText(link).then(() => {
                            alert(`Đã khởi tạo & copy mã nhanh thành công:\n🔗 Link: ${link}\n(Mã giới thiệu "${safeCode}" đã sẵn sàng đón tiếp clicks)`);
                          });
                        }}
                        className="p-1 px-3 bg-white text-indigo-700 border border-slate-300 hover:bg-slate-100 rounded text-[10px] font-bold shadow-6xs transition self-start sm:self-auto cursor-pointer"
                      >
                        🔗 Tạo Referral Link Nhanh
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : roomViewMode === 'MATRIX_CALENDAR' ? (
        /* DAY-BY-DAY CALENDAR MATRIX (LỊCH TỔNG QUAN) VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4 font-sans" id="calendar-matrix-view">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <span className="text-[10px] bg-indigo-150 text-indigo-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">Lịch Trống & Bận Chi Tiết (10 Ngày)</span>
              <p className="text-[11px] text-slate-400 mt-1">Trực quan hóa trạng thái trống 🟢 hoặc bận 🔴 trong 10 ngày tiếp theo. Click trực tiếp ô Trống để đặt phòng tức thì.</p>
            </div>
            <div className="flex items-center space-x-3.5 text-xs font-bold text-slate-500 font-mono">
              <span className="inline-flex items-center"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mr-1.5"></span>Trống</span>
              <span className="inline-flex items-center"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 mr-1.5"></span>Bận</span>
            </div>
          </div>

          {/* Dynamic Day-by-Day Date Filtering Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-slate-700 flex items-center">
                <Calendar className="h-3.5 w-3.5 text-indigo-600 mr-1.5" />
                Mốc ngày bắt đầu tra cứu:
              </span>
              <input 
                type="date" 
                value={calendarStartDate} 
                onChange={(e) => setCalendarStartDate(e.target.value)} 
                className="p-1.5 px-3 border border-slate-200 rounded-lg text-xs font-mono font-black bg-white shadow-7xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => {
                  const prev = new Date(calendarStartDate);
                  prev.setDate(prev.getDate() - 10);
                  setCalendarStartDate(prev.toISOString().split('T')[0]);
                }}
                className="bg-white hover:bg-slate-105 border border-slate-250 p-1.5 px-3 rounded-lg text-[11px] font-black text-slate-705 shadow-7xs transition active:scale-95"
              >
                ⬅️ 10 ngày trước
              </button>
              <button 
                type="button"
                onClick={() => setCalendarStartDate('2026-06-10')}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 p-1.5 px-3 rounded-lg text-[11px] font-black text-indigo-700 shadow-7xs transition active:scale-95"
                title="Khôi phục về mốc ban đầu"
              >
                Hôm nay (10/06)
              </button>
              <button 
                type="button"
                onClick={() => {
                  const next = new Date(calendarStartDate);
                  next.setDate(next.getDate() + 10);
                  setCalendarStartDate(next.toISOString().split('T')[0]);
                }}
                className="bg-white hover:bg-slate-105 border border-slate-250 p-1.5 px-3 rounded-lg text-[11px] font-black text-slate-705 shadow-7xs transition active:scale-95"
              >
                10 ngày sau ➡️
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-150">
            <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4 w-64">Dạng Phòng / Cơ Sở</th>
                  {getNext10Days().map(day => (
                    <th key={day.dateStr} className="py-3 px-2 text-center text-[10px] w-24">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-sans text-xs">
                {filteredRooms.map(room => {
                  const matchedProp = properties.find(p => p.id === room.propertyId);
                  const propName = matchedProp?.name || 'Căn hộ Homestay';
                  const expectedCommission = room.clientPrice - room.ctvPrice;

                  return (
                    <tr key={room.id} className="hover:bg-slate-50/50 transition font-medium text-slate-600">
                      {/* Room Header Info */}
                      <td className="py-4 px-4">
                        <span 
                          onClick={() => setSelectedPropertyId(room.propertyId)}
                          className="font-extrabold text-xs text-indigo-700 hover:underline cursor-pointer block truncate"
                          title="Click xem chi tiết Agoda/Booking"
                        >
                          🏙️ {propName}
                        </span>
                        <span className="font-extrabold text-xs text-slate-800 block mt-0.5 truncate">{room.name}</span>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                          <span>Max: {room.maxGuests} khách</span>
                          <span className="text-emerald-600 font-bold">Lời: +{expectedCommission.toLocaleString('vi-VN')}đ</span>
                        </div>
                      </td>

                      {/* 10 Days status blocks */}
                      {getNext10Days().map(day => {
                        const occupied = isDateOccupied(room.id, day.dateStr);

                        return (
                          <td key={day.dateStr} className="py-4 px-1.5 text-center">
                            {occupied ? (
                              <div 
                                className="bg-rose-50 text-rose-700 p-2.5 text-center rounded-xl border border-rose-100 font-extrabold text-[10px] shadow-2xs cursor-not-allowed select-none transition-all flex flex-col justify-center items-center h-12"
                                title={`Đã bận: Phòng đã được chốt (${day.dateStr})`}
                              >
                                <span>🔴 HẾT</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleQuickBookFromMatrix(room, day.dateStr)}
                                className="w-full bg-emerald-50 hover:bg-emerald-100/80 active:scale-95 text-emerald-800 p-2 text-center rounded-xl border border-emerald-200/60 font-black text-[10px] shadow-2xs cursor-pointer transition-all flex flex-col justify-center items-center h-12"
                                title={`Trống! Click để giữ chỗ từ ngày ${day.dateStr}`}
                              >
                                <span className="text-emerald-700">🟢 TRỐNG</span>
                                <span className="text-[9px] font-mono opacity-80 mt-0.5 text-emerald-600 font-bold">{room.ctvPrice.toLocaleString('vi-VN')}đ</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-450 max-w-4xl mx-auto shadow-sm">
          <Layers className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-sm text-slate-700">Không tìm thấy phòng trống phù hợp!</p>
          <p className="text-xs text-slate-400 mt-1">Xin vui lòng nới rộng mốc ngày thuê hoặc thay đổi mốc giá và sức chứa để tìm được phòng ưng ý.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="rooms-bento-listings">
          {filteredRooms.map((room) => {
            const matchedProp = properties.find(p => p.id === room.propertyId);
            const parentLocation = matchedProp?.location || 'Khánh Hoà';
            const expectedCommission = room.clientPrice - room.ctvPrice;

            return (
              <div 
                key={room.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-200 font-sans"
              >
                <div>
                  {/* Thumbnail */}
                  <div 
                    onClick={() => setSelectedRoomId(room.id)}
                    className="h-48 bg-slate-100 relative overflow-hidden cursor-pointer group"
                    title="Click xem chi tiết Agoda/Booking"
                  >
                    <img 
                      src={room.images[0]} 
                      alt={room.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />

                    {/* Left overlay buttons */}
                    {room.videoUrl && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveVideo(room.videoUrl || null); }}
                        className="absolute top-3 left-3 bg-indigo-600/90 hover:bg-indigo-750 text-white p-2 rounded-full shadow-md flex items-center justify-center transition-transform hover:scale-110 cursor-pointer z-10"
                        title="Xem tour thực tế"
                      >
                        <Video className="h-4 w-4" />
                      </button>
                    )}

                    <span className="absolute bottom-3 left-3 bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono z-10">
                      Sức chứa: {room.maxGuests} khách
                    </span>

                    {/* Property type Pill */}
                    <span className="absolute top-3 right-3 bg-indigo-650 text-white font-black text-[10px] py-1 px-3 rounded-full uppercase tracking-wider shadow-sm z-10">
                      {room.propertyType || 'Villa'}
                    </span>
                  </div>

                  {/* Body info */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center space-x-1">
                      <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="text-[10px] font-bold text-indigo-705 text-indigo-700 block uppercase tracking-wide">
                        {room.propertyName || 'Khu Resort'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-1">
                      <h3 
                        onClick={() => setSelectedRoomId(room.id)}
                        className="font-extrabold text-[#111827] text-sm leading-snug hover:text-indigo-600 cursor-pointer transition"
                        title="Xem chi tiết Agoda/Booking"
                      >
                        {room.name}
                      </h3>
                      <button 
                        onClick={() => setSelectedRoomId(room.id)}
                        className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded hover:bg-indigo-100 transition whitespace-nowrap"
                      >
                        👁️ Chi tiết Agoda
                      </button>
                    </div>

                    <div className="flex items-center text-[11px] text-slate-400 font-semibold">
                      <MapPin className="h-3 w-3 text-rose-500 mr-1 flex-shrink-0" />
                      {parentLocation}
                    </div>

                    {/* Room Type and Area/Bed Specification badge row */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {room.roomTypeName && (
                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          🛋️ {room.roomTypeName}
                        </span>
                      )}
                      {room.area && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                          📏 {room.area}m²
                        </span>
                      )}
                      {room.bedType && (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          🛏️ {room.bedType}
                        </span>
                      )}
                    </div>

                    {/* Amenities visual listing badgeline */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {room.amenities.map((item, idx) => (
                          <span key={idx} className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            ✨ {item}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {room.description || 'Chưa cập nhật mô tả không gian.'}
                    </p>

                    {/* Pricing Tiers analysis */}
                    <div className="grid grid-cols-2 gap-3 mt-4 bg-slate-50 border border-slate-150 rounded-xl p-3 text-center">
                      <div className="text-left pl-1">
                        <span className="text-[9px] text-indigo-500 font-bold block uppercase tracking-wider">Đại lý CTV</span>
                        <span className="text-xs font-extrabold text-indigo-700 font-mono">
                          {room.ctvPrice.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      
                      <div className="border-l border-slate-200 text-right pr-1">
                        <span className="text-[9px] text-emerald-500 font-bold block uppercase tracking-wider">Khách công khai</span>
                        <span className="text-xs font-extrabold text-[#0D9488] font-mono">
                          {room.clientPrice.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* Detailed Pricing configurations & inventory */}
                    <div className="text-[11px] space-y-2 pt-2.5 border-t border-slate-150">
                      <div className="flex justify-between items-center bg-indigo-50/20 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-600 font-semibold">📦 Tổng lượng phòng chi tiết:</span>
                        <strong className="text-indigo-950 font-bold">{room.quantity || 1} phòng dạng này</strong>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">⏰ Cấu hình Giá theo Giờ:</span>
                          <strong className="text-slate-700 font-mono">{room.priceByHour ? `${room.priceByHour.toLocaleString('vi-VN')} đ` : 'Chưa định nghĩa'}</strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1">
                          <span className="text-slate-500">☀️ Cấu hình Giá theo Ngày:</span>
                          <strong className="text-slate-700 font-mono">{room.priceByDay ? `${room.priceByDay.toLocaleString('vi-VN')} đ` : 'Chưa định nghĩa'}</strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1">
                          <span className="text-slate-500">📅 Cấu hình Giá theo Tuần:</span>
                          <strong className="text-slate-700 font-mono">{room.priceByWeek ? `${room.priceByWeek.toLocaleString('vi-VN')} đ` : 'Chưa định nghĩa'}</strong>
                        </div>
                      </div>

                      {room.specialRates && room.specialRates.length > 0 && (
                        <div className="bg-rose-50/50 p-2 border border-rose-100 rounded-lg text-[10px]">
                          <span className="font-extrabold text-amber-800 uppercase tracking-wider block mb-1">🔥 Giá thời gian đặc biệt (Lễ/Tết):</span>
                          <div className="space-y-1 leading-normal">
                            {room.specialRates.map((sr, idx) => (
                              <div key={idx} className="flex justify-between text-slate-500">
                                <span>{sr.name}:</span>
                                <strong className="text-rose-700 font-mono">CTV {sr.ctvPrice.toLocaleString('vi-VN')} đ | Khách {sr.clientPrice.toLocaleString('vi-VN')} đ</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(room.latitude || room.longitude) && (
                        <div className="text-[10px] font-mono text-slate-400 pt-1 flex justify-between items-center">
                          <span>📍 Định vị phòng: {room.latitude || 11.94}, {room.longitude || 108.44}</span>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${room.latitude || 11.94},${room.longitude || 108.44}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-slate-50 p-1 px-1.5 border border-slate-200 rounded text-[9px] font-bold text-indigo-700 shadow-6xs"
                          >
                            Bản đồ vĩ độ ↗
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Default Markup profits indicator */}
                    {expectedCommission > 0 && (
                      <div className="bg-emerald-50 text-emerald-820 p-2.5 rounded-xl flex items-center justify-between text-[11px] border border-emerald-100 mt-2 font-semibold">
                        <span className="flex items-center text-emerald-800">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500 mr-1 flex-shrink-0" />
                          Tiền thu hoạch mặc định:
                        </span>
                        <strong className="text-emerald-700">+{expectedCommission.toLocaleString('vi-VN')}đ / đêm</strong>
                      </div>
                    )}

                    {/* Interactive Real-time Availability Calendar Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCalendarRoomId(expandedCalendarRoomId === room.id ? null : room.id);
                        }}
                        className="w-full py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer"
                      >
                        <span>📅 {expandedCalendarRoomId === room.id ? 'Thu gọn lịch bận' : 'Kiểm tra lịch bận chi tiết'}</span>
                        {expandedCalendarRoomId === room.id ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
                      </button>
                    </div>

                    {/* Collapsible Calendar Grid */}
                    {expandedCalendarRoomId === room.id && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Trạng thái phòng tháng:</span>
                          <select
                            value={calendarMonth}
                            onChange={(e) => setCalendarMonth(e.target.value)}
                            className="text-[10px] font-black bg-white border border-slate-205 p-1 rounded uppercase focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="2026-06">Tháng 06/2026</option>
                            <option value="2026-07">Tháng 07/2026</option>
                            <option value="2026-08">Tháng 08/2026</option>
                          </select>
                        </div>

                        {/* Calendar Grid Header */}
                        <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-slate-400">
                          <div>CN</div><div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div>
                        </div>

                        {/* Days Render */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                          {getCalendarDays().map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className="h-6" />;
                            
                            const occupied = isDateOccupied(room.id, day.dateStr);
                            const isPast = day.dateStr < "2026-06-10"; // Metadata is 2026-06-10

                            return (
                              <div
                                key={day.dateStr}
                                className={`py-1 rounded-sm font-mono relative cursor-help transition ${
                                  occupied
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-black'
                                    : isPast
                                    ? 'bg-slate-100 text-slate-350 line-through'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-150 font-bold hover:bg-emerald-100'
                                }`}
                                title={occupied ? `Bận rộn: Phòng đã có khách thuê (${day.dateStr})` : isPast ? 'Ngày đã trôi qua' : `Đang Trống: Phòng mở sẵn sàn (${day.dateStr})`}
                              >
                                <span>{day.dayNum}</span>
                                {occupied && (
                                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 bg-rose-600 rounded-full" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Custom test inputs */}
                        <div className="pt-2.5 border-t border-slate-200 space-y-2">
                          <span className="text-[9px] font-black uppercase text-indigo-700 block tracking-wider">Thử kiểm lịch trùng & Giữ chổ nhanh:</span>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <span className="text-[9px] text-slate-500 font-bold block mb-0.5">Ngày nhận (Check-in)</span>
                              <input
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={roomCheckIn[room.id] || ''}
                                onChange={(e) => setRoomCheckIn(prev => ({ ...prev, [room.id]: e.target.value }))}
                                className="w-full text-[10px] p-1.5 border border-slate-200 rounded font-semibold font-mono bg-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-500 font-bold block mb-0.5">Ngày trả (Check-out)</span>
                              <input
                                type="date"
                                min={roomCheckIn[room.id] || new Date().toISOString().split('T')[0]}
                                value={roomCheckOut[room.id] || ''}
                                onChange={(e) => setRoomCheckOut(prev => ({ ...prev, [room.id]: e.target.value }))}
                                className="w-full text-[10px] p-1.5 border border-slate-200 rounded font-semibold font-mono bg-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Confirm Action with local validation checks */}
                {(() => {
                  const finalIn = roomCheckIn[room.id] || checkIn;
                  const finalOut = roomCheckOut[room.id] || checkOut;
                  const datesOverlapped = isRangeOverlapped(room.id, finalIn, finalOut);
                  const hasDatesChosen = finalIn && finalOut;

                  return (
                    <div className="p-5 pt-0 space-y-2.5">
                      {hasDatesChosen && datesOverlapped && (
                        <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black rounded-lg flex items-center">
                          <XCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mr-1.5" />
                          <span>TRÙNG LỊCH BẬN! Vui lòng chọn mốc thời gian trống khác để phòng tránh trùng đè.</span>
                        </div>
                      )}
                      
                      {hasDatesChosen && !datesOverlapped && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg flex items-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-650 text-emerald-600 flex-shrink-0 mr-1.5" />
                          <span>LỊCH TRỐNG AN TOÀN! Sẵn sàng bàn giao đặt giữ chỗ ngay cho khách.</span>
                        </div>
                      )}

                      {/* Copy Quote and Affiliate Link Section */}
                      <div className="grid grid-cols-2 gap-1.5 pb-2 border-b border-dashed border-slate-150 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            const quoteText = `🌟 BÁO GIÁ PHÒNG HOMESTAY CHUYÊN NGHIỆP 🌟\n\n🏢 Cơ sở: ${room.propertyName || 'Khu Resort cao cấp'}\n🛏️ Loại: ${room.roomTypeName || 'Tiêu chuẩn'} - Phòng: ${room.name}\n📏 Diện tích: ${room.area}m² | Giường: ${room.bedType}\n✨ Tiện ích: ${(room.amenities || []).join(', ')}\n📝 Mô tả: ${room.description || 'Không gian sang trọng, an toàn, thoải mái.'}\n\n💸 GIÁ BÁN YÊU CẦU: ${room.clientPrice.toLocaleString('vi-VN')} đ / đêm\n\n📞 Đặt phòng nhanh ngay để giữ phòng ưu đãi tốt nhất!`;
                            navigator.clipboard.writeText(quoteText).then(() => {
                              alert('📋 Đã sao chép Quote phòng gửi nhanh Zalo/Facebook thành công!\nBạn có thể dán (Paste) để gửi ngay cho khách hàng.');
                            });
                          }}
                          className="py-1 px-2 border border-dashed border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/60 text-indigo-755 text-indigo-700 font-bold rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1"
                        >
                          📋 Copy Quote [Zalo/FB]
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const safeRefCode = `REF_RM_${room.id.replace('rm_', '').toUpperCase()}`;
                            const affiliateLink = `${window.location.origin}?ref=${safeRefCode}&room=${room.id}`;
                            navigator.clipboard.writeText(affiliateLink).then(() => {
                              alert(`🔗 Tạo & sao chép Affiliate Link cho phòng nghỉ này thành công:\n${affiliateLink}\n\n(Giới thiệu mã: "${safeRefCode}")`);
                            });
                          }}
                          className="py-1 px-2 border border-dashed border-emerald-250 bg-emerald-50/20 hover:bg-emerald-50/60 text-emerald-700 font-bold rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1"
                        >
                          🔗 Link Chia Sẻ (+Hoa Hồng)
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRoomId(room.id)}
                          className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center border border-slate-200"
                          title="Xem giao diện Agoda/Booking"
                        >
                          👁️ Chi tiết
                        </button>
                        <button
                          onClick={() => {
                            if (datesOverlapped) {
                              alert('Ngày bạn chọn đã bị đặt trước dính lịch bận. Vui lòng mở bảng lịch bận phía trên để tìm ngày khả dụng!');
                              return;
                            }
                            onBookRoom(room, finalIn, finalOut);
                          }}
                          disabled={hasDatesChosen && datesOverlapped}
                          className={`flex-1 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs ${
                            hasDatesChosen && datesOverlapped
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 border border-slate-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <span>Lên Đơn Giữ Chỗ</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Video stream view */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-55" onClick={() => setActiveVideo(null)}>
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <span className="text-xs font-bold flex items-center"><Video className="h-4 w-4 mr-1.5 text-indigo-400" /> Xem Video Tour Không Gian Phòng</span>
              <button onClick={() => setActiveVideo(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <video 
                src={activeVideo} 
                className="w-full h-full" 
                controls 
                autoPlay 
                loop 
                playsInline
                onError={() => alert('Đường dẫn video mẫu gặp sự cố hoặc không thể phát lúc này.')}
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================== AGODA/BOOKING.COM DEEP PROPERTY DETAIL MODAL ==================== */}
      {selectedPropertyId && (() => {
        const p = properties.find(prop => prop.id === selectedPropertyId);
        if (!p) return null;
        
        const propertyImages = p.images && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop'];
        const currentActiveImgIdx = activeDetailsImageIndices[p.id] || 0;
        const currentActiveImg = propertyImages[currentActiveImgIdx] || propertyImages[0];
        const propertyRooms = rooms.filter(r => r.propertyId === p.id);

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 md:p-6 z-50 overflow-y-auto" onClick={() => setSelectedPropertyId(null)}>
            <div 
              className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden font-sans border border-slate-200 animate-scale-up my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header block */}
              <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {p.type}
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold tracking-tight">Chi Tiết Khu Lưu Trú Cao Cấp — Giao Điện Premium</h2>
                </div>
                <button 
                  onClick={() => setSelectedPropertyId(null)} 
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Main Content Layout */}
              <div className="p-4 sm:p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT: Agoda Dynamic Gallery Carousel (7 Columns) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden relative border border-slate-200 shadow-sm bg-slate-50">
                      <img 
                        src={currentActiveImg} 
                        alt="Active view" 
                        className="w-full h-full object-cover transition-all duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {p.videoUrl && (
                        <button
                          onClick={() => setActiveVideo(p.videoUrl || null)}
                          className="absolute bottom-4 right-4 bg-indigo-600/90 hover:bg-indigo-755 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold text-[11px] shadow-md flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>Xem Video Tour 🎥</span>
                        </button>
                      )}
                    </div>

                    {/* Thumbnail Switchers */}
                    {propertyImages.length > 1 && (
                      <div className="grid grid-cols-5 gap-2">
                        {propertyImages.map((img, index) => (
                          <button
                            key={index}
                            onClick={() => setActiveDetailsImageIndices(prev => ({ ...prev, [p.id]: index }))}
                            className={`h-16 rounded-xl overflow-hidden border-2 transition relative ${
                              index === currentActiveImgIdx ? 'border-indigo-600 scale-102 ring-2 ring-indigo-100' : 'border-slate-200 hover:opacity-85'
                            }`}
                          >
                            <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Property Meta Summary & Policies (5 Columns) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div>
                      <div className="flex items-center text-amber-500 space-x-0.5 text-xs font-bold font-sans">
                        <span>★★★★★</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded ml-2 font-black">5.0 TUYỆT VỜI</span>
                      </div>
                      <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug mt-1.5">{p.name}</h1>
                      <p className="text-xs text-slate-500 font-semibold flex items-center mt-1">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 mr-1 flex-shrink-0" />
                        {p.location}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                      <span className="text-[9px] text-indigo-700 font-extrabold uppercase tracking-widest block">Mô tả tổng quan</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">{p.description}</p>
                    </div>

                    {/* Facilities categorized list */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Tiện nghi đẳng cấp bơi lội & tiệc ngoài trời:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.facilities?.map((f, idx) => (
                          <span key={idx} className="bg-indigo-50/70 text-indigo-800 text-[10px] font-black p-1 px-3 rounded-xl border border-indigo-100 flex items-center">
                            ✨ {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Policy cancellation details */}
                    <div className="bg-rose-50/40 p-4 border border-rose-100 rounded-2xl space-y-1.5">
                      <span className="text-[9px] text-rose-800 font-extrabold uppercase tracking-widest block">Chính sách vận hành chung:</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans whitespace-pre-line">
                        {p.policies || 'Huỷ phòng trước 3 ngày nhận phòng sẽ được hoàn tiền 100% doanh thặng dư của đơn phòng.'}
                      </p>
                    </div>

                    {/* Quick map trigger */}
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-[10px] font-mono flex items-center justify-between">
                      <span className="text-slate-600">Map GPS: {p.latitude || 11.94}, {p.longitude || 108.44}</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${p.latitude || 11.94},${p.longitude || 108.44}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white hover:bg-slate-50 p-1 px-2.5 border border-slate-300 rounded-lg text-[9px] font-bold text-indigo-700 font-sans inline-flex items-center space-x-1 shadow-7xs transition"
                      >
                        <MapPin className="h-3 w-3 text-rose-500" />
                        <span>Mở Google Maps ↗</span>
                      </a>
                    </div>
                  </div>

                </div>

                {/* BOTTOM: Room Selection list (Full row) */}
                <div className="space-y-3 pt-6 border-t border-slate-150">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">🏰 Bảng giá loại phòng thuộc {p.name} ({propertyRooms.length} Variants)</span>
                  
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-wider">
                          <th className="py-3 px-4">Loại Phòng</th>
                          <th className="py-3 px-4">Sức Chứa tối đa</th>
                          <th className="py-3 px-4">Giá CTV sỉ gốc</th>
                          <th className="py-3 px-4">Giá Niêm Yết Công Khai</th>
                          <th className="py-3 px-4 text-center">Biên Hoa Hồng CTV</th>
                          <th className="py-3 px-4 text-right">Lên Đơn Ngay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                        {propertyRooms.map(room => {
                          const com = room.clientPrice - room.ctvPrice;
                          return (
                            <tr key={room.id} className="hover:bg-indigo-50/20 transition font-medium">
                              <td className="py-3.5 px-4 font-bold text-slate-900">
                                <div className="flex items-center space-x-3">
                                  <img src={room.images[0]} className="h-8 w-12 rounded object-cover border border-slate-200" alt="r" />
                                  <span>{room.name}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-500">🧑‍🤝‍🧑 {room.maxGuests} người lớn</td>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{room.ctvPrice.toLocaleString('vi-VN')} đ</td>
                              <td className="py-3.5 px-4 font-mono font-bold text-[#0D9488]">{room.clientPrice.toLocaleString('vi-VN')} đ</td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-100">
                                  +{com.toLocaleString('vi-VN')}đ / đêm
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedPropertyId(null);
                                    onBookRoom(room, checkIn, checkOut);
                                  }}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-6xs transition active:scale-95 cursor-pointer leading-none inline-flex items-center space-x-1"
                                >
                                  <span>Bán phòng</span>
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Action guidelines */}
              <div className="bg-slate-50 p-4 border-t border-slate-150 text-center text-slate-400 text-[10px]">
                💡 Tỉ lệ chốt đơn thành công dựa trên phân khúc khách lẻ được trợ lý ảo Gemini phân tích & đề xuất trực tiếp trên Dashboard.
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== DEEP ROOM DETAIL MODAL (AGODA/BOOKING STYLE FOR CTV) ==================== */}
      {selectedRoomId && (() => {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (!room) return null;

        const matchedProp = properties.find(p => p.id === room.propertyId);
        const parentLocation = matchedProp?.location || 'Việt Nam';
        const parentPolicies = matchedProp?.policies || 'Huỷ phòng trước 3 ngày nhận phòng để được hoàn tiền 100%.';

        const roomImages = room.images && room.images.length > 0 ? room.images : ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop'];
        const activeImgIdx = activeRoomImageIndices[room.id] || 0;
        const currentImg = roomImages[activeImgIdx] || roomImages[0];

        // Pick initial / current checks
        const modalCheckIn = roomCheckIn[room.id] || checkIn || '';
        const modalCheckOut = roomCheckOut[room.id] || checkOut || '';
        const hasDates = modalCheckIn && modalCheckOut;
        const datesOverlapped = isRangeOverlapped(room.id, modalCheckIn, modalCheckOut);

        // Compute nights & amounts
        let calculatedNights = 1;
        if (hasDates) {
          const d1 = new Date(modalCheckIn);
          const d2 = new Date(modalCheckOut);
          const diffTime = Math.abs(d2.getTime() - d1.getTime());
          calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        }

        const totalCtvPrice = room.ctvPrice * calculatedNights;
        const totalClientPrice = room.clientPrice * calculatedNights;
        const totalProfit = totalClientPrice - totalCtvPrice;

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 md:p-6 z-50 overflow-y-auto" onClick={() => setSelectedRoomId(null)}>
            <div 
              className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden font-sans border border-slate-200 animate-scale-up my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header block */}
              <div className="bg-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="bg-[#0D9488]/90 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {room.propertyType || 'Villa'}
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold tracking-tight">Chi Tiết Phòng Theo Tiêu Chuẩn Agoda VIP</h2>
                </div>
                <button 
                  onClick={() => setSelectedRoomId(null)} 
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Main Content Layout */}
              <div className="p-4 sm:p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT: Agoda Gallery & Core Room Specs (7 Columns) */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="h-64 sm:h-80 rounded-2xl overflow-hidden relative border border-slate-200 shadow-sm bg-slate-50">
                    <img 
                      src={currentImg} 
                      alt="Active room view" 
                      className="w-full h-full object-cover transition-all duration-300"
                      referrerPolicy="no-referrer"
                    />
                    {room.videoUrl && (
                      <button
                        onClick={() => setActiveVideo(room.videoUrl || null)}
                        className="absolute bottom-4 right-4 bg-indigo-600/95 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-[11px] shadow-md flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Video className="h-4 w-4" />
                        <span>Xem Video Tour thực tế 🎥</span>
                      </button>
                    )}
                  </div>

                  {/* Thumbnail Swapper */}
                  {roomImages.length > 1 && (
                    <div className="grid grid-cols-5 gap-2">
                      {roomImages.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveRoomImageIndices(prev => ({ ...prev, [room.id]: index }))}
                          className={`h-16 rounded-xl overflow-hidden border-2 transition relative ${
                            index === activeImgIdx ? 'border-indigo-600 scale-102 ring-2 ring-indigo-100' : 'border-slate-200 hover:opacity-85'
                          }`}
                        >
                          <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Core specifications */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl grid grid-cols-3 gap-2.5 text-center">
                    <div>
                      <span className="text-[10px] text-slate-450 uppercase font-bold block mb-0.5">Sức chứa tối đa</span>
                      <strong className="text-slate-850 text-xs font-extrabold flex items-center justify-center gap-1">🧑‍🤝‍🧑 {room.maxGuests} khách</strong>
                    </div>
                    <div className="border-x border-slate-200">
                      <span className="text-[10px] text-slate-450 uppercase font-bold block mb-0.5">Mức diện tích</span>
                      <strong className="text-slate-850 text-xs font-extrabold flex items-center justify-center gap-1">📐 {room.squareArea || 32} m²</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-450 uppercase font-bold block mb-0.5">Thiết kế giường</span>
                      <strong className="text-slate-850 text-xs font-extrabold flex items-center justify-center gap-1">🛏️ {room.bedType || 'King Size'}</strong>
                    </div>
                  </div>

                  {/* Amenities List */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-black text-slate-850 uppercase tracking-widest block font-sans">☘️ Tiện ích trang bị nội khu phòng:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <span className="p-2.5 rounded-xl border border-slate-150 bg-white text-slate-700 text-[11px] font-bold flex items-center gap-1.5 shadow-7xs">
                        📶 Wifi Tốc Độ Cao
                      </span>
                      <span className="p-2.5 rounded-xl border border-slate-150 bg-white text-slate-700 text-[11px] font-bold flex items-center gap-1.5 shadow-7xs">
                        ❄️ Điều Hòa 2 Chiều
                      </span>
                      <span className="p-2.5 rounded-xl border border-slate-150 bg-white text-slate-700 text-[11px] font-bold flex items-center gap-1.5 shadow-7xs">
                        📺 Smart TV Siêu Nét
                      </span>
                      <span className="p-2.5 rounded-xl border border-slate-150 bg-white text-slate-700 text-[11px] font-bold flex items-center gap-1.5 shadow-7xs">
                        🍹 Tủ Lạnh Mini Bar
                      </span>
                      <span className="p-2.5 rounded-xl border border-slate-150 bg-white text-slate-700 text-[11px] font-bold flex items-center gap-1.5 shadow-7xs">
                        🛁 Bồn Tắm Thư Giãn
                      </span>
                      <span className="p-2.5 rounded-xl border border-slate-150 bg-white text-slate-700 text-[11px] font-bold flex items-center gap-1.5 shadow-7xs">
                        🧴 Máy Sấy & Máy Giặt
                      </span>
                    </div>
                  </div>

                  {/* Policy cancellation details */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-1.5">
                    <span className="text-[10px] text-slate-450 font-black uppercase tracking-widest block font-sans">📋 Chính sách hủy phạt phòng & Vận hành:</span>
                    <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium whitespace-pre-line">
                      {parentPolicies}
                    </p>
                  </div>
                </div>

                {/* RIGHT: Calendar Checks & Dynamic Pricing Calculations (5 Columns) */}
                <div className="lg:col-span-5 space-y-4">
                  <div>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-110 border-emerald-100 px-2 py-0.5 rounded font-black uppercase tracking-wide">
                      ⚡ PHÒNG TRỐNG KHO
                    </span>
                    <h1 className="text-xl font-black text-slate-900 leading-snug mt-1.5">{room.name}</h1>
                    <p className="text-xs text-[#0D9488] font-bold flex items-center mt-1">
                      🏙️ {room.propertyName || 'Khu Resort'} | 📍 {parentLocation}
                    </p>
                  </div>

                  {/* Pricing Overview */}
                  <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="text-xs text-slate-400 font-bold">Giá CTV Nhập Sỉ gốc:</span>
                      <strong className="text-base text-indigo-300 font-mono">{room.ctvPrice.toLocaleString('vi-VN')} đ/đêm</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-bold">Giá Niêm Yết Công khai:</span>
                      <strong className="text-base text-[#0D9488] font-mono">{room.clientPrice.toLocaleString('vi-VN')} đ/đêm</strong>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                      <span className="text-xs text-emerald-400 font-extrabold uppercase">Biên thặng dư hoa hồng:</span>
                      <strong className="text-lg text-emerald-400 font-mono font-black animate-pulse">
                        +{(room.clientPrice - room.ctvPrice).toLocaleString('vi-VN')} đ / đêm
                      </strong>
                    </div>
                  </div>

                  {/* Booking Selector form inside modal */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-widest block font-sans">
                      📅 Chọn Ngày Định Giữ Chỗ nhanh trên Agoda Detail
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">Ngày nhận (Check-in)</span>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={modalCheckIn}
                          onChange={(e) => setRoomCheckIn(prev => ({ ...prev, [room.id]: e.target.value }))}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-semibold font-mono text-slate-800"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">Ngày trả (Check-out)</span>
                        <input
                          type="date"
                          min={modalCheckIn || new Date().toISOString().split('T')[0]}
                          value={modalCheckOut}
                          onChange={(e) => setRoomCheckOut(prev => ({ ...prev, [room.id]: e.target.value }))}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-semibold font-mono text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Show warnings or pricing output */}
                    {hasDates ? (
                      <>
                        {datesOverlapped ? (
                          <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-700 text-xs font-bold leading-normal flex items-start">
                            <XCircle className="h-4 w-4 text-rose-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>Trùng lịch bận! Phòng này đã có người giữ ngày đã chọn. Vui lòng đổi khoảng ngày khác.</span>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-emerald-50 border border-emerald-150 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center text-emerald-800 font-bold">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 mr-1.5" />
                              <span>Lịch trống hoàn hảo: {calculatedNights} đêm liên tiếp!</span>
                            </div>

                            <div className="border-t border-emerald-200 pt-2 space-y-1 text-[11px] font-sans font-bold text-slate-600">
                              <div className="flex justify-between">
                                <span>Tổng tiền CTV sỉ gốc ({calculatedNights} đêm):</span>
                                <span className="font-mono text-slate-800">{totalCtvPrice.toLocaleString('vi-VN')}đ</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Tổng tiền bán lẻ cho Khách ({calculatedNights} đêm):</span>
                                <span className="font-mono text-[#0D9488]">{totalClientPrice.toLocaleString('vi-VN')}đ</span>
                              </div>
                              <div className="flex justify-between border-t border-emerald-200 pt-1.5 text-xs text-emerald-700 font-extrabold">
                                <span>Lợi nhuận Hoa Hồng của bạn:</span>
                                <span className="font-mono text-lg">{totalProfit.toLocaleString('vi-VN')}đ</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-705 text-indigo-700 leading-normal">
                        ℹ️ Điền ngày Check-in/Check-out để bộ máy tính Agoda tính toán thời gian ở và tổng doanh thu, lợi nhuận thực nhận.
                      </div>
                    )}
                  </div>

                  {/* Modal bottom Action submit */}
                  <div>
                    <button
                      onClick={() => {
                        if (datesOverlapped && hasDates) {
                          alert('Lịch bận trùng, không thể đặt phòng thời gian này!');
                          return;
                        }
                        setSelectedRoomId(null);
                        onBookRoom(room, modalCheckIn, modalCheckOut);
                      }}
                      disabled={hasDates && datesOverlapped}
                      className={`w-full py-3.5 font-bold text-sm rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 shadow-md ${
                        hasDates && datesOverlapped
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-indigo-650 hover:bg-indigo-700 text-white shadow-indigo-100'
                      }`}
                    >
                      <span>Lên Đơn Đặt Phòng Trực Tiếp ⚡</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="text-[10px] text-center text-slate-400 font-bold mt-2">
                      💡 Click sẽ đưa bạn tới Form hoàn tất thông tin khách hàng và thanh toán.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
