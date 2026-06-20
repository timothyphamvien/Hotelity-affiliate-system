import React, { useState } from 'react';
import { Button } from '../atoms/Button';

interface TouchStep {
  label: string;
  description: string;
  icon?: React.ReactNode;
}

export interface CardProps {
  id?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  statusBadge?: React.ReactNode;
  price?: string;
  pricePeriod?: string;
  metadata?: { label: string; value: string; icon?: React.ReactNode }[];
  
  // 3-Touches operation configurators
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  actionVariant?: 'primary' | 'secondary' | 'terracotta' | 'success' | 'danger' | 'outline';
  
  // Steps definition for confirmation
  steps?: TouchStep[];
  
  // Final Touch Confirm action
  onConfirm?: () => Promise<void> | void;
  confirmTitle?: string;
  confirmWarning?: string;
  className?: string;
}

/**
 * MOLECULE: Card - Embodies high-end styling with the 3-touches workflow.
 * Touch 1: Click "Action"
 * Touch 2: Review verification payload
 * Touch 3: Trigger "Confirm"
 */
export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  imageUrl,
  statusBadge,
  price,
  pricePeriod = 'đêm',
  metadata = [],
  actionLabel = 'Xử lý nhanh',
  actionIcon,
  actionVariant = 'primary',
  steps = [
    { label: 'Chọn lệnh', description: 'Chọn hành động xử lý đơn phòng' },
    { label: 'Kiểm tra', description: 'Đối soát các dữ liệu phòng và thanh toán' },
    { label: 'Hoàn tất', description: 'Cập nhật trạng thái an toàn lên hệ thống' }
  ],
  onConfirm,
  confirmTitle = 'Xác minh giao dịch',
  confirmWarning = 'Thực thi sẽ thay đổi trực tiếp trạng thái phòng vật lý.',
  className = '',
}) => {
  const [touchStage, setTouchStage] = useState<1 | 2>(1);
  const [working, setWorking] = useState(false);

  const handleActionClick = () => {
    setTouchStage(2); // Touch Stage 2: Verification panel
  };

  const handleConfirmSubmit = async () => {
    if (!onConfirm) return;
    try {
      setWorking(true);
      await onConfirm();
      setTouchStage(1); // Reset back to Touch 1
    } catch (err: any) {
      alert('Thao tác không thành công: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className={`group bg-white rounded-2xl border border-[#E3D8CB]/50 hover:border-[#C58B5C]/50 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col font-sans ${className}`}>
      
      {/* Aspect Ratio Preservation header container */}
      {imageUrl && (
        <div className="relative aspect-video w-full overflow-hidden bg-soft-beige">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {statusBadge && (
            <div className="absolute top-3.5 right-3.5 z-10">
              {statusBadge}
            </div>
          )}
        </div>
      )}

      {/* Main content body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        
        {touchStage === 1 ? (
          /* Touch Step 1: Normal View */
          <div className="space-y-3.5">
            <div>
              {statusBadge && !imageUrl && <div className="mb-2.5">{statusBadge}</div>}
              {subtitle && (
                <span className="text-[10px] font-black tracking-widest text-[#C58B5C] uppercase block mb-1">
                  {subtitle}
                </span>
              )}
              <h3 className="text-sm font-extrabold text-primary-text leading-snug group-hover:text-deep-olive transition-colors">
                {title}
              </h3>
            </div>

            {/* Metadata list */}
            {metadata.length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-secondary-text">
                {metadata.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 py-0.5">
                    {item.icon && <span className="text-muted-text active:text-deep-olive shrink-0">{item.icon}</span>}
                    <span className="truncate">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Touch Step 2: Verification Panel inside Card (No disruptive popups) */
          <div className="space-y-3 bg-[#F7F3EC]/50 border border-[#E3D8CB]/40 rounded-xl p-3.5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#E3D8CB]/30 pb-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-deep-olive">
                ⚡ {confirmTitle}
              </span>
              <button 
                onClick={() => setTouchStage(1)}
                className="text-[10px] font-black text-rose-600 hover:text-rose-800 bg-white shadow-xs px-2 py-0.5 rounded border border-[#E3D8CB]/30 cursor-pointer"
              >
                ✕ Hủy
              </button>
            </div>

            {/* Steps bar */}
            <div className="flex items-center justify-between font-bold text-[9px] text-[#8A8177]">
              {steps.map((st, i) => (
                <React.Fragment key={i}>
                  <div className={`flex items-center gap-1 ${i === 1 ? 'text-deep-olive font-black' : ''}`}>
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[8px] ${
                      i <= 1 ? 'bg-deep-olive text-[#F7F3EC]' : 'bg-[#E3D8CB] text-white'
                    }`}>
                      {i + 1}
                    </span>
                    <span>{st.label}</span>
                  </div>
                  {i < steps.length - 1 && <div className="flex-1 h-px bg-[#E3D8CB]/50 mx-1"></div>}
                </React.Fragment>
              ))}
            </div>

            <p className="text-[11px] font-extrabold text-secondary-text bg-white p-2 rounded border border-[#E3D8CB]/20">
              {confirmWarning}
            </p>
          </div>
        )}

        {/* Action controls footer */}
        <div className="pt-3 border-t border-[#F1EFEA] flex items-center justify-between gap-3">
          {price && (
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-text">Giá chỉ từ</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-sm font-black text-rose-650 font-mono">{price}</span>
                <span className="text-[10px] font-semibold text-muted-text">/{pricePeriod}</span>
              </div>
            </div>
          )}

          {touchStage === 1 ? (
            <Button
              variant={actionVariant}
              size="sm"
              icon={actionIcon}
              onClick={handleActionClick}
              className="ml-auto"
            >
              {actionLabel}
            </Button>
          ) : (
            <Button
              variant="success"
              size="sm"
              isLoading={working}
              onClick={handleConfirmSubmit}
              className="ml-auto flex-1 font-black"
            >
              ✓ Xác nhận Touch 3
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};
