import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

function localDateTimeMin() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 1);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function displayDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function ResourceManagement() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const minStart = useMemo(localDateTimeMin, []);
  const selectedResource = resources.find((resource) => String(resource.id) === selectedId);

  const load = useCallback(async () => {
    setError('');
    try {
      const [resourceList, myBookings] = await Promise.all([
        api('/resources'),
        user ? api('/resources/bookings/mine') : Promise.resolve([]),
      ]);
      setResources(resourceList);
      setBookings(myBookings);
      setSelectedId((current) => current || String(resourceList[0]?.id || ''));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedId || !user) {
      setAvailability([]);
      return undefined;
    }
    let active = true;
    setScheduleLoading(true);
    api(`/resources/${selectedId}/bookings`)
      .then((result) => { if (active) setAvailability(result); })
      .catch((scheduleError) => { if (active) setError(scheduleError.message); })
      .finally(() => { if (active) setScheduleLoading(false); });
    return () => { active = false; };
  }, [selectedId, user]);

  async function reserve(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/resources/${values.resourceId}/book`, {
        method: 'POST',
        body: { start: new Date(values.start).toISOString(), end: new Date(values.end).toISOString() },
      });
      setSelectedId(values.resourceId);
      setNotice('Your resource reservation is confirmed.');
      form.reset();
      await load();
      setAvailability(await api(`/resources/${values.resourceId}/bookings`));
    } catch (reservationError) {
      setError(reservationError.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(bookingId) {
    setCancelingId(bookingId);
    setError('');
    setNotice('');
    try {
      await api(`/resources/bookings/${bookingId}`, { method: 'DELETE' });
      setNotice('Reservation cancelled.');
      await load();
      if (selectedId) setAvailability(await api(`/resources/${selectedId}/bookings`));
    } catch (cancelError) {
      setError(cancelError.message);
    } finally {
      setCancelingId(null);
    }
  }

  const upcomingBookings = bookings.filter((booking) => new Date(booking.end) > new Date());
  const pastBookings = bookings.filter((booking) => new Date(booking.end) <= new Date());

  return <div className="mx-auto max-w-6xl">
    <header className="relative mb-7 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-6 text-white shadow-card sm:px-8 sm:py-7">
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 opacity-60" /><div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-32 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Campus operations</p><h1 className="text-3xl font-bold tracking-tight text-white sm:text-[2rem]">Resource hub</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Explore shared spaces and equipment, check availability, and manage your reservations.</p></div>
        {!user && <Link to="/login" className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">Sign in to request a resource</Link>}
      </div>
    </header>

    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,.7fr)]">
      <section>
        <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="font-semibold tracking-tight text-zinc-900">Shared inventory</h2><p className="mt-1 text-xs text-zinc-500">{resources.length} resources listed</p></div><Link to="/calendar" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Browse events →</Link></div>
        {loading ? <div role="status" aria-label="Loading resources" className="grid gap-4 md:grid-cols-2">{[0, 1].map((item) => <div key={item} className="card animate-pulse !p-5"><div className="h-11 w-11 rounded-xl bg-slate-100" /><div className="mt-5 h-3 w-20 rounded bg-slate-50" /><div className="mt-2 h-5 w-2/3 rounded bg-slate-100" /><div className="mt-3 h-3 w-full rounded bg-slate-50" /><div className="mt-2 h-3 w-4/5 rounded bg-slate-50" /><div className="mt-5 h-10 rounded-xl bg-slate-100" /></div>)}</div> : resources.length ? <div className="grid gap-4 md:grid-cols-2">
          {resources.map((resource) => {
            const active = selectedId === String(resource.id);
            return <article key={resource.id} className={`card !p-5 transition-all duration-200 hover:-translate-y-0.5 ${active ? 'border-indigo-300 ring-4 ring-indigo-500/5' : ''}`}>
              <div className="mb-4 flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7"><path d="M4 20V8l8-5 8 5v12M8 20v-6h8v6M4 9h16" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${resource.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{resource.isAvailable ? 'Available' : 'Unavailable'}</span></div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">{resource.type}</p><h3 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">{resource.name}</h3><p className="mt-2 min-h-10 text-sm leading-5 text-zinc-600">{resource.description || 'Shared campus resource available to the university community.'}</p>
              <button type="button" disabled={!resource.isAvailable} onClick={() => setSelectedId(String(resource.id))} className="btn-secondary mt-4 w-full !py-2.5 disabled:cursor-not-allowed disabled:opacity-50">{active ? 'Selected for reservation' : 'Check availability & select'}</button>
            </article>;
          })}
        </div> : <div className="card text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-600" aria-hidden="true">▦</span><h2 className="mt-3 font-semibold text-zinc-900">No resources listed yet</h2><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-zinc-500">Campus spaces and equipment will appear here when administrators add them.</p></div>}

        {user && <section className="card mt-6">
          <div className="mb-4"><h2 className="font-semibold tracking-tight text-zinc-900">My reservations</h2><p className="mt-1 text-xs text-zinc-500">Track upcoming bookings and review past reservations.</p></div>
          <div className="space-y-3">{upcomingBookings.map((booking) => <article key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3.5">
            <div><p className="text-sm font-semibold text-zinc-900">{booking.resource.name}{booking.event?.title ? ` · ${booking.event.title}` : ''}</p><p className="mt-1 text-xs text-zinc-500">{displayDate(booking.start)} – {displayDate(booking.end)}</p></div>
            <button type="button" onClick={() => cancel(booking.id)} disabled={cancelingId === booking.id} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">{cancelingId === booking.id ? 'Cancelling…' : 'Cancel'}</button>
          </article>)}
            {!upcomingBookings.length && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-500 shadow-sm" aria-hidden="true">◷</span><p className="mt-2 text-sm font-semibold text-zinc-700">No upcoming reservations</p><p className="mt-1 text-xs text-zinc-500">Choose a resource and reserve a time to see it here.</p></div>}
          </div>
          {pastBookings.length > 0 && <details className="mt-4 border-t border-zinc-100 pt-4"><summary className="cursor-pointer text-xs font-semibold text-zinc-600">Past reservations ({pastBookings.length})</summary><div className="mt-3 space-y-2">{pastBookings.map((booking) => <p key={booking.id} className="flex flex-wrap justify-between gap-2 text-xs text-zinc-500"><span>{booking.resource.name}</span><span>{displayDate(booking.start)}</span></p>)}</div></details>}
        </section>}
      </section>

      <aside className="space-y-4">
        <form onSubmit={reserve} className="card">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Reserve a time</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Request a resource</h2><p className="mb-4 mt-1 text-xs leading-5 text-zinc-500">Reservations are confirmed immediately when the requested time is available.</p>
          {user ? <>
            <label className="label">Resource<select className="field mt-1" name="resourceId" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} required><option value="" disabled>Select a resource</option>{resources.filter((resource) => resource.isAvailable).map((resource) => <option value={resource.id} key={resource.id}>{resource.name} · {resource.type}</option>)}</select></label>
            <label className="label mt-3">Starts<input className="field mt-1" name="start" type="datetime-local" min={minStart} required /></label>
            <label className="label mt-3">Ends<input className="field mt-1" name="end" type="datetime-local" min={minStart} required /></label>
            <button className="btn-primary mt-4 w-full" disabled={busy || !resources.some((resource) => resource.isAvailable)}>{busy ? 'Checking availability…' : 'Request reservation'}</button>
          </> : <Link to="/login" className="btn-primary mt-3 w-full">Sign in to reserve</Link>}
        </form>

        {user && selectedResource && <section className="card !p-5">
          <div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Availability</p><h2 className="mt-1 font-semibold text-zinc-900">{selectedResource.name}</h2></div><span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-600">{scheduleLoading ? 'Checking…' : `${availability.length} upcoming`}</span></div>
          {scheduleLoading ? <p className="text-sm text-zinc-500">Loading the schedule…</p> : availability.length ? <div className="space-y-2">{availability.map((slot) => <div key={slot.id} className="rounded-xl bg-zinc-50 p-3"><p className="text-xs font-semibold text-zinc-800">{displayDate(slot.start)}</p><p className="mt-1 text-xs text-zinc-500">Ends {displayDate(slot.end)}{slot.event?.title ? ` · ${slot.event.title}` : ''}</p></div>)}</div> : <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">No upcoming reservations listed. Your selected time is still checked securely when submitted.</p>}
        </section>}
      </aside>
    </div>
  </div>;
}
