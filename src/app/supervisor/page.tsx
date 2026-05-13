'use client';

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
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-500"
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

function PersonCard({ p }: { p: Person }) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
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
        <p className="text-right text-xs font-semibold text-indigo-900">{p.overallPercent}% overall</p>
      </div>
    </div>
  );
}

export default function SupervisorDashboardPage() {
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
        const res = await fetch('/api/supervisor/reports');
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
    <div className="space-y-8">
      <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-white to-teal-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Your team</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">People you supervise</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Progress reflects company-wide training plus team modules for each person&apos;s assigned teams. Use{' '}
          <strong>Training Center</strong> in the header for your own assigned learning.
        </p>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-800">{error}</div>
      )}
      {loading && <div className="card text-sm text-gray-500">Loading…</div>}

      {!loading && !error && (
        <>
          {bySupervisor.length === 0 && people.length === 0 ? (
            <div className="card text-sm text-gray-600">
              No roster entries list you as supervisor yet. When an admin assigns you on the training roster, your
              team will appear here.
            </div>
          ) : (
            bySupervisor.map((g) => (
              <section key={g.supervisorEmail}>
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Your direct reports</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {g.members.map((p) => (
                    <PersonCard key={p.email} p={p} />
                  ))}
                </div>
              </section>
            ))
          )}

          {!loading && people.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Table view</h2>
              <div className="card overflow-x-auto border-slate-200 shadow-md">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500">
                      <th className="py-2 pr-2">Email</th>
                      <th className="pr-2">Name</th>
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
                        <td className="max-w-[200px] pr-2 text-xs text-gray-600">
                          {p.teamLabels.join(', ') || '—'}
                        </td>
                        <td className="pr-2 text-xs">
                          {p.companyTotal ? `${p.companyDone}/${p.companyTotal}` : '—'}
                        </td>
                        <td className="pr-2 text-xs">
                          {p.teamTotal ? `${p.teamDone}/${p.teamTotal}` : '—'}
                        </td>
                        <td className="text-right text-xs font-semibold text-indigo-900">
                          {p.overallPercent}% ({p.badge})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
