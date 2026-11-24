import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const containerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    api('/notifications').then(setNotifications).catch(() => setNotifications([]));
  }, []);
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);
  const unread = notifications.filter((item) => !item.read).length;
  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
      setNotificationError('');
    } catch (error) {
      setNotificationError(error.message);
    }
  }
  return (
    <div className="relative" ref={containerRef}>
      <button className="relative rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50" onClick={() => setOpen((current) => !current)} aria-label="Notifications" aria-expanded={open} aria-controls="notification-menu">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 21h4" strokeLinecap="round"/></svg>
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && <div id="notification-menu" className="dropdown-menu absolute right-0 z-30 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-200/80 bg-white p-3 shadow-float">
        <p className="px-2 pb-2 text-sm font-bold text-zinc-900">Notifications</p>
        {notificationError && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-2.5 py-2 text-xs text-rose-700">{notificationError}</p>}
        {notifications.length === 0 && <div className="px-3 py-6 text-center"><span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/></svg></span><p className="text-sm font-semibold text-zinc-800">You’re all caught up</p><p className="mt-1 text-xs text-zinc-500">New updates will show up here.</p></div>}
        <div className="max-h-80 overflow-y-auto">
          {notifications.slice(0, 10).map((item) => (
            <button key={item.id} onClick={() => { setOpen(false); if (!item.read) markRead(item.id); }} className={`block w-full rounded-xl p-2.5 text-left text-sm transition hover:bg-zinc-50 ${item.read ? 'text-zinc-500' : 'font-medium text-zinc-900'}`}>
              <span>{item.payload?.eventTitle || item.payload?.title || item.type.replaceAll('_', ' ')}</span>
              <span className="mt-1 block text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="CampusHub Discover">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-indigo-500 to-violet-700 text-lg font-black text-white shadow-md shadow-indigo-600/20">C</span>
          <span><span className="block text-[17px] font-bold tracking-tight text-zinc-900">CampusHub</span><span className="hidden text-[11px] font-medium text-zinc-500 sm:block">Campus life, connected</span></span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {[['/', 'Discover'], ['/calendar', 'Calendar'], ['/clubs', 'Clubs'], ['/resources', 'Resources']].map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `hidden rounded-lg border px-3 py-2 text-sm font-medium transition duration-200 sm:block ${isActive ? 'border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-transparent text-zinc-600 hover:bg-white hover:text-zinc-950'}`}>{label}</NavLink>)}
          {user ? <>
            <NotificationBell />
            <div className="hidden items-center gap-2 border-l border-zinc-200 pl-3 sm:flex">
              <Link to="/settings" aria-label="Account settings" title="Account settings" className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 transition hover:bg-indigo-200">{user.name?.slice(0, 1).toUpperCase()}</Link>
              <Link to="/settings" className="rounded-lg px-2 py-2 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-950">Settings</Link>
              <button onClick={signOut} className="rounded-lg px-2 py-2 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-950">Sign out</button>
            </div>
            <Link to="/settings" className="rounded-lg px-2 py-2 text-sm font-medium text-zinc-600 sm:hidden">Settings</Link>
            <button onClick={signOut} className="rounded-lg px-2 py-2 text-sm font-medium text-zinc-600 sm:hidden">Exit</button>
          </> : <Link to="/login" className="btn-primary !rounded-lg !px-3.5 !py-2">Sign in <span aria-hidden="true">→</span></Link>}
        </nav>
      </div>
    </header>
  );
}
