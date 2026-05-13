'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface ModuleSummary {
  id: string;
  name: string;
  slug: string;
  isCompanyWide: boolean;
  teamId: string | null;
}

interface Team {
  id: string;
  label: string;
}

export default function AdminTrainingModulesPage() {
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, tRes] = await Promise.all([
        fetch('/api/admin/training/modules'),
        fetch('/api/admin/training/teams'),
      ]);
      const mData = await mRes.json();
      const tData = await tRes.json();
      if (!mRes.ok) throw new Error(mData.error || 'Failed to load modules');
      setModules(mData.modules ?? []);
      setTeams(tData.teams ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function teamLabel(id: string | null) {
    if (!id) return '';
    return teams.find((t) => t.id === id)?.label ?? '';
  }

  async function deleteModule(id: string, name: string) {
    if (
      !confirm(
        `Delete module "${name}"? This removes all sections and learner progress tied to it. This cannot be undone.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/training/modules/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Delete failed');
      return;
    }
    void load();
  }

  return (
    <div className="training-admin-page space-y-8">
      <div className="training-admin-hero rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50 via-white to-indigo-50/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Training HQ</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Programs & people</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Build <strong>company-wide</strong> courses everyone completes first, then attach <strong>team modules</strong>{' '}
              (Georgia Vocational, Tennessee Vocational, etc.). Learners see a quest-style path in the Training Center;
              you steer content, roster, and supervisors here.{' '}
              <span className="text-indigo-900">
                Tagged supervisors use the <strong>Supervisor portal</strong> at <span className="font-mono">/supervisor</span>{' '}
                for their team&apos;s progress and the Training Center for their own learning.
              </span>
            </p>
          </div>
          <Link href="/admin" className="btn-secondary text-sm shrink-0">
            ← Admin home
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/admin/training/overview" className="btn-primary text-sm shadow-md">
            Team progress overview
          </Link>
          <Link href="/admin/training/roster" className="btn-secondary text-sm">
            Roster & supervisors
          </Link>
          <Link href="/admin/training/teams" className="btn-secondary text-sm">
            Teams
          </Link>
          <Link href="/admin/training/settings" className="btn-secondary text-sm">
            Training settings
          </Link>
          <Link href="/admin/training/completions" className="btn-secondary text-sm">
            Module drill-down
          </Link>
          <Link href="/admin/training/new" className="btn-secondary text-sm ring-2 ring-amber-200">
            + New module
          </Link>
        </div>
      </div>

      {loading && (
        <div className="card border-teal-100 text-sm text-gray-500 shadow-inner">Loading modules…</div>
      )}

      {error && !loading && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-800">{error}</div>
      )}

      {!loading && !error && (
        <div className="card border-slate-200 shadow-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Modules</h2>
            <p className="text-xs text-gray-500">Delete removes sections & progress for that module.</p>
          </div>
          {modules.length === 0 ? (
            <p className="text-sm text-gray-500">
              No modules yet. Create a company-wide program, then optional team modules for each team track.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {modules.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      <span className="font-mono">/training/module/{m.slug}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.isCompanyWide
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {m.isCompanyWide ? 'Company-wide' : `Team: ${teamLabel(m.teamId) || '—'}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/admin/training/${m.id}`}
                      className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-900 hover:bg-teal-100"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                      onClick={() => void deleteModule(m.id, m.name)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
