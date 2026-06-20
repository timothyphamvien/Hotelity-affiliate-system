import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Wallet, PayoutRequest } from '../../types';
import { 
  DollarSign, Clock, CheckCircle2, AlertTriangle, 
  WalletCards, Send, RefreshCw, Landmark, HelpCircle 
} from 'lucide-react';

export function CtvWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  const fetchWalletAndPayouts = async () => {
    try {
      setLoading(true);
      const [walletData, payoutsData] = await Promise.all([
        api.getWallet(),
        api.getPayouts()
      ]);
      setWallet(walletData);
      setPayouts(payoutsData);
    } catch (err) {
      console.error('Lỗi khi tải thông tin ví/thanh toán:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletAndPayouts();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError('');
    setPayoutSuccess('');
    setPayoutLoading(true);

    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount < 50000) {
      setPayoutError('Số tiền yêu cầu thanh toán tối thiểu phải là 50,000 đ');
      setPayoutLoading(false);
      return;
    }

    if (!wallet || !wallet.bankName || !wallet.bankAccount || !wallet.bankHolder) {
      setPayoutError('Vui lòng quay lại màn hình Trang chủ kết nối thông tin ngân hàng trước khi gửi yêu cầu rút tiền.');
      setPayoutLoading(false);
      return;
    }

    if (wallet.balance < numericAmount) {
      setPayoutError(`Số dư khả dụng trong ví không đủ để giải ngân khoản rút này. Hiện có: ${wallet.balance.toLocaleString('vi-VN')} đ`);
      setPayoutLoading(false);
      return;
    }

    try {
      const res = await api.requestPayout(numericAmount);
      setPayoutSuccess(res.message);
      setAmount('');
      
      // Refresh
      const [w, p] = await Promise.all([api.getWallet(), api.getPayouts()]);
      setWallet(w);
      setPayouts(p);
    } catch (err: any) {
      setPayoutError(err.message || 'Gửi yêu cầu thanh toán không thành công. Hãy thử lại sau!');
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <span className="p-3 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  const hasLinkedBank = !!(wallet?.bankName && wallet?.bankAccount && wallet?.bankHolder);

  return (
    <div className="space-y-6" id="ctv-wallet-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">💰 Ví Thưởng & Rút Hoa Hồng</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quản lý số dư, tiền treo đặt cọc phòng và rút tiền từ hoa hồng tích lũy về ngân hàng cá nhân bất kỳ.
        </p>
      </div>

      {/* Numerical Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Withdrawable */}
        <div className="bg-gradient-to-br from-indigo-700 to-indigo-600 text-white p-6 rounded-2xl shadow-md space-y-2">
          <span className="text-xs text-indigo-200 font-semibold uppercase tracking-wider block">Ví Hoa Hồng Sẵn Có</span>
          <span className="text-3xl font-black block tracking-tight">
            {(wallet?.balance || 0).toLocaleString('vi-VN')} đ
          </span>
          <p className="text-[11px] text-indigo-100 flex items-center pt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            Kết toán từ cọc khách thành công, rút ngay 24/7
          </p>
        </div>

        {/* Pending Approval */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Hoa Hồng Đang Treo Duyệt</span>
          <span className="text-3xl font-black text-amber-500 block tracking-tight">
            {(wallet?.pending || 0).toLocaleString('vi-VN')} đ
          </span>
          <p className="text-[11px] text-slate-400 block pt-2">
            📍 Sẽ được cộng tiếp vào ví khả dụng sau khi Admin duyệt đơn hàng
          </p>
        </div>

        {/* Total Settled */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Tổng Thu Nhập Tích Lũy</span>
          <span className="text-3xl font-black text-emerald-600 block tracking-tight">
            {(wallet?.totalEarned || 0).toLocaleString('vi-VN')} đ
          </span>
          <p className="text-[11px] text-slate-400 block pt-2">
            💰 Đã được duyệt thành công trên hệ thống
          </p>
        </div>
      </div>

      {/* Split Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Send Payout Request Column */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <Send className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Gửi Yêu Cầu Rút Hoa Hồng</h3>
          </div>

          {/* Quick Warning if Bank not Linked */}
          {!hasLinkedBank ? (
            <div id="bank-warning" className="p-4 bg-amber-50 rounded-lg text-xs hover:bg-amber-100 transition-all text-amber-800 border border-amber-200">
              <AlertTriangle className="h-5 w-5 mb-1.5 text-amber-600" />
              <p className="font-bold">Chưa Kết Nối Ngân Hàng!</p>
              <p className="mt-1 leading-relaxed">
                Bạn chưa lưu thông tin thẻ ngân hàng của mình dể nhận chuyển khoản thương lượng hoa hồng. Hãy quay về tab <b>Trang Chủ</b> để hoàn thành liên kết trước khi thực hiện giao dịch này.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Thẻ thụ hưởng hiện thời</span>
              <div className="flex items-center space-x-2 pt-1 font-bold">
                <Landmark className="h-4 w-4 text-slate-500" />
                <span className="text-indigo-950 uppercase">{wallet?.bankName}</span>
                <span className="text-slate-400">|</span>
                <span className="font-mono">{wallet?.bankAccount}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 uppercase">Chủ thẻ: <b>{wallet?.bankHolder}</b></p>
            </div>
          )}

          {payoutError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
              ⚠️ {payoutError}
            </div>
          )}

          {payoutSuccess && (
            <div className="p-3 bg-semibold bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold">
              🎉 {payoutSuccess}
            </div>
          )}

          <form onSubmit={handleRequestPayout} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Số tiền muốn rút (mức rút t.thiểu: 50k)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">đ</span>
                <input
                  type="number"
                  placeholder="Nhập số tiền..."
                  required
                  min={50000}
                  max={wallet?.balance || 0}
                  disabled={!hasLinkedBank || (wallet?.balance || 0) < 50000}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-sm pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-extrabold text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              id="submit-payout-btn"
              disabled={payoutLoading || !hasLinkedBank || (wallet?.balance || 0) < 50000}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg transition-all focus:outline-none disabled:bg-slate-200 cursor-pointer text-center"
            >
              {payoutLoading ? 'Đang giải ngân...' : 'Xử Lý Lệnh Rút Tiền'}
            </button>
          </form>
        </div>

        {/* Payout History Column */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 pb-1.5 border-b border-slate-50">
            <div className="h-8 w-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
              <WalletCards className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Nhật Ký Giải Ngân / Rút Tiền</h3>
          </div>

          <div className="overflow-y-auto max-h-[340px] space-y-3 pr-1">
            {payouts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Bạn chưa có giao dịch rút hoa hồng nào trước đây.
              </div>
            ) : (
              payouts.map((po) => (
                <div 
                  key={po.id}
                  className="p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition bg-slate-50/50 text-xs flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-slate-800 text-sm">
                        {po.amount.toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">({po.id})</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Rút về: <b>{po.bankName}</b> | <b>{po.bankAccount}</b> ({po.bankHolder})
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Yêu cầu: {new Date(po.createdAt).toLocaleDateString('vi-VN')} lúc {new Date(po.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      po.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : po.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {po.status === 'COMPLETED' ? 'Đã thanh toán 🎉' : po.status === 'REJECTED' ? 'Bị trả lại ❌' : 'Đang xử lý ⏳'}
                    </span>
                    {po.processedAt && (
                      <span className="text-[9px] text-slate-400 block mt-1 font-semibold">
                        G.Ngân: {new Date(po.processedAt).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
