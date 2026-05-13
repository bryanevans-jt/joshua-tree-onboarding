'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Team {
  id: string;
  slug: string;
  label: string;
  active?: boolean;
}

interface RosterRow {
  email: string;
  teamIds: string[];
  supervisorEmail: string;
  displayName?: string | null;
}

export default function TrainingRosterPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [supervisors, setSupervisors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSup, setNewSup] = useState('');
  const [rowEmail, setRowEmail] = useState('');
  const [rowTeamIds, setRowTeamIds] = useState<string[]>([]);
  const [rowSup, setRowSup] = useState('');
  const [rowName, setRowName] = useState('');
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

  const activeTeams = teams.filter((t) => t.active !== false);

  function teamLabel(id: string) {
    return teams.find((t) => t.id === id)?.label ?? id;
  }

  function toggleTeam(teamId: string) {
    setRowTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((x) => x !== teamId) : [...prev, teamId]
    );
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [t, r, s] = await Promise.all([
        fetch('/api/admin/training/teams').then((x) => x.json()),
        fetch('/api/admin/training/roster').then((x) => x.json()),
        fetch('/api/admin/training/supervisors').then((x) => x.json()),
      ]);
      const list: Team[] = t.teams ?? [];
      setTeams(list);
      setRoster(r.roster ?? []);
      setSupervisors(s.emails ?? []);
      const act = list.filter((x) => x.active !== false);
      setRowTeamIds((cur) => {
        if (cur.length) return cur;
        return act[0]?.id ? [act[0].id] : [];
      });
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setEditingEmail(null);
    setRowEmail('');
    setRowSup('');
    setRowName('');
    const act = teams.filter((t) => t.active !== false);
    setRowTeamIds(act[0]?.id ? [act[0].id] : []);
  }

  return (
    <div className="training-admin-page space-y-6">
      <div className="training-admin-hero rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50 via-white to-amber-50/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">People & access</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Roster & supervisors</h1>
            <p className="mt-2 max-w-xl text-sm text-gray-600">
              <strong>Step 1:</strong> Tag supervisor emails (anyone who may appear as a supervisor on the roster).{' '}
              <strong>Step 2:</strong> Add each employee, choose one or more teams (e.g. Georgia and/or Tennessee
              Vocational), and pick their supervisor from the tagged list.
            </p>
            <p className="mt-3 max-w-xl text-xs text-indigo-900/90">
              Tagged supervisors can open their own <strong>Supervisor portal</strong> at{' '}
              <span className="font-mono">/supervisor</span> to see training progress for people who list them as
              supervisor — and use <strong>Training Center</strong> for their own modules.
            </p>
          </div>
          <Link href="/admin/training" className="btn-secondary text-sm shrink-0">
            ← Training hub
          </Link>
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-800">{error}</div>
      )}
      {loading && <div className="card text-sm text-gray-500">Loading…</div>}

      {!loading && (
        <>
          <div className="card max-w-2xl border-teal-100 shadow-md">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Tagged supervisor emails</h2>
            <p className="mb-3 text-xs text-gray-600">
              Only these addresses can be chosen as a supervisor when editing the roster.
            </p>
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
                Tag supervisor
              </button>
            </div>
            <ul className="space-y-1 text-xs">
              {supervisors.map((e) => (
                <li
                  key={e}
                  className="flex justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2"
                >
                  <span className="font-mono text-gray-800">{e}</span>
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700"
                    onClick={async () => {
                      await fetch(
                        `/api/admin/training/supervisors?email=${encodeURIComponent(e)}`,
                        { method: 'DELETE' }
                      );
                      void load();
                    }}
                  >
                    Remove tag
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card max-w-2xl border-amber-100 shadow-md">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingEmail ? 'Edit roster entry' : 'Add someone to the roster'}
              </h2>
              {editingEmail && (
                <button type="button" className="text-xs text-teal-600 hover:text-teal-700" onClick={resetForm}>
                  Cancel edit — add new instead
                </button>
              )}
            </div>
            <p className="mb-3 text-xs text-gray-600">
              {editingEmail
                ? 'Update teams (checkboxes), supervisor, or display name. Email cannot be changed here; remove the row and add a new one if the address was wrong.'
                : 'Use a work @thejoshuatree.org address. Check every team this person belongs to — vocational staff can be Georgia only, Tennessee only, or both.'}
            </p>
            <div className="grid gap-3 text-sm">
              <input
                className={`input-field${editingEmail ? ' cursor-not-allowed bg-gray-50' : ''}`}
                placeholder="Employee email (@thejoshuatree.org)"
                value={rowEmail}
                readOnly={!!editingEmail}
                title={editingEmail ? 'Email cannot be changed here' : undefined}
                onChange={(e) => setRowEmail(e.target.value)}
              />
              <div>
                <p className="mb-2 text-xs font-medium text-gray-700">Teams (select one or more)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeTeams.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm hover:border-teal-300"
                    >
                      <input
                        type="checkbox"
                        checked={rowTeamIds.includes(t.id)}
                        onChange={() => toggleTeam(t.id)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
                {activeTeams.length === 0 && (
                  <p className="text-xs text-amber-700">No active teams — add teams under Training → Teams.</p>
                )}
              </div>
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
                  if (!rowTeamIds.length) {
                    setError('Select at least one team.');
                    return;
                  }
                  const res = await fetch('/api/admin/training/roster', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: rowEmail.trim(),
                      teamIds: rowTeamIds,
                      supervisorEmail: rowSup.trim(),
                      displayName: rowName.trim() || null,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setError(data.error || 'Failed');
                    return;
                  }
                  resetForm();
                  void load();
                }}
              >
                {editingEmail ? 'Save changes' : 'Add to roster'}
              </button>
            </div>
          </div>

          <div className="card border-slate-200 shadow-md">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Current roster</h2>
            <p className="mb-4 text-xs text-gray-600">Everyone with training access. Use Edit to change teams or supervisor.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2 pr-2">Email</th>
                    <th className="pr-2">Name</th>
                    <th className="pr-2">Teams</th>
                    <th className="pr-2">Supervisor</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((r) => (
                    <tr key={r.email} className="border-b border-gray-100">
                      <td className="py-2 pr-2 font-mono text-gray-900">{r.email}</td>
                      <td className="pr-2 text-gray-700">{r.displayName?.trim() || '—'}</td>
                      <td className="pr-2 text-gray-800">
                        {r.teamIds?.length
                          ? r.teamIds.map((id) => teamLabel(id)).join(', ')
                          : '—'}
                      </td>
                      <td className="pr-2 font-mono text-gray-700">{r.supervisorEmail}</td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="mr-3 text-teal-600 hover:text-teal-700"
                          onClick={() => {
                            setError(null);
                            setEditingEmail(r.email);
                            setRowEmail(r.email);
                            setRowTeamIds(r.teamIds?.length ? [...r.teamIds] : activeTeams[0]?.id ? [activeTeams[0].id] : []);
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
                            if (editingEmail === r.email) resetForm();
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
          </div>
        </>
      )}
    </div>
  );
}
