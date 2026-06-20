import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Room, Booking, Property } from '../../types';
import { ChevronLeft, ChevronRight, Calendar, Filter, Eye, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export function AdminCalendar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterProperty, setFilterProperty] = useState('ALL');
  const [startDateStr, setStartDateStr] = useState('');
  
  // Hover & selection booking details pane
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const [roomList, bookingList, propList] = await Promise.all([
        api.getRooms(),
        api.getBookings(),
        api.getProperties()
      ]);
      setRooms(roomList);
      setBookings(bookingList);
      setProperties(propList);
    } catch (err) {
      console.error('Error fetching calendar schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
    // Default start date is today
    const today = new Date();
    setStartDateStr(today.toISOString().split('T')[0]);

    const handleSyncUpdate = () => {
      fetchCalendarData();
    };
    window.addEventListener('room-status-updated', handleSyncUpdate);
    return () => {
      window.removeEventListener('room-status-updated', handleSyncUpdate);
    };
  }, []);

  const getDatesArray = () => {
    if (!startDateStr) return [];
    const arr = [];
    const start = new Date(startDateStr);
    for (let i = 0; i < 30; i++) {
      const nextDate = new Date(start);
      nextDate.setDate(start.getDate() + i);
      arr.push({
        dateStr: nextDate.toISOString().split('T')[0],
        dayOfWeek: nextDate.toLocaleDateString('vi-VN', { weekday: 'short' }),
        dayOfMonth: nextDate.getDate(),
        month: nextDate.getMonth() + 1
      });
    }
    return arr;
  };

  const shiftStartDate = (days: number) => {
    const start = new Date(startDateStr);
    start.setDate(start.getDate() + days);
    setStartDateStr(start.toISOString().split('T')[0]);
  };

  const dates = getDatesArray();

  const getBookingForRoomAndDate = (rId: string, dateStr: string) => {
    const targetDate = new Date(dateStr);
    return bookings.find(b => {
      if (b.status === 'CANCELLED' || b.bookingStatus === 'CANCELLED') return false;
      const rMatches = b.roomId === rId || (b.roomIds && b.roomIds.includes(rId));
      if (!rMatches) return false;

      const checkInDate = new Date(b.checkIn);
      const checkOutDate = new Date(b.checkOut);
      // Date hits interval
      return targetDate >= checkInDate && targetDate < checkOutDate;
    });
  };

  const getStatusColorClass = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === 'available' || s === 'true') return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border-emerald-200';
    if (s === 'hold' || s === 'on_hold') return 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200';
    if (s === 'booked' || s === 'checked_in') return 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200';
    if (s === 'maintenance') return 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-300';
    return 'bg-slate-50 text-slate-400 border-slate-100';
  };

  const getRoomRealStatusLabel = (room: Room, dateStr: string) => {
    // Check if there is an active booking on this date
    const b = getBookingForRoomAndDate(room.id, dateStr);
    if (b) {
      return {
        label: `Đã Đặt: ${b.customerName}`,
        booking: b,
        colorClass: 'bg-indigo-600 text-white font-semibold'
      };
    }
    
    // Check room's base status
    const stat = String(room.status).toLowerCase();
    if (stat === 'maintenance') {
      return { label: 'Bảo Trì 🔧', booking: null, colorClass: 'bg-slate-200 text-slate-600 border border-slate-300 pattern' };
    }
    if (stat === 'cleaning') {
      return { label: 'Đang Dọn 🧹', booking: null, colorClass: 'bg-teal-50 text-teal-800 border-teal-200' };
    }
    if (stat === 'hold' || stat === 'on_hold') {
      return { label: 'Đang Giữ 👀', booking: null, colorClass: 'bg-amber-100 text-amber-800 border-amber-200 border animate-pulse' };
    }

    return { label: 'Phòng Trống 🟢', booking: null, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-150 border hover:bg-emerald-100' };
  };

  const filteredRooms = rooms.filter(r => {
    return filterProperty === 'ALL' ? true : r.propertyId === filterProperty;
  });

  return (
    <div className="space-y-6" id="admin-calendar-timeline-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📅 Sơ Đồ Lịch Phòng Timeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            Giao diện bàn cờ điều phối trạng thái phòng vật lý theo thời gian, hiển thị chi tiết các booking liền kề.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setStartDateStr(new Date().toISOString().split('T')[0])}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 px-3.5 rounded-lg transition-colors cursor-pointer"
          >
            Hôm nay
          </button>
          
          <button
            onClick={fetchCalendarData}
            title="Làm mới sơ đồ"
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Controllers Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Left side shifting */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-between sm:justify-start">
          <button
            onClick={() => shiftStartDate(-30)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200 bg-white cursor-pointer"
            title="Lùi 30 ngày"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <span className="text-xs font-bold text-slate-700 px-3 flex items-center space-x-2 bg-slate-50 py-2 rounded-lg border border-slate-100">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span>Từ: {new Date(startDateStr).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </span>
          <button
            onClick={() => shiftStartDate(30)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200 bg-white cursor-pointer"
            title="Tiến 30 ngày"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Right side filter properties list */}
        <div className="w-full md:w-72">
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Lọc theo Cơ sở (Tất cả)</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <span className="p-3 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-16 text-center text-slate-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-sm">Chưa có phòng vật lý nào được lập lịch</p>
          <p className="text-xs text-slate-400 mt-1">Vui lòng thiết lập thêm phòng vật lý ở menu kho phòng.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {/* Timeline Board scroll wrapper */}
          <div className="overflow-x-auto w-full">
            <table className="min-w-full border-collapse divide-y divide-slate-100 text-[11px] table-fixed">
              <thead className="bg-slate-50/70">
                <tr>
                  {/* Fixed left header row column */}
                  <th className="sticky left-0 bg-slate-100/90 backdrop-blur-md z-10 px-4 py-3.5 border-r border-slate-200 text-left font-bold text-slate-700 uppercase tracking-wider w-48 max-w-[12rem] min-w-[12rem]">
                    Phòng & Cơ sở
                  </th>

                  {/* Horizontal 14 dates header */}
                  {dates.map(d => {
                    const isWeekend = d.dayOfWeek === 'T7' || d.dayOfWeek === 'CN';
                    return (
                      <th
                        key={d.dateStr}
                        className={`px-3 py-2 text-center text-[10px] font-bold border-r border-slate-100/80 w-20 max-w-[5rem] min-w-[5rem] ${
                          isWeekend ? 'bg-rose-50/50 text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        <span className="block">{d.dayOfWeek}</span>
                        <b className="text-sm tracking-tight">{d.dayOfMonth}/{d.month}</b>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map(room => (
                  <tr key={room.id} className="hover:bg-slate-50/30 transition-all">
                    {/* Sticky left room signature detail */}
                    <td className="sticky left-0 bg-white/95 backdrop-blur-md z-10 px-4 py-3 border-r border-slate-200 font-bold text-slate-800 shadow-sm w-48 max-w-[12rem] min-w-[12rem]">
                      <div className="text-slate-900 block truncate" title={room.roomName || room.name}>
                        {room.roomCode || room.id.toUpperCase()} - {room.roomName || room.name}
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium block truncate uppercase">
                        🏫 {room.propertyName}
                      </span>
                    </td>

                    {/* Timeline date cells */}
                    {dates.map(d => {
                      const { label, booking, colorClass } = getRoomRealStatusLabel(room, d.dateStr);

                      // If there is an active booking, clicking on it triggers the details bubble below or opens sidebar descriptor
                      return (
                        <td
                          key={d.dateStr}
                          onClick={() => {
                            if (booking) {
                              setSelectedBooking(booking);
                            }
                          }}
                          className={`border-r border-slate-150 text-center relative cursor-pointer px-1 py-1.5 w-20 max-w-[5rem] min-w-[5rem] h-12 transition-all ${
                            booking ? 'bg-indigo-50/20' : ''
                          }`}
                        >
                          <div
                            className={`h-full w-full rounded-md flex items-center justify-center p-1 text-[9px] transition leading-tight ${colorClass}`}
                            title={label}
                          >
                            <span className="line-clamp-2 text-center select-none font-bold">
                              {booking ? `${(booking.customerName || 'Khách').split(' ').pop()} 🔑` : (label || '').split(' ')[0]}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sơ đồ màu sắc legend */}
          <div className="bg-slate-50/50 p-4 border-t border-slate-150/70 flex flex-wrap gap-4 text-[11px] font-bold text-slate-500">
            <span className="flex items-center space-x-1.5">
              <span className="h-3 w-6 bg-emerald-50 rounded border border-emerald-250 block"></span>
              <span>Phòng trống</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="h-3 w-6 bg-indigo-600 rounded block"></span>
              <span>Đã cọc & Giữ phòng (Khách)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="h-3 w-6 bg-amber-100 rounded border border-amber-250 block"></span>
              <span>Đang giữ tạm thời</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="h-3 w-6 bg-slate-200 rounded border border-slate-350 block"></span>
              <span>Bảo trì 🔧</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="h-3 w-6 bg-teal-50 rounded border border-teal-200 block"></span>
              <span>Chờ dọn dẹp🧹</span>
            </span>
          </div>
        </div>
      )}

      {/* Selected Booking Detail Popover Overlay Panel */}
      {selectedBooking && (
        <div className="bg-indigo-50/90 border border-indigo-100 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm animate-scale-up">
          <div className="space-y-1.5">
            <h4 className="font-bold text-indigo-900 text-xs inline-flex items-center space-x-2">
              <span>🎟️ Chi Tiết Đơn Độc Lập đang Chọn: {selectedBooking.bookingCode}</span>
            </h4>
            <div className="text-[11px] text-indigo-800 space-y-0.5 font-medium">
              <p>Khách hàng: <b>{selectedBooking.customerName}</b> - ĐT: <b>{selectedBooking.customerPhone}</b></p>
              <p>Lịch ở: <b>{selectedBooking.checkIn}</b> đến <b>{selectedBooking.checkOut}</b> ({selectedBooking.nights} đêm) - Số người: <b>{selectedBooking.guests}</b></p>
              <p>Tổng giá bán: <b>{selectedBooking.sellingPrice.toLocaleString('vi-VN')} đ</b> - CTV đề xuất: <b>{selectedBooking.ctvName || 'Admin'}</b></p>
            </div>
          </div>
          <div className="flex space-x-2 shrink-0">
            <button
              onClick={() => setSelectedBooking(null)}
              className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-[10px] py-1.5 px-3 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              Đóng chi tiết
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
