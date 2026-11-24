import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import DiscoverFeed from './components/DiscoverFeed';
import ResourceManagement from './components/ResourceManagement';
import { getRoleHome, useAuth } from './context/AuthContext';
import { api, API_URL } from './lib/api';

function PageTitle({ eyebrow, title, description, children }) {
  return <section className="relative mb-7 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-6 text-white shadow-card sm:px-8 sm:py-7">
    <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
    <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-32 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
    <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">{eyebrow}</p><h1 className="text-3xl font-bold tracking-tight text-white sm:text-[2rem]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>}</div>
      {children}
    </div>
  </section>;
}

function Alert({ message, type = 'error' }) {
  if (!message) return null;
  return <div role="status" className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}><span className="mt-0.5 font-bold" aria-hidden="true">{type === 'success' ? '✓' : '!'}</span><span>{message}</span></div>;
}

function EmptyState({ title, description, children }) {
  return <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-5 py-8 text-center">
    <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-400 shadow-sm"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7"><path d="M8 3v3m8-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 13h8m-8 3h5" strokeLinecap="round"/></svg></span>
    <h3 className="text-sm font-semibold text-zinc-800">{title}</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-zinc-500">{description}</p>{children}
  </div>;
}

function AuthPage({ mode }) {
  const { login, register, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    setError('');
    setLoading(true);
    try {
      await (mode === 'login' ? login(form) : register(form));
      navigate('/', { replace: true });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  if (isLoading) return <div className="card mx-auto max-w-md text-center text-sm text-zinc-500" role="status">Restoring your session…</div>;
  if (user) return <Navigate to="/" replace />;
  return <div className="mx-3 grid max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:mx-6 md:mx-auto md:grid-cols-[1.05fr_.95fr]">
    <section className="relative flex min-h-[250px] flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-7 text-white sm:px-8 sm:py-9 md:min-h-[570px] lg:p-12">
      <div aria-hidden="true" className="auth-grid pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-16 h-80 w-80 rounded-full bg-indigo-500/20 blur-[100px]" />
      <div className="relative z-10 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] font-bold text-white shadow-sm">C</span><span className="text-sm font-semibold tracking-tight text-white">CampusHub</span></div>
      <div className="relative z-10 mt-8 md:mt-0"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-300">Your campus, connected</p><h2 className="mb-4 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">Find your people.<br /><span className="text-indigo-300">Make campus count.</span></h2><p className="max-w-sm text-sm leading-6 text-slate-300">A single place for university clubs, events, tickets and the teams bringing them to life.</p></div>
      <p className="relative z-10 mt-8 text-xs font-medium text-slate-300">Discover <span className="mx-2 text-slate-500">/</span> Participate <span className="mx-2 text-slate-500">/</span> Lead</p>
    </section>
    <form onSubmit={submit} className="bg-white p-8 md:p-12">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">{mode === 'login' ? 'Welcome back' : 'Get started'}</p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-950">{mode === 'login' ? 'Sign in to CampusHub' : 'Create your student account'}</h1>
      <p className="mb-6 mt-2 text-sm text-slate-600">{mode === 'login' ? 'Pick up where your campus life left off.' : 'Join the communities that make campus yours.'}</p>
      <Alert message={error} />
      {mode === 'register' && <label className="label">Full name<input className="field mt-1" name="name" required autoComplete="name" /></label>}
      <label className="label mt-4">University email<input className="field mt-1" name="email" type="email" required autoComplete="email" /></label>
      <label className="label mt-4">Password<input className="field mt-1" name="password" type="password" minLength="10" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
      <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <p className="mt-5 text-center text-sm text-muted">{mode === 'login' ? 'New to CampusHub?' : 'Already registered?'} <Link className="font-bold text-brand" to={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? 'Create account' : 'Sign in'}</Link></p>
    </form>
  </div>;
}

function EventCard({ event, onRegister, busy }) {
  const start = new Date(event.startDate);
  return <article className="card flex flex-col justify-between gap-5 !p-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200">
    <div>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <span className="inline-flex max-w-[75%] items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-700"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />{event.club?.name || 'Campus event'}</span>
        <span className="rounded-xl border border-zinc-100 bg-zinc-50 px-2.5 py-1.5 text-center"><span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">{start.toLocaleDateString(undefined, { month: 'short' })}</span><span className="block text-sm font-bold leading-4 text-zinc-900">{start.toLocaleDateString(undefined, { day: 'numeric' })}</span></span>
      </div>
      <div className="px-5 pb-5 pt-4"><h3 className="text-lg font-semibold tracking-tight text-zinc-900">{event.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600">{event.description || 'Join fellow students for this campus event.'}</p></div>
    </div>
    <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-zinc-100 bg-zinc-50/70 px-5 py-3.5">
      <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-zinc-600"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-zinc-400" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="truncate">{start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} <span className="text-zinc-300">·</span> {event.venue || 'Venue TBA'}</span></span>
      {onRegister && <button className="btn-primary shrink-0 !rounded-lg !px-3 !py-2 !text-xs" onClick={() => onRegister(event.id)} disabled={busy}>{busy ? 'Reserving…' : 'Get ticket'} <span aria-hidden="true">→</span></button>}
    </div>
  </article>;
}

function EventFeed({ calendar = false }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    api('/events')
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  async function register(eventId) {
    if (!user) return window.location.assign('/login');
    setBusy(eventId);
    setError('');
    try {
      const result = await api(`/tickets/events/${eventId}/register`, { method: 'POST', body: {} });
      setTicket(result.ticket);
    } catch (err) { setError(err.message); }
    finally { setBusy(null); }
  }
  const grouped = calendar ? events.reduce((groups, event) => {
    const key = new Date(event.startDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    groups[key] ||= [];
    groups[key].push(event);
    return groups;
  }, {}) : null;
  return <>
    {calendar ? <PageTitle eyebrow="Plan ahead" title="Campus calendar" description="A live calendar of approved university events.">
      <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm">{loading ? 'Loading events…' : `${events.length} upcoming`}</span>
    </PageTitle> : <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-8 text-white shadow-card sm:px-9 sm:py-10 lg:px-11">
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 opacity-55" /><div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-32 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl"><span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-200"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Campus life, in motion</span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]">Find your next <span className="text-indigo-300">campus moment.</span></h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">Discover events, meet your community, and make the most of every day at university.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7"><path d="M8 3v3m8-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span><span className="block text-lg font-bold leading-5">{events.length}</span><span className="text-xs text-zinc-300">upcoming events</span></span></div>
      </div>
    </section>}
    <Alert message={error} />
    {ticket && <div className="mb-6 flex flex-wrap items-center gap-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
      <img alt="Your event ticket QR code" className="h-28 w-28 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm" src={ticket.qrCode} />
      <div><p className="font-semibold text-emerald-800">You’re registered!</p><p className="mt-1 text-sm text-emerald-800/80">Save your QR ticket and present it at the entrance.</p><code className="mt-2 block text-xs text-emerald-900/70">{ticket.code}</code></div>
    </div>}
    {!calendar && events.length > 0 && <div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-zinc-900">Popular on campus</p><p className="mt-0.5 text-xs text-zinc-500">The latest from your university community</p></div><Link to="/calendar" className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800">View calendar <span aria-hidden="true">→</span></Link></div>}
    {loading && <div role="status" aria-label="Loading events" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="card animate-pulse !p-5"><div className="h-5 w-28 rounded-full bg-slate-100" /><div className="mt-5 h-5 w-2/3 rounded bg-slate-100" /><div className="mt-3 h-3 w-full rounded bg-slate-100" /><div className="mt-2 h-3 w-4/5 rounded bg-slate-100" /><div className="mt-6 h-9 rounded-xl bg-slate-50" /></div>)}</div>}
    {calendar ? Object.entries(grouped || {}).map(([month, items]) => <section key={month} className="mb-8">
      <h2 className="mb-4 text-lg font-bold text-ink">{month}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((event) => <EventCard key={event.id} event={event} onRegister={user?.role === 'STUDENT' ? register : null} busy={busy === event.id} />)}</div>
    </section>) : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} onRegister={user?.role === 'STUDENT' ? register : null} busy={busy === event.id} />)}</div>}
    {events.length === 0 && !loading && !error && <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center shadow-sm"><span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.6"><path d="M8 3v3m8-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 13h3m-3 3h6" strokeLinecap="round"/></svg></span><h2 className="text-base font-semibold text-zinc-900">Nothing on the calendar just yet</h2><p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-zinc-500">New events are being planned. Explore a club and find the communities making them happen.</p><Link to="/clubs" className="btn-secondary mt-5 !rounded-lg !px-3.5 !py-2">Explore clubs <span aria-hidden="true">→</span></Link></div>}
  </>;
}

function StudentTickets() {
  const [tickets, setTickets] = useState([]);
  const [certificates, setCertificates] = useState({});
  const [error, setError] = useState('');
  useEffect(() => { api('/tickets/mine').then(setTickets).catch((err) => setError(err.message)); }, []);
  async function getCertificate(eventId) {
    setError('');
    try {
      const result = await api(`/certificates/${eventId}/generate`, { method: 'POST', body: {} });
      setCertificates((current) => ({ ...current, [eventId]: result }));
    } catch (err) { setError(err.message); }
  }
  async function download(path) {
    try {
      const response = await fetch(`${API_URL.replace(/\/api$/, '')}${path}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('campushub-token')}` },
      });
      if (!response.ok) throw new Error('Unable to download certificate');
      const file = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = file; link.download = 'campushub-certificate.pdf'; link.click();
      URL.revokeObjectURL(file);
    } catch (err) { setError(err.message); }
  }
  return <section className="card mt-6"><h2 className="mb-4 font-bold tracking-tight text-zinc-900">My event tickets & certificates</h2><Alert message={error} /><div className="space-y-3">{tickets.map((ticket) => <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 p-4 transition hover:border-zinc-200 hover:bg-zinc-50/60"><div><p className="font-semibold text-zinc-900">{ticket.event.title}</p><p className="mt-1 text-xs text-zinc-500">{new Date(ticket.event.startDate).toLocaleDateString()} · {ticket.scannedAt ? 'Attendance verified' : 'Ticket registered'}</p></div>{ticket.scannedAt && <div>{certificates[ticket.eventId]?.downloadUrl ? <button className="btn-primary !px-3 !py-2" onClick={() => download(certificates[ticket.eventId].downloadUrl)}>Download certificate</button> : <button className="btn-secondary !px-3 !py-2" onClick={() => getCertificate(ticket.eventId)}>Get certificate</button>}</div>}</div>)}{tickets.length === 0 && <EmptyState title="Your tickets will show up here" description="Register for a campus event and your tickets and attendance certificates will be easy to find." />}</div></section>;
}

function EventProposalForm({ clubs, onCreated }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const items = values.getAll('itemDescription').map((description, index) => ({
      description: String(description).trim(),
      amount: Number(values.getAll('itemAmount')[index]),
    })).filter((item) => item.description && item.amount > 0);
    const amount = items.reduce((sum, item) => sum + item.amount, 0);
    if (!items.length) {
      setError('Add at least one budget item with a positive amount.');
      return;
    }
    setLoading(true); setError('');
    try {
      await api('/events/proposals', {
        method: 'POST',
        body: {
          event: {
            title: values.get('eventTitle'),
            description: values.get('eventDescription'),
            venue: values.get('venue'),
            clubId: Number(values.get('clubId')),
            startDate: new Date(values.get('startDate')).toISOString(),
            endDate: new Date(values.get('endDate')).toISOString(),
          },
          budget: {
            title: values.get('budgetTitle'),
            description: values.get('budgetDescription'),
            amount,
            items,
          },
        },
      });
      form.reset();
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <form className="card" onSubmit={submit}>
    <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">One complete submission</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Event & budget proposal</h2><p className="mt-1 text-sm leading-5 text-zinc-500">Submit event details and an itemized budget together for advisor review.</p></div><Alert message={error} />
    <label className="label">Club<select name="clubId" className="field mt-1" required defaultValue=""><option value="" disabled>Select a club</option>{clubs.map((club) => <option value={club.id} key={club.id}>{club.name}</option>)}</select></label>
    <label className="label mt-3">Event title<input name="eventTitle" className="field mt-1" required /></label>
    <label className="label mt-3">Event description<textarea name="eventDescription" rows="3" className="field mt-1" /></label>
    <label className="label mt-3">Venue<input name="venue" className="field mt-1" /></label>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="label">Starts<input name="startDate" type="datetime-local" className="field mt-1" required /></label>
      <label className="label">Ends<input name="endDate" type="datetime-local" className="field mt-1" required /></label>
    </div>
    <div className="my-5 border-t border-zinc-100 pt-4"><h3 className="text-sm font-semibold text-zinc-900">Financial proposal</h3>
      <label className="label mt-3">Budget title<input name="budgetTitle" className="field mt-1" required /></label>
      <label className="label mt-3">Purpose<textarea name="budgetDescription" rows="2" className="field mt-1" /></label>
      <div className="mt-4 space-y-3"><p className="text-xs font-semibold text-zinc-600">Itemized costs</p>{[0, 1, 2].map((index) => <div key={index} className="grid grid-cols-[1fr_8rem] gap-2"><input className="field" name="itemDescription" placeholder={`Item ${index + 1}`} required={index === 0} /><input className="field" name="itemAmount" type="number" step="0.01" min="0.01" placeholder="Amount" required={index === 0} /></div>)}</div>
    </div>
    <button className="btn-primary mt-1 w-full" disabled={loading || !clubs.length}>{loading ? 'Submitting proposal…' : 'Submit event & budget'}</button>
    {!clubs.length && <p className="mt-3 text-xs text-amber-700">Your account must be added to a club before you can create its events.</p>}
  </form>;
}

function ReceiptForm({ proposal, onSaved }) {
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      await api(`/budgets/${proposal.id}/receipts`, { method: 'POST', body: { ...values, amount: Number(values.amount) } });
      form.reset();
      setError('');
      onSaved();
    } catch (err) { setError(err.message); }
  }
  return <form onSubmit={submit} className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_8rem_auto]"><input className="field" name="receiptUrl" type="url" placeholder="HTTPS receipt URL" required /><input className="field" name="amount" type="number" step="0.01" min="0.01" placeholder="Amount" required /><button className="btn-secondary !px-3 !py-2">Add expense</button>{error && <p className="text-xs text-rose-700 sm:col-span-3">{error}</p>}</form>;
}

function CoHostPanel({ events }) {
  const [clubs, setClubs] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [message, setMessage] = useState('');
  async function load() {
    try {
      const [clubList, invitationList] = await Promise.all([api('/clubs'), api('/cohosts')]);
      setClubs(clubList); setInvitations(invitationList);
    } catch (err) { setMessage(err.message); }
  }
  useEffect(() => { load(); }, []);
  async function invite(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      await api(`/events/${values.eventId}/invitations`, { method: 'POST', body: { clubId: Number(values.clubId) } });
      setMessage('Co-host invitation sent.');
      form.reset();
      await load();
    } catch (err) { setMessage(err.message); }
  }
  async function respond(id, decision) {
    try { await api(`/cohosts/${id}/respond`, { method: 'PATCH', body: { decision } }); await load(); }
    catch (err) { setMessage(err.message); }
  }
  return <section className="card mt-6"><h2 className="mb-4 font-bold text-ink">Co-host collaboration</h2><Alert message={message} type={message.startsWith('Co-host') ? 'success' : 'error'} />
    <form onSubmit={invite} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
      <select className="field" name="eventId" defaultValue="" required><option value="" disabled>Choose your event</option>{events.filter((event) => event.isDraft).map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select>
      <select className="field" name="clubId" defaultValue="" required><option value="" disabled>Invite a club</option>{clubs.filter((club) => !events.some((event) => event.club.id === club.id)).map((club) => <option value={club.id} key={club.id}>{club.name}</option>)}</select>
      <button className="btn-primary">Invite co-host</button>
    </form>
    <div className="mt-5 space-y-3">{invitations.map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><p className="text-sm"><strong>{invitation.event.title}</strong> · {invitation.status}</p>{invitation.status === 'PENDING' && <div className="flex gap-2"><button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" onClick={() => respond(invitation.id, 'DECLINED')}>Decline</button><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" onClick={() => respond(invitation.id, 'ACCEPTED')}>Accept</button></div>}</div>)}{invitations.length === 0 && <EmptyState title="No co-host invitations yet" description="Invitations from partner clubs will appear here." />}</div>
  </section>;
}

function ApplicationsPanel({ clubs }) {
  const [clubId, setClubId] = useState('');
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!clubId && clubs[0]) setClubId(String(clubs[0].id));
  }, [clubs, clubId]);
  async function load() {
    if (!clubId) return;
    try { setApplications(await api(`/recruitment/clubs/${clubId}/applications`)); setError(''); }
    catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, [clubId]);
  async function review(id, status) {
    try { await api(`/recruitment/applications/${id}`, { method: 'PATCH', body: { status } }); await load(); }
    catch (err) { setError(err.message); }
  }
  return <section className="card mt-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-ink">Recruitment applications</h2><select className="field max-w-xs" value={clubId} onChange={(event) => setClubId(event.target.value)}><option value="">Select a club</option>{clubs.map((club) => <option value={club.id} key={club.id}>{club.name}</option>)}</select></div><Alert message={error} /><div className="space-y-3">{applications.map((application) => <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"><div><p className="font-semibold">{application.name}</p><p className="text-sm text-muted">{application.email} · {application.status}</p><p className="mt-1 text-xs text-slate-500">{application.message}</p></div>{application.status === 'PENDING' && <div className="flex gap-2"><button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" onClick={() => review(application.id, 'REJECTED')}>Decline</button><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" onClick={() => review(application.id, 'APPROVED')}>Approve</button></div>}</div>)}{applications.length === 0 && <EmptyState title="No applications yet" description="Membership requests for this club will appear here." />}</div></section>;
}

function ExecutiveWorkspace({ onCheckIn }) {
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [error, setError] = useState('');
  const [loadingId, setLoadingId] = useState(null);
  const [selectedClubId, setSelectedClubId] = useState('');
  async function load() {
    try {
      const [clubList, ownEvents] = await Promise.all([api('/clubs/mine'), api('/events/mine')]);
      setClubs(clubList); setEvents(ownEvents);
      const currentClubId = selectedClubId || String(clubList[0]?.id || '');
      if (currentClubId) {
        setSelectedClubId(currentClubId);
        setProposals(await api(`/budgets/clubs/${currentClubId}`));
      }
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);
  async function submitDraft(id) {
    setLoadingId(id); setError('');
    try { await api(`/events/${id}/submit`, { method: 'POST', body: {} }); await load(); }
    catch (err) { setError(err.message); }
    finally { setLoadingId(null); }
  }
  return <><PageTitle eyebrow="Club workspace" title="Build campus moments" description="Submit complete event and budget proposals together, then track the advisor review."><button onClick={onCheckIn} className="btn-secondary">Open check-in</button></PageTitle>
    <Alert message={error} />
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <EventProposalForm clubs={clubs} onCreated={load} />
      <section className="card"><h2 className="mb-4 font-bold text-ink">Your event pipeline</h2>
        <div className="space-y-3">{events.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
          <div><p className="font-semibold text-ink">{event.title}</p><p className="mt-1 text-xs text-muted">{event.club.name} · {new Date(event.startDate).toLocaleDateString()}</p><p className="mt-1 text-xs font-medium text-indigo-700">{event.budgetProposals?.[0] ? `${event.budgetProposals[0].title} · $${Number(event.budgetProposals[0].amount).toFixed(2)}` : 'Budget proposal required before submission'}</p></div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{event.isDraft ? 'DRAFT' : event.status}</span>{event.isDraft && <button className="btn-primary !px-3 !py-2" disabled={loadingId === event.id || !event.budgetProposals?.length} onClick={() => submitDraft(event.id)}>{loadingId === event.id ? 'Submitting…' : 'Submit'}</button>}</div>
        </div>)}{events.length === 0 && <EmptyState title="No event proposals yet" description="Your drafts and submitted proposals will appear here once you create an event." />}</div>
      </section>
    </div>
    <section className="card mt-6"><h2 className="mb-4 font-bold text-ink">Club budget ledger</h2><div className="space-y-3">{proposals.map((proposal) => <div key={proposal.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{proposal.title}</p><p className="mt-1 text-xs text-muted">{proposal.items.map((item) => `${item.description}: $${Number(item.amount).toFixed(2)}`).join(' · ')}</p>{proposal.receipts.map((receipt) => <a className="mr-3 mt-2 inline-block text-xs font-semibold text-brand" href={receipt.receiptUrl} target="_blank" rel="noreferrer" key={receipt.id}>Receipt ${Number(receipt.amount).toFixed(2)} ↗</a>)}</div><div className="text-right"><p className="font-bold">${Number(proposal.amount).toFixed(2)}</p><p className="text-xs font-semibold text-slate-500">{proposal.status}</p></div></div>{proposal.status === 'APPROVED' && <ReceiptForm proposal={proposal} onSaved={load} />}</div>)}{proposals.length === 0 && <EmptyState title="No budget proposals yet" description="Budgets submitted with your event proposals will be tracked here." />}</div></section>
    <CoHostPanel events={events} />
    <ApplicationsPanel clubs={clubs} />
  </>;
}

function AdvisorWorkspace() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  async function load() {
    try {
      setEvents(await api('/advisor/events'));
    }
    catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);
  async function review(id, status) {
    const feedback = window.prompt(`Optional feedback for ${status.toLowerCase()}:`) || '';
    try { await api(`/events/${id}/status`, { method: 'PATCH', body: { status, feedback } }); await load(); }
    catch (err) { setError(err.message); }
  }
  return <><PageTitle eyebrow="Faculty advisor" title="Approval cockpit" description="Review event logistics and the linked itemized budget together for your assigned clubs." /><Alert message={error} />
    <section className="card"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-ink">Events awaiting review</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{events.length} pending</span></div>
      <div className="space-y-3">{events.map((event) => <article key={event.id} className="rounded-xl border border-slate-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="font-bold text-ink">{event.title}</p><p className="mt-1 text-sm text-muted">{event.club.name} · {event.venue || 'Venue TBA'} · {new Date(event.startDate).toLocaleString()}</p><p className="mt-2 text-sm text-slate-600">{event.description}</p>
          {event.budgetProposals?.[0] && <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Linked budget proposal</p><p className="mt-1 font-semibold text-zinc-900">{event.budgetProposals[0].title}</p></div><p className="text-lg font-bold text-zinc-900">${Number(event.budgetProposals[0].amount).toFixed(2)}</p></div>{event.budgetProposals[0].description && <p className="mt-2 text-sm text-zinc-600">{event.budgetProposals[0].description}</p>}<div className="mt-3 space-y-1 border-t border-indigo-100 pt-3">{event.budgetProposals[0].items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-xs text-zinc-600"><span>{item.description}</span><span className="font-medium text-zinc-800">${Number(item.amount).toFixed(2)}</span></div>)}</div></div>}
          {!event.budgetProposals?.length && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">This older event has no linked budget proposal and cannot be reviewed yet.</p>}
        </div><div className="flex shrink-0 gap-2"><button disabled={!event.budgetProposals?.length} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => review(event.id, 'REJECTED')}>Reject both</button><button disabled={!event.budgetProposals?.length} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => review(event.id, 'APPROVED')}>Approve both</button></div>
        </div></article>)}{events.length === 0 && <EmptyState title="Nothing needs review" description="New event and budget proposals from your assigned clubs will appear here." />}</div>
    </section>
  </>;
}

function AdminWorkspace() {
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [resources, setResources] = useState([]);
  const [roles, setRoles] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const [userList, clubList, resourceList] = await Promise.all([
        api('/admin/users'),
        api('/clubs'),
        api('/resources'),
      ]);
      setUsers(userList);
      setClubs(clubList);
      setResources(resourceList);
      setRoles(Object.fromEntries(userList.map((item) => [item.id, item.role])));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function updateRole(event, id) {
    event.preventDefault();
    setError(''); setNotice('');
    try {
      await api(`/auth/users/${id}/role`, { method: 'PATCH', body: { role: roles[id] } });
      setNotice('Account role updated. Ask that user to sign in again to refresh their dashboard.');
      await load();
    } catch (err) { setError(err.message); }
  }

  async function createUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setError(''); setNotice('');
    try {
      await api('/admin/users', { method: 'POST', body: values });
      form.reset();
      setNotice('Account created. Share the temporary password securely with the user.');
      await load();
    } catch (err) { setError(err.message); }
  }

  async function createClub(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setError(''); setNotice('');
    try {
      await api('/clubs', {
        method: 'POST',
        body: {
          name: values.name,
          description: values.description,
          leadId: Number(values.leadId),
          advisorId: values.advisorId ? Number(values.advisorId) : null,
        },
      });
      form.reset();
      setNotice('Club created. The selected executive can now draft events.');
      await load();
    } catch (err) { setError(err.message); }
  }

  async function createResource(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setError(''); setNotice('');
    try {
      await api('/resources', { method: 'POST', body: values });
      form.reset();
      setNotice('Shared resource added to the booking inventory.');
      await load();
    } catch (err) { setError(err.message); }
  }

  const executives = users.filter((item) => item.role === 'CLUB_EXECUTIVE' || roles[item.id] === 'CLUB_EXECUTIVE');
  const advisors = users.filter((item) => item.role === 'FACULTY_ADVISOR' || roles[item.id] === 'FACULTY_ADVISOR');
  return <>
    <PageTitle eyebrow="Administrator workspace" title="Set up your campus" description="Create user roles, assign club leadership and advisors, and manage shared resources." />
    <Alert message={error} />
    <Alert message={notice} type="success" />
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      {[['Accounts', users.length, 'People across your campus'], ['Clubs', clubs.length, 'Student communities'], ['Resources', resources.length, 'Bookable resources']].map(([label, count, detail], index) => <div className="card group !p-5" key={label}><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-zinc-600">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">{count}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${index === 0 ? 'bg-indigo-50 text-indigo-600' : index === 1 ? 'bg-violet-50 text-violet-600' : 'bg-emerald-50 text-emerald-600'}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7"><path d={index === 0 ? 'M16 20h5v-1a4 4 0 0 0-5.5-3.7M16 20H8m8 0v-1c0-1.1-.4-2.1-1.1-2.8M8 20H3v-1a4 4 0 0 1 5.5-3.7M8 20v-1c0-1.1.4-2.1 1.1-2.8m0 0a5 5 0 0 1 5.8 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm5 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z' : index === 1 ? 'M3 10.5 12 4l9 6.5M5 9v11h14V9M9 20v-6h6v6' : 'M5 4h14v16H5zM8 8h8m-8 4h8m-8 4h4'} strokeLinecap="round" strokeLinejoin="round"/></svg></span></div><p className="mt-2 text-xs text-zinc-500">{detail}</p></div>)}
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold text-ink">Accounts & roles</h2><p className="mt-1 text-xs text-muted">Create accounts with Register, then assign elevated campus roles here.</p></div>
        </div>
        <form onSubmit={createUser} className="mb-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-5">
          <input className="field" name="name" placeholder="Full name" required />
          <input className="field" name="email" type="email" placeholder="Email" required />
          <select className="field" name="role" defaultValue="STUDENT">{['STUDENT', 'CLUB_EXECUTIVE', 'FACULTY_ADVISOR', 'ADMIN'].map((role) => <option value={role} key={role}>{role.replaceAll('_', ' ')}</option>)}</select>
          <input className="field" name="password" type="password" minLength="10" maxLength="72" placeholder="Temporary password" required />
          <button className="btn-primary">Create account</button>
        </form>
        <div className="space-y-3">
          {users.map((item) => <form key={item.id} onSubmit={(event) => updateRole(event, item.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
            <div className="min-w-40"><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-muted">{item.email}</p></div>
            <div className="flex items-center gap-2"><select aria-label={`Role for ${item.name}`} className="field !w-auto min-w-44 !py-2" value={roles[item.id] || item.role} onChange={(event) => setRoles((current) => ({ ...current, [item.id]: event.target.value }))}>
              {['STUDENT', 'CLUB_EXECUTIVE', 'FACULTY_ADVISOR', 'ADMIN'].map((role) => <option value={role} key={role}>{role.replaceAll('_', ' ')}</option>)}
            </select><button className="btn-primary !px-3 !py-2" disabled={(roles[item.id] || item.role) === item.role}>Save</button></div>
          </form>)}
          {users.length === 0 && <EmptyState title="No accounts yet" description="Create an account to start assigning roles and building your campus community." />}
        </div>
      </section>
      <div className="space-y-6">
        <form className="card" onSubmit={createClub}>
          <h2 className="mb-4 font-bold text-ink">Create a club</h2>
          <label className="label">Club name<input className="field mt-1" name="name" required /></label>
          <label className="label mt-3">Description<textarea className="field mt-1" name="description" rows="2" /></label>
          <label className="label mt-3">Club executive lead<select className="field mt-1" name="leadId" defaultValue="" required><option value="" disabled>Assign an executive</option>{executives.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.email}</option>)}</select></label>
          <label className="label mt-3">Faculty advisor<select className="field mt-1" name="advisorId" defaultValue=""><option value="">Not assigned yet</option>{advisors.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <button className="btn-primary mt-4" disabled={!executives.length}>Create club</button>
          {!executives.length && <p className="mt-2 text-xs text-amber-700">First assign a registered account the CLUB_EXECUTIVE role.</p>}
        </form>
        <form className="card" onSubmit={createResource}>
          <h2 className="mb-4 font-bold text-ink">Add shared resource</h2>
          <label className="label">Resource name<input className="field mt-1" name="name" placeholder="Lecture Hall A" required /></label>
          <label className="label mt-3">Type<input className="field mt-1" name="type" placeholder="Venue, Projector, Audio..." required /></label>
          <label className="label mt-3">Description<textarea className="field mt-1" name="description" rows="2" /></label>
          <button className="btn-primary mt-4">Add resource</button>
          <p className="mt-3 text-xs text-muted">{resources.map((resource) => resource.name).join(' · ') || 'No resources yet'}</p>
        </form>
      </div>
    </div>
  </>;
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (user.role === 'CLUB_EXECUTIVE') return <ExecutiveWorkspace onCheckIn={() => navigate('/check-in')} />;
  if (user.role === 'FACULTY_ADVISOR') return <AdvisorWorkspace />;
  if (user.role === 'ADMIN') return <AdminWorkspace />;
  return <><PageTitle eyebrow="Student home" title={`Good to see you, ${user.name.split(' ')[0]}`} description="Find a campus event, save your place, and stay in the loop." /><EventFeed /><StudentTickets /></>;
}

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={getRoleHome(user.role)} replace />;
}
function ClubDirectory() {
  const [clubs, setClubs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [executives, setExecutives] = useState([]);
  const [message, setMessage] = useState('');
  useEffect(() => { api('/clubs').then(setClubs).catch((err) => setMessage(err.message)); }, []);
  async function apply(event, clubId) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await api(`/recruitment/clubs/${clubId}/applications`, { method: 'POST', body: data });
      setMessage('Application submitted. The club team will be in touch.');
      form.reset();
    } catch (err) { setMessage(err.message); }
  }
  async function showTeam(clubId) {
    if (selected === clubId) { setSelected(null); return; }
    setSelected(clubId);
    try {
      const result = await api(`/recruitment/clubs/${clubId}/executives`);
      setExecutives(result);
    } catch (err) { setMessage(err.message); }
  }
  return <><PageTitle eyebrow="Find your community" title="University clubs" description="Explore student groups, meet the executive teams and apply to join." /><Alert message={message} type={message.startsWith('Application') ? 'success' : 'error'} />
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{clubs.map((club) => <article className="card group transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200" key={club.id}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-lg font-bold text-indigo-700 ring-1 ring-indigo-100">{club.name.slice(0, 1)}</div><h2 className="text-lg font-semibold tracking-tight text-zinc-900">{club.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-zinc-600">{club.description || 'A community for students to learn, connect and create.'}</p>
      <p className="mt-3 text-xs font-medium text-zinc-500">{club._count.members} members <span className="mx-1 text-zinc-300">·</span> {club._count.events} events</p>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => showTeam(club.id)} className="btn-secondary !px-3 !py-2">Meet the team</button><button onClick={() => { setSelected(club.id); api(`/recruitment/clubs/${club.id}/executives`).then(setExecutives).catch((err) => setMessage(err.message)); }} className="btn-primary !px-3 !py-2">Apply to join</button></div>
      {selected === club.id && <><div className="mt-4 border-t border-slate-100 pt-4"><p className="mb-2 text-sm font-bold">Executive directory</p><p className="text-sm text-muted">{executives.lead?.name} · Club lead</p>{executives.members?.map((member) => <p key={member.user.id} className="mt-1 text-sm text-muted">{member.user.name} · {member.title}</p>)}</div><form onSubmit={(event) => apply(event, club.id)} className="mt-4 space-y-3 border-t border-slate-100 pt-4"><p className="text-sm font-bold">Membership application</p><input className="field" name="name" placeholder="Your name" required /><input className="field" name="email" type="email" placeholder="University email" required /><input className="field" name="studentId" placeholder="Student ID (optional)" /><textarea className="field" name="message" rows="2" placeholder="Tell us why you’re interested" /><button className="btn-primary w-full">Send application</button></form></>}
    </article>)}</div>
    {clubs.length === 0 && !message && <EmptyState title="Find your campus community" description="Club listings will appear here as university groups are added." />}
  </>;
}

function CheckInPage() {
  const { user } = useAuth();
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  if (!user) return <Navigate to="/login" replace />;
  if (!['ADMIN', 'FACULTY_ADVISOR', 'CLUB_EXECUTIVE'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  async function checkIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const code = scannedCode || new FormData(form).get('code');
    setResult(''); setError('');
    try { const data = await api('/tickets/check-in', { method: 'POST', body: { code } }); setResult(`Checked in ${data.attendee} for ${data.event}.`); form.reset(); }
    catch (err) { setError(err.message); }
    finally { setScannedCode(''); }
  }
  async function startScanner() {
    setCameraError('');
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('QR scanning is not supported by this browser. Enter the ticket code manually.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      scannerRef.current = true;
      const scan = async () => {
        if (!scannerRef.current || !videoRef.current) return;
        const codes = await detector.detect(videoRef.current);
        if (codes[0]?.rawValue) {
          setScannedCode(codes[0].rawValue);
          scannerRef.current = false;
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        requestAnimationFrame(scan);
      };
      scan();
    } catch (err) { setCameraError(`Unable to start camera: ${err.message}`); }
  }
  useEffect(() => () => {
    scannerRef.current = false;
    videoRef.current?.srcObject?.getTracks?.().forEach((track) => track.stop());
  }, []);
  return <div className="mx-auto max-w-xl"><PageTitle eyebrow="Event operations" title="Gate check-in" description="Scan the attendee’s QR code with your device or enter the ticket code to verify their registration." /><div className="card"><Alert message={error} /><Alert message={result} type="success" /><Alert message={cameraError} /><div className="mb-4"><video ref={videoRef} className="max-h-64 w-full rounded-xl bg-slate-950" playsInline muted /><button type="button" className="btn-secondary mt-3 w-full" onClick={startScanner}>Start QR scanner</button></div><form onSubmit={checkIn}><label className="label">Ticket code<input className="field mt-1" name="code" autoComplete="off" placeholder={scannedCode || 'Paste or scan ticket code'} value={scannedCode} onChange={(event) => setScannedCode(event.target.value)} required /></label><button className="btn-primary mt-4 w-full">Verify & check in</button></form></div></div>;
}

function CertificateVerification() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  async function verify(event) {
    event.preventDefault(); setResult(null); setError('');
    try { setResult(await api(`/certificates/verify/${encodeURIComponent(code)}`)); }
    catch (err) { setError(err.message); }
  }
  return <div className="mx-auto max-w-xl"><PageTitle eyebrow="Credential validation" title="Verify a certificate" description="Check the validity and holder details of a CampusHub attendance certificate." /><form className="card" onSubmit={verify}><Alert message={error} /><label className="label">Verification code<input className="field mt-1" value={code} onChange={(event) => setCode(event.target.value)} required /></label><button className="btn-primary mt-4">Verify certificate</button>{result && <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-bold">Valid CampusHub certificate</p><p className="mt-2">{result.user.name} attended {result.event.title}.</p></div>}</form></div>;
}

function AuthenticatedApp() {
  const { user } = useAuth();
  return <div className="app-shell min-h-screen">
    <Navbar />
    <div className="mx-auto flex max-w-[1440px] gap-8 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={<DiscoverFeed />} />
          <Route path="/calendar" element={<EventFeed calendar />} />
          <Route path="/clubs" element={<ClubDirectory />} />
          <Route path="/resources" element={<ResourceManagement />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
          <Route path="/dashboard/admin" element={<ProtectedRoute roles={['ADMIN']}><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/advisor" element={<ProtectedRoute roles={['FACULTY_ADVISOR']}><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/executive" element={<ProtectedRoute roles={['CLUB_EXECUTIVE']}><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/student" element={<ProtectedRoute roles={['STUDENT']}><Dashboard /></ProtectedRoute>} />
          <Route path="/check-in" element={<ProtectedRoute roles={['ADMIN', 'FACULTY_ADVISOR', 'CLUB_EXECUTIVE']}><CheckInPage /></ProtectedRoute>} />
          <Route path="/verify-certificate" element={<CertificateVerification />} />
          <Route path="*" element={<Navigate to={getRoleHome(user.role)} replace />} />
        </Routes>
      </main>
    </div>
  </div>;
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="*" element={<ProtectedRoute><AuthenticatedApp /></ProtectedRoute>} />
  </Routes>;
}
