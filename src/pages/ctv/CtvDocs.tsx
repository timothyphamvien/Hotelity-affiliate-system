import React, { useState } from 'react';
import { 
  BookOpen, Search, Download, FileText, Image, 
  HelpCircle, Sparkles, FileSpreadsheet, Newspaper,
  Video, ChevronRight, ExternalLink, Library
} from 'lucide-react';

export function CtvDocs() {
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'HANDBOOK' | 'ASSETS' | 'POLICY'>('ALL');

  const categories = [
    { id: 'ALL', label: '🗂️ Tất cả tài liệu' },
    { id: 'HANDBOOK', label: '📖 Cẩm nang CTV' },
    { id: 'POLICY', label: '🧾 Quy chế & Chính sách' },
    { id: 'ASSETS', label: '🌄 Thư viện Ảnh / Video' },
  ];

  const documents = [
    {
      id: 'doc_1',
      title: 'Cẩm Nang Đón Khách & Hướng Dẫn Vân Hành Cho Đại Lý',
      description: 'Quy trình chi tiết từ lúc khách giữ phòng, đóng cọc, check-in đến check-out và giải quyết phát sinh sự cố tại villa.',
      category: 'HANDBOOK',
      type: 'PDF',
      size: '2.4 MB',
      updatedAt: '2026-06-15',
      downloadUrl: '#',
      icon: BookOpen,
      iconColor: 'text-indigo-650 bg-indigo-50'
    },
    {
      id: 'doc_2',
      title: 'Bảng Tỷ Lệ Hoa Hồng & Thưởng Vượt Chỉ Tiêu Quý II/2026',
      description: 'Chính sách chiết khấu hoa hồng sỉ, các mốc thưởng bonus áp doanh số phòng từng dòng biệt thự và căn hộ nghỉ dưỡng.',
      category: 'POLICY',
      type: 'XLSX',
      size: '1.1 MB',
      updatedAt: '2026-06-12',
      downloadUrl: '#',
      icon: FileSpreadsheet,
      iconColor: 'text-emerald-700 bg-emerald-50'
    },
    {
      id: 'doc_3',
      title: 'Bộ Ảnh Marketing Toàn Cảnh Villa Hồ Tràm - Vũng Tàu (HD)',
      description: 'Tài liệu ảnh ngoại thất, nội thất phòng ngủ, bể bơi vô cực và khuôn viên nướng BBQ để CTV chia sẻ quảng bá khách hàng.',
      category: 'ASSETS',
      type: 'ZIP',
      size: '145 MB',
      updatedAt: '2026-06-18',
      downloadUrl: '#',
      icon: Image,
      iconColor: 'text-amber-700 bg-amber-50'
    },
    {
      id: 'doc_4',
      title: 'Slide Giới Thiệu Chuỗi Nghỉ Dưỡng StayHub Luxury Co.',
      description: 'Slide thuyết trình slide đẹp mắt, chuyên nghiệp giới thiệu thế mạnh dự án, tiện ích nội ngoại khu chuẩn 5 sao.',
      category: 'ASSETS',
      type: 'PPTX',
      size: '12.8 MB',
      updatedAt: '2026-06-08',
      downloadUrl: '#',
      icon: FileText,
      iconColor: 'text-rose-600 bg-rose-50'
    },
    {
      id: 'doc_5',
      title: 'Chính Sách Hoàn Hủy & Hoàn Tiền Cọc Cho Khách Đoàn',
      description: 'Quy chế hủy phòng do thiên tai, thay đổi lịch trình hoặc sự cố bất khả kháng. Hạn mức bồi hoàn và thỏa thuận xử lý.',
      category: 'POLICY',
      type: 'PDF',
      size: '850 KB',
      updatedAt: '2026-06-10',
      downloadUrl: '#',
      icon: Newspaper,
      iconColor: 'text-blue-600 bg-blue-50'
    },
    {
      id: 'doc_6',
      title: 'Video Trải Nghiệm Thật Homestay Đà Lạt View Đồi Mây',
      description: 'Góc quay 4K phục vụ tạo video ngắn TikTok/Reels phục vụ CTV chạy quảng cáo tiếp cận khách hàng trẻ tuổi.',
      category: 'ASSETS',
      type: 'MP4',
      size: '58 MB',
      updatedAt: '2026-06-20',
      downloadUrl: '#',
      icon: Video,
      iconColor: 'text-purple-600 bg-purple-50 font-black'
    }
  ];

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchText.toLowerCase()) || 
                          doc.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || doc.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDownloadStub = (title: string) => {
    alert(`Đang khởi tạo liên kết tải xuống an toàn cho file: "${title}". Chúc bạn giao dịch thành công!`);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10 font-sans" id="ctv-docs-viewport">
      {/* Top intro */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 text-left">
          <div className="flex items-center space-x-2">
            <span className="p-1 px-2.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-md font-black uppercase tracking-wider">
              Thư viện tài liệu hỗ trợ bán hàng
            </span>
            <Sparkles className="h-4.5 w-4.5 text-indigo-550 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-slate-850">Tài Liệu, Thư Viện & Quy Chế CTV</h1>
          <p className="text-xs text-slate-450">Tải xuống tài liệu bán hàng, cẩm nang đón tiếp, quy định đặt cọc và chính sách chiết khấu kinh doanh mới nhất.</p>
        </div>
      </div>

      {/* Main filter tab layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar categories inside document menu */}
        <div className="md:w-64 space-y-4 shrink-0 text-left">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-4 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-950 px-1 border-b border-slate-150 pb-2">
              <Library className="h-4.5 w-4.5 text-indigo-650" />
              <span className="text-xs font-black uppercase tracking-wider">Phân Phối Tài Liệu</span>
            </div>

            <div className="flex flex-col space-y-1.5">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick FAQ info widget */}
          <div className="p-4 bg-teal-50/40 border border-teal-150/50 rounded-2xl space-y-2">
            <h4 className="text-xs font-extrabold text-teal-950 flex items-center gap-1">
              <HelpCircle className="h-4 w-4 text-teal-750" />
              <span>Gặp Trở Ngại Tải File?</span>
            </h4>
            <p className="text-[10px] text-teal-800 leading-relaxed font-semibold">
              Các tài liệu dung lượng lớn được lưu trực tiếp trên Cloud Google Drive. Khuyến nghị sử dụng Wifi kết nối ổn định khi tải ảnh bão hòa HD.
            </p>
          </div>
        </div>

        {/* Content pane containing document lists */}
        <div className="flex-1 space-y-5">
          {/* Search strip */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1.5" />
            <input
              type="text"
              placeholder="Search: Nhập tên tài liệu, quy định, file ảnh, slide muốn tìm kiếm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full text-xs bg-transparent border-none outline-none text-slate-705 placeholder-slate-400 font-semibold focus:ring-0"
            />
            {searchText && (
              <button 
                onClick={() => setSearchText('')}
                className="text-xs text-slate-400 hover:text-slate-600 p-1 px-2.5 font-bold cursor-pointer"
              >
                ✕ Xóa
              </button>
            )}
          </div>

          {/* Search Result lists count */}
          <div className="text-left">
            <span className="text-[11px] text-slate-400 font-semibold">
              Tìm thấy <b className="text-slate-700">{filteredDocs.length}</b> tài liệu phù hợp tiêu chí của đại lý.
            </span>
          </div>

          {/* Grid list display */}
          {filteredDocs.length === 0 ? (
            <div className="p-16 bg-white border border-dashed rounded-3xl text-center space-y-2">
              <BookOpen className="h-10 w-10 text-slate-350 mx-auto animate-pulse" />
              <h3 className="text-sm font-bold text-slate-700">Không tìm thấy tài liệu nào!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">Vui lòng thay đổi từ khóa kiếm tìm hoặc chọn phân hệ danh mục tài liệu khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => {
                const DocumentIcon = doc.icon;
                return (
                  <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col justify-between text-left hover:shadow transition-all group">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className={`p-2.5 rounded-xl shrink-0 ${doc.iconColor}`}>
                          <DocumentIcon className="h-5 w-5" />
                        </div>
                        <span className="text-[9px] bg-slate-100 font-mono font-extrabold text-[#1F1F1C] px-2 py-0.5 rounded border border-slate-200">
                          {doc.type} • {doc.size}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-indigo-650 transition">
                          {doc.title}
                        </h3>
                        <p className="text-[11px] text-slate-450 leading-relaxed font-medium line-clamp-2">
                          {doc.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-semibold font-mono">Cập nhật: {doc.updatedAt}</span>
                      <button
                        type="button"
                        onClick={() => handleDownloadStub(doc.title)}
                        className="py-1 px-3.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-extrabold rounded-lg flex items-center space-x-1 transition cursor-pointer"
                      >
                        <Download className="h-3 w-3 shrink-0" />
                        <span>Tải về</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Guidelines info card block */}
          <div className="p-5 bg-indigo-50/30 rounded-2xl border border-indigo-150/40 text-left space-y-4">
            <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-indigo-100/60">
              <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
              Nội quy vận hành Homestay dòng StayOS Lux
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] leading-tight text-indigo-950">
              <div className="space-y-1">
                <span className="font-bold text-indigo-805 block">🕛 Giờ Check-in/out:</span>
                <span className="text-slate-500 font-medium">Nhận phòng sau 14:00 và Trả phòng trước 12:00 hôm sau. Trả muộn phụ thu 10% giá phòng/h.</span>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-indigo-805 block">🔇 Quy chuẩn tiếng ồn:</span>
                <span className="text-slate-500 font-medium">Không hát hò, phát nhạc lớn tại khuôn viên bơi lội, nướng ngoại thất ngoài trời sau 22:00 đêm.</span>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-indigo-805 block">🧹 Đầy đủ tiện ích:</span>
                <span className="text-slate-500 font-medium">Cung cấp bộ đồ nấu dọn, gia vị nướng, đồ bếp BBQ thoải mái. Yêu cầu quý khách dọn sạch sẽ khi trả.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
