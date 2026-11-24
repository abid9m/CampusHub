import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const roleCopy = {
  ADMIN: ['Campus-wide updates', 'Explore events, club announcements and the activity that needs your attention.'],
  FACULTY_ADVISOR: ['Your campus feed', 'Follow campus events and keep track of proposals awaiting your review.'],
  CLUB_EXECUTIVE: ['Your campus, your clubs', 'Share updates with your club and discover what is happening across campus.'],
  STUDENT: ['Your campus, in your feed', 'Discover events, club announcements and the communities bringing campus to life.'],
};

function formatDate(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date to be announced' : new Intl.DateTimeFormat(undefined, options).format(date);
}

function statusStyle(status) {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-700';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700';
  return 'bg-zinc-100 text-zinc-600';
}

function FeedCard({ item, onOpen }) {
  const isPost = item.kind === 'post';
  const post = item.post;
  const event = item.event;
  const title = isPost ? post.title : event.title;
  const clubName = isPost ? post.club.name : event.club?.name || 'Campus event';
  const date = isPost ? post.createdAt : event.updatedAt || event.createdAt || event.startDate;
  const label = isPost
    ? post.type === 'ANNOUNCEMENT' ? 'Announcement' : 'Club post'
    : event.isDraft ? 'Draft'
      : event.status === 'PENDING' ? 'Event update · In review'
        : event.status === 'REJECTED' ? 'Event update · Changes requested'
          : 'Campus event';

  return <article className="card !p-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200">
    <button type="button" onClick={() => onOpen(item)} className="block w-full rounded-t-2xl p-5 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 text-sm font-bold text-indigo-700">{clubName.slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-zinc-900">{clubName}</span><span className="mt-0.5 block text-xs text-zinc-500">{formatDate(date)}</span></span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isPost && post.type === 'ANNOUNCEMENT' ? 'bg-violet-50 text-violet-700' : !isPost ? statusStyle(event.status) : 'bg-indigo-50 text-indigo-700'}`}>{label}</span>
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>
      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-zinc-600">{isPost ? post.content : event.description || 'Open the event to see the full schedule and logistics.'}</p>
      {!isPost && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-zinc-500">
        <span>{formatDate(event.startDate)}</span><span>{event.venue || 'Venue to be announced'}</span>
      </div>}
      {isPost && post.event && <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">Related event: {post.event.title}</span>}
    </button>
    <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/70 px-5 py-3">
      <span className="text-xs text-zinc-500">{isPost ? `Shared by ${post.author.name}` : event.status === 'PENDING' ? 'Proposal awaiting advisor review' : 'Tap to view event details'}</span>
      <button type="button" className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800" onClick={() => onOpen(item)}>View details <span aria-hidden="true">→</span></button>
    </div>
  </article>;
}

function DetailDialog({ item, onClose, onRegister, registering, ticket, user }) {
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const isPost = item.kind === 'post';
  const event = isPost ? item.post.event : item.event;
  const title = isPost ? item.post.title : item.event.title;
  const club = isPost ? item.post.club : item.event.club;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(click) => { if (click.target === click.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="feed-detail-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-float sm:rounded-3xl sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">{club?.name || 'CampusHub'}</p><h2 id="feed-detail-title" className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">{title}</h2></div><button type="button" aria-label="Close details" onClick={onClose} className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-50">×</button></div>
      {isPost ? <>
        <p className="whitespace-pre-line text-sm leading-7 text-zinc-700">{item.post.content}</p>
        <p className="mt-5 text-xs text-zinc-500">{item.post.type === 'ANNOUNCEMENT' ? 'Announcement' : 'Club post'} · Shared by {item.post.author.name} · {formatDate(item.post.createdAt)}</p>
        {event && <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Related event</p><p className="mt-1 font-semibold text-zinc-900">{event.title}</p><p className="mt-2 text-sm text-zinc-600">{formatDate(event.startDate)} · {event.venue || 'Venue to be announced'}</p></div>}
      </> : <>
        {item.event.description && <p className="whitespace-pre-line text-sm leading-7 text-zinc-700">{item.event.description}</p>}
        <dl className="mt-5 grid gap-3 rounded-2xl bg-zinc-50 p-4 sm:grid-cols-2">
          <div><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Starts</dt><dd className="mt-1 text-sm font-medium text-zinc-900">{formatDate(item.event.startDate)}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ends</dt><dd className="mt-1 text-sm font-medium text-zinc-900">{formatDate(item.event.endDate)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Venue</dt><dd className="mt-1 text-sm font-medium text-zinc-900">{item.event.venue || 'Venue to be announced'}</dd></div>
          {item.event.status !== 'APPROVED' && <div className="sm:col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Proposal status</dt><dd className="mt-1"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle(item.event.status)}`}>{item.event.isDraft ? 'DRAFT' : item.event.status}</span>{item.event.advisorNotes && <p className="mt-2 text-sm text-zinc-600">Advisor note: {item.event.advisorNotes}</p>}</dd></div>}
        </dl>
        {user?.role === 'STUDENT' && item.event.status === 'APPROVED' && <div className="mt-5">{ticket ? <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><img src={ticket.qrCode} alt="Your event ticket QR code" className="h-24 w-24 rounded-xl bg-white p-2" /><div><p className="font-semibold text-emerald-800">You’re registered</p><p className="mt-1 text-xs text-emerald-800/80">Ticket code: {ticket.code}</p></div></div> : <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => onRegister(item.event.id)} disabled={registering}>{registering ? 'Reserving your ticket…' : 'Register for this event'}</button>}</div>}
      </>}
    </section>
  </div>;
}

export default function DiscoverFeed() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [posts, setPosts] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [ticket, setTicket] = useState(null);
  const canPost = user?.role === 'ADMIN' || user?.role === 'CLUB_EXECUTIVE';
  const isAdmin = user?.role === 'ADMIN';
  const roleText = roleCopy[user?.role] || ['Discover campus life', 'Explore events and club announcements from across campus.'];

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [publicEvents, clubPosts, roleEvents, clubList] = await Promise.all([
        api('/events'),
        api('/posts'),
        Promise.all([
          user && ['ADMIN', 'CLUB_EXECUTIVE'].includes(user.role) ? api('/events/mine') : Promise.resolve([]),
          user && ['ADMIN', 'FACULTY_ADVISOR'].includes(user.role) ? api('/advisor/events') : Promise.resolve([]),
        ]),
        canPost ? api(isAdmin ? '/clubs' : '/clubs/mine') : Promise.resolve([]),
      ]);
      const uniqueEvents = new Map(publicEvents.map((event) => [event.id, event]));
      roleEvents.flat().forEach((event) => uniqueEvents.set(event.id, event));
      setEvents([...uniqueEvents.values()]);
      setPosts(clubPosts);
      setClubs(clubList);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [canPost, isAdmin, user]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const items = useMemo(() => [
    ...events.map((event) => ({ kind: 'event', id: `event-${event.id}`, createdAt: event.updatedAt || event.createdAt || event.startDate, event })),
    ...posts.map((post) => ({ kind: 'post', id: `post-${post.id}`, createdAt: post.createdAt, post })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [events, posts]);

  const visibleItems = items.filter((item) => filter === 'ALL' || (filter === 'EVENTS' ? item.kind === 'event' : item.kind === 'post'));

  async function sharePost(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setPosting(true);
    setNotice('');
    setError('');
    try {
      await api('/posts', { method: 'POST', body: { ...values, clubId: Number(values.clubId) } });
      form.reset();
      setNotice('Your club update is now on the campus feed.');
      await loadFeed();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setPosting(false);
    }
  }

  async function register(eventId) {
    if (!user) return;
    setRegistering(true);
    setError('');
    try {
      const result = await api(`/tickets/events/${eventId}/register`, { method: 'POST', body: {} });
      setTicket(result.ticket);
    } catch (registrationError) {
      setError(registrationError.message);
    } finally {
      setRegistering(false);
    }
  }

  return <div className="mx-auto max-w-6xl">
    <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-7 text-white shadow-card sm:px-9 sm:py-9">
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 opacity-55" /><div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-32 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">CampusHub · Discover</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{roleText[0]}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">{roleText[1]}</p></div>
        <Link to="/resources" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"><span aria-hidden="true">▦</span> Resource hub <span aria-hidden="true">→</span></Link>
      </div>
    </section>

    {canPost && <form onSubmit={sharePost} className="card mb-5 !p-4 sm:!p-5">
      <div className="mb-3 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">{user.name?.slice(0, 1).toUpperCase()}</span><div><h2 className="text-sm font-semibold text-zinc-900">Share with your campus</h2><p className="text-xs text-zinc-500">Post an update or publish a club announcement.</p></div></div>
      {clubs.length ? <div className="grid gap-3 sm:grid-cols-2">
        <select className="field" name="clubId" defaultValue="" required><option value="" disabled>Choose a club</option>{clubs.map((club) => <option value={club.id} key={club.id}>{club.name}</option>)}</select>
        <select className="field" name="type" defaultValue="POST"><option value="POST">Club post</option><option value="ANNOUNCEMENT">Announcement</option></select>
        <input className="field sm:col-span-2" name="title" placeholder="Give your update a title" maxLength="140" required />
        <textarea className="field sm:col-span-2" name="content" rows="3" placeholder="What should your campus community know?" maxLength="5000" required />
        <button className="btn-primary w-full sm:col-span-2" disabled={posting}>{posting ? 'Publishing…' : 'Publish update'}</button>
      </div> : <p className="text-sm text-zinc-500">You need an assigned club before you can publish an update. <Link className="font-semibold text-indigo-600" to="/clubs">View clubs</Link></p>}
    </form>}

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <section className="min-w-0">
        {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold tracking-tight text-zinc-900">Latest from campus</h2><p className="mt-0.5 text-xs text-zinc-500">{items.length} {items.length === 1 ? 'update' : 'updates'} across clubs and events</p></div>
          <div className="flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm" aria-label="Filter feed">
            {[['ALL', 'All'], ['EVENTS', 'Events'], ['POSTS', 'Posts']].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-50'}`}>{label}</button>)}
          </div>
        </div>
        <div className="space-y-4">
          {visibleItems.map((item) => <FeedCard key={item.id} item={item} onOpen={(selection) => { setSelected(selection); setTicket(null); }} />)}
          {!loading && visibleItems.length === 0 && !error && <div className="card text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-600">✦</div><h3 className="mt-3 font-semibold text-zinc-900">Your feed is just getting started</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500">New club announcements and event updates will show here as they are published.</p><Link to="/clubs" className="btn-secondary mt-4 !py-2">Explore clubs</Link></div>}
          {loading && <div role="status" aria-label="Loading campus updates" className="space-y-4">{[0, 1].map((item) => <div key={item} className="card animate-pulse !p-5"><div className="flex items-center gap-3"><span className="h-10 w-10 rounded-xl bg-slate-100" /><span className="flex-1"><span className="block h-3 w-32 rounded bg-slate-100" /><span className="mt-2 block h-2.5 w-24 rounded bg-slate-50" /></span></div><div className="mt-5 h-4 w-2/3 rounded bg-slate-100" /><div className="mt-3 h-3 w-full rounded bg-slate-50" /><div className="mt-2 h-3 w-4/5 rounded bg-slate-50" /></div>)}</div>}
        </div>
      </section>
      <aside className="hidden space-y-4 xl:block">
        <div className="card !p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Campus shortcuts</p><div className="mt-3 space-y-1"><Link to="/calendar" className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Event calendar <span aria-hidden="true">→</span></Link><Link to="/clubs" className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Club directory <span aria-hidden="true">→</span></Link><Link to="/resources" className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Resource hub <span aria-hidden="true">→</span></Link></div></div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5"><p className="text-sm font-semibold text-indigo-950">Make it a campus moment</p><p className="mt-1 text-xs leading-5 text-indigo-900/75">Find an event, connect with a club, or reserve shared equipment for your next activity.</p></div>
      </aside>
    </div>
    {selected && <DetailDialog item={selected} user={user} onClose={() => setSelected(null)} onRegister={register} registering={registering} ticket={ticket} />}
  </div>;
}
