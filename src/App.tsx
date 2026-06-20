import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/auth/Login';
import { CtvDashboard } from './pages/ctv/CtvDashboard';
import { CtvRooms } from './pages/ctv/CtvRooms';
import { CtvBooking } from './pages/ctv/CtvBooking';
import { CtvHistory } from './pages/ctv/CtvHistory';
import { CtvWallet } from './pages/ctv/CtvWallet';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminRooms } from './pages/admin/AdminRooms';
import { AdminBookings } from './pages/admin/AdminBookings';
import { AdminCtv } from './pages/admin/AdminCtv';
import { AdminPayout } from './pages/admin/AdminPayout';

// Custom sub-modules targeting detailed properties, templates and calendars
import { AdminProperties } from './pages/admin/AdminProperties';
import { AdminRoomTypes } from './pages/admin/AdminRoomTypes';
import { AdminCalendar } from './pages/admin/AdminCalendar';
import { AdminBookingsNew } from './pages/admin/AdminBookingsNew';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminCustomers } from './pages/admin/AdminCustomers';
import { CtvCustomers } from './pages/ctv/CtvCustomers';

import { Room, AppNotification, User as AppUser } from './types';
import { api } from './services/api';

import { 
  Menu, X, LogOut, Wallet, Bell, Shield, 
  BarChart, Home, CheckSquare, Users, Landmark, 
  ShieldAlert, BookOpen, Layers, Sparkles, CircleUser,
  Building2, Calendar, FileText
} from 'lucide-react';

function BaseLayout() {
  const { user, logout, setUser } = useAuth();
  const [activeView, setActiveView] = useState('');
  
  // States for ctv booking pass-through
  const [selectedBookingRoom, setSelectedBookingRoom] = useState<Room | null>(null);
  const [initialCheckIn, setInitialCheckIn] = useState('');
  const [initialCheckOut, setInitialCheckOut] = useState('');

  // Floating notifications dropdown
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [quickBalance, setQuickBalance] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Toast Notifications
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: string }[]>([]);
  const [seenAlertIds, setSeenAlertIds] = useState<string[]>([]);

  // Method to programmatically trigger client-side toasts
  const addClientToast = (title: string, message: string, type: 'BOOKING_SUCCESS' | 'AVAILABILITY_CHANGE' | 'COMMISSION_EARNED') => {
    const id = 'toast_' + Math.random().toString(36).substr(2, 9);
    const newToast = { id, title, message, type };
    
    setToasts((prev) => {
      if (prev.some(t => t.id === id)) return prev;
      return [...prev, newToast].slice(-5);
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 5500);
  };

  // Expose toast function globally so other pages can trigger client-side immediate alerts
  useEffect(() => {
    (window as any).showLiveToast = addClientToast;
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const pollLiveAlerts = async () => {
    if (!user) return;
    try {
      const alerts = await api.getLiveAlerts();
      if (alerts && alerts.length > 0) {
        setSeenAlertIds((currentSeen) => {
          const unseen = alerts.filter(a => !currentSeen.includes(a.id));
          if (unseen.length > 0) {
            const newToastList = unseen.map(a => ({
              id: a.id,
              title: a.title,
              message: a.message,
              type: a.type
            }));

            setToasts((prevToasts) => {
              const existingIds = new Set(prevToasts.map(t => t.id));
              const uniqueNewToasts = newToastList.filter(t => !existingIds.has(t.id));
              return [...prevToasts, ...uniqueNewToasts].slice(-4);
            });

            newToastList.forEach(nt => {
              setTimeout(() => {
                setToasts((prev) => prev.filter(t => t.id !== nt.id));
              }, 5000);
            });

            return [...currentSeen, ...unseen.map(a => a.id)];
          }
          return currentSeen;
        });
      }
    } catch (err) {
      const errStr = String(err);
      if (errStr.includes('Failed to fetch') || errStr.includes('fetch') || errStr.includes('NetworkError') || errStr.includes('Failed to Fetch')) {
        console.warn('Quiet log: Error polling live alerts (network transient):', errStr);
      } else {
        console.error('Error polling live alerts:', err);
      }
    }
  };

  // Poll for live alerts every 8 seconds
  useEffect(() => {
    if (!user) return;
    // Initial load
    pollLiveAlerts();
    const interval = setInterval(() => {
      pollLiveAlerts();
    }, 8000);
    return () => clearInterval(interval);
  }, [user]);

  // Process URL Referral Codes on startup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral');
    if (ref) {
      localStorage.setItem('booking_referral_code', ref);
      api.trackReferralClick(ref).catch((err) => {
        console.error('Lỗi tracking click giới thiệu:', err);
      });
    }
  }, []);

  const [currentMockRole, setCurrentMockRole] = useState<string>('');

  // Sync active view with user roles on load or change
  useEffect(() => {
    if (user) {
      const initialRole = user.role || 'CTV';
      setCurrentMockRole(initialRole);
      
      const roleUpper = initialRole.toUpperCase();
      const isAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'STAFF' || roleUpper === 'MANAGER';
      if (isAdmin) {
        setActiveView('admin_dashboard');
      } else {
        setActiveView('ctv_dashboard');
      }
      fetchTopBarStats();
    }
  }, [user]);

  const fetchTopBarStats = async () => {
    if (!user) return;
    try {
      const notifs = await api.getNotifications();
      setNotifications(notifs);

      const roleUpper = String(currentMockRole || user.role).toUpperCase();
      if (roleUpper === 'CTV') {
        const wallet = await api.getWallet();
        setQuickBalance(wallet?.balance || 0);
      }
    } catch (err) {
      const errStr = String(err);
      if (errStr.includes('Failed to fetch') || errStr.includes('fetch') || errStr.includes('NetworkError') || errStr.includes('Failed to Fetch')) {
        console.warn('Quiet log: Lỗi khi tải thông báo topbar (network transient):', errStr);
      } else {
        console.error('Lỗi khi tải thông báo topbar:', err);
      }
    }
  };

  // Poll for notifications and wallet updates every 15 seconds for realistic feeling
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchTopBarStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchTopBarStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookRoomRedirect = (room: Room, checkInDate: string, checkOutDate: string) => {
    setSelectedBookingRoom(room);
    setInitialCheckIn(checkInDate);
    setInitialCheckOut(checkOutDate);
    setActiveView('ctv_booking');
  };

  if (!user) {
    return <Login onSuccess={(role) => {
      const roleUpper = String(role).toUpperCase();
      const isAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'STAFF' || roleUpper === 'MANAGER';
      setActiveView(isAdmin ? 'admin_dashboard' : 'ctv_dashboard');
    }} />;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Render correct pages
  const renderContent = () => {
    switch (activeView) {
      // CTV Views
      case 'ctv_dashboard':
        return <CtvDashboard onNavigate={(view) => { setActiveView(view); fetchTopBarStats(); }} />;
      case 'ctv_rooms':
        return <CtvRooms onBookRoom={handleBookRoomRedirect} />;
      case 'ctv_booking':
        return (
          <CtvBooking 
            selectedRoom={selectedBookingRoom} 
            initialCheckIn={initialCheckIn} 
            initialCheckOut={initialCheckOut} 
            onNavigate={(view) => { setActiveView(view); fetchTopBarStats(); }}
          />
        );
      case 'ctv_history':
        return <CtvHistory />;
      case 'ctv_wallet':
        return <CtvWallet />;
      case 'ctv_customers':
        return <CtvCustomers onNavigate={(view) => { setActiveView(view); }} />;

      // Admin & Operational Views
      case 'admin_dashboard':
        return <AdminDashboard onNavigate={(view) => { setActiveView(view); fetchTopBarStats(); }} />;
      case 'admin_properties':
        return <AdminProperties initialTab="properties" />;
      case 'admin_room_types':
        return <AdminProperties initialTab="room_types" />;
      case 'admin_rooms':
        return <AdminProperties initialTab="rooms" />;
      case 'admin_calendar':
        return <AdminCalendar />;
      case 'admin_bookings_new':
        return <AdminBookingsNew />;
      case 'admin_bookings':
        return <AdminBookings />;
      case 'admin_reports':
        return <AdminReports />;
      case 'admin_ctv':
        return <AdminCtv />;
      case 'admin_payout':
        return <AdminPayout />;
      case 'admin_customers':
        return <AdminCustomers onNavigate={(view) => { setActiveView(view); }} />;

      default:
        return (
          <div className="text-center p-12">
            <p className="text-slate-500 font-semibold">Giao diện này đang được nâng cấp phát triển.</p>
          </div>
        );
    }
  };

  // Sidebar Layout Definitions
  const ctvNavItems = [
    { id: 'ctv_dashboard', label: 'Tổng Quan Dashboard', icon: BarChart },
    { id: 'ctv_rooms', label: 'Xem Phòng Trống', icon: Home },
    { id: 'ctv_history', label: 'Lịch Sử Đơn Đặt', icon: CheckSquare },
    { id: 'ctv_wallet', label: 'Ví Thưởng Hoa Hồng', icon: Landmark },
    { id: 'ctv_customers', label: 'Quản Lý Khách Hàng', icon: Users },
  ];

  const adminNavItems = [
    { id: 'admin_dashboard', label: 'Dashboard Phân Tích', icon: BarChart },
    { id: 'admin_properties', label: 'Cơ Sở & Kho Phòng', icon: Building2 },
    { id: 'admin_calendar', label: 'Lịch Phòng Timeline', icon: Calendar },
    { id: 'admin_bookings_new', label: 'Lên Đơn Đặt Phòng', icon: Sparkles },
    { id: 'admin_bookings', label: 'Duyệt Khóa Đơn Đặt', icon: CheckSquare },
    { id: 'admin_reports', label: 'Báo Cáo Thống Kê', icon: FileText },
    { id: 'admin_ctv', label: 'Duyệt Cộng Tác Viên', icon: Users },
    { id: 'admin_payout', label: 'Duyệt Yêu Cầu Rút', icon: Landmark },
    { id: 'admin_customers', label: 'Quản Lý Khách Hàng', icon: Users },
  ];

  const roleUpper = String(currentMockRole || user.role).toUpperCase();
  const isCurrentlyAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'STAFF' || roleUpper === 'MANAGER';
  const navItems = isCurrentlyAdmin ? adminNavItems : ctvNavItems;

  return (
    <div className="min-h-screen bg-[#F7F3EC] flex flex-col font-sans" id="app-workspace">
      
      {/* Premium Multi-role Swapper Rail */}
      <div className="bg-[#2F4A3D] text-[#F7F3EC] px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold space-y-2 sm:space-y-0 relative z-40 shadow-sm" id="testing-multirole-swapper">
        <div className="flex items-center space-x-2">
          <span className="bg-[#C58B5C] text-white px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest animate-pulse">
            SANDBOX LIFESTYLE
          </span>
          <span className="text-[#EFE8DD] font-medium">Bản dùng thử: Click lựa chọn vai trò để chuyển trải nghiệm phân quyền:</span>
        </div>
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto mt-1 sm:mt-0 justify-center">
          {[
            { role: 'SUPER_ADMIN', label: '👑 Super' },
            { role: 'ADMIN', label: '🛡️ Admin' },
            { role: 'MANAGER', label: '💼 Manager' },
            { role: 'STAFF', label: '🧹 Staff' },
            { role: 'CTV', label: '🤝 CTV' }
          ].map((rObj) => {
            const isSel = String(currentMockRole).toUpperCase() === rObj.role;
            return (
              <button
                key={rObj.role}
                type="button"
                onClick={() => {
                  setCurrentMockRole(rObj.role);
                  const isAd = rObj.role !== 'CTV';
                  const mockUserId = isAd ? 'usr_admin' : 'usr_ctv1';
                  
                  // Encode new context-aligned mock token: userId:role:timestamp
                  const mockToken = btoa(`${mockUserId}:${rObj.role}:${Date.now()}`);
                  api.setToken(mockToken);
                  
                  // Update client state session
                  setUser({
                    id: mockUserId,
                    name: isAd ? 'Admin Tổng' : 'Lâm Chí Viễn',
                    email: isAd ? 'admin@gmail.com' : 'ctv1@gmail.com',
                    phone: isAd ? '0901234567' : '0911222333',
                    role: rObj.role as any,
                    status: 'APPROVED'
                  });

                  setActiveView(isAd ? 'admin_dashboard' : 'ctv_dashboard');
                  addClientToast('Chuyển Vai Trò Thành Công', `Hệ thống đã chuyển sang chế độ: ${rObj.label}`, 'COMMISSION_EARNED');
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition flex-shrink-0 ${
                  isSel 
                    ? 'bg-[#C58B5C] text-white shadow' 
                    : 'bg-[#3A5D4C] text-[#EFE8DD] hover:bg-[#47705B] hover:text-white'
                }`}
              >
                {rObj.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Boutique Navigation Bar */}
      <header className="bg-white border-b border-[#E3D8CB] h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-3.5">
          {/* Mobile hamburger */}
          <button 
            type="button"
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-[#5F5A52] hover:bg-[#F7F3EC] hover:text-[#1F1F1C]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-[#2F4A3D] rounded-full flex items-center justify-center text-white shadow-xs transition-all duration-200">
              <Shield className="h-4.5 w-4.5 text-[#EFE8DD]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-lg tracking-tight text-[#2F4A3D] leading-none">
                StayOS
              </span>
              <span className="text-[9px] text-[#8A8177] mt-1 uppercase tracking-widest font-bold leading-none">
                {isCurrentlyAdmin ? `${currentMockRole} COORDINATOR` : 'AFFILIATE NETWORK'}
              </span>
            </div>
            <span className="bg-[#EBF5EE] text-[#3F7D58] border border-[#D5EBDB] text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline-block">
              ONLINE
            </span>
          </div>
        </div>

        {/* Quick info widgets on the right */}
        <div className="flex items-center space-x-4">
          
          {/* Quick wallet check for CTV in top bar */}
          {!isCurrentlyAdmin && (
            <div 
              onClick={() => setActiveView('ctv_wallet')}
              className="bg-[#EBF5EE] hover:bg-[#D5EBDB] border border-[#D5EBDB] p-1.5 px-3 rounded-lg flex items-center space-x-1.5 text-xs text-[#3F7D58] cursor-pointer transition hidden md:flex font-mono"
            >
              <Wallet className="h-4 w-4" />
              <span className="font-bold">{quickBalance.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          {/* User profiling */}
          <div className="items-center space-x-2 hidden md:flex bg-[#F7F3EC] border border-[#E3D8CB] px-3 py-1.5 rounded-full">
            <div className="w-6 h-6 bg-[#2F4A3D] text-[#EFE8DD] rounded-full flex items-center justify-center font-bold text-[10px] uppercase font-serif pb-0.5">
              {user.name ? user.name.substring(0, 2).toUpperCase() : 'CV'}
            </div>
            <span className="text-xs font-semibold text-[#1F1F1C]">{user.name}</span>
          </div>

          {/* Notifications Panel with Badge */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                fetchTopBarStats();
              }}
              id="notif-bell-btn"
              className="p-2 rounded-full hover:bg-[#F7F3EC] text-[#5F5A52] hover:text-[#1F1F1C] relative cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#B14A3B] border border-white animate-pulse"></span>
              )}
            </button>

            {/* Float Popover overlay lists */}
            {showNotifDropdown && (
              <div 
                className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-[#E3D8CB] shadow-xl overflow-hidden z-50 animate-scale-up"
                id="notif-popup"
              >
                <div className="bg-[#F7F3EC] p-3 px-4 border-b border-[#E3D8CB] flex items-center justify-between">
                  <span className="font-bold text-[#1F1F1C] text-xs">Thông báo hoạt động ({notifications.length})</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkNotificationsRead}
                      className="text-[10px] text-[#2F4A3D] hover:underline font-bold"
                    >
                      Đọc tất cả
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-[#E3D8CB]">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-[#8A8177] text-xs">
                      Chưa có thông báo.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`p-3.5 space-y-1 hover:bg-[#F7F3EC]/50 transition-all text-xs ${
                          n.isRead ? 'text-[#8A8177]' : 'bg-[#EBFBF5]/20 text-[#1F1F1C] font-semibold'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-[#2F4A3D]">{n.title}</span>
                          <span className="text-[#8A8177] font-normal">
                            {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-[11px] font-normal leading-relaxed text-[#5F5A52]">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick exit */}
          <button
            onClick={logout}
            id="logout-btn"
            className="p-2 rounded-full hover:bg-[#FDF2F0] text-[#8A8177] hover:text-[#B14A3B] cursor-pointer transition"
            title="Đăng xuất"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main split workarea */}
      <div className="flex-1 flex" id="main-frame-layout">
        
        {/* Sidebar Left panel Desktop */}
        <aside className="w-60 bg-white border-r border-[#E3D8CB] hidden lg:flex flex-col justify-between py-6 sticky top-16 h-[calc(100vh-64px)] overflow-hidden">
          <div className="space-y-6 px-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#8A8177] block px-3">
              {isCurrentlyAdmin ? `Bộ Phận ${currentMockRole}` : 'Phân vùng CTV'}
            </span>
            
            <nav className="space-y-1.5 px-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id || 
                  (item.id === 'ctv_rooms' && activeView === 'ctv_booking') ||
                  (item.id === 'admin_properties' && (activeView === 'admin_room_types' || activeView === 'admin_rooms'));
                
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setSelectedBookingRoom(null); }}
                    className={`w-full py-2.5 px-3 rounded-xl font-medium text-[13px] inline-flex items-center space-x-3 transition-colors cursor-pointer ${
                      isActive 
                        ? 'bg-[#2F4A3D] text-white font-semibold shadow-xs' 
                        : 'text-[#5F5A52] hover:bg-[#F7F3EC] hover:text-[#1F1F1C]'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="px-4">
            <div className="p-4 bg-[#F7F3EC] border border-[#E3D8CB] rounded-2xl space-y-2 text-[11px] text-[#5F5A52] leading-relaxed shadow-3xs">
              <span className="font-bold text-[#2F4A3D] uppercase block text-[10px] tracking-wider">Hỗ trợ hotline</span>
              <p>Mọi thắc mắc về vận hành và chính sách đối tác xin liên hệ tổng đài hỗ trợ.</p>
              <button className="w-full py-2 bg-white border border-[#E3D8CB] rounded-xl text-xs font-bold hover:bg-[#EFE8DD] transition-colors uppercase tracking-wider text-[#2F4A3D]">1900-555-888</button>
            </div>
          </div>
        </aside>

        {/* Mobile menu modal overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-[#1F1F1C]/45 backdrop-blur-xs z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="w-64 bg-white h-full p-6 space-y-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-[#E3D8CB]">
                  <span className="text-xs font-black text-[#2F4A3D] uppercase tracking-widest">StayOS di động</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-[#8A8177]">✕</button>
                </div>

                <nav className="space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id || 
                      (item.id === 'ctv_rooms' && activeView === 'ctv_booking') ||
                      (item.id === 'admin_properties' && (activeView === 'admin_room_types' || activeView === 'admin_rooms'));

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveView(item.id);
                          setSelectedBookingRoom(null);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs inline-flex items-center space-x-3 transition cursor-pointer ${
                          isActive 
                            ? 'bg-[#2F4A3D] text-white shadow-md' 
                            : 'text-[#5F5A52] hover:bg-[#F7F3EC] hover:text-[#1F1F1C]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-100 text-[10px] text-slate-400">
                <p className="font-bold uppercase text-slate-600">Đang đăng nhập:</p>
                <div className="flex items-center space-x-1.5 font-bold">
                  <span className="text-indigo-700">{user.name}</span>
                  <span className="text-slate-350">|</span>
                  <span className="text-slate-500">{user.email}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Viewer viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {renderContent()}
        </main>

        {/* Floating Toast Notification layer */}
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => {
            const isBooking = toast.type === 'BOOKING_SUCCESS';
            const isCommission = toast.type === 'COMMISSION_EARNED';
            
            return (
              <div 
                key={toast.id}
                className={`bg-white rounded-xl border border-slate-100 shadow-2xl p-4 flex space-x-3 text-xs w-full pointer-events-auto transform duration-300 hover:scale-[1.02] border-l-4 transition-all duration-300 ${
                  isBooking 
                    ? 'border-l-rose-500' 
                    : isCommission 
                      ? 'border-l-emerald-500' 
                      : 'border-l-indigo-500'
                }`}
                style={{ animation: 'slide-up 0.4s ease-out' }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isBooking && (
                    <div className="bg-rose-50 text-rose-600 p-1.5 rounded-lg flex items-center justify-center text-sm">
                      🔥
                    </div>
                  )}
                  {isCommission && (
                    <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg flex items-center justify-center text-sm">
                      💰
                    </div>
                  )}
                  {!isBooking && !isCommission && (
                    <div className="bg-sky-50 text-sky-600 p-1.5 rounded-lg flex items-center justify-center text-sm">
                      🟢
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 tracking-tight">{toast.title}</span>
                    <button 
                      onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                      className="text-slate-400 hover:text-slate-600 text-[10px] ml-2 cursor-pointer p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">{toast.message}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BaseLayout />
    </AuthProvider>
  );
}
