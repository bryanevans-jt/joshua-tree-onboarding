'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Team {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  active: boolean;
}

export default function AdminTrainingTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/training/teams');
    const data = await res.json();
    setTeams(data.teams ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="training-admin-page space-y-6">
      <div className="training-admin-hero rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-teal-50/80 p-6 shadow-sm">
        <Link href="/admin/training" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          ← Training hub
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Teams</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Teams drive which <strong>team modules</strong> appear for each person. Vocational is split into{' '}
          <strong>Georgia Vocational</strong> and <strong>Tennessee Vocational</strong>; assign one or both on the
          roster. Retire a legacy team by setting it <strong>inactive</strong> — inactive teams cannot be selected for
          new roster rows.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <ul className="card divide-y divide-gray-100 border-slate-200 text-sm shadow-md">
          {teams.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
              <span>
                <span className="font-medium text-gray-900">{t.label}</span>{' '}
                <span className="text-xs text-gray-500">({t.slug})</span>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  t.active ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {t.active ? 'Active' : 'Inactive'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="card max-w-md border-teal-100 shadow-md">
        <h2 className="text-sm font-semibold text-gray-900">Add team</h2>
        <p className="mb-3 text-xs text-gray-500">Slug becomes the stable id (lowercase, hyphens).</p>
        <input className="input-field" placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <input className="input-field mt-2" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input
          type="number"
          className="input-field mt-2"
          placeholder="Sort order"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
        <button
          type="button"
          className="btn-primary mt-3"
          onClick={async () => {
            setError(null);
            const res = await fetch('/api/admin/training/teams', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug, label, sortOrder, active: true }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error || 'Failed');
              return;
            }
            setSlug('');
            setLabel('');
            setSortOrder(0);
            void load();
          }}
        >
          Create team
        </button>
      </div>
    </div>
  );
}
