import React from 'react';
import { 
  CheckCircle2, AlertTriangle, KeyRound, Clock, 
  Sparkles, Ban 
} from 'lucide-react';

export interface StatusPillProps {
  type: 'room' | 'booking' | 'payment';
  status: string;
}

/**
 * ATOM: StatusPill - Visual status presenter
 */
export const StatusPill: React.FC<StatusPillProps> = ({ type, status }) => {
  const norm = String(status || '').toLowerCase().trim();

  if (type === 'room') {
    switch (norm) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF5EE] text-[#3F7D58] border border-[#D5EBDB]" id="status-room-available">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3F7D58] animate-pulse"></span>
            Còn trống (Available)
          </span>
        );
      case 'hold':
      case 'on hold':
      case 'on_hold':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF6EC] text-[#D79A2B] border border-[#FBE3CC]" id="status-room-hold">
            <Clock className="w-3.5 h-3.5" />
            Đang giữ (Hold)
          </span>
        );
      case 'booked':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF4FA] text-[#406E8E] border border-[#D4E8F4]" id="status-room-booked">
            <KeyRound className="w-3.5 h-3.5" />
            Đã đặt (Booked)
          </span>
        );
      case 'checked_in':
      case 'checked-in':
      case 'checkedin':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5EEFB] text-[#714B9F] border border-[#E8D9F7]" id="status-room-checked-in">
            <KeyRound className="w-3.5 h-3.5" />
            Đang ở (Checked In)
          </span>
        );
      case 'checked_out':
      case 'checked-out':
      case 'checkedout':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F1EFF1] text-[#5F5A52] border border-[#E3E1E3]" id="status-room-checked-out">
            <Clock className="w-3.5 h-3.5" />
            Đã Checkout
          </span>
        );
      case 'cleaning':
      case 'dirty':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EAF7FA] text-[#288494] border border-[#D0F0F5]" id="status-room-cleaning">
            <Sparkles className="w-3.5 h-3.5" />
            Chờ dọn dẹp (Cleaning)
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF2F0] text-[#B14A3B] border border-[#FADCD7]" id="status-room-maintenance">
            <AlertTriangle className="w-3.5 h-3.5" />
            Bảo trì (Maintenance)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-750 border border-gray-250">
            {status}
          </span>
        );
    }
  }

  if (type === 'booking') {
    switch (norm) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF6EC] text-[#D79A2B] border border-[#FBE3CC]" id="status-booking-pending">
            <Clock className="w-3 h-3" /> CHỜ DUYỆT CỌC
          </span>
        );
      case 'confirmed':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EBF5EE] text-[#3F7D58] border border-[#D5EBDB]" id="status-booking-confirmed">
            <CheckCircle2 className="w-3 h-3" /> ĐÃ XÁC NHẬN
          </span>
        );
      case 'checked_in':
      case 'checked-in':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F5EEFB] text-[#714B9F] border border-[#E8D9F7]" id="status-booking-checked-in">
            🔑 ĐANG LƯU TRÚ
          </span>
        );
      case 'checked_out':
      case 'checked-out':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F1EFF1] text-[#5F5A52] border border-[#E3E1E3]" id="status-booking-completed">
            🚪 HOÀN THÀNH
          </span>
        );
      case 'cancelled':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FDF2F0] text-[#B14A3B] border border-[#FADCD7]" id="status-booking-cancelled">
            <Ban className="w-3 h-3" /> ĐÃ HỦY ĐƠN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200">
            {status}
          </span>
        );
    }
  }

  // Payment Status
  switch (norm) {
    case 'paid':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-extrabold bg-[#EBF5EE] text-[#3F7D58] border border-[#D5EBDB]" id="status-payment-paid">
          ĐÃ THANH TOÁN
        </span>
      );
    case 'deposit_paid':
    case 'deposit':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-extrabold bg-[#EBF4FA] text-[#406E8E] border border-[#D4E8F4]" id="status-payment-deposit">
          ĐÃ CỌC MỘT PHẦN
        </span>
      );
    case 'unpaid':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-extrabold bg-[#FDF2F0] text-[#B14A3B] border border-[#FADCD7]" id="status-payment-unpaid">
          CHƯA THANH TOÁN
        </span>
      );
  }
};
