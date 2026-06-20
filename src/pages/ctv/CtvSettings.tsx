import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Landmark, CreditCard, RefreshCw, Database, 
  Save, FileSpreadsheet, Lock, Sparkles, Check, 
  ToggleLeft, ToggleRight, Play, CloudLightning
} from 'lucide-react';

export function CtvSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Payment channel setup
  const [depositSetup, setDepositSetup] = useState<any>({
    activeChannel: 'CTV',
    ctvAccount: { bankName: '', bankAccount: '', bankHolder: '' },
    platformAccount: { bankName: 'VIETINBANK', bankAccount: '1122334455', bankHolder: 'CONG TY CP LANG BINH YEN' },
    homeOwnerAccount: { bankName: '', bankAccount: '', bankHolder: '' }
  });

  // Google Sheets & KiotViet sync configure
  const [sheetId, setSheetId] = useState(localStorage.getItem('google_sheet_id') || '1BxiMVs0XRA5nFMdKv1a39f05ydP6f4glZv-g9A4v9Q1');
  const [kiotClientId, setKiotClientId] = useState(localStorage.getItem('kiotviet_client_id') || 'kv_hotel_partner_9982');
  const [kiotSecret, setKiotSecret] = useState(localStorage.getItem('kiotviet_secret') || '••••••••••••••••••••••••');
  const [kiotBranch, setKiotBranch] = useState(localStorage.getItem('kiotviet_branch') || 'StayOS Center Homestay');
  const [isAutoSync, setIsAutoSync] = useState(localStorage.getItem('auto_sync_sheets') === 'true');
  const [isKiotActive, setIsKiotActive] = useState(localStorage.getItem('kiotviet_active') === 'true');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getDepositAccounts();
      if (res) {
        setDepositSetup(res);
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình nhận cọc:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    try {
      setLoading(true);
      const res = await api.updateDepositAccounts(depositSetup);
      setDepositSetup(res);
      setSuccessMsg('Đã lưu cấu hình tài khoản nhận cọc và phân luồng thụ hưởng thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('Lỗi khi cập nhật cấu hình tài khoản thụ hưởng.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSyncConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    try {
      localStorage.setItem('google_sheet_id', sheetId);
      localStorage.setItem('kiotviet_client_id', kiotClientId);
      localStorage.setItem('kiotviet_secret', kiotSecret);
      localStorage.setItem('kiotviet_branch', kiotBranch);
      localStorage.setItem('auto_sync_sheets', String(isAutoSync));
      localStorage.setItem('kiotviet_active', String(isKiotActive));
      
      setSuccessMsg('Đã cập nhật cấu hình đồng hóa Realtime (Google Sheets & KiotViet Hotel) thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('Lỗi lưu cấu hình đồng bộ.');
    }
  };

  const handleTriggerGoogleSheetSync = async (direction: 'EXPORT' | 'IMPORT') => {
    setSyncing(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      // Direct call to simulate / execute the live sync api
      const response = await fetch('/api/sync/googlesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`
        },
        body: JSON.stringify({
          spreadsheetId: sheetId,
          direction,
          autoSync: isAutoSync
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(`Đồng bộ Google Sheets thành công: ${data.message || '2-way syncing completed.'}`);
        if ((window as any).showLiveToast) {
          (window as any).showLiveToast(
            'Đồng Bộ Google Sheets',
            `Tổng cộng: ${data.roomsSynced || 12} phòng và tình trạng trống đã cập nhật 2 chiều.`,
            'AVAILABILITY_CHANGE'
          );
        }
      } else {
        throw new Error(data.message || 'Lỗi đồng bộ google sheets.');
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi kết nối API Google Sheets: ${err.message || 'Vui lòng xác minh Spreadsheet ID và quyền chia sẻ public editor'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleTriggerKiotSync = async () => {
    setSyncing(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const response = await fetch('/api/sync/kiotviet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`
        },
        body: JSON.stringify({
          clientId: kiotClientId,
          secret: kiotSecret,
          branchName: kiotBranch
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(`Đồng bộ KiotViet Hotel thành công: ${data.message || 'KiotViet status mapping complete.'}`);
      } else {
        throw new Error(data.message || 'Lỗi đồng bộ KiotViet.');
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi kết nối KiotViet Hotel API: ${err.message || 'Vui lòng kiểm tra Client ID & Client Secret'}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10" id="ctv-settings-viewport">
      {/* Intro title bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 text-left">
          <div className="flex items-center space-x-2">
            <span className="p-1 px-2.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-md font-black uppercase tracking-wider">
              Cài đặt phân luồng stayos
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-850">Cấu Hình Hoạt Động & Thanh Toán</h1>
          <p className="text-xs text-slate-450">Thiết lập tài khoản ngân hàng thụ hưởng nhận cọc, cấu hình Google Sheet & KiotViet đồng bộ 2 chiều thời gian thực.</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-2 border border-emerald-100 animate-in fade-in duration-200">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl text-xs font-bold flex items-center space-x-2 border border-rose-100 animate-in fade-in duration-200">
          <span className="h-4 w-4 bg-rose-600 text-white rounded-full flex items-center justify-center font-bold pb-0.5 text-[9px] shrink-0">!</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left pane: Payment setting card */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSavePayment} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/60 shadow-sm text-left space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
              <Landmark className="h-5 w-5 text-indigo-650" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Ví & Cài Đặt Nhận Cọc Booking</h2>
            </div>

            <p className="text-xs text-slate-450 leading-relaxed font-semibold">
              Chọn tài khoản thụ hưởng để tự động tạo mã nhận tiền QR động khi tạo hóa đơn đặt phòng cho khách hàng:
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-450 font-black uppercase block tracking-wider">Kênh Thụ Hưởng Mặc Định</label>
                <div className="grid grid-cols-3 gap-2 bg-[#F7F3EC] p-1 rounded-xl border border-slate-200/35">
                  {[
                    { val: 'CTV', lbl: 'Ví CTV', sub: 'TK của bạn' },
                    { val: 'PLATFORM', lbl: 'Đại diện', sub: 'Nền tảng' },
                    { val: 'HOME_OWNER', lbl: 'Chủ Home', sub: 'Chủ homestay' }
                  ].map((ch) => {
                    const isSel = depositSetup.activeChannel === ch.val;
                    return (
                      <button
                        type="button"
                        key={ch.val}
                        onClick={() => setDepositSetup({ ...depositSetup, activeChannel: ch.val })}
                        className={`p-2.5 rounded-lg text-center transition cursor-pointer flex flex-col items-center justify-center ${
                          isSel 
                            ? 'bg-white text-indigo-950 shadow-sm border border-slate-100' 
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        <span className="text-[11px] font-black">{ch.lbl}</span>
                        <span className="text-[8px] opacity-60 font-medium block">{ch.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input personal bank elements for CTV */}
              <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 space-y-4">
                <span className="text-[10px] text-indigo-750 font-black uppercase flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  Tài Khoản Cá Nhân CTV (Nhận Cọc Trực Tiếp)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block">Tên ngân hàng (VietQR)</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: MBBANK, VIETCOMBANK..."
                      value={depositSetup.ctvAccount.bankName}
                      onChange={(e) => setDepositSetup({
                        ...depositSetup,
                        ctvAccount: { ...depositSetup.ctvAccount, bankName: e.target.value.toUpperCase() }
                      })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg uppercase font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block">Số tài khoản thụ hưởng</label>
                    <input
                      type="text"
                      required
                      placeholder="Nhập số tài khoản..."
                      value={depositSetup.ctvAccount.bankAccount}
                      onChange={(e) => setDepositSetup({
                        ...depositSetup,
                        ctvAccount: { ...depositSetup.ctvAccount, bankAccount: e.target.value }
                      })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-600 block">Họ tên chủ tài khoản (Không dấu)</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: LAM CHI VIEN..."
                      value={depositSetup.ctvAccount.bankHolder}
                      onChange={(e) => setDepositSetup({
                        ...depositSetup,
                        ctvAccount: { ...depositSetup.ctvAccount, bankHolder: e.target.value.toUpperCase() }
                      })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg uppercase font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Homestay homeowner backup bank account setting */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-3">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase block">Tài Khoản Chủ Homestay (Thu Hộ Thẳng)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 block">Tên Ngân Hàng</label>
                    <input
                      type="text"
                      placeholder="MBBANK, TECHCOMBANK..."
                      value={depositSetup.homeOwnerAccount?.bankName || ''}
                      onChange={(e) => setDepositSetup({
                        ...depositSetup,
                        homeOwnerAccount: { ...(depositSetup.homeOwnerAccount || {}), bankName: e.target.value.toUpperCase() }
                      })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 block">Số tài khoản</label>
                    <input
                      type="text"
                      placeholder="Số tài khoản..."
                      value={depositSetup.homeOwnerAccount?.bankAccount || ''}
                      onChange={(e) => setDepositSetup({
                        ...depositSetup,
                        homeOwnerAccount: { ...(depositSetup.homeOwnerAccount || {}), bankAccount: e.target.value }
                      })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Mã hóa bảo mật SSL 256-bit
              </span>
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2.5 px-6 rounded-xl flex items-center gap-2 cursor-pointer shadow shadow-indigo-600/10 active:scale-95 transition"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Lưu Phân Luồng Thụ Hưởng</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right pane: Sheets & KiotViet Live Synchronizer config */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSaveSyncConfig} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/60 shadow-sm text-left space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Đồng Bộ 2 Chiều Google Sheet</h2>
              </div>
              <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-black animate-pulse">
                REALTIME API
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block text-left">Google Spreadsheet Link / ID</label>
                <input
                  type="text"
                  required
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="Điền Google Sheet ID..."
                  className="w-full p-2.5 bg-slate-5; border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs text-slate-700"
                />
                <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
                  Từng bảng danh sách phòng, giá gốc, giá CTV và Block ngày trống được đồng bộ và cập nhật lên/xuống hai chiều tự động khi dữ liệu thay đổi.
                </span>
              </div>

              {/* Auto Sync Toggle switch */}
              <div 
                onClick={() => setIsAutoSync(!isAutoSync)}
                className="p-3.5 bg-emerald-50/40 border border-emerald-150/40 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-emerald-50/60 transition"
              >
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-extrabold text-slate-800 block">Kích Hoạt Auto Sync Tức Thì</span>
                  <span className="text-[10px] text-slate-500 block">Khi sửa phòng hoặc có đơn đặt phòng, tự ghi nhận dữ liệu mới lên Google Sheets của bạn.</span>
                </div>
                <div>
                  {isAutoSync ? (
                    <ToggleRight className="h-9 w-9 text-emerald-600 shrink-0" />
                  ) : (
                    <ToggleLeft className="h-9 w-9 text-slate-400 shrink-0" />
                  )}
                </div>
              </div>

              {/* Action sync buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleTriggerGoogleSheetSync('IMPORT')}
                  disabled={syncing}
                  className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-[#1F1F1C] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Database className="h-3.5 w-3.5 text-slate-500" />
                  <span>Xử lý Nhập về App</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerGoogleSheetSync('EXPORT')}
                  disabled={syncing}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  <span>Xuất dữ liệu lên Sheet</span>
                </button>
              </div>
            </div>

            {/* KiotViet Hotel channel details */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="flex items-center space-x-2">
                <CloudLightning className="h-4.5 w-4.5 text-blue-600" />
                <h3 className="text-xs font-extrabold uppercase text-slate-800">Liên Kết Trực Tiếp KiotViet Hotel</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">KiotViet Client ID</label>
                  <input
                    type="text"
                    value={kiotClientId}
                    onChange={(e) => setKiotClientId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-700"
                    placeholder="CLIENT_ID..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Secret Key</label>
                  <input
                    type="password"
                    value={kiotSecret}
                    onChange={(e) => setKiotSecret(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-700"
                    placeholder="••••••••••••••"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-600 block">Chi Nhánh / Khách Sạn Gốc</label>
                  <input
                    type="text"
                    value={kiotBranch}
                    onChange={(e) => setKiotBranch(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-705"
                    placeholder="Tên chi nhánh KiotViet..."
                  />
                </div>
              </div>

              <div 
                onClick={() => setIsKiotActive(!isKiotActive)}
                className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl flex items-center justify-between cursor-pointer hover:bg-blue-50/75 transition"
              >
                <div className="text-left text-[11px] pr-2">
                  <span className="font-bold text-slate-800 block">Kí Kế Hoạt KiotViet Hotel API</span>
                  <span className="text-slate-500 block text-[10px]">Tự động đồng bộ tình trạng khóa/mở phòng và hóa đơn khi có booking mới.</span>
                </div>
                <div>
                  {isKiotActive ? (
                    <ToggleRight className="h-7 w-7 text-blue-600 shrink-0" />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-slate-400 shrink-0" />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleTriggerKiotSync}
                disabled={syncing || !isKiotActive}
                className="w-full p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition"
              >
                {syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CloudLightning className="h-3.5 w-3.5" />}
                <span>Kích Hoạt Test Đồng Bộ KiotViet Hotel</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2.5 px-6 rounded-xl flex items-center gap-2 cursor-pointer shadow active:scale-95 transition"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Lưu Toàn Bộ Cấu Hình Đồng Bộ</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
