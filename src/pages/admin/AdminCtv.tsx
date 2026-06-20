import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { User, Wallet } from '../../types';
import { Users, CheckCircle, ShieldAlert, Award, Phone, Mail, Percent, BookOpen, Layers } from 'lucide-react';

export function AdminCtv() {
  const [ctvs, setCtvs] = useState<(User & { wallet: Wallet; stats: any })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom commission edit state
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [customCommRateInput, setCustomCommRateInput] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchCTVs = async () => {
    try {
      setLoading(true);
      const list = await api.getCTVs();
      setCtvs(list);
    } catch (err) {
      console.error('Lỗi khi tải CTV phía Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCTVs();
  }, []);

  const handleApproveCTV = async (id: string, name: string) => {
    if (confirm(`Xác nhận duyệt cho CTV "${name}" gia nhập hệ thống và cấp quyền bán phòng?`)) {
      try {
        await api.approveCTV(id);
        fetchCTVs();
      } catch (err: any) {
        alert(err.message || 'Lỗi duyệt tài khoản CTV.');
      }
    }
  };

  const handleUpdateCommission = async (id: string) => {
    const rate = Number(customCommRateInput);
    if (!customCommRateInput || isNaN(rate) || rate < 1 || rate > 100) {
      alert('Vui lòng tỷ lệ hoa hồng nằm trong khoảng [1 - 100]%');
      return;
    }

    try {
      setUpdating(true);
      await api.updateCTVCommission(id, rate);
      setEditingCommId(null);
      setCustomCommRateInput('');
      fetchCTVs();
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật tỷ lệ hoa hồng chi trả.');
    } finally {
      setUpdating(false);
    }
  };

  // Divide list
  const pendingCTVs = ctvs.filter(c => c.status === 'PENDING');
  const activeCTVs = ctvs.filter(c => c.status === 'APPROVED');

  return (
    <div className="space-y-6" id="admin-ctv">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">👥 Phê Duyệt & Quản Lý Cộng Tác Viên</h1>
        <p className="text-sm text-slate-500 mt-1">
          Kích hoạt tài khoản CTV đăng ký mới và điều phối hoặc thiết lập tỷ lệ hoa hồng cơ bản riêng cho từng đối tác bán hàng.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <span className="p-3 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Section 1: Pending Approvals */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-700 flex items-center">
              <ShieldAlert className="h-5 w-5 mr-1.5 text-rose-500" />
              Yêu cầu CTV gia nhập mới ({pendingCTVs.length})
            </h3>

            {pendingCTVs.length === 0 ? (
              <div className="p-5 bg-slate-50 rounded-xl text-center text-slate-400 text-xs border border-dashed border-slate-200">
                Chúc mừng! Không có yêu cầu phê duyệt thành viên CTV nào đang chờ bận.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingCTVs.map((ctv) => (
                  <div 
                    key={ctv.id}
                    className="p-4 bg-white rounded-xl border border-rose-100 shadow-xs flex items-center justify-between gap-4 animate-scale-up"
                  >
                    <div className="space-y-1 text-xs">
                      <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded uppercase">
                        Đang Chờ Duyệt
                      </span>
                      <h4 className="font-extrabold text-slate-800 text-sm block mt-1">{ctv.name}</h4>
                      <p className="text-slate-500 font-mono">Email: {ctv.email}</p>
                      <p className="text-slate-500">Phone: {ctv.phone}</p>
                      <p className="text-[10px] text-slate-400">Đăng ký: {new Date(ctv.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>

                    <button
                      onClick={() => handleApproveCTV(ctv.id, ctv.name)}
                      className="py-1.5 px-3.5 bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer flex items-center"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Duyệt CTV
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Active Collaborators */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-700 flex items-center">
              <Users className="h-5 w-5 mr-1.5 text-indigo-600" />
              Cộng tác viên đang hoạt động ({activeCTVs.length})
            </h3>

            {activeCTVs.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-xl text-center text-slate-400 text-xs text-slate-400">
                Chưa có CTV nào được kích hoạt hoạt động trên hệ thống.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {activeCTVs.map((ctv) => (
                  <div 
                    key={ctv.id}
                    className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    {/* Basic details left */}
                    <div className="space-y-1 flex-1 text-xs text-slate-600">
                      <h4 className="font-extrabold text-slate-800 text-sm block">{ctv.name}</h4>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        <span className="flex items-center">
                          <Mail className="h-3.5 w-3.5 text-slate-400 mr-1 flex-shrink-0" />
                          {ctv.email}
                        </span>
                        <span className="flex items-center">
                          <Phone className="h-3.5 w-3.5 text-slate-400 mr-1 flex-shrink-0" />
                          {ctv.phone}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 pt-2 flex-wrap gap-y-1">
                        <span className="bg-slate-100 text-slate-500 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                          ID: {ctv.id}
                        </span>
                        <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center">
                          <Percent className="h-3 w-3 mr-0.5" /> Hoa hồng phòng nền: {ctv.commissionRate}%
                        </span>
                      </div>
                    </div>

                    {/* Stats center */}
                    <div className="grid grid-cols-3 gap-6 text-xs text-center border-t border-b lg:border-t-0 lg:border-b-0 py-3 lg:py-0 px-2 lg:px-6 border-slate-50 border-dashed">
                      <div>
                        <span className="text-slate-400 block font-medium">Tổng Đơn</span>
                        <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">{ctv.stats?.totalBookings || 0} đơn</span>
                      </div>
                      
                      <div>
                        <span className="text-slate-400 block font-medium">Đơn Thành công</span>
                        <span className="font-extrabold text-emerald-600 text-sm mt-0.5 block">{ctv.stats?.approvedBookings || 0}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Tổng giá bán sỹ</span>
                        <span className="font-bold text-slate-800 block mt-0.5">{(ctv.stats?.totalSales || 0).toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>

                    {/* Commission settings right */}
                    <div className="flex flex-col justify-center sm:items-end min-w-[200px]">
                      {editingCommId === ctv.id ? (
                        <div className="space-y-1.5 animate-scale-up">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              placeholder="Hoa hồng ctv % mới..."
                              value={customCommRateInput}
                              onChange={(e) => setCustomCommRateInput(e.target.value)}
                              className="p-1 px-2 border border-slate-250 rounded bg-white text-xs font-bold w-24 focus:outline-none"
                            />
                            <button
                              onClick={() => handleUpdateCommission(ctv.id)}
                              disabled={updating}
                              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded"
                            >
                              Lưu
                            </button>
                            <button
                              onClick={() => { setEditingCommId(null); setCustomCommRateInput(''); }}
                              className="py-1 px-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px]"
                            >
                              Hủy
                            </button>
                          </div>
                          <span className="text-[9px] text-slate-400 block">Sửa tỷ lệ hoa hồng sàn nền của CTV</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCommId(ctv.id);
                            setCustomCommRateInput(String(ctv.commissionRate));
                          }}
                          className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#151b2c] font-bold text-[10px] rounded-lg transition overflow-hidden text-center cursor-pointer"
                        >
                          ⚙️ Cài tỷ lệ hoa hồng riêng
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
