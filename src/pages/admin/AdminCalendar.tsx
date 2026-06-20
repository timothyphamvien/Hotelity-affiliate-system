import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Room, Booking, Property } from '../../types';
import { ChevronLeft, ChevronRight, Calendar, Filter, Eye, AlertCircle, RefreshCw, Layers, Check, X } from 'lucide-react';

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

  // Drag and drop pending change state
  const [pendingMove, setPendingMove] = useState<{
    booking: Booking;
    targetRoomId: string;
    targetRoomName: string;
    newCheckIn: string;
    newCheckOut: string;
    nightsCount: number;
  } | null>(null);

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

  const handleBookingDrop = async (bookingId: string, targetRoomId: string, targetDateStr: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const targetRoom = rooms.find(r => r.id === targetRoomId);
    const targetRoomName = targetRoom ? (targetRoom.roomName || targetRoom.name) : targetRoomId;

    // Calculate original standard nights count
    const start = new Date(booking.checkIn);
    const end = new Date(booking.checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nightsCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // Align booking check-in starting exactly with the dropper target date cell
    const newCheckIn = targetDateStr;
    const newCheckOutDate = new Date(targetDateStr);
    newCheckOutDate.setDate(newCheckOutDate.getDate() + nightsCount);
    const newCheckOut = newCheckOutDate.toISOString().split('T')[0];

    // Double check collisions / date alignments
    const hasOverlap = bookings.some(b => {
      if (b.id === bookingId) return false;
      if (b.status === 'CANCELLED' || b.bookingStatus === 'CANCELLED') return false;
      const bMatches = b.roomId === targetRoomId || (b.roomIds && b.roomIds.includes(targetRoomId));
      if (!bMatches) return false;

      const bStart = new Date(b.checkIn);
      const bEnd = new Date(b.checkOut);
      const dropStart = new Date(newCheckIn);
      const dropEnd = new Date(newCheckOut);

      return dropStart < bEnd && bStart < dropEnd;
    });

    if (hasOverlap) {
      alert(`⚠️ Không thể đổi lịch: Khoảng thời gian từ ${newCheckIn} đến ${newCheckOut} của phòng "${targetRoomName}" đã bị trùng lặp với đơn hàng khác!`);
      return;
    }

    setPendingMove({
      booking,
      targetRoomId,
      targetRoomName,
      newCheckIn,
      newCheckOut,
      nightsCount
    });
  };

  const confirmMoveBooking = async () => {
    if (!pendingMove) return;
    try {
      setLoading(true);
      await api.updateBooking(pendingMove.booking.id, {
        roomId: pendingMove.targetRoomId,
        checkIn: pendingMove.newCheckIn,
        checkOut: pendingMove.newCheckOut,
        nights: pendingMove.nightsCount
      });
      setPendingMove(null);
      await fetchCalendarData();
      alert('🎉 Đổi lịch đặt phòng thành công!');
    } catch (err: any) {
      alert('Không thể cập nhật đổi lịch: ' + err.message);
    } finally {
      setLoading(false);
    }
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

    return { label: 'Phòng Trống 🟢', booking: null, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-150 border hover:bg-emerald-105' };
  };

  const filteredRooms = rooms.filter(r => {
    return filterProperty === 'ALL' ? true : r.propertyId === filterProperty;
  });

  return (
    <div className="space-y-6" id="admin-calendar-timeline-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📅 Sơ Đồ Lịch Phòng Timeline</h1>
          <p className="text-sm text-slate-500 mt-1 pb-1">
            Giao diện bàn cờ điều phối trạng thái phòng vật lý theo thời gian. <b>Kéo thả (Drag & Drop) ô đặt phòng</b> để thay đổi phòng và ngày lưu trú tức thì.
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-4 justify-between items-center">
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
        <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden flex flex-col">
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
                          onDragOver={(e) => {
                            e.preventDefault();
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData('bookingId');
                            if (draggedId) {
                              await handleBookingDrop(draggedId, room.id, d.dateStr);
                            }
                          }}
                          onClick={() => {
                            if (booking) {
                              setSelectedBooking(booking);
                            }
                          }}
                          className={`border-r border-slate-150 text-center relative cursor-pointer px-1 py-1.5 w-20 max-w-[5rem] min-w-[5rem] h-12 transition-all ${
                            booking ? 'bg-[#EEF2F6]' : ''
                          }`}
                        >
                          <div
                            draggable={booking ? true : false}
                            onDragStart={(e) => {
                              if (booking) {
                                e.dataTransfer.setData('bookingId', booking.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }
                            }}
                            className={`h-full w-full rounded-md flex items-center justify-center p-1 text-[9px] transition leading-tight ${colorClass} ${
                              booking ? 'cursor-grab active:cursor-grabbing hover:brightness-95 active:shadow-inner' : ''
                            }`}
                            title={booking ? `${label} (Kéo ô này sang ngày/phòng khác để dời lịch)` : label}
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
          <div className="bg-slate-50/55 p-4 border-t border-slate-150/70 flex flex-wrap gap-4 text-[11px] font-bold text-slate-500">
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

      {/* DRAG & DROP INTERACTIVE CONFIRMATION MODAL */}
      {pendingMove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 text-left border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-indigo-650 mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Calendar className="h-6 w-6 text-indigo-650" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Xác nhận thay đổi lịch phòng?</h3>
                <p className="text-[10px] text-slate-500">Thao tác dời phòng timeline thông minh</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[9px]">Khách hàng</span>
                <b className="text-slate-800 text-[11px]">{pendingMove.booking.customerName}</b>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-200/60">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[9px]">Phòng đích</span>
                  <b className="text-indigo-900 text-[11px]">{pendingMove.targetRoomName}</b>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[9px]">Số đêm nghỉ</span>
                  <b className="text-slate-800 text-[11px]">{pendingMove.nightsCount} đêm</b>
                </div>
              </div>

              <div className="space-y-1 pt-1.5">
                <span className="text-slate-400 block font-semibold uppercase text-[9px]">Lịch trình đề xuất mới</span>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="px-2 py-1 bg-white border border-slate-200 rounded font-bold font-mono">{pendingMove.newCheckIn}</span>
                  <span>➔</span>
                  <span className="px-2 py-1 bg-white border border-slate-200 rounded font-bold font-mono">{pendingMove.newCheckOut}</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-amber-600 mt-2.5 font-medium">
              * Hệ thống đã xác minh không có xung đột lịch phòng nào trùng chéo trên dải dời phòng này.
            </p>

            <div className="mt-6 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setPendingMove(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmMoveBooking}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 active:bg-indigo-805 text-white font-bold text-xs rounded-lg transition shadow-md shadow-indigo-650/10 cursor-pointer flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Cập nhật ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Booking Detail Popover Overlay Panel */}
      {selectedBooking && !pendingMove && (
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

