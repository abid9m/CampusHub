import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useAuth } from './context/AuthContext';
import { api, API_URL } from './lib/api';

function PageTitle({ eyebrow, title, description, children }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p><h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}</div>
    {children}
  </div>;
}

function Alert({ message, type = 'error' }) {
  if (!message) return null;
  return <div role="status" className={`mb-4 rounded-xl px-4 py-3 text-sm ${type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{message}</div>;
}

function AuthPage({ mode }) {
  const { login, register, user } = useAuth();
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
      navigate('/dashboard');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl bg-white shadow-card md:grid-cols-2">
    <div className="hidden bg-ink p-10 text-white md:flex md:flex-col md:justify-between">
      <span className="text-sm font-bold text-indigo-200">CAMPUSHUB / YOUR CAMPUS, CONNECTED</span>
      <div><p className="mb-4 text-4xl font-extrabold leading-tight">Find your people.<br />Make campus count.</p><p className="text-sm leading-6 text-slate-300">A single place for university clubs, events, tickets and the teams bringing them to life.</p></div>
      <p className="text-xs text-slate-400">Discover · Participate · Lead</p>
    </div>
    <form onSubmit={submit} className="p-7 sm:p-10">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">{mode === 'login' ? 'Welcome back' : 'Get started'}</p>
      <h1 className="mb-6 text-2xl font-extrabold text-ink">{mode === 'login' ? 'Sign in to CampusHub' : 'Create your student account'}</h1>
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
  return <article className="card flex flex-col justify-between gap-5">
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">{event.club?.name || 'Campus event'}</span>
        <span className="text-xs font-semibold text-slate-400">{start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
      <h3 className="text-lg font-bold text-ink">{event.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{event.description || 'Join fellow students for this campus event.'}</p>
    </div>
    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
      <span className="text-xs font-medium text-slate-500">{start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {event.venue || 'Venue TBA'}</span>
      {onRegister && <button className="btn-primary !px-3 !py-2" onClick={() => onRegister(event.id)} disabled={busy}>Get ticket</button>}
    </div>
  </article>;
}

function EventFeed({ calendar = false }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => { api('/events').then(setEvents).catch((err) => setError(err.message)); }, []);
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
    <PageTitle eyebrow={calendar ? 'Plan ahead' : 'What’s happening'} title={calendar ? 'Campus calendar' : 'Discover events'} description={calendar ? 'A live calendar of approved university events.' : 'Explore what’s happening across campus and reserve your place.'}>
      <span className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 shadow-card">{events.length} upcoming</span>
    </PageTitle>
    <Alert message={error} />
    {ticket && <div className="card mb-6 flex flex-wrap items-center gap-5 border-emerald-200">
      <img alt="Your event ticket QR code" className="h-28 w-28 rounded-lg border p-1" src={ticket.qrCode} />
      <div><p className="font-bold text-emerald-800">You’re registered!</p><p className="mt-1 text-sm text-muted">Save your QR ticket and present it at the entrance.</p><code className="mt-2 block text-xs text-slate-500">{ticket.code}</code></div>
    </div>}
    {calendar ? Object.entries(grouped || {}).map(([month, items]) => <section key={month} className="mb-8">
      <h2 className="mb-4 text-lg font-bold text-ink">{month}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((event) => <EventCard key={event.id} event={event} onRegister={user?.role === 'STUDENT' ? register : null} busy={busy === event.id} />)}</div>
    </section>) : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} onRegister={user?.role === 'STUDENT' ? register : null} busy={busy === event.id} />)}</div>}
    {events.length === 0 && !error && <div className="card text-center text-sm text-muted">No approved events are listed yet. Check back soon.</div>}
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
  return <section className="card mt-6"><h2 className="mb-4 font-bold text-ink">My event tickets & certificates</h2><Alert message={error} /><div className="space-y-3">{tickets.map((ticket) => <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"><div><p className="font-semibold">{ticket.event.title}</p><p className="mt-1 text-xs text-muted">{new Date(ticket.event.startDate).toLocaleDateString()} · {ticket.scannedAt ? 'Attendance verified' : 'Ticket registered'}</p></div>{ticket.scannedAt && <div>{certificates[ticket.eventId]?.downloadUrl ? <button className="btn-primary !px-3 !py-2" onClick={() => download(certificates[ticket.eventId].downloadUrl)}>Download certificate</button> : <button className="btn-secondary !px-3 !py-2" onClick={() => getCertificate(ticket.eventId)}>Get certificate</button>}</div>}</div>)}{tickets.length === 0 && <p className="text-sm text-muted">Your event registrations will appear here.</p>}</div></section>;
}

function ResourceBookingPanel() {
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  useEffect(() => { api('/resources').then(setResources).catch((err) => setMessage(err.message)); }, []);
  async function showBookings(event) {
    const resourceId = event.target.value;
    if (!resourceId) { setBookings([]); return; }
    try { setBookings(await api(`/resources/${resourceId}/bookings`)); }
    catch (err) { setMessage(err.message); }
  }
  async function book(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      await api(`/resources/${values.resourceId}/book`, { method: 'POST', body: { start: new Date(values.start).toISOString(), end: new Date(values.end).toISOString() } });
      setBookings(await api(`/resources/${values.resourceId}/bookings`));
      setMessage('Resource booked successfully.');
      form.reset();
    } catch (err) { setMessage(err.message); }
  }
  return <section className="card mt-6"><h2 className="mb-4 font-bold text-ink">Shared resource booking</h2><Alert message={message} type={message.startsWith('Resource booked') ? 'success' : 'error'} /><form onSubmit={book} className="grid gap-3 md:grid-cols-2"><select className="field md:col-span-2" name="resourceId" defaultValue="" onChange={showBookings} required><option value="" disabled>Select a hall or equipment</option>{resources.filter((resource) => resource.isAvailable).map((resource) => <option value={resource.id} key={resource.id}>{resource.name} · {resource.type}</option>)}</select><label className="label">Starts<input className="field mt-1" name="start" type="datetime-local" required /></label><label className="label">Ends<input className="field mt-1" name="end" type="datetime-local" required /></label><button className="btn-primary md:col-span-2" disabled={!resources.length}>Book resource</button></form>{bookings.length > 0 && <div className="mt-4 border-t border-slate-100 pt-4"><p className="mb-2 text-sm font-bold">Upcoming reservations</p>{bookings.map((booking) => <p className="py-1 text-xs text-muted" key={booking.id}>{new Date(booking.start).toLocaleString()} – {new Date(booking.end).toLocaleTimeString()} {booking.event?.title ? `· ${booking.event.title}` : ''}</p>)}</div>}{resources.length === 0 && !message && <p className="mt-3 text-xs text-muted">No shared resources have been added yet.</p>}</section>;
}

function EventDraftForm({ clubs, onCreated }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form));
    setLoading(true); setError('');
    try {
      await api('/events', { method: 'POST', body: { ...raw, clubId: Number(raw.clubId), startDate: new Date(raw.startDate).toISOString(), endDate: new Date(raw.endDate).toISOString() } });
      form.reset();
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <form className="card" onSubmit={submit}>
    <h2 className="mb-4 font-bold text-ink">Create an event draft</h2><Alert message={error} />
    <label className="label">Event title<input name="title" className="field mt-1" required /></label>
    <label className="label mt-3">Club<select name="clubId" className="field mt-1" required defaultValue=""><option value="" disabled>Select a club</option>{clubs.map((club) => <option value={club.id} key={club.id}>{club.name}</option>)}</select></label>
    <label className="label mt-3">Description<textarea name="description" rows="3" className="field mt-1" /></label>
    <label className="label mt-3">Venue<input name="venue" className="field mt-1" /></label>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="label">Starts<input name="startDate" type="datetime-local" className="field mt-1" required /></label>
      <label className="label">Ends<input name="endDate" type="datetime-local" className="field mt-1" required /></label>
    </div>
    <button className="btn-primary mt-4" disabled={loading || !clubs.length}>{loading ? 'Saving…' : 'Save draft'}</button>
    {!clubs.length && <p className="mt-3 text-xs text-amber-700">Your account must be added to a club before you can create its events.</p>}
  </form>;
}

function BudgetProposalForm({ clubs, onCreated }) {
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const items = values.getAll('itemDescription').map((description, index) => ({
      description: String(description).trim(),
      amount: Number(values.getAll('itemAmount')[index]),
    })).filter((item) => item.description && item.amount > 0);
    const amount = items.reduce((sum, item) => sum + item.amount, 0);
    if (!items.length) { setError('Add at least one item with a positive amount.'); return; }
    setError('');
    try {
      await api('/budgets', { method: 'POST', body: { clubId: Number(values.get('clubId')), title: values.get('title'), description: values.get('description'), amount, items } });
      form.reset();
      onCreated();
    } catch (err) { setError(err.message); }
  }
  return <form className="card" onSubmit={submit}>
    <h2 className="mb-4 font-bold text-ink">Budget proposal</h2><Alert message={error} />
    <label className="label">Club<select className="field mt-1" name="clubId" defaultValue="" required><option value="" disabled>Select a club</option>{clubs.map((club) => <option value={club.id} key={club.id}>{club.name}</option>)}</select></label>
    <label className="label mt-3">Proposal title<input className="field mt-1" name="title" required /></label>
    <label className="label mt-3">Purpose<textarea className="field mt-1" name="description" rows="2" /></label>
    <div className="mt-4 space-y-3"><p className="text-sm font-semibold">Itemized costs</p>{[0, 1, 2].map((index) => <div key={index} className="grid grid-cols-[1fr_8rem] gap-2"><input className="field" name="itemDescription" placeholder={`Item ${index + 1}`} /><input className="field" name="itemAmount" type="number" step="0.01" min="0" placeholder="Amount" /></div>)}</div>
    <button className="btn-primary mt-4" disabled={!clubs.length}>Submit proposal</button>
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
    <div className="mt-5 space-y-3">{invitations.map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><p className="text-sm"><strong>{invitation.event.title}</strong> · {invitation.status}</p>{invitation.status === 'PENDING' && <div className="flex gap-2"><button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" onClick={() => respond(invitation.id, 'DECLINED')}>Decline</button><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" onClick={() => respond(invitation.id, 'ACCEPTED')}>Accept</button></div>}</div>)}</div>
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
  return <section className="card mt-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-ink">Recruitment applications</h2><select className="field max-w-xs" value={clubId} onChange={(event) => setClubId(event.target.value)}><option value="">Select a club</option>{clubs.map((club) => <option value={club.id} key={club.id}>{club.name}</option>)}</select></div><Alert message={error} /><div className="space-y-3">{applications.map((application) => <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"><div><p className="font-semibold">{application.name}</p><p className="text-sm text-muted">{application.email} · {application.status}</p><p className="mt-1 text-xs text-slate-500">{application.message}</p></div>{application.status === 'PENDING' && <div className="flex gap-2"><button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" onClick={() => review(application.id, 'REJECTED')}>Decline</button><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" onClick={() => review(application.id, 'APPROVED')}>Approve</button></div>}</div>)}{applications.length === 0 && <p className="text-sm text-muted">No membership applications yet.</p>}</div></section>;
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
  return <><PageTitle eyebrow="Club workspace" title="Build campus moments" description="Draft event proposals, submit them for advisor review, and manage your club’s event pipeline."><button onClick={onCheckIn} className="btn-secondary">Open check-in</button></PageTitle>
    <Alert message={error} />
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <div className="space-y-6"><EventDraftForm clubs={clubs} onCreated={load} /><BudgetProposalForm clubs={clubs} onCreated={load} /></div>
      <section className="card"><h2 className="mb-4 font-bold text-ink">Your event pipeline</h2>
        <div className="space-y-3">{events.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
          <div><p className="font-semibold text-ink">{event.title}</p><p className="mt-1 text-xs text-muted">{event.club.name} · {new Date(event.startDate).toLocaleDateString()}</p></div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{event.isDraft ? 'DRAFT' : event.status}</span>{event.isDraft && <button className="btn-primary !px-3 !py-2" disabled={loadingId === event.id} onClick={() => submitDraft(event.id)}>Submit</button>}</div>
        </div>)}{events.length === 0 && <p className="py-8 text-center text-sm text-muted">Your drafts and submissions will appear here.</p>}</div>
      </section>
    </div>
    <section className="card mt-6"><h2 className="mb-4 font-bold text-ink">Club budget ledger</h2><div className="space-y-3">{proposals.map((proposal) => <div key={proposal.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{proposal.title}</p><p className="mt-1 text-xs text-muted">{proposal.items.map((item) => `${item.description}: $${Number(item.amount).toFixed(2)}`).join(' · ')}</p>{proposal.receipts.map((receipt) => <a className="mr-3 mt-2 inline-block text-xs font-semibold text-brand" href={receipt.receiptUrl} target="_blank" rel="noreferrer" key={receipt.id}>Receipt ${Number(receipt.amount).toFixed(2)} ↗</a>)}</div><div className="text-right"><p className="font-bold">${Number(proposal.amount).toFixed(2)}</p><p className="text-xs font-semibold text-slate-500">{proposal.status}</p></div></div>{proposal.status === 'APPROVED' && <ReceiptForm proposal={proposal} onSaved={load} />}</div>)}{proposals.length === 0 && <p className="text-sm text-muted">Budget proposals and approvals will appear here.</p>}</div></section>
    <CoHostPanel events={events} />
    <ApplicationsPanel clubs={clubs} />
    <ResourceBookingPanel />
  </>;
}

function AdvisorWorkspace() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [error, setError] = useState('');
  async function load() {
    try {
      const [pendingEvents, clubs] = await Promise.all([api('/advisor/events'), api('/clubs/mine')]);
      setEvents(pendingEvents);
      const proposalLists = await Promise.all(clubs.filter((club) => user.role === 'ADMIN' || club.advisor?.id === user.id).map((club) => api(`/budgets/clubs/${club.id}`)));
      setBudgets(proposalLists.flat().filter((proposal) => proposal.status === 'PENDING'));
    }
    catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);
  async function review(id, status) {
    const feedback = window.prompt(`Optional feedback for ${status.toLowerCase()}:`) || '';
    try { await api(`/events/${id}/status`, { method: 'PATCH', body: { status, feedback } }); await load(); }
    catch (err) { setError(err.message); }
  }
  async function reviewBudget(id, decision) {
    const notes = window.prompt(`Optional note for ${decision.toLowerCase()}:`) || '';
    try { await api(`/advisor/budgets/${id}`, { method: 'PATCH', body: { decision, notes } }); await load(); }
    catch (err) { setError(err.message); }
  }
  return <><PageTitle eyebrow="Faculty advisor" title="Approval cockpit" description="Review submitted event plans, venue conflicts and budget proposals for your assigned clubs." /><Alert message={error} />
    <section className="card"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-ink">Events awaiting review</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{events.length} pending</span></div>
      <div className="space-y-3">{events.map((event) => <article key={event.id} className="rounded-xl border border-slate-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-ink">{event.title}</p><p className="mt-1 text-sm text-muted">{event.club.name} · {event.venue || 'Venue TBA'} · {new Date(event.startDate).toLocaleString()}</p><p className="mt-2 text-sm text-slate-600">{event.description}</p></div>
          <div className="flex gap-2"><button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" onClick={() => review(event.id, 'REJECTED')}>Reject</button><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" onClick={() => review(event.id, 'APPROVED')}>Approve</button></div>
        </div></article>)}{events.length === 0 && <p className="py-8 text-center text-sm text-muted">Nothing is waiting for your review.</p>}</div>
    </section>
    <section className="card mt-6"><h2 className="mb-4 font-bold text-ink">Budget proposals awaiting review</h2><div className="space-y-3">{budgets.map((proposal) => <article key={proposal.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 p-4"><div><p className="font-bold">{proposal.title} · ${Number(proposal.amount).toFixed(2)}</p><p className="mt-1 text-sm text-muted">{proposal.items.map((item) => `${item.description} ($${Number(item.amount).toFixed(2)})`).join(' · ')}</p></div><div className="flex gap-2"><button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" onClick={() => reviewBudget(proposal.id, 'REJECTED')}>Reject</button><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" onClick={() => reviewBudget(proposal.id, 'APPROVED')}>Approve</button></div></article>)}{budgets.length === 0 && <p className="text-sm text-muted">No budget proposals are waiting for review.</p>}</div></section>
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
      {[['Accounts', users.length], ['Clubs', clubs.length], ['Resources', resources.length]].map(([label, count]) => <div className="card !p-4" key={label}><p className="text-sm text-muted">{label}</p><p className="mt-1 text-2xl font-extrabold">{count}</p></div>)}
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
          {users.length === 0 && <p className="text-sm text-muted">No accounts found.</p>}
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
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'CLUB_EXECUTIVE') return <ExecutiveWorkspace onCheckIn={() => navigate('/check-in')} />;
  if (user.role === 'FACULTY_ADVISOR') return <AdvisorWorkspace />;
  if (user.role === 'ADMIN') return <AdminWorkspace />;
  return <><PageTitle eyebrow="Student home" title={`Good to see you, ${user.name.split(' ')[0]}`} description="Find a campus event, save your place, and stay in the loop." /><EventFeed /><StudentTickets /><ResourceBookingPanel /></>;
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
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{clubs.map((club) => <article className="card" key={club.id}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-lg font-black text-brand">{club.name.slice(0, 1)}</div><h2 className="text-lg font-bold">{club.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-muted">{club.description || 'A community for students to learn, connect and create.'}</p>
      <p className="mt-3 text-xs text-slate-500">{club._count.members} members · {club._count.events} events</p>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => showTeam(club.id)} className="btn-secondary !px-3 !py-2">Meet the team</button><button onClick={() => { setSelected(club.id); api(`/recruitment/clubs/${club.id}/executives`).then(setExecutives).catch((err) => setMessage(err.message)); }} className="btn-primary !px-3 !py-2">Apply to join</button></div>
      {selected === club.id && <><div className="mt-4 border-t border-slate-100 pt-4"><p className="mb-2 text-sm font-bold">Executive directory</p><p className="text-sm text-muted">{executives.lead?.name} · Club lead</p>{executives.members?.map((member) => <p key={member.user.id} className="mt-1 text-sm text-muted">{member.user.name} · {member.title}</p>)}</div><form onSubmit={(event) => apply(event, club.id)} className="mt-4 space-y-3 border-t border-slate-100 pt-4"><p className="text-sm font-bold">Membership application</p><input className="field" name="name" placeholder="Your name" required /><input className="field" name="email" type="email" placeholder="University email" required /><input className="field" name="studentId" placeholder="Student ID (optional)" /><textarea className="field" name="message" rows="2" placeholder="Tell us why you’re interested" /><button className="btn-primary w-full">Send application</button></form></>}
    </article>)}</div>
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

export default function App() {
  const { user } = useAuth();
  return <div className="min-h-screen bg-canvas">
    <Navbar />
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={<EventFeed />} />
          <Route path="/calendar" element={<EventFeed calendar />} />
          <Route path="/clubs" element={<ClubDirectory />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/check-in" element={<CheckInPage />} />
          <Route path="/verify-certificate" element={<CertificateVerification />} />
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
        </Routes>
      </main>
    </div>
  </div>;
}
