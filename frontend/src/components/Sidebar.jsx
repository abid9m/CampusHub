import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleLinks = {
  ADMIN: [['/dashboard', 'Admin workspace'], ['/check-in', 'Gate check-in'], ['/clubs', 'Club directory']],
  FACULTY_ADVISOR: [['/dashboard', 'Review cockpit'], ['/check-in', 'Gate check-in'], ['/clubs', 'Club directory']],
  CLUB_EXECUTIVE: [['/dashboard', 'Club workspace'], ['/check-in', 'Gate check-in'], ['/clubs', 'Club directory']],
  STUDENT: [['/dashboard', 'My CampusHub'], ['/calendar', 'Event calendar'], ['/clubs', 'Join a club']],
};

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-24 space-y-1">
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
        {(roleLinks[user.role] || []).map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-brand-soft text-brand' : 'text-slate-600 hover:bg-white hover:text-ink'}`}>
            {label}
          </NavLink>
        ))}
        <div className="mt-8 rounded-2xl bg-brand-soft p-4">
          <p className="text-sm font-bold text-ink">{user.name}</p>
          <p className="mt-1 text-xs capitalize text-muted">{user.role?.replaceAll('_', ' ').toLowerCase()}</p>
        </div>
      </div>
    </aside>
  );
}
