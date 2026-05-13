'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Team {
  id: string;
  slug: string;
  label: string;
}

export default function TrainingRosterPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [roster, setRoster] = useState<
    Array<{ email: string; teamId: string; supervisorEmail: string; displayName?: string | null }>
  >([]);
  const [supervisors, setSupervisors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSup, setNewSup] = useState('');
  const [rowEmail, setRowEmail] = useState('');
  const [rowTeam, setRowTeam] = useState('');
  const [rowSup, setRowSup] = useState('');
  const [rowName, setRowName] = useState('');
  /** When set, the form is editing this person (email field stays fixed). */
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [t, r, s] = await Promise.all([
        fetch('/api/admin/training/teams').then((x) => x.json()),
        fetch('/api/admin/training/roster').then((x) => x.json()),
        fetch('/api/admin/training/supervisors').then((x) => x.json()),
      ]);
      setTeams(t.teams ?? []);
      setRoster(r.roster ?? []);
      setSupervisors(s.emails ?? []);
      if (!rowTeam && (t.teams?.[0]?.id ?? '')) setRowTeam(t.teams[0].id);
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Training roster & supervisors</h1>
          <p className="text-sm text-gray-600">
            Tag supervisor emails first, then assign each employee to a team and supervisor.
          </p>
        </div>
        <Link href="/admin/training" className="text-sm text-teal-600 hover:text-teal-700">
          ← Modules
        </Link>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-800">{error}</div>
      )}
      {loading && <div className="card text-sm text-gray-500">Loading…</div>}

      {!loading && (
        <>
          <div className="card max-w-xl">
            <h2 className="mb-2 text-sm font-semibold">Supervisor emails (tagged)</h2>
            <div className="mb-3 flex gap-2">
              <input
                className="input-field flex-1"
                type="email"
                placeholder="supervisor@thejoshuatree.org"
                value={newSup}
                onChange={(e) => setNewSup(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary whitespace-nowrap"
                onClick={async () => {
                  const res = await fetch('/api/admin/training/supervisors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: newSup }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setError(data.error || 'Failed');
                    return;
                  }
                  setNewSup('');
                  void load();
                }}
              >
                Add
              </button>
            </div>
            <ul className="space-y-1 text-xs">
              {supervisors.map((e) => (
                <li key={e} className="flex justify-between rounded border border-gray-100 px-2 py-1">
                  <span>{e}</span>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={async () => {
                      await fetch(
                        `/api/admin/training/supervisors?email=${encodeURIComponent(e)}`,
                        { method: 'DELETE' }
                      );
                      void load();
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card max-w-xl">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                {editingEmail ? 'Edit roster entry' : 'Add someone to the roster'}
              </h2>
              {editingEmail && (
                <button
                  type="button"
                  className="text-xs text-teal-600 hover:text-teal-700"
                  onClick={() => {
                    setEditingEmail(null);
                    setRowEmail('');
                    setRowSup('');
                    setRowName('');
                    if (teams[0]?.id) setRowTeam(teams[0].id);
                  }}
                >
                  Cancel edit — add new instead
                </button>
              )}
            </div>
            <p className="mb-3 text-xs text-gray-600">
              {editingEmail
                ? 'Change team, supervisor, or display name, then save. To use a different email, remove this row and add a new one.'
                : 'Saving with an email that is already on the roster updates that row (same as Edit). New emails are added.'}
            </p>
            <div className="grid gap-2 text-sm">
              <input
                className={`input-field${editingEmail ? ' cursor-not-allowed bg-gray-50' : ''}`}
                placeholder="Employee email (@thejoshuatree.org)"
                value={rowEmail}
                readOnly={!!editingEmail}
                title={editingEmail ? 'Email cannot be changed here' : undefined}
                onChange={(e) => setRowEmail(e.target.value)}
              />
              <select
                className="input-field"
                value={rowTeam}
                onChange={(e) => setRowTeam(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                className="input-field"
                placeholder="Supervisor email (must be tagged above)"
                value={rowSup}
                onChange={(e) => setRowSup(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Display name (optional)"
                value={rowName}
                onChange={(e) => setRowName(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  const res = await fetch('/api/admin/training/roster', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: rowEmail.trim(),
                      teamId: rowTeam,
                      supervisorEmail: rowSup.trim(),
                      displayName: rowName.trim() || null,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setError(data.error || 'Failed');
                    return;
                  }
                  setEditingEmail(null);
                  setRowEmail('');
                  setRowSup('');
                  setRowName('');
                  if (teams[0]?.id) setRowTeam(teams[0].id);
                  void load();
                }}
              >
                {editingEmail ? 'Save changes' : 'Add to roster'}
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-2 text-sm font-semibold">Current roster</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2">Email</th>
                  <th>Name</th>
                  <th>Team</th>
                  <th>Supervisor</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.email} className="border-b border-gray-100">
                    <td className="py-1.5">{r.email}</td>
                    <td className="text-gray-700">{r.displayName?.trim() || '—'}</td>
                    <td>{teams.find((t) => t.id === r.teamId)?.label ?? r.teamId}</td>
                    <td>{r.supervisorEmail}</td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="mr-3 text-teal-600 hover:text-teal-700"
                        onClick={() => {
                          setError(null);
                          setEditingEmail(r.email);
                          setRowEmail(r.email);
                          setRowTeam(r.teamId);
                          setRowSup(r.supervisorEmail);
                          setRowName(r.displayName?.trim() ?? '');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-700"
                        onClick={async () => {
                          if (editingEmail === r.email) {
                            setEditingEmail(null);
                            setRowEmail('');
                            setRowSup('');
                            setRowName('');
                            if (teams[0]?.id) setRowTeam(teams[0].id);
                          }
                          await fetch(
                            `/api/admin/training/roster?email=${encodeURIComponent(r.email)}`,
                            { method: 'DELETE' }
                          );
                          void load();
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
