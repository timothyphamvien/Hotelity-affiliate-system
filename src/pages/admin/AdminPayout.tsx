import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { PayoutRequest } from '../../types';
import { Landmark, Check, X, Search, Copy, LandmarkIcon, Clock, ToggleLeft } from 'lucide-react';

export function AdminPayout() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'PENDING' | 'DONE'>('PENDING');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const list = await api.getPayouts();
      setPayouts(list);
    } catch (err) {
      console.error('Lỗi khi tải lệnh thanh toán:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleStatusUpdate = async (id: string, status: 'COMPLETED' | 'REJECTED') => {
    const actionTxt = status === 'COMPLETED' 
      ? 'Bạn đã thực hiện giao dịch chuyển ngân khoản thủ công thành công bên ngoài ngân hàng và muốn xác nhận hoàn thành trên web?' 
      : 'Xác nhận từ chối giải ngân yêu cầu rút tiền này? Số vốn sẽ được hoàn dồn trả lại ví chính cho CTV.';

    if (confirm(actionTxt)) {
      try {
        setSubmitting(true);
        await api.updatePayoutStatus(id, status);
        fetchPayouts();
      } catch (err: any) {
        alert(err.message || 'Lỗi xử lý yêu cầu rút tiền.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    alert(`Đã sao chép: ${txt}`);
  };

  const filteredPayouts = payouts.filter(p => {
    const isPending = p.status === 'PENDING';
    const matchesTab = tab === 'PENDING' ? isPending : !isPending;
    
    const matchesSearch = (p.ctvName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.bankAccount || '').includes(search) ||
                          (p.bankHolder || '').toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6" id="admin-payouts">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">💸 Ban Hành Duyệt Chi Hoa Hồng</h1>
        <p className="text-sm text-slate-500 mt-1">
          Hệ thống theo dõi các lệnh rút quỹ ví khả dụng của cộng tác viên. Vui lòng chuyển khoản ngoài ngân hàng cho CTV và bấm nút xác nhận.
        </p>
      </div>

      {/* Tabs and Searching */}
      <div className="flex bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex bg-slate-100 p-1 rounded-md w-full sm:w-auto">
          <button
            onClick={() => setTab('PENDING')}
            className={`flex-1 sm:flex-none py-2 px-4 text-xs font-bold rounded-md transition ${
              tab === 'PENDING' ? 'bg-white text-rose-500 shadow-xs' : 'text-slate-500'
            }`}
          >
            Lệnh chờ xuất tiền ({payouts.filter(p => p.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setTab('DONE')}
            className={`flex-1 sm:flex-none py-2 px-4 text-xs font-bold rounded-md transition ${
              tab === 'DONE' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
            }`}
          >
            Lịch sử đã duyệt chi ({payouts.filter(p => p.status !== 'PENDING').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Tìm theo CTV, STK số, chủ thẻ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <span className="p-3 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : filteredPayouts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400 font-medium text-xs">
          Chưa có lệnh rút tiền nào hiển thị trong khoảng danh sách này.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPayouts.map((po) => (
            <div 
              key={po.id}
              className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* Account copy block */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded">
                    MÃ LỆNH: {po.id}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    po.status === 'COMPLETED' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : po.status === 'REJECTED' 
                      ? 'bg-rose-50 text-rose-700 font-bold border border-rose-100' 
                      : 'bg-amber-50 text-amber-700 mark-pending'
                  }`}>
                    {po.status === 'COMPLETED' ? 'Đã xuất khoản' : po.status === 'REJECTED' ? 'Bị hủy từ chối' : 'Chờ chuyển khoản'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Yêu cầu ngày: {new Date(po.createdAt).toLocaleDateString('vi-VN')} lúc {new Date(po.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium text-slate-600 pt-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Người rút tiền (CTV)</span>
                    <span className="font-extrabold text-indigo-700 block mt-1">{po.ctvName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Ngân hàng thụ hưởng</span>
                    <button 
                      onClick={() => handleCopy(po.bankName)}
                      className="font-extrabold text-slate-800 flex items-center hover:underline mt-1 font-mono uppercase"
                    >
                      {po.bankName} <Copy className="h-3 w-3 ml-1 text-slate-400" />
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Số tài khoản (STK)</span>
                    <button 
                      onClick={() => handleCopy(po.bankAccount)}
                      className="font-bold text-indigo-950 block mt-1 hover:underline font-mono text-sm leading-none bg-slate-50 p-1 rounded border border-slate-100 cursor-pointer w-max"
                    >
                      {po.bankAccount} <Copy className="h-3 w-3 ml-1 text-slate-400 inline-block align-middle" />
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Chủ tài khoản</span>
                    <button 
                      onClick={() => handleCopy(po.bankHolder)}
                      className="font-extrabold text-slate-800 flex items-center hover:underline mt-1 uppercase"
                    >
                      {po.bankHolder} <Copy className="h-3 w-3 ml-1 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action buttons or details display right */}
              <div className="md:text-right flex flex-row md:flex-col md:justify-center justify-between items-center sm:border-l sm:border-dashed sm:border-slate-100 md:pl-6 min-w-[150px] border-t pt-3.5 md:pt-0 md:border-t-0">
                <div className="mb-2">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Số tiền rút chuyển</span>
                  <span className="text-xl font-black text-rose-600 block tracking-tight">
                    -{po.amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {po.status === 'PENDING' ? (
                  <div className="flex gap-2 w-full sm:w-auto mt-1">
                    <button
                      onClick={() => handleStatusUpdate(po.id, 'REJECTED')}
                      disabled={submitting}
                      className="p-1 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded text-xs transition cursor-pointer"
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(po.id, 'COMPLETED')}
                      disabled={submitting}
                      className="p-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition flex items-center cursor-pointer font-mono"
                    >
                      <Check className="h-3 w-3 mr-0.5" /> Chuyển xong
                    </button>
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-400 block">
                    {po.processedAt && (
                      <span className="block italic">Đăng hoàn thành: {new Date(po.processedAt).toLocaleDateString('vi-VN')}</span>
                    )}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
