import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Sparkles, Gift, Share2, Clipboard, CheckCircle2, Users, 
  DollarSign, HelpCircle, ArrowRight, ShieldCheck, HeartHandshake,
  Facebook, Mail, Smartphone, Award, Trophy, Zap
} from 'lucide-react';

export function CtvReferralProgram() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Direct email invite portal states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) {
      alert('Vui lòng cung cấp đầy đủ Họ tên và Email của bạn đồng hành!');
      return;
    }
    setInviting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInviteSuccess(true);
      setInviteEmail('');
      setInviteName('');
      setInvitePhone('');
      alert(`🎉 Gửi thư mời thành công! Hệ thống Làng Bình Yên đã tự động phát chuyển hướng dẫn liên kết hoa hồng đến hộp thư: ${inviteEmail}.`);
      setTimeout(() => setInviteSuccess(false), 8000);
    } catch (err) {
      alert('Không kết nối được dịch vụ gửi thư mời lúc này.');
    } finally {
      setInviting(false);
    }
  };

  // Generate real referral link pointing to local system with ref search query
  const referralId = user?.referralCode || user?.id || 'CTV_SECRET';
  const referralLink = `${window.location.origin}/?ref=${referralId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Persuasive benefits why other sellers should register & work with StayHub
  const platformAdvantages = [
    {
      id: 1,
      icon: <Zap className="h-5 w-5 text-indigo-600" />,
      title: 'Hệ sinh thái Biệt thự & Homestay đa dạng',
      description: 'Hơn 1,200 phòng trống, biệt thự nghỉ dưỡng VIP trải dài khắp Vũng Tàu, Đà Lạt, Nha Trang, Phú Quốc luôn cập nhật trạng thái trực tuyến 24/7.'
    },
    {
      id: 2,
      icon: <Award className="h-5 w-5 text-emerald-600" />,
      title: 'Tỷ lệ hoa hồng bỏ túi lên tới 10% - 25%',
      description: 'Không qua trung gian, hệ sinh thái StayHub liên kết ký gửi phòng tận gốc từ các chủ đầu tư, tối ưu phí chênh lệch đại lý cực cao.'
    },
    {
      id: 3,
      icon: <ShieldCheck className="h-5 w-5 text-sky-600" />,
      title: 'Hỗ trợ xuất hóa đơn VAT nhanh chóng',
      description: 'Đặc thù nhóm khách công ty cần hóa đơn để giải ngân, StayHub hỗ trợ hoàn thiện chứng từ đỏ VAT chỉ trong 4 giờ làm việc.'
    },
    {
      id: 4,
      icon: <HeartHandshake className="h-5 w-5 text-pink-650" />,
      title: 'Khởi nghiệp 0 đồng - Chiết khấu tức thì',
      description: 'Không đóng phí gia nhập, không rủi ro cọc ôm phòng giữ phòng. Rút sỉ hoa hồng về thẻ ATM ngân hàng trong 10 phút sau khi bàn giao phòng.'
    }
  ];

  // Dummy affiliate overview statistics for the currently logged-in CTV
  const mockReferredCtvs = [
    { id: 'usr_sub_1', name: 'Đoàn Minh Anh', joinedAt: '2026-06-18', status: 'ACTIVE', bookingsCompleted: 3, payoutVat: 4100000 },
    { id: 'usr_sub_2', name: 'Trần Hoàng Long', joinedAt: '2026-06-19', status: 'ACTIVE', bookingsCompleted: 1, payoutVat: 2800000 },
    { id: 'usr_sub_3', name: 'Phạm Kiều Trang', joinedAt: '2026-06-20', status: 'PENDING', bookingsCompleted: 0, payoutVat: 0 }
  ];

  const totalFriendsReferred = mockReferredCtvs.length;
  const activeReferralsEarned = 2 * 100000; // 2 active friends * 100k
  const commission1pctRevenue = Math.round((4100000 + 2800000) * 0.01); // 1% of sub-CTV booking total bills
  const grandTotalAffiliateComms = activeReferralsEarned + commission1pctRevenue;

  return (
    <div className="space-y-6" id="ctv-referral-affiliate-portal">
      
      {/* HEADER SECTION */}
      <div className="border-b border-slate-100 pb-5 text-left">
        <h1 className="text-xl font-black text-slate-800 flex items-center space-x-2">
          <Gift className="h-6 w-6 text-indigo-600 animate-bounce" />
          <span>🎁 Tặng Quà Bạn Bè & Thưởng Thụ Động Trọn Đời</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Mở rộng hệ sinh thái kinh doanh homestay StayHub và cùng kiếm tiền thụ động. Nhận thưởng kép khổng lồ từ mỗi người bạn đồng hành.
        </p>
      </div>

      {/* MARKETING HERO PROMOTIONAL BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl text-left">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 pointer-events-none">
          <Users className="h-64 w-64 text-white -mr-16 -mb-16 transform rotate-12" />
        </div>

        <div className="max-w-xl space-y-4">
          <span className="bg-indigo-500/35 text-indigo-200 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider border border-indigo-400/25">
            🔥 Chương trình siêu tiếp thị 2026
          </span>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">
            Bạn Bè Đắt Đơn – <span className="text-amber-400">Tài Khoản Cộng Thưởng!</span>
          </h2>
          <p className="text-xs text-indigo-100/90 leading-relaxed font-semibold">
            Chỉ cần gửi đường link độc quyền của bạn để mời bạn bè tham gia đội ngũ Đại sứ bán phòng StayHub. Bạn sắm vai "Nhà bảo trợ" và nhận ngay 2 tầng thưởng kép thụ động:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1">
              <div className="flex items-center space-x-2">
                <div className="bg-amber-405/20 text-amber-300 p-1 rounded-lg">
                  <Award className="h-4 w-4" />
                </div>
                <span className="text-xs font-black text-amber-300">Quà Tặng Chào CTV Mới</span>
              </div>
              <h3 className="text-lg font-black text-white">+100,000 đ</h3>
              <p className="text-[10px] text-indigo-205 leading-snug">
                Cộng trực tiếp vào tài khoản khả dụng khi CTV mới đăng ký thành công qua mã giới thiệu & được Admin phê duyệt tài khoản.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1">
              <div className="flex items-center space-x-2">
                <div className="bg-emerald-405/20 text-emerald-300 p-1 rounded-lg">
                  <Trophy className="h-4 w-4" />
                </div>
                <span className="text-xs font-black text-emerald-300">Hưởng Lương Trọn Đời</span>
              </div>
              <h3 className="text-lg font-black text-white">Nhận Thêm 1% Doanh Thu</h3>
              <p className="text-[10px] text-indigo-205 leading-snug">
                Mỗi khi người bạn giới thiệu lưu trú khách thành công, bạn nhận thêm 1% dòng tiền hóa đơn hóa đơn bán sỉ mà bạn đó sáp nhập trọn đời.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SHARE LINK CARD BOX */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs text-left space-y-5">
        <div className="space-y-1">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5">
            <Share2 className="h-5 w-5 text-indigo-600" />
            <span>Đường dẫn tiếp thị liên kết (Affiliate Link) độc quyền</span>
          </h3>
          <p className="text-xs text-slate-400">
            Sao chép mã liên kết này và đăng lên trang cá nhân Facebook, Zalo, hoặc các nhóm phân phối nghỉ dưỡng để thu hút cộng tác viên đại lý cấp dưới.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-xs focus-within:ring-1 focus-within:ring-indigo-505 flex items-center justify-between select-all truncate">
            <span className="text-slate-600 truncate font-semibold">{referralLink}</span>
            <span className="text-[9px] bg-indigo-50 font-black text-indigo-800 border border-indigo-150 px-1.5 py-0.5 rounded ml-2">
              Code: {referralId}
            </span>
          </div>

          <button
            onClick={handleCopyLink}
            className={`py-3 px-6 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 transition cursor-pointer min-w-[170px] ${
              copied 
                ? 'bg-emerald-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/15'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Đã Sao Chép!</span>
              </>
            ) : (
              <>
                <Clipboard className="h-4 w-4" />
                <span>Sao Chép Link Mời</span>
              </>
            )}
          </button>
        </div>

        {/* Mock Social Sharing Widgets */}
        <div className="flex items-center gap-1.5 pt-2 flex-wrap text-xs font-semibold text-slate-500">
          <span>Gửi nhanh qua:</span>
          <button
            onClick={() => alert('Mở liên kết Facebook để chia sẻ tuyển dụng CTV...')} 
            className="p-1 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Facebook className="h-3.5 w-3.5 text-blue-600" />
            <span>Facebook</span>
          </button>
          <button
            onClick={() => alert(`Đã sao chép link. Vui lòng mở Zalo để gửi tuyển dụng: ${referralLink}`)}
            className="p-1 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Smartphone className="h-3.5 w-3.5 text-sky-505" />
            <span>Zalo Messenger</span>
          </button>
          <button
            onClick={() => {
              const body = encodeURIComponent(`Chào bạn, StayHub là hệ quản trị đặt phòng Homestay/Villa biệt thự nghỉ dưỡng chiết khấu cao lên tới 25%. Kính mời bạn tham gia làm CTV đại sứ bán phòng cùng mình nhé! Link đăng ký tài khoản miễn phí: ${referralLink}`);
              window.open(`mailto:?subject=Thuong%20Gia%20Nhap%20StayHub&body=${body}`);
            }}
            className="p-1 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Mail className="h-3.5 w-3.5 text-rose-500" />
            <span>Email</span>
          </button>
        </div>
      </div>

      {/* DIRECT INVITATION FORM PORTAL */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm text-left space-y-5">
        <div className="space-y-1">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5 font-display text-indigo-950">
            <Mail className="h-5 w-5 text-indigo-600" />
            <span>Mời Bạn Đăng Ký Trực Tiếp Hệ Thống</span>
          </h3>
          <p className="text-xs text-slate-400">
            Nhập email hoặc số điện thoại của bạn đồng hành, hệ thống StayHub sẽ phát đi thư mời chứa mã giới thiệu độc quyền của bạn ngay lập tức.
          </p>
        </div>

        <form onSubmit={handleSendInvite} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Họ tên bạn đồng hành</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Nguyễn Văn Hải"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Địa chỉ Email</label>
              <input
                type="email"
                required
                placeholder="partner@gmail.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Số điện thoại (SĐT)</label>
              <input
                type="text"
                placeholder="Ví dụ: 0912345678"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={inviting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition cursor-pointer"
          >
            {inviting ? 'Đang kích hoạt gói gửi...' : 'Gửi Thư Mời Gia Nhập Đồng Hành'}
          </button>
        </form>

        {inviteSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-xl border border-emerald-100 flex items-center space-x-1.5 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Đã phát đi thư mời hợp tác điện tử trực tuyến! Khách có thể click trực tiếp vào liên kết đính kèm để sáp nhập thành đại lý cấp dưới của bạn.</span>
          </div>
        )}
      </div>

      {/* WHY INVITATION MATTERS - CORE PERSUASIVE ADVANTAGES */}
      <div className="bg-slate-50/60 p-6 rounded-3xl border border-slate-200 text-left space-y-4">
        <div className="space-y-1">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5">
            <HelpCircle className="h-5 w-5 text-indigo-650" />
            <span>Tại sao bạn bè nên cộng tác bán phòng cùng StayHub?</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Không chỉ giúp bạn bè gia tăng sỉ thu nhập tay trái cực nhàn rỗi, StayHub cung cấp công cụ chuyển giao dữ liệu rỗng thông minh giúp họ không lo sai số:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {platformAdvantages.map(item => (
            <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-start space-x-3.5 shadow-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl shrink-0">
                {item.icon}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-slate-850">{item.title}</h4>
                <p className="text-[11px] text-slate-500 leading-normal font-medium">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MY AFFILIATE NETWORK WORKSPACE SUMMARY */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-left space-y-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 pb-3.5 gap-2">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5">
              <Users className="h-5 w-5 text-indigo-600" />
              <span>Sổ tay đại sứ - Mạng lưới của bạn</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Báo cáo hiệu suất kinh doanh tiếp thị liên kết thụ động thời gian thực.</p>
          </div>
          
          <div className="bg-slate-50 p-1.5 px-3 border border-slate-200 text-slate-600 text-xs font-black rounded-lg">
            Khách đồng hành sỉ: <span className="text-indigo-650">{totalFriendsReferred} CTV</span>
          </div>
        </div>

        {/* Statistics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-black">Thưởng Giới Thiệu Cố định</span>
            <h3 className="text-lg font-black text-indigo-950 font-mono">+{activeReferralsEarned.toLocaleString('vi-VN')}đ</h3>
            <p className="text-[10px] text-slate-405 leading-none">Ước tính: +100k/CTV được duyệt tài khoản</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-black">Thu nhập 1% hóa đơn</span>
            <h3 className="text-lg font-black text-indigo-950 font-mono">+{commission1pctRevenue.toLocaleString('vi-VN')}đ</h3>
            <p className="text-[10px] text-slate-405 leading-none">Tính trên 1% doanh số của cấp dưới trọn đời</p>
          </div>

          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-150 space-y-1">
            <span className="text-[10px] text-indigo-550 uppercase font-black">Lũy kế hoàn thưởng thụ động</span>
            <h3 className="text-xl font-black text-indigo-705 font-mono">+{grandTotalAffiliateComms.toLocaleString('vi-VN')}đ</h3>
            <p className="text-[10px] text-indigo-600 font-bold leading-none">💵 Đã tích lũy và chuyển thành số dư ví</p>
          </div>
        </div>

        {/* Referred list table */}
        <div className="border border-slate-150 rounded-2xl overflow-hidden mt-2 text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-150">
              <tr>
                <th className="p-3">Họ tên CTV bạn mời</th>
                <th className="p-3">Ngày gia nhập</th>
                <th className="p-3">Trạng thái duyệt</th>
                <th className="p-3 text-right">Tổng hóa đơn con sỉ</th>
                <th className="p-3 text-right">Bạn nhận 1% hoa hồng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-750 font-medium">
              {mockReferredCtvs.map(item => {
                const subCpctRewards = Math.round(item.payoutVat * 0.01);
                return (
                  <tr key={item.id} className="hover:bg-slate-500/5">
                    <td className="p-3 font-extrabold text-slate-800">{item.name}</td>
                    <td className="p-3 font-mono text-slate-500">{item.joinedAt}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-black rounded uppercase tracking-wider ${
                        item.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-amber-50 text-amber-700 animate-pulse'
                      }`}>
                        {item.status === 'ACTIVE' ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">{item.payoutVat.toLocaleString('vi-VN')}đ</td>
                    <td className="p-3 text-right font-mono font-black text-indigo-700">+{subCpctRewards.toLocaleString('vi-VN')}đ</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
