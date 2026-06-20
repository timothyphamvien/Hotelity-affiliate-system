import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus, Phone, Mail, Lock, Shield, Sparkles } from 'lucide-react';

interface LoginProps {
  onSuccess: (role: 'ADMIN' | 'CTV') => void;
}

export function Login({ onSuccess }: LoginProps) {
  const { login, register } = useAuth();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick credentials helper for demonstration
  const handleQuickFill = (role: 'ADMIN' | 'CTV') => {
    if (role === 'ADMIN') {
      setEmail('admin@gmail.com');
      setPassword('admin123');
    } else {
      setEmail('ctv1@gmail.com');
      setPassword('ctv123');
    }
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name || !email || !phone || !password) {
          throw new Error('Vui lòng điền đầy đủ tất cả thông tin các trường.');
        }
        const msg = await register(name, email, phone, password);
        setSuccessMsg(msg);
        setIsRegister(false);
        // Clean form
        setPassword('');
      } else {
        if (!email || !password) {
          throw new Error('Vui lòng nhập tài khoản và mật khẩu.');
        }
        const user = await login(email, password);
        onSuccess(user.role);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 transition-all">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-150">
            <Shield className="h-6 w-6" id="brand-logo" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">
            VietVilla Hub
          </h2>
          <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto">
            Hệ thống Quản lý Cộng tác viên Bán phòng & Quản trị Homestay, Biệt thự nghỉ dưỡng cao cấp
          </p>
        </div>

        {/* Info Alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm transition-all" id="error-alert">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm transition-all" id="success-alert">
            {successMsg}
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            id="tab-login"
            onClick={() => { setIsRegister(false); setErrorMsg(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              !isRegister ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            id="tab-register"
            onClick={() => { setIsRegister(true); setErrorMsg(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              isRegister ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đăng ký CTV
          </button>
        </div>

        {/* Core Form */}
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Họ và tên CTV</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <LogIn className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    id="reg-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Số điện thoại liên hệ</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    id="reg-phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912xxxxx"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Địa chỉ Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                id="field-email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cooperator@gmail.com"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Mật khẩu</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                id="field-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            id="btn-auth-submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-300 transition-all cursor-pointer shadow-md"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isRegister ? (
              <>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Đăng ký ngay
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-1.5" />
                Đăng nhập hệ thống
              </>
            )}
          </button>
        </form>

        {/* Quick Access Account Helper */}
        <div className="pt-6 border-t border-slate-100">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Tài khoản dùng thử nhanh
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickFill('ADMIN')}
              id="fill-admin"
              className="flex items-center justify-center py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium border border-indigo-100 cursor-pointer"
            >
              <Sparkles className="h-3 w-3 mr-1 text-indigo-500" />
              Vào quyền Admin
            </button>
            <button
              onClick={() => handleQuickFill('CTV')}
              id="fill-ctv"
              className="flex items-center justify-center py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-medium border border-amber-100 cursor-pointer"
            >
              <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
              Vào quyền CTV 1
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            Mật khẩu khuyên dùng: <b>admin123</b> / <b>ctv123</b>
          </p>
        </div>
      </div>
    </div>
  );
}
