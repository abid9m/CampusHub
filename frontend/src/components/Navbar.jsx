import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const roleHome = {
  ADMIN: '/dashboard',
  FACULTY_ADVISOR: '/dashboard',
  CLUB_EXECUTIVE: '/dashboard',
  STUDENT: '/dashboard',
};

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    api('/notifications').then(setNotifications).catch(() => setNotifications([]));
  }, []);
  const unread = notifications.filter((item) => !item.read).length;
  async function markRead(id) {
    await api(`/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
  }
  return (
    <div className="relative">
      <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600" onClick={() => setOpen(!open)} aria-label="Notifications">
        <span aria-hidden="true">♢</span>
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && <div className="absolute right-0 z-30 mt-3 w-80 rounded-2xl border border-slate-100 bg-white p-3 shadow-card">
        <p className="px-2 pb-2 text-sm font-bold">Notifications</p>
        {notifications.length === 0 && <p className="p-2 text-sm text-muted">You’re all caught up.</p>}
        <div className="max-h-80 overflow-y-auto">
          {notifications.slice(0, 10).map((item) => (
            <button key={item.id} onClick={() => !item.read && markRead(item.id)} className={`block w-full rounded-xl p-2.5 text-left text-sm hover:bg-slate-50 ${item.read ? 'text-muted' : 'font-medium text-ink'}`}>
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
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to={roleHome[user?.role] || '/'} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-black text-white">C</span>
          <span><span className="block text-lg font-extrabold tracking-tight text-ink">CampusHub</span><span className="hidden text-[11px] font-medium text-muted sm:block">Campus life, connected</span></span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link className="hidden text-sm font-semibold text-slate-600 hover:text-brand sm:block" to="/">Discover</Link>
          <Link className="hidden text-sm font-semibold text-slate-600 hover:text-brand sm:block" to="/calendar">Calendar</Link>
          <Link className="hidden text-sm font-semibold text-slate-600 hover:text-brand sm:block" to="/clubs">Clubs</Link>
          {user ? <>
            <NotificationBell />
            <button onClick={() => { logout(); navigate('/'); }} className="btn-secondary !px-3 !py-2">Sign out</button>
          </> : <Link to="/login" className="btn-primary !px-3 !py-2">Sign in</Link>}
        </nav>
      </div>
    </header>
  );
}
