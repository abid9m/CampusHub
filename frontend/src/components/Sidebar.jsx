import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleLinks = {
  ADMIN: [['/', 'Discover feed'], ['/dashboard/admin', 'Admin workspace'], ['/resources', 'Resource hub'], ['/check-in', 'Gate check-in'], ['/clubs', 'Club directory']],
  FACULTY_ADVISOR: [['/', 'Discover feed'], ['/dashboard/advisor', 'Review cockpit'], ['/resources', 'Resource hub'], ['/check-in', 'Gate check-in'], ['/clubs', 'Club directory']],
  CLUB_EXECUTIVE: [['/', 'Discover feed'], ['/dashboard/executive', 'Club workspace'], ['/resources', 'Resource hub'], ['/check-in', 'Gate check-in'], ['/clubs', 'Club directory']],
  STUDENT: [['/', 'Discover feed'], ['/dashboard/student', 'My CampusHub'], ['/resources', 'Resource hub'], ['/calendar', 'Event calendar'], ['/clubs', 'Join a club']],
};

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-24 space-y-1">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Workspace</p>
        {(roleLinks[user.role] || []).map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600 hover:bg-white hover:text-zinc-950'}`}>
            {({ isActive }) => <><span className={`h-1.5 w-1.5 rounded-full transition ${isActive ? 'bg-indigo-600' : 'bg-zinc-300 group-hover:bg-zinc-500'}`}></span>{label}</>}
          </NavLink>
        ))}
        <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">{user.name?.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-900">{user.name}</p>
              <p className="mt-0.5 text-[11px] capitalize text-zinc-500">{user.role?.replaceAll('_', ' ').toLowerCase()}</p></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
