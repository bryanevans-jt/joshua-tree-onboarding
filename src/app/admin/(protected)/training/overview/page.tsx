'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Person {
  email: string;
  displayName: string | null;
  supervisorEmail: string;
  teamLabels: string[];
  companyDone: number;
  companyTotal: number;
  teamDone: number;
  teamTotal: number;
  overallPercent: number;
  badge: string;
}

interface SupGroup {
  supervisorEmail: string;
  members: Person[];
}

function ProgressBar({ pct }: { pct: number }) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

function PersonCard({ p }: { p: Person }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-medium text-gray-900">{p.email}</p>
          {p.displayName && <p className="text-xs text-gray-600">{p.displayName}</p>}
          <p className="mt-1 text-xs text-gray-500">
            Teams: {p.teamLabels.length ? p.teamLabels.join(', ') : '—'}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
          {p.badge}
        </span>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>
            Company-wide: {p.companyDone}/{p.companyTotal || '—'}
          </span>
          <span>
            Team modules: {p.teamDone}/{p.teamTotal || '—'}
          </span>
        </div>
        <ProgressBar pct={p.overallPercent} />
        <p className="text-right text-xs font-semibold text-teal-800">{p.overallPercent}% overall</p>
      </div>
    </div>
  );
}

export default function TrainingOverviewPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [bySupervisor, setBySupervisor] = useState<SupGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/training/overview');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        if (!cancelled) {
          setPeople(data.people ?? []);
          setBySupervisor(data.bySupervisor ?? []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="training-admin-page space-y-8">
      <div className="training-admin-hero rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-white to-teal-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Mission control</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Team progress</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Every rostered learner appears below. The supervisor view groups people by their assigned supervisor so
              you can coach in clusters. Percentages count all assigned company-wide sections plus team-only modules
              for the teams on each person&apos;s roster.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            {!loading && !error && people.length > 0 && (
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => {
                  function escapeCsvCell(value: string) {
                    return `"${String(value).replace(/"/g, '""')}"`;
                  }
                  const header = [
                    'email',
                    'displayName',
                    'supervisorEmail',
                    'teams',
                    'companyDone',
                    'companyTotal',
                    'teamDone',
                    'teamTotal',
                    'overallPercent',
                    'badge',
                  ];
                  const lines = [header.join(',')];
                  for (const p of people) {
                    lines.push(
                      [
                        escapeCsvCell(p.email),
                        escapeCsvCell(p.displayName || ''),
                        escapeCsvCell(p.supervisorEmail),
                        escapeCsvCell(p.teamLabels.join('; ')),
                        escapeCsvCell(String(p.companyDone)),
                        escapeCsvCell(String(p.companyTotal)),
                        escapeCsvCell(String(p.teamDone)),
                        escapeCsvCell(String(p.teamTotal)),
                        escapeCsvCell(String(p.overallPercent)),
                        escapeCsvCell(p.badge),
                      ].join(',')
                    );
                  }
                  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `training-team-progress-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download CSV
              </button>
            )}
            <Link href="/admin/training" className="btn-secondary text-sm shrink-0">
              ← Training hub
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-800">{error}</div>
      )}
      {loading && <div className="card text-sm text-gray-500">Crunching numbers…</div>}

      {!loading && !error && (
        <>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">By supervisor</h2>
            <div className="space-y-6">
              {bySupervisor.map((g) => (
                <div
                  key={g.supervisorEmail}
                  className="rounded-2xl border border-gray-200 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Supervisor</p>
                      <p className="font-mono text-sm font-semibold text-gray-900">{g.supervisorEmail}</p>
                    </div>
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-900">
                      {g.members.length} team member{g.members.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {g.members.map((p) => (
                      <PersonCard key={p.email} p={p} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">All learners (A–Z)</h2>
            <div className="card overflow-x-auto border-slate-200 shadow-md">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500">
                    <th className="py-2 pr-2">Email</th>
                    <th className="pr-2">Name</th>
                    <th className="pr-2">Supervisor</th>
                    <th className="pr-2">Teams</th>
                    <th className="pr-2">Company</th>
                    <th className="pr-2">Team mods</th>
                    <th className="text-right">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.email} className="border-b border-gray-50">
                      <td className="py-2 pr-2 font-mono text-xs">{p.email}</td>
                      <td className="pr-2 text-gray-700">{p.displayName || '—'}</td>
                      <td className="pr-2 font-mono text-xs text-gray-600">{p.supervisorEmail}</td>
                      <td className="max-w-[200px] pr-2 text-xs text-gray-600">
                        {p.teamLabels.join(', ') || '—'}
                      </td>
                      <td className="pr-2 text-xs">
                        {p.companyTotal ? `${p.companyDone}/${p.companyTotal}` : '—'}
                      </td>
                      <td className="pr-2 text-xs">
                        {p.teamTotal ? `${p.teamDone}/${p.teamTotal}` : '—'}
                      </td>
                      <td className="text-right">
                        <span className="font-semibold text-teal-800">{p.overallPercent}%</span>
                        <span className="ml-2 text-xs text-gray-500">({p.badge})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {people.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">No one on the roster yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
