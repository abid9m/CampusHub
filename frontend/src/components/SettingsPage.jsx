import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function roleLabel(role) {
  return role?.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Member';
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function save(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword && newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setBusy(true);
    try {
      await updateProfile({ name, email, currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('Your account settings have been saved.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="mx-auto max-w-4xl">
    <header className="relative mb-7 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-6 text-white shadow-card sm:px-8 sm:py-7">
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-32 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative z-10"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Your account</p><h1 className="text-3xl font-bold tracking-tight text-white sm:text-[2rem]">Profile & settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Update your account information and keep your sign-in details secure.</p></div>
    </header>

    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <form onSubmit={save} className="card">
        <div className="mb-5 border-b border-slate-100 pb-4"><h2 className="font-semibold tracking-tight text-zinc-900">Personal information</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Confirm your current password before saving account changes.</p></div>
        <label className="label">Full name<input className="field mt-1" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
        <label className="label mt-4">Email address<input className="field mt-1" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <div className="my-6 border-t border-slate-100" />
        <div className="mb-4"><h2 className="font-semibold tracking-tight text-zinc-900">Change password <span className="font-normal text-zinc-400">(optional)</span></h2><p className="mt-1 text-xs leading-5 text-zinc-500">Use at least 10 characters. Leave these fields empty to keep your current password.</p></div>
        <label className="label">New password<input className="field mt-1" name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <label className="label mt-4">Confirm new password<input className="field mt-1" name="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
        <label className="label mt-4">Current password<input className="field mt-1" name="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
        <button className="btn-primary mt-6 w-full sm:w-auto" disabled={busy}>{busy ? 'Saving settings…' : 'Save changes'}</button>
      </form>

      <aside className="card !p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Account overview</p>
        <div className="mt-4 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-lg font-bold text-indigo-700">{user.name?.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-900">{user.name}</p><p className="truncate text-xs text-zinc-500">{user.email}</p></div></div>
        <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4"><div><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Role</dt><dd className="mt-1 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{roleLabel(user.role)}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Account ID</dt><dd className="mt-1 text-sm font-medium text-zinc-700">#{user.id}</dd></div></dl>
        <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Your role is managed by a campus administrator. Contact them if your workspace access needs to change.</p>
      </aside>
    </div>
  </div>;
}
